/**
 * The assistant's starter questions.
 *
 * Shared deliberately between the browser and the server. /api/rag/meta
 * returns this list, and the panel also renders it while that request is
 * still in flight — so the chips are in place from first paint and the
 * response replaces them with an identical list, moving nothing. Keeping one
 * copy is what makes that true; two copies that drift would reintroduce the
 * layout shift the shared list exists to remove.
 *
 * Plain data with no imports, so pulling it into the serverless bundle from
 * backend/rag/pipeline.mjs costs nothing.
 */
export const SUGGESTED_QUESTIONS = [
  "Who is Husnain?",
  "What is VLVRAG and what were the results?",
  "What's his experience with FastAPI and backend work?",
  "Has he built RAG systems before?",
  "What did he do on the solar PV digital twin?",
  "Is he available for work, and what kind of roles?",
];

export default SUGGESTED_QUESTIONS;
