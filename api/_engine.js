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

function getIndex() {
  if (!CHUNKS?.length) return null;
  if (!cached) cached = { index: buildIndex(CHUNKS), size: CHUNKS.length, builtAt: BUILT_AT };
  return cached;
}

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
  // The functions are same-origin with the site in production; the header is
  // here so a local `npm run dev` on :5173 can talk to a `vercel dev` on
  // :3000 without a proxy shim.
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}
