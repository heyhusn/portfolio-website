import { applyCors, readBody, validateQuestion, rateLimited } from "../_engine.js";
import { answer } from "../../backend/rag/pipeline.mjs";
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

  try {
    const result = await answer(parsed.question, parsed.history);
    res.status(200).json(result);
  } catch (err) {
    const status = err instanceof LlmError ? err.status || 502 : 500;
    if (!(err instanceof LlmError)) console.error("[rag/ask]", err);
    res.status(status).json({
      error: err instanceof LlmError ? err.message : "Something went wrong answering that.",
    });
  }
}
