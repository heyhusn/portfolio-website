/**
 * Export the knowledge base for production:  npm run export:index
 *
 * Writes api/_rag-index.js — the same chunks the local SQLite index holds,
 * as a plain ES module.
 *
 * Why a .js module and not a .json file: a Vercel function that reads JSON
 * at runtime needs the file traced into its bundle and either an import
 * attribute or an fs read with a path that survives bundling. A static
 * `export const CHUNKS = [...]` is followed by the bundler like any other
 * import, with no runtime file access and nothing to configure. It is a few
 * hundred KB of text, well inside the function size limit.
 *
 * Run this after `npm run ingest` and commit the result — it is what the
 * deployed chatbot answers from, and Vercel has no database to read.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadChunks, saveChunks, invalidateIndex } from "./store.mjs";
import buildCorpus from "./corpus.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../../api/_rag-index.js");

let chunks = await loadChunks();

// Build first if there is nothing to export. Failing with "run ingest first"
// made this a two-command ritual that is easy to half-remember, and there is
// no case where someone wants an export of an empty index.
if (!chunks.length) {
  console.log("Chunk table is empty — building the knowledge base first…");
  const built = await buildCorpus();
  if (!built.chunks.length) {
    console.error("Corpus came back empty. Check backend/rag/sources/ and that the DB is seeded.");
    process.exit(1);
  }
  await saveChunks(built.chunks);
  invalidateIndex();
  chunks = await loadChunks();
  console.log(`Indexed ${chunks.length} chunks from ${built.docs.length} documents.`);
}

// Only the fields retrieval and citation actually use — dropping the rest
// keeps the bundled module lean.
const slim = chunks.map((c) => ({
  id: c.id,
  docId: c.docId,
  source: c.source,
  kind: c.kind,
  title: c.title,
  url: c.url || "",
  date: c.date || "",
  text: c.text,
}));

const bySource = slim.reduce((acc, c) => ({ ...acc, [c.source]: (acc[c.source] || 0) + 1 }), {});

const file = `/**
 * GENERATED — do not edit by hand.
 *
 * Husnain's knowledge base, exported from the local SQLite index by
 * backend/rag/export-index.mjs so the Vercel functions in api/rag/ have
 * something to retrieve from without a database.
 *
 * Regenerate with:  cd backend && npm run ingest && npm run export:index
 *
 * Built ${new Date().toISOString()} — ${slim.length} chunks
 * ${Object.entries(bySource).map(([k, v]) => `${k}: ${v}`).join(", ")}
 */
export const BUILT_AT = ${JSON.stringify(new Date().toISOString())};
export const CHUNKS = ${JSON.stringify(slim)};
export default CHUNKS;
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, file);

const kb = (Buffer.byteLength(file) / 1024).toFixed(0);
console.log(`Wrote api/_rag-index.js — ${slim.length} chunks, ${kb} kB.`);
console.log(Object.entries(bySource).map(([k, v]) => `  ${k.padEnd(9)} ${v}`).join("\n"));
console.log("\nCommit this file — it is what the deployed chatbot answers from.");
