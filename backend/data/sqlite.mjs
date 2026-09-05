/**
 * SQLite driver — local development.
 *
 * better-sqlite3 is synchronous; every method here is still declared `async`
 * so both drivers present one interface and the callers never branch on which
 * database they are talking to.
 *
 * This file is never loaded in production: `data/index.mjs` imports a driver
 * dynamically, so a serverless bundle that resolves to Postgres never pulls
 * better-sqlite3 — a native binary it cannot build or use.
 */
import db from "../db.mjs";

const parse = (v, fallback) => {
  if (v === null || v === undefined) return fallback;
  if (typeof v !== "string") return v;
  try { return JSON.parse(v); } catch { return fallback; }
};
const str = (v) => JSON.stringify(v ?? null);

export const driver = {
  name: "sqlite",

  async findUser(username) {
    return db.prepare("SELECT * FROM users WHERE username = ?").get(username) || null;
  },

  async upsertUser(username, passwordHash) {
    db.prepare("INSERT OR REPLACE INTO users (username, password) VALUES (?, ?)").run(username, passwordHash);
  },

  async getProfile() {
    const row = db.prepare("SELECT * FROM profile WHERE id = 1").get();
    if (!row) return null;
    return {
      ...row,
      heroWords: parse(row.heroWords, []),
      socials: parse(row.socials, []),
      stats: parse(row.stats, []),
      education: parse(row.education, {}),
    };
  },

  async saveProfile(p) {
    db.prepare(`
      INSERT OR REPLACE INTO profile (id, name, heroWords, kicker, availability, role, location, tagline, intro,
        aboutEyebrow, aboutTitle, aboutLead, email, phone, phoneHref, socials, stats, education)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      p.name, str(p.heroWords || []), p.kicker || "", p.availability || "", p.role || "", p.location || "",
      p.tagline || "", p.intro || "", p.aboutEyebrow || "", p.aboutTitle || "", p.aboutLead || "",
      p.email, p.phone || "", p.phoneHref || "", str(p.socials || []), str(p.stats || []), str(p.education || {})
    );
  },

  async listProjects() {
    return db.prepare("SELECT * FROM projects ORDER BY ordering ASC").all().map((p) => ({
      ...p, featured: !!p.featured,
      highlights: parse(p.highlights, []), stack: parse(p.stack, []), links: parse(p.links, []),
    }));
  },

  async replaceProjects(projects) {
    const del = db.prepare("DELETE FROM projects");
    const ins = db.prepare(`INSERT INTO projects (slug, title, tag, year, image, featured, summary, description, highlights, stack, links, note, ordering)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    db.transaction(() => {
      del.run();
      projects.forEach((p, i) => ins.run(p.slug, p.title, p.tag || "", p.year || "", p.image || "",
        p.featured ? 1 : 0, p.summary || "", p.description || "", str(p.highlights || []),
        str(p.stack || []), str(p.links || []), p.note || null, i));
    })();
  },

  async listPosts() {
    return db.prepare("SELECT * FROM posts").all().map((p) => ({ ...p, isDraft: !!p.isDraft, body: parse(p.body, []) }));
  },

  async replacePosts(posts) {
    const del = db.prepare("DELETE FROM posts");
    const ins = db.prepare(`INSERT INTO posts (slug, title, date, dateLabel, category, excerpt, body, image, isDraft)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    db.transaction(() => {
      del.run();
      posts.forEach((p) => ins.run(p.slug, p.title, p.date || "", p.dateLabel || "", p.category || "",
        p.excerpt || "", str(p.body || []), p.image || "", p.isDraft ? 1 : 0));
    })();
  },

  async getSiteContent() {
    const out = {};
    for (const row of db.prepare("SELECT * FROM site_content").all()) out[row.key] = parse(row.value, row.value);
    return out;
  },

  async saveSiteContent(content) {
    const stmt = db.prepare("INSERT OR REPLACE INTO site_content (key, value) VALUES (?, ?)");
    db.transaction(() => { for (const [k, v] of Object.entries(content)) stmt.run(k, str(v)); })();
  },

  async deleteSiteContent(key) {
    db.prepare("DELETE FROM site_content WHERE key = ?").run(key);
  },

  async listSections() {
    return db.prepare("SELECT * FROM sections ORDER BY ordering ASC").all().map((s) => ({
      ...s, is_visible: !!s.is_visible, content: s.content ? parse(s.content, null) : null,
    }));
  },

  async replaceSections(sections) {
    const del = db.prepare("DELETE FROM sections");
    const ins = db.prepare(`INSERT INTO sections (id, title, is_visible, ordering, animation_type, font_family, type, content)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    db.transaction(() => {
      del.run();
      sections.forEach((s, i) => ins.run(s.id, s.title || "", s.is_visible ? 1 : 0, i,
        s.animation_type || "default", s.font_family || "default", s.type || "predefined",
        s.content ? str(s.content) : null));
    })();
  },

  async insertSectionIfMissing(section, ordering) {
    const res = db.prepare(`INSERT OR IGNORE INTO sections (id, title, is_visible, ordering, animation_type, font_family, type, content)
      VALUES (?, ?, ?, ?, 'default', 'default', 'predefined', NULL)`)
      .run(section.id, section.title, section.is_visible ? 1 : 0, ordering);
    return res.changes > 0;
  },

  async listChunks() {
    return db.prepare("SELECT * FROM rag_chunks ORDER BY id").all();
  },

  async replaceChunks(chunks) {
    const del = db.prepare("DELETE FROM rag_chunks");
    const ins = db.prepare(`INSERT INTO rag_chunks (id, docId, source, kind, title, url, date, text, part)
      VALUES (@id, @docId, @source, @kind, @title, @url, @date, @text, @part)`);
    db.transaction(() => {
      del.run();
      for (const c of chunks) ins.run({ ...c, url: c.url || "", date: c.date || "", part: c.part || 0 });
    })();
  },

  async chunkStats() {
    return db.prepare("SELECT source, COUNT(*) AS n FROM rag_chunks GROUP BY source ORDER BY n DESC").all();
  },

  async logQuery(entry) {
    db.prepare(`INSERT INTO rag_queries (question, answer, sources, grounded, latencyMs, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)`).run(entry.question, entry.answer, str(entry.sources || []),
      entry.grounded ? 1 : 0, entry.latencyMs || 0, new Date().toISOString());
  },

  async close() {},
};

export default driver;
