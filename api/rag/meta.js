import { getIndex, indexStats, applyCors } from "../_engine.js";
import { llmInfo } from "../../backend/rag/llm.mjs";
import { SUGGESTED_QUESTIONS } from "../../backend/rag/pipeline.mjs";

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  const loaded = await getIndex();
  const llm = llmInfo();

  res.status(200).json({
    ready: Boolean(loaded) && llm.configured,
    indexed: loaded?.size || 0,
    stats: indexStats(),
    model: llm.model,
    llmConfigured: llm.configured,
    // Tells the front end WHY it isn't ready, so the offline panel can say
    // something actionable instead of a generic "unavailable".
    reason: !loaded ? "empty-index" : !llm.configured ? "no-api-key" : null,
    suggestions: SUGGESTED_QUESTIONS,
    builtAt: loaded?.builtAt || null,
    indexSource: loaded?.source || null,
  });
}
