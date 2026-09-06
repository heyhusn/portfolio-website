/**
 * Postgres / Supabase driver.
 *
 * Used in production. Everything here is async, which is why the repository
 * interface is async even on the synchronous SQLite side — one shape for both.
 *
 * Serverless notes, both of which matter on Vercel:
 *  - `prepare: false` is required when connecting through Supabase's
 *    transaction pooler (port 6543). PgBouncer in transaction mode does not
 *    keep a session between statements, so named prepared statements break.
 *  - `max: 1` because a serverless instance handles one request at a time.
 *    A pool per instance multiplied by instances is how you exhaust Postgres
 *    connections during a traffic spike.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let sql;

export function client() {
  if (sql) return sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  sql = postgres(url, {
    max: Number(process.env.PGPOOL_MAX) || 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    // Supabase requires TLS; a local test database does not have it.
    ssl: /supabase|amazonaws|render|neon/i.test(url) ? "require" : undefined,
    onnotice: () => {},
  });
  return sql;
}

export async function applySchema() {
  const ddl = fs.readFileSync(path.join(__dirname, "schema.pg.sql"), "utf-8");
  await client().unsafe(ddl);
}

/* JSONB comes back already parsed, so these are mostly identity — but a column
 * can still hold a JSON string if it was written by an older migration, and a
 * NULL has to become the right empty shape rather than null. */
const arr = (v) => (Array.isArray(v) ? v : v && typeof v === "string" ? safe(v, []) : []);
const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : v && typeof v === "string" ? safe(v, {}) : {});
const safe = (v, fallback) => { try { return JSON.parse(v); } catch { return fallback; } };

