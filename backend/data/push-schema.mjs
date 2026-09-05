/**
 * Create the schema on Supabase:  npm run db:push
 *
 * Idempotent — every statement is CREATE TABLE / CREATE INDEX IF NOT EXISTS,
 * so running it against a populated database changes nothing.
 */
import "../env.mjs";
import { applySchema, driver } from "./postgres.mjs";

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set.\n\n" +
      "Supabase → Project Settings → Database → Connection string → URI.\n" +
      "Use the connection *pooler* URI (port 6543) for anything serverless.\n" +
      "Put it in backend/.env as DATABASE_URL=postgres://…"
  );
  process.exit(1);
}

await applySchema();
console.log("Schema applied.");
await driver.close();
