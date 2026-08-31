import { applyCors, readBody, validateQuestion, rateLimited } from "../_engine.js";
import { answerStream } from "../../backend/rag/pipeline.mjs";
import { LlmError } from "../../backend/rag/llm.mjs";

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });

  if (rateLimited(req)) {
    return res.status(429).json({
      error:
        "That's a lot of questions in a short time. Give it a few minutes — or use the " +
        "contact form and Husnain will answer directly.",
    });
  }

  const parsed = validateQuestion(await readBody(req));
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  // Without this a proxy in front of the function buffers the whole stream
  // and delivers it as one lump, which defeats the point of streaming.
  res.setHeader("X-Accel-Buffering", "no");

  let closed = false;
  req.on("close", () => { closed = true; });

  try {
    for await (const event of answerStream(parsed.question, parsed.history)) {
      if (closed) break;
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
    if (!closed) res.end();
  } catch (err) {
    if (!(err instanceof LlmError)) console.error("[rag/stream]", err);
    const message =
      err instanceof LlmError ? err.message : "Something went wrong answering that.";
    res.write(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`);
    res.end();
  }
}
