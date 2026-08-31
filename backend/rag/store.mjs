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
import db from "../db.mjs";
import { buildIndex } from "./retriever.mjs";

let cached = null;

export function saveChunks(chunks) {
  const del = db.prepare("DELETE FROM rag_chunks");
  const ins = db.prepare(
    "INSERT INTO rag_chunks (id, docId, source, kind, title, url, date, text, part) " +
      "VALUES (@id, @docId, @source, @kind, @title, @url, @date, @text, @part)"
  );
  db.transaction(() => {
    del.run();
    for (const c of chunks) ins.run(c);
  })();
  cached = null;
}

export function loadChunks() {
  return db.prepare("SELECT * FROM rag_chunks ORDER BY id").all();
}

export function getIndex() {
  if (cached) return cached;
  const chunks = loadChunks();
  if (!chunks.length) return null;
  cached = { index: buildIndex(chunks), size: chunks.length, builtAt: new Date().toISOString() };
  return cached;
}

/** Called after a re-ingest so a running server picks up new content. */
export function invalidateIndex() {
  cached = null;
}

export function indexStats() {
  const rows = db
    .prepare("SELECT source, COUNT(*) AS n FROM rag_chunks GROUP BY source ORDER BY n DESC")
    .all();
  const total = rows.reduce((a, r) => a + r.n, 0);
  return { total, bySource: rows };
}

export function logQuery(entry) {
  try {
    db.prepare(
      "INSERT INTO rag_queries (question, answer, sources, grounded, latencyMs, createdAt) " +
        "VALUES (?, ?, ?, ?, ?, ?)"
    ).run(
      entry.question,
      entry.answer,
      JSON.stringify(entry.sources || []),
      entry.grounded ? 1 : 0,
      entry.latencyMs || 0,
      new Date().toISOString()
    );
  } catch {
    /* Logging is diagnostics, never a reason to fail a visitor's question. */
  }
}
