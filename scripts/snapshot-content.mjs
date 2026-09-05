/**
 * Build-time content snapshot.  Runs BEFORE `vite build`.
 *
 * THE PROBLEM
 * -----------
 * The public site renders from content bundled into the JS (src/data/), then
 * fetches the same content from the admin API and swaps it in. That is what
 * makes first paint instant and what keeps the site up when the API is down —
 * but it also means a visitor sees the *build-time hand-written* copy for a
 * few hundred milliseconds and the *database* copy after that. Where the two
 * disagree — an edited headline, one extra project, a reordered service list —
 * the page visibly rewrites and re-lays out under the reader.
 *
 * THE FIX
 * -------
 * Read the database at build time and write what it says into
 * src/data/snapshot.generated.js, which fallback.js prefers over the
 * hand-written content. Then, for any deploy where nobody has edited anything
 * since, the first paint and the API response are identical and there is
 * nothing to swap. Edits made after the deploy still land the way they always
 * did — but as one changed block, not a whole-page repaint.
 *
 * The endpoints this replaces (api/profile.js, projects.js, posts.js, site.js,
 * sections.js) all return `await db.<method>()` verbatim with no reshaping, so
 * calling the repository directly here produces byte-identical payloads. If
 * one of them ever starts transforming its result, this has to transform it
 * the same way.
 *
 * No DATABASE_URL, or a database that will not answer: the snapshot stays
 * null and the build carries on with the bundled content. This step can never
 * fail a build — a slightly stale first paint is a far better outcome than a
 * deploy that does not happen.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(__dirname, "../src/data/snapshot.generated.js");

const HEADER = `/**
 * Build-time content snapshot — GENERATED FILE, DO NOT EDIT BY HAND.
 *
 * Written by scripts/snapshot-content.mjs during \`npm run build\`. See that
 * file for why this exists; see src/data/fallback.js for how it is consumed.
 * Committed as null so a checkout with no database still builds.
 */`;

const EMPTY = `${HEADER}
export const snapshot = null;

/** Set by the build script to the ISO timestamp the snapshot was taken. */
export const snapshotTakenAt = null;
`;

function write(snapshot, takenAt) {
  const body =
    snapshot === null
      ? EMPTY
      : `${HEADER}
export const snapshot = ${JSON.stringify(snapshot, null, 2)};

/** Set by the build script to the ISO timestamp the snapshot was taken. */
export const snapshotTakenAt = ${JSON.stringify(takenAt)};
`;
  fs.writeFileSync(target, body);
}

if (!process.env.DATABASE_URL) {
  write(null);
  console.log("[snapshot] no DATABASE_URL — first paint will use bundled src/data content.");
  process.exit(0);
}

try {
  const { repo } = await import("../backend/data/index.mjs");
  const db = await repo();

  const [profile, projects, posts, siteContent, sections] = await Promise.all([
    db.getProfile(),
    db.listProjects(),
    db.listPosts(),
    db.getSiteContent(),
    db.listSections(),
  ]);

  // A database that exists but has never been seeded returns empty shapes.
  // Snapshotting that would blank the site on first paint and then fill it in
  // — the exact flash this script is meant to remove, only worse.
  if (!profile?.name) {
    write(null);
    console.log("[snapshot] database has no profile row yet — keeping bundled content.");
    process.exit(0);
  }

  // Drafts are stripped before they reach the bundle. The site never renders
  // them (the store filters on isDraft), so leaving them out costs nothing
  // visually, keeps unpublished writing out of a file every visitor
  // downloads, and keeps the snapshot smaller.
  //
  // Note this is the one place the snapshot is deliberately NOT identical to
  // the API response, which still returns drafts — so the store's
  // "unchanged?" check will always see the posts list as changed and take the
  // update. That costs one render of a list whose visible members are the
  // same, and shifts nothing.
  const published = posts.filter((p) => !p.isDraft);

  const takenAt = new Date().toISOString();
  write({ profile, projects, posts: published, siteContent, sections }, takenAt);

  const kb = (fs.statSync(target).size / 1024).toFixed(1);
  console.log(
    `[snapshot] captured ${projects.length} projects, ${published.length} published posts ` +
      `(${posts.length - published.length} drafts excluded), ` +
      `${Object.keys(siteContent || {}).length} content blocks, ${sections.length} sections (${kb} kB) at ${takenAt}`
  );
} catch (err) {
  write(null);
  console.warn(`[snapshot] database unavailable (${err.message}) — keeping bundled content.`);
}

// The Postgres driver holds an open pool; nothing else keeps the process
// alive, so end it explicitly rather than waiting on the idle timeout.
process.exit(0);
