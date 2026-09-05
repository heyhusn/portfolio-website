/**
 * Copy the local SQLite database into Postgres:  npm run db:migrate
 *
 * A one-off for the switch to Supabase — everything already edited in the
 * local admin panel moves across, rather than being reseeded from src/data
 * and losing it.
 *
 * Reads through the SQLite driver and writes through the Postgres one, so
 * both sides go through the same normalisation the app uses; no raw column
 * copying, and no chance of a JSON string landing in a JSONB column.
 *
 * Safe to re-run: every write is a replace or an upsert. It does NOT delete
 * anything in Postgres that SQLite has no opinion about.
 */
import "../env.mjs";
import { applySchema, driver as pg } from "./postgres.mjs";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — nothing to migrate to. See backend/.env.example.");
  process.exit(1);
}

// Import the SQLite driver explicitly rather than through data/index.mjs,
// which would resolve to Postgres because DATABASE_URL is set.
const { driver: sqlite } = await import("./sqlite.mjs");

await applySchema();
console.log("Schema ready.\n");

const step = async (label, read, write) => {
  const data = await read();
  const count = Array.isArray(data) ? data.length : data ? Object.keys(data).length : 0;
  if (!count) { console.log(`  ${label.padEnd(16)} nothing to copy`); return; }
  await write(data);
  console.log(`  ${label.padEnd(16)} ${count}`);
};

console.log("Copying SQLite → Postgres:");
await step("profile", () => sqlite.getProfile(), (p) => p && pg.saveProfile(p));
await step("projects", () => sqlite.listProjects(), (v) => pg.replaceProjects(v));
await step("posts", () => sqlite.listPosts(), (v) => pg.replacePosts(v));
await step("site content", () => sqlite.getSiteContent(), (v) => pg.saveSiteContent(v));
await step("sections", () => sqlite.listSections(), (v) => pg.replaceSections(v));
await step("rag chunks", () => sqlite.listChunks(), (v) => pg.replaceChunks(v));

// The admin user carries a bcrypt hash, which copies across as-is — the same
// password keeps working, and the plaintext was never stored anywhere.
const admin = await sqlite.findUser("admin");
if (admin) {
  await pg.upsertUser(admin.username, admin.password);
  console.log("  admin user      copied (password unchanged)");
}

console.log("\nDone. Point the app at Postgres by keeping DATABASE_URL set;");
console.log("unset it to go back to the local SQLite file.");
await pg.close();
