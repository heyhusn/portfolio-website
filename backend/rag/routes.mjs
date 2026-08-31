/**
 * RAG HTTP routes.
 *
 *   GET  /api/rag/meta      — is it ready, how big is the index, sample questions
 *   POST /api/rag/ask       — question in, grounded answer + sources out
 *   POST /api/rag/stream    — the same, server-sent events
 *   POST /api/rag/reindex   — admin only, rebuilds the index without a restart
 *
 * Rate limits are per IP and deliberately tight: every question costs a real
 * LLM call against Husnain's own key, and an open endpoint on a public
 * portfolio is exactly the kind of thing that gets scraped.
 */
import rateLimit from "express-rate-limit";
import { answer, answerStream, retrieve, setIndexProvider, SUGGESTED_QUESTIONS } from "./pipeline.mjs";
import { getIndex, indexStats, invalidateIndex, saveChunks, logQuery } from "./store.mjs";
import { llmInfo, LlmError } from "./llm.mjs";
import buildCorpus from "./corpus.mjs";

const MAX_QUESTION_CHARS = 500;

const askLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: Number(process.env.RAG_RATE_LIMIT) || 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "That's a lot of questions in a short time. Give it a few minutes — or use the " +
      "contact form and Husnain will answer directly.",
  },
});

function validate(req, res) {
  const question = String(req.body?.question || "").trim();
  if (!question) {
    res.status(400).json({ error: "Ask a question first." });
    return null;
  }
  if (question.length > MAX_QUESTION_CHARS) {
    res.status(400).json({ error: `Questions are capped at ${MAX_QUESTION_CHARS} characters.` });
    return null;
  }
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-6) : [];
  return { question, history };
}

function sendError(res, err, headersSent = false) {
  const status = err instanceof LlmError ? err.status || 502 : 500;
  const message =
    err instanceof LlmError ? err.message : "Something went wrong answering that.";
  if (!(err instanceof LlmError)) console.error("[rag] unhandled:", err);
  if (headersSent) {
    res.write(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`);
    return res.end();
  }
  res.status(status).json({ error: message });
}

export function registerRagRoutes(app, authenticateToken) {
  // Under Express the index is the SQLite-backed one. The serverless build
  // injects a different provider over the same pipeline.
  setIndexProvider(getIndex);

  // Self-heal on boot. Requiring `npm run ingest` before `npm start` meant a
  // forgotten step showed visitors an "Assistant offline" panel with nothing
  // explaining why — the failure looked like a bug rather than a missing
  // command. If the chunk table is empty, build it here. Ingestion is a few
  // hundred milliseconds over local files, and it only ever runs when there
  // is nothing to serve.
  try {
    if (!getIndex()) {
      console.log("[rag] chunk table is empty — building the knowledge base…");
      const { docs, chunks } = buildCorpus();
      if (chunks.length) {
        saveChunks(chunks);
        invalidateIndex();
        console.log(`[rag] indexed ${chunks.length} chunks from ${docs.length} documents.`);
      } else {
        console.warn("[rag] corpus came back empty — check backend/rag/sources/.");
      }
    }
    const loaded = getIndex();
    const llm = llmInfo();
    console.log(
      `[rag] assistant ${loaded && llm.configured ? "ready" : "NOT ready"} — ` +
        `${loaded?.size || 0} chunks, model ${llm.model}` +
        (llm.configured ? "" : ", LLM_API_KEY missing from backend/.env")
    );
  } catch (err) {
    // A broken knowledge base must not stop the rest of the API booting.
    console.error("[rag] could not build the index on boot:", err.message);
  }

  app.get("/api/rag/meta", (req, res) => {
    const loaded = getIndex();
    const llm = llmInfo();
    res.json({
      ready: Boolean(loaded) && llm.configured,
      indexed: loaded?.size || 0,
      stats: indexStats(),
      model: llm.model,
      llmConfigured: llm.configured,
      // Lets the front end say WHY it isn't ready instead of a generic
      // "unavailable" that gives the visitor nothing to act on.
      reason: !loaded ? "empty-index" : !llm.configured ? "no-api-key" : null,
      suggestions: SUGGESTED_QUESTIONS,
    });
  });

  app.post("/api/rag/ask", askLimiter, async (req, res) => {
    const parsed = validate(req, res);
    if (!parsed) return;
    try {
      const result = await answer(parsed.question, parsed.history);
      logQuery({ question: parsed.question, ...result });
      res.json(result);
    } catch (err) {
      sendError(res, err);
    }
  });

  app.post("/api/rag/stream", askLimiter, async (req, res) => {
    const parsed = validate(req, res);
    if (!parsed) return;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    // Nginx and friends buffer SSE into uselessness without this.
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const started = Date.now();
    let sources = [];
    let full = "";
    // If the visitor navigates away mid-answer there is no one to stream to,
    // and continuing just burns tokens.
    let closed = false;
    req.on("close", () => { closed = true; });

    try {
      for await (const event of answerStream(parsed.question, parsed.history)) {
        if (closed) break;
        if (event.type === "sources") sources = event.sources;
        if (event.type === "delta") full += event.text;
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      if (!closed) {
        logQuery({
          question: parsed.question,
          answer: full,
          sources,
          grounded: Boolean(full),
          latencyMs: Date.now() - started,
        });
        res.end();
      }
    } catch (err) {
      sendError(res, err, true);
    }
  });

  // Diagnostics: what would retrieval return, with no LLM call and no cost.
  // Admin-only because it exposes raw chunk text.
  app.post("/api/rag/retrieve", authenticateToken, (req, res) => {
    const parsed = validate(req, res);
    if (!parsed) return;
    const { hits, indexed } = retrieve(parsed.question);
    res.json({
      indexed,
      hits: hits.map((h) => ({
        title: h.chunk.title,
        source: h.chunk.source,
        url: h.chunk.url,
        relevance: Number(h.relevance.toFixed(3)),
        score: Number(h.score.toFixed(2)),
        preview: h.chunk.text.slice(0, 300),
      })),
    });
  });

  app.post("/api/rag/reindex", authenticateToken, (req, res) => {
    try {
      const { docs, chunks } = buildCorpus();
      if (!chunks.length) {
        return res.status(400).json({ error: "Corpus came back empty — nothing was replaced." });
      }
      saveChunks(chunks);
      invalidateIndex();
      res.json({ success: true, documents: docs.length, chunks: chunks.length, stats: indexStats() });
    } catch (err) {
      console.error("[rag] reindex failed:", err);
      res.status(500).json({ error: "Reindex failed: " + err.message });
    }
  });
}

export default registerRagRoutes;
