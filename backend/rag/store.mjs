/**
 * Chunk persistence + the in-memory index the answer route queries.
 *
 * Chunks live in SQLite so ingestion is a separate, explicit step: the site
 * can boot and serve without re-reading resumes and READMEs on every start,
 * and a bad ingest can be re-run without a deploy. The BM25 index itself is
 * rebuilt in memory on first use — it is a few hundred documents and takes
 * single-digit milliseconds, so persisting it would be more machinery than
 * the problem deserves.
 */
import { repo } from "../data/index.mjs";
import { buildIndex } from "./retriever.mjs";

let cached = null;

export async function saveChunks(chunks) {
  await (await repo()).replaceChunks(chunks);
  cached = null;
}

export async function loadChunks() {
  return await (await repo()).listChunks();
}

/**
 * The in-memory BM25 index, built once and reused.
 *
 * Async because the underlying store may be a hosted Postgres. Callers that
 * need it synchronously (the retrieval hot path) use `peekIndex()` after
 * `warmIndex()` has resolved — building a few hundred documents takes single
 * digit milliseconds, so it is done once per process and then just read.
 */
export async function warmIndex() {
  if (cached) return cached;
  const chunks = await loadChunks();
  if (!chunks.length) return null;
  cached = { index: buildIndex(chunks), size: chunks.length, builtAt: new Date().toISOString() };
  return cached;
}

/** Synchronous read of whatever warmIndex() last built. */
export function peekIndex() {
  return cached;
}

export function invalidateIndex() {
  cached = null;
}

export async function indexStats() {
  const rows = await (await repo()).chunkStats();
  return { total: rows.reduce((a, r) => a + Number(r.n), 0), bySource: rows };
}

export async function logQuery(entry) {
  try {
    await (await repo()).logQuery(entry);
  } catch {
    /* Logging is diagnostics, never a reason to fail a visitor's question. */
  }
}
