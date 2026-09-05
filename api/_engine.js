/**
 * Serverless side of the RAG engine.
 *
 * Same retrieval and generation code as the local Express server — the
 * modules under backend/rag/ are imported directly rather than copied, so
 * there is one implementation to fix when something is wrong with it. The
 * only difference is where the chunks come from: SQLite locally, the
 * generated api/_rag-index.js here.
 *
 * The index is built once per warm instance. Building it is a few
 * milliseconds over a few hundred chunks, and a cold start pays it once.
 */
import { buildIndex } from "../backend/rag/retriever.mjs";
import { setIndexProvider } from "../backend/rag/pipeline.mjs";
import { CHUNKS, BUILT_AT } from "./_rag-index.js";

let cached = null;

/**
 * Where the chunks come from, in order of preference:
 *
 *  1. Postgres, when DATABASE_URL is set. This is what makes an admin edit in
 *     production actually reach the assistant — reindex from /admin and the
 *     next cold instance picks it up. One query, cached for the life of the
 *     instance.
 *  2. api/_rag-index.js, the committed export. Works with no database at all,
 *     which keeps the chatbot deployable on a static-only setup.
 */
async function getIndex() {
  if (cached) return cached;

  if (process.env.DATABASE_URL) {
    try {
      const { repo } = await import("../backend/data/index.mjs");
      const rows = await (await repo()).listChunks();
      if (rows.length) {
        cached = { index: buildIndex(rows), size: rows.length, builtAt: new Date().toISOString(), source: "database" };
        return cached;
      }
      // An empty table is not an error — fall through to the committed export
      // rather than serving an assistant with nothing to retrieve.
    } catch (err) {
      console.error("[rag] could not read chunks from the database, using the bundled index:", err.message);
    }
  }

  if (!CHUNKS?.length) return null;
  cached = { index: buildIndex(CHUNKS), size: CHUNKS.length, builtAt: BUILT_AT, source: "bundled" };
  return cached;
}

// Register the provider with the shared pipeline. Without this line the
// pipeline keeps its default "no index" provider and every question comes
// back as "the knowledge base is empty" — while /api/rag/meta still reports a
// healthy index, because it calls getIndex() directly. Two code paths, one
// source of truth for the index; only this line connects them.
setIndexProvider(getIndex);

export function indexStats() {
  const bySource = {};
  for (const c of CHUNKS || []) bySource[c.source] = (bySource[c.source] || 0) + 1;
  return {
    total: CHUNKS?.length || 0,
    bySource: Object.entries(bySource)
      .map(([source, n]) => ({ source, n }))
      .sort((a, b) => b.n - a.n),
  };
}

export { getIndex, BUILT_AT };

/* ---------------------------------------------------------------- */
/* Shared request helpers                                            */
/* ---------------------------------------------------------------- */

const MAX_QUESTION_CHARS = 500;

/**
 * Per-instance rate limiting.
 *
 * Deliberately modest about what it is: serverless instances don't share
 * memory, so a determined caller spread across cold starts gets more than
 * the nominal limit. It still stops the common case — one browser or one
 * script hammering a warm instance — and the real spend ceiling is the
 * budget cap on the provider account, which is where it belongs.
 */
const hits = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = Number(process.env.RAG_RATE_LIMIT) || 25;

export function rateLimited(req) {
  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  const now = Date.now();
  const seen = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  seen.push(now);
  hits.set(ip, seen);

  // Keep the map from growing without bound on a long-lived instance.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (!times.some((t) => now - t < WINDOW_MS)) hits.delete(key);
    }
  }
  return seen.length > LIMIT;
}

export function readBody(req) {
  // Vercel parses JSON bodies for us, but not on every runtime version —
  // fall back to reading the stream rather than assuming.
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try { resolve(JSON.parse(raw || "{}")); } catch { resolve({}); }
    });
  });
}

export function validateQuestion(body) {
  const question = String(body?.question || "").trim();
  if (!question) return { error: "Ask a question first." };
  if (question.length > MAX_QUESTION_CHARS) {
    return { error: `Questions are capped at ${MAX_QUESTION_CHARS} characters.` };
  }
  const history = Array.isArray(body?.history) ? body.history.slice(-6) : [];
  return { question, history };
}

export function applyCors(req, res) {
  // Same-origin is the normal case in production: the site and /api share an
  // origin, so the browser sends no Origin header and CORS never applies. The
  // header below exists for the cross-origin setups — a `vercel dev` on :3000
  // serving a Vite dev server on :5173, or an API hosted separately.
  //
  // Not `*`: that hands every website on the internet the ability to call
  // these routes from a visitor's browser. Unnecessary, since production does
  // not need the header at all, and wrong for the admin routes.
  const origin = req.headers.origin;
  if (origin) {
    const host = req.headers.host || "";
    const sameOrigin = origin === `https://${host}` || origin === `http://${host}`;
    const allowed = (process.env.CORS_ORIGIN || "")
      .split(",").map((s) => s.trim()).filter(Boolean);

    if (sameOrigin || allowed.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      // The response varies by Origin, so a cache must not serve one origin's
      // response to another.
      res.setHeader("Vary", "Origin");
    } else {
      // No header: the browser blocks it, which is the intent. Logged so a
      // genuine misconfiguration is diagnosable from the function logs rather
      // than only from a browser console on someone else's machine.
      console.warn(
        `[cors] refused origin ${origin} (host ${host}). ` +
          `Add it to CORS_ORIGIN if this is expected.`
      );
    }
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") { res.status(204).end(); return true; }
  return false;
}
