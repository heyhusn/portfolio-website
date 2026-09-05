/**
 * Ingestion CLI:  node rag/ingest.mjs        (or: npm run ingest)
 *
 * Rebuilds the whole chunk table from the four sources. Safe to re-run — it
 * is a full replace inside a transaction, so a failure part-way leaves the
 * previous index intact rather than a half-written one.
 *
 * Run it after editing site content in the admin panel, after dropping new
 * resumes into rag/sources/resumes/, or after `npm run refresh:github`.
 */
import buildCorpus from "./corpus.mjs";
import { saveChunks, indexStats } from "./store.mjs";

const { docs, chunks } = await buildCorpus();

if (!chunks.length) {
  console.error(
    "No chunks produced. Is the database seeded (npm run seed / npm run migrate) " +
      "and are rag/sources/ populated?"
  );
  process.exit(1);
}

await saveChunks(chunks);

const stats = await indexStats();
const chars = chunks.reduce((a, c) => a + c.text.length, 0);

console.log(`Ingested ${docs.length} documents into ${chunks.length} chunks (${(chars / 1000).toFixed(1)}k chars).`);
for (const row of stats.bySource) console.log(`  ${row.source.padEnd(10)} ${row.n} chunks`);
console.log("\nRestart the API (or hit POST /api/rag/reindex as admin) to serve the new index.");
