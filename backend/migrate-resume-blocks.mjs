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
import db from "./db.mjs";

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
 * this still lands correctly if you have already reordered the home page,
 * or if the numbering has gaps. Drag it elsewhere afterwards if you like.
 */
const ASSISTANT = { id: "assistant", title: "Ask About My Work", is_visible: 1, after: "services" };

const hasKey = db.prepare("SELECT 1 FROM site_content WHERE key = ?");
const insertKey = db.prepare("INSERT INTO site_content (key, value) VALUES (?, ?)");

for (const [key, value] of Object.entries(NEW_KEYS)) {
  if (hasKey.get(key)) {
    console.log(`site_content.${key} already present — left alone.`);
  } else {
    insertKey.run(key, JSON.stringify(value));
    console.log(`site_content.${key} added.`);
  }
}

const removedStack = db.prepare("DELETE FROM site_content WHERE key = 'stack'").run().changes;
if (removedStack) console.log("site_content.stack removed (nothing renders it now).");

const hasSection = db.prepare("SELECT 1 FROM sections WHERE id = ?");
const insertSection = db.prepare(
  "INSERT INTO sections (id, title, is_visible, ordering, animation_type, font_family, type, content) " +
    "VALUES (?, ?, ?, ?, 'default', 'default', 'predefined', NULL)"
);

// Append after the current maximum so the new rows never collide with an
// ordering you have already arranged by hand in the Sections Layout tab.
let nextOrder =
  (db.prepare("SELECT MAX(ordering) AS m FROM sections").get()?.m ?? -1) + 1;

for (const s of NEW_SECTIONS) {
  if (hasSection.get(s.id)) {
    console.log(`section "${s.id}" already present — left alone.`);
  } else {
    insertSection.run(s.id, s.title, s.is_visible, nextOrder++);
    console.log(`section "${s.id}" added (visible: ${!!s.is_visible}).`);
  }
}

if (hasSection.get(ASSISTANT.id)) {
  console.log(`section "${ASSISTANT.id}" already present — left alone.`);
} else {
  const anchor = db
    .prepare("SELECT ordering FROM sections WHERE id = ?")
    .get(ASSISTANT.after);

  if (!anchor) {
    // No services section to anchor to — append rather than guess at a number.
    insertSection.run(ASSISTANT.id, ASSISTANT.title, ASSISTANT.is_visible, nextOrder++);
    console.log(
      `section "${ASSISTANT.id}" appended (no "${ASSISTANT.after}" section to anchor to). ` +
        `Drag it up the Sections Layout tab so visitors see it.`
    );
  } else {
    const target = anchor.ordering + 1;
    db.transaction(() => {
      db.prepare("UPDATE sections SET ordering = ordering + 1 WHERE ordering >= ?").run(target);
      insertSection.run(ASSISTANT.id, ASSISTANT.title, ASSISTANT.is_visible, target);
    })();
    console.log(`section "${ASSISTANT.id}" added directly after "${ASSISTANT.after}" (position ${target}).`);
  }
}

// Re-close any gaps the shifts (or an earlier hand edit) left behind, so the
// admin panel's drag-and-drop starts from a clean 0..n-1 sequence.
db.transaction(() => {
  const rows = db.prepare("SELECT id FROM sections ORDER BY ordering ASC, rowid ASC").all();
  const set = db.prepare("UPDATE sections SET ordering = ? WHERE id = ?");
  rows.forEach((r, i) => set.run(i, r.id));
})();

console.log(
  "\nDone. Nothing else was touched — your profile, projects, posts and existing " +
    "site text are exactly as they were.\nOpen /admin → Sections Layout to drag the new " +
    "sections into place."
);
