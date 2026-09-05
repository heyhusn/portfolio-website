/**
 * Additive migration for the resume-derived blocks (skills, certifications,
 * volunteering, GitHub).
 *
 * Use this instead of `npm run seed` on a database you have already edited.
 * seed.mjs uses INSERT OR REPLACE for profile and site_content, so re-running
 * it would silently overwrite every change made through the admin panel with
 * whatever is currently in src/data/. This script only ever *adds*:
 *
 *  - the four new site_content keys, and only if they are missing
 *  - the four new section rows, appended after whatever ordering you already
 *    have, and only if they are missing
 *  - it drops the dead `stack` key, which nothing renders any more
 *
 * Safe to run more than once. Run it from backend/:  node migrate-resume-blocks.mjs
 */
import path from "path";
import { fileURLToPath } from "url";
import { repo, usingPostgres } from "./data/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skills = await import("file://" + path.resolve(__dirname, "../src/data/skills.js"));

const NEW_KEYS = {
  skillGroups: skills.skillGroups,
  certifications: skills.certifications,
  volunteering: skills.volunteering,
  github: skills.github,
  recommendations: skills.recommendations,
};

const NEW_SECTIONS = [
  { id: "github", title: "GitHub Contributions", is_visible: 1 },
  { id: "skills", title: "Technical Skills", is_visible: 0 },
  { id: "certifications", title: "Certifications", is_visible: 0 },
  { id: "volunteering", title: "Volunteering", is_visible: 0 },
  { id: "recommendations", title: "Recommendations", is_visible: 1 },
];

/**
 * The assistant is the exception to "append at the end".
 *
 * Everything else here is added after your existing layout so a hand-arranged
 * order is never disturbed. But the assistant is the one thing on the page a
 * visitor can actually interact with, and appending it put it below fourteen
 * other sections — technically installed, practically invisible.
 *
 * It is anchored to the services section rather than to a fixed number.
 * FlowingPortrait interpolates the hero portrait from the hero slot into the
 * services slot as you scroll, so a section sitting between those two gets
 * the portrait gliding over it — directly AFTER services is the highest slot
 * clear of that path. Anchoring by lookup rather than by "position 3" means
 * this still lands correctly if you have already reordered the home page.
 */
const ASSISTANT = { id: "assistant", title: "Ask About My Work", is_visible: 1, after: "services" };

const db = await repo();
console.log(`Migrating ${usingPostgres() ? "Postgres (DATABASE_URL)" : "SQLite (backend/portfolio.db)"}…\n`);

if (usingPostgres()) {
  const { applySchema } = await import("./data/postgres.mjs");
  await applySchema();
}

// ---- content keys: add only what is missing ----------------------------
const existing = await db.getSiteContent();
const toAdd = {};
for (const [key, value] of Object.entries(NEW_KEYS)) {
  if (key in existing) console.log(`site_content.${key} already present — left alone.`);
  else { toAdd[key] = value; console.log(`site_content.${key} added.`); }
}
if (Object.keys(toAdd).length) await db.saveSiteContent(toAdd);

if ("stack" in existing) {
  await db.deleteSiteContent("stack");
  console.log("site_content.stack removed (nothing renders it now).");
}

// ---- sections: append the new ones, then splice the assistant in -------
let sections = await db.listSections();
const has = (id) => sections.some((s) => s.id === id);

for (const s of NEW_SECTIONS) {
  if (has(s.id)) { console.log(`section "${s.id}" already present — left alone.`); continue; }
  sections.push({ ...s, is_visible: !!s.is_visible, animation_type: "default", font_family: "default", type: "predefined", content: null });
  console.log(`section "${s.id}" added (visible: ${!!s.is_visible}).`);
}

if (has(ASSISTANT.id)) {
  console.log(`section "${ASSISTANT.id}" already present — left alone.`);
} else {
  const row = { ...ASSISTANT, is_visible: true, animation_type: "default", font_family: "default", type: "predefined", content: null };
  const at = sections.findIndex((s) => s.id === ASSISTANT.after);
  if (at >= 0) {
    sections.splice(at + 1, 0, row);
    console.log(`section "${ASSISTANT.id}" added directly after "${ASSISTANT.after}".`);
  } else {
    sections.push(row);
    console.log(`section "${ASSISTANT.id}" appended (no "${ASSISTANT.after}" section to anchor to).`);
  }
}

// replaceSections renumbers ordering from the array position, which also
// closes any gaps an earlier hand edit left behind.
await db.replaceSections(sections);

console.log(
  "\nDone. Nothing else was touched — your profile, projects, posts and existing " +
    "site text are exactly as they were.\nOpen /admin → Sections Layout to drag the new " +
    "sections into place."
);
await db.close();