export const driver = {
  name: "postgres",

  async findUser(username) {
    const [row] = await client()`SELECT * FROM users WHERE username = ${username}`;
    return row || null;
  },

  async upsertUser(username, passwordHash) {
    await client()`
      INSERT INTO users (username, password) VALUES (${username}, ${passwordHash})
      ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password`;
  },

  async getProfile() {
    const [row] = await client()`SELECT * FROM profile WHERE id = 1`;
    if (!row) return null;
    return { ...row, heroWords: arr(row.heroWords), socials: arr(row.socials), stats: arr(row.stats), education: obj(row.education) };
  },

  async saveProfile(p) {
    await client()`
      INSERT INTO profile (id, name, "heroWords", kicker, availability, role, location, tagline, intro,
        "aboutEyebrow", "aboutTitle", "aboutLead", email, phone, "phoneHref", socials, stats, education)
      VALUES (1, ${p.name}, ${client().json(p.heroWords || [])}, ${p.kicker || ""}, ${p.availability || ""},
        ${p.role || ""}, ${p.location || ""}, ${p.tagline || ""}, ${p.intro || ""}, ${p.aboutEyebrow || ""},
        ${p.aboutTitle || ""}, ${p.aboutLead || ""}, ${p.email}, ${p.phone || ""}, ${p.phoneHref || ""},
        ${client().json(p.socials || [])}, ${client().json(p.stats || [])}, ${client().json(p.education || {})})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, "heroWords" = EXCLUDED."heroWords", kicker = EXCLUDED.kicker,
        availability = EXCLUDED.availability, role = EXCLUDED.role, location = EXCLUDED.location,
        tagline = EXCLUDED.tagline, intro = EXCLUDED.intro, "aboutEyebrow" = EXCLUDED."aboutEyebrow",
        "aboutTitle" = EXCLUDED."aboutTitle", "aboutLead" = EXCLUDED."aboutLead", email = EXCLUDED.email,
        phone = EXCLUDED.phone, "phoneHref" = EXCLUDED."phoneHref", socials = EXCLUDED.socials,
        stats = EXCLUDED.stats, education = EXCLUDED.education`;
  },

  async listProjects() {
    const rows = await client()`SELECT * FROM projects ORDER BY ordering ASC`;
    return rows.map((p) => ({ ...p, featured: !!p.featured, highlights: arr(p.highlights), stack: arr(p.stack), links: arr(p.links) }));
  },

  async replaceProjects(projects) {
    const db = client();
    await db.begin(async (tx) => {
      await tx`DELETE FROM projects`;
      for (const [i, p] of projects.entries()) {
        await tx`INSERT INTO projects (slug, title, tag, year, image, featured, summary, description, highlights, stack, links, note, ordering)
          VALUES (${p.slug}, ${p.title}, ${p.tag || ""}, ${p.year || ""}, ${p.image || ""}, ${!!p.featured},
            ${p.summary || ""}, ${p.description || ""}, ${db.json(p.highlights || [])}, ${db.json(p.stack || [])},
            ${db.json(p.links || [])}, ${p.note || null}, ${i})`;
      }
    });
  },

  async listPosts() {
    const rows = await client()`SELECT * FROM posts`;
    return rows.map((p) => ({ ...p, isDraft: !!p.isDraft, body: arr(p.body) }));
  },

  async replacePosts(posts) {
    const db = client();
    await db.begin(async (tx) => {
      await tx`DELETE FROM posts`;
      for (const p of posts) {
        await tx`INSERT INTO posts (slug, title, date, "dateLabel", category, excerpt, body, image, "isDraft")
          VALUES (${p.slug}, ${p.title}, ${p.date || ""}, ${p.dateLabel || ""}, ${p.category || ""},
            ${p.excerpt || ""}, ${db.json(p.body || [])}, ${p.image || ""}, ${!!p.isDraft})`;
      }
    });
  },

  async getSiteContent() {
    const rows = await client()`SELECT * FROM site_content`;
    const out = {};
    for (const r of rows) out[r.key] = typeof r.value === "string" ? safe(r.value, r.value) : r.value;
    return out;
  },

  async saveSiteContent(content) {
    const db = client();
    await db.begin(async (tx) => {
      for (const [key, value] of Object.entries(content)) {
        await tx`INSERT INTO site_content (key, value) VALUES (${key}, ${db.json(value)})
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
      }
    });
  },

  async deleteSiteContent(key) {
    await client()`DELETE FROM site_content WHERE key = ${key}`;
  },

  async listSections() {
    const rows = await client()`SELECT * FROM sections ORDER BY ordering ASC`;
    return rows.map((s) => ({ ...s, is_visible: !!s.is_visible, content: s.content ?? null }));
  },

  async replaceSections(sections) {
    const db = client();
    await db.begin(async (tx) => {
      await tx`DELETE FROM sections`;
      for (const [i, s] of sections.entries()) {
        await tx`INSERT INTO sections (id, title, is_visible, ordering, animation_type, font_family, type, content)
          VALUES (${s.id}, ${s.title || ""}, ${!!s.is_visible}, ${i}, ${s.animation_type || "default"},
            ${s.font_family || "default"}, ${s.type || "predefined"}, ${s.content ? db.json(s.content) : null})`;
      }
    });
  },

  async insertSectionIfMissing(section, ordering) {
    const db = client();
    const res = await db`INSERT INTO sections (id, title, is_visible, ordering, animation_type, font_family, type, content)
      VALUES (${section.id}, ${section.title}, ${!!section.is_visible}, ${ordering}, 'default', 'default', 'predefined', NULL)
      ON CONFLICT (id) DO NOTHING`;
    return res.count > 0;
  },

  async listChunks() {
    return await client()`SELECT * FROM rag_chunks ORDER BY id`;
  },

  async replaceChunks(chunks) {
    const db = client();
    await db.begin(async (tx) => {
      await tx`DELETE FROM rag_chunks`;
      // One multi-row insert per batch: 246 individual round trips to a hosted
      // database is seconds of latency, one batch is milliseconds.
      const size = 200;
      for (let i = 0; i < chunks.length; i += size) {
        const batch = chunks.slice(i, i + size).map((c) => ({
          id: c.id, docId: c.docId, source: c.source, kind: c.kind,
          title: c.title, url: c.url || "", date: c.date || "", text: c.text, part: c.part || 0,
        }));
        await tx`INSERT INTO rag_chunks ${tx(batch, "id", "docId", "source", "kind", "title", "url", "date", "text", "part")}`;
      }
    });
  },

  async chunkStats() {
    const rows = await client()`SELECT source, COUNT(*)::int AS n FROM rag_chunks GROUP BY source ORDER BY n DESC`;
    return rows.map((r) => ({ source: r.source, n: r.n }));
  },

  async logQuery(entry) {
    await client()`INSERT INTO rag_queries (question, answer, sources, grounded, "latencyMs")
      VALUES (${entry.question}, ${entry.answer}, ${client().json(entry.sources || [])},
        ${!!entry.grounded}, ${entry.latencyMs || 0})`;
  },

  async close() {
    if (sql) { await sql.end({ timeout: 5 }); sql = undefined; }
  },
};

export default driver;
