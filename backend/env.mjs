/**
 * Loads backend/.env, and does it as a side-effecting *import* on purpose.
 *
 * ES modules evaluate every import before any statement in the importing
 * module's body. So calling dotenv.config() in server.mjs's body runs it
 * AFTER rag/llm.mjs has already been evaluated — and any module that read
 * process.env at load time got undefined. That is exactly what happened:
 * the API booted reporting "LLM_API_KEY missing" from a .env that plainly
 * contained it.
 *
 * Importing this module first makes the load order explicit and correct, and
 * the path is resolved from this file rather than the working directory so it
 * works whether the process was started from backend/ or the project root.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config({
  path: path.join(path.dirname(fileURLToPath(import.meta.url)), ".env"),
});
