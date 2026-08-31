import "./env.mjs";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import db from "./db.mjs";
import registerGitHubRoutes from "./github.mjs";
import registerRagRoutes from "./rag/routes.mjs";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// --- Secret key -------------------------------------------------------
// A hardcoded secret in source control means anyone who can read the repo
// can mint valid admin tokens. Require it from the environment; only fall
// back to a per-boot random secret (with a loud warning) so a forgotten
// .env fails safe in dev instead of shipping a known key to production.
let SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
  SECRET_KEY = crypto.randomUUID() + crypto.randomUUID();
  console.warn(
    "[auth] JWT_SECRET is not set in backend/.env — using a random secret " +
      "for this process only. Every restart will invalidate existing admin " +
      "sessions. Copy backend/.env.example to backend/.env and set a real " +
      "secret before deploying."
  );
}

// --- CORS ---------------------------------------------------------------
// cors() with no options reflects every Origin header, which is wide open.
// Restrict to the site's own origin(s), configurable for local dev vs prod.
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin requests / curl / server-to-server calls send no Origin.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json({ limit: "2mb" }));

// --- Auth middleware ------------------------------------------------------
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Missing token" });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
};

// Small helper so a bad payload returns 400 instead of a 500 from a thrown
// error or a corrupted row further down the line.
const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;
const isArray = (v) => Array.isArray(v);

// Login is the one endpoint an attacker can hit without a token, so it is
// the one that needs to be rate-limited against brute-forcing the password.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." },
});

// --- Auth routes ------------------------------------------------------
app.post("/api/auth/login", loginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  if (!isNonEmptyString(username) || !isNonEmptyString(password)) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  const ok = user && bcrypt.compareSync(password, user.password);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ username: user.username }, SECRET_KEY, { expiresIn: "24h" });
  res.json({ token });
});

// --- Profile routes ------------------------------------------------------
app.get("/api/profile", (req, res) => {
  const profile = db.prepare("SELECT * FROM profile WHERE id = 1").get();
  if (profile) {
    profile.heroWords = JSON.parse(profile.heroWords || "[]");
    profile.socials = JSON.parse(profile.socials || "{}");
    profile.stats = JSON.parse(profile.stats || "[]");
    profile.education = JSON.parse(profile.education || "{}");
  }
  res.json(profile || null);
});

app.put("/api/profile", authenticateToken, (req, res) => {
  const profile = req.body || {};
  if (!isNonEmptyString(profile.name) || !isNonEmptyString(profile.email)) {
    return res.status(400).json({ error: "Name and email are required" });
  }
  const stmt = db.prepare(`
    UPDATE profile SET
      name = ?, heroWords = ?, kicker = ?, availability = ?, role = ?, location = ?, tagline = ?, intro = ?,
      aboutEyebrow = ?, aboutTitle = ?, aboutLead = ?, email = ?, phone = ?, phoneHref = ?, socials = ?, stats = ?, education = ?
    WHERE id = 1
  `);
  stmt.run(
    profile.name, JSON.stringify(profile.heroWords || []), profile.kicker || "", profile.availability || "",
    profile.role || "", profile.location || "", profile.tagline || "", profile.intro || "",
    profile.aboutEyebrow || "", profile.aboutTitle || "", profile.aboutLead || "", profile.email,
    profile.phone || "", profile.phoneHref || "", JSON.stringify(profile.socials || {}),
    JSON.stringify(profile.stats || []), JSON.stringify(profile.education || {})
  );
  res.json({ success: true });
});

// --- Projects routes -------------------------------------------------
app.get("/api/projects", (req, res) => {
  const projects = db.prepare("SELECT * FROM projects ORDER BY ordering ASC").all();
  projects.forEach((p) => {
    p.featured = !!p.featured;
    p.highlights = JSON.parse(p.highlights || "[]");
    p.stack = JSON.parse(p.stack || "[]");
    p.links = JSON.parse(p.links || "[]");
  });
  res.json(projects);
});

app.put("/api/projects", authenticateToken, (req, res) => {
  const projects = req.body;
  if (!isArray(projects)) return res.status(400).json({ error: "Expected an array of projects" });
  for (const p of projects) {
    if (!isNonEmptyString(p.slug) || !isNonEmptyString(p.title)) {
      return res.status(400).json({ error: "Every project needs a slug and a title" });
    }
  }
  const slugs = new Set(projects.map((p) => p.slug));
  if (slugs.size !== projects.length) {
    return res.status(400).json({ error: "Project slugs must be unique" });
  }

  const deleteStmt = db.prepare("DELETE FROM projects");
  const insertStmt = db.prepare(`
    INSERT INTO projects (slug, title, tag, year, image, featured, summary, description, highlights, stack, links, note, ordering)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    db.transaction(() => {
      deleteStmt.run();
      projects.forEach((p, idx) => {
        insertStmt.run(
          p.slug, p.title, p.tag || "", p.year || "", p.image || "", p.featured ? 1 : 0,
          p.summary || "", p.description || "", JSON.stringify(p.highlights || []),
          JSON.stringify(p.stack || []), JSON.stringify(p.links || []), p.note || null, idx
        );
      });
    })();
  } catch (err) {
    return res.status(400).json({ error: "Could not save projects: " + err.message });
  }
  res.json({ success: true });
});

// --- Posts routes ------------------------------------------------------
// Field names mirror what the public blog pages (PostCard, BlogPost) read:
// date + dateLabel, excerpt, and body (an array of {type, text} blocks).
app.get("/api/posts", (req, res) => {
  const posts = db.prepare("SELECT * FROM posts").all();
  posts.forEach((p) => {
    p.isDraft = !!p.isDraft;
    try {
      p.body = JSON.parse(p.body || "[]");
    } catch {
      p.body = [];
    }
  });
  res.json(posts);
});

app.put("/api/posts", authenticateToken, (req, res) => {
  const posts = req.body;
  if (!isArray(posts)) return res.status(400).json({ error: "Expected an array of posts" });
  for (const p of posts) {
    if (!isNonEmptyString(p.slug) || !isNonEmptyString(p.title)) {
      return res.status(400).json({ error: "Every post needs a slug and a title" });
    }
  }
  const slugs = new Set(posts.map((p) => p.slug));
  if (slugs.size !== posts.length) {
    return res.status(400).json({ error: "Post slugs must be unique" });
  }

  const deleteStmt = db.prepare("DELETE FROM posts");
  const insertStmt = db.prepare(`
    INSERT INTO posts (slug, title, date, dateLabel, category, excerpt, body, image, isDraft)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    db.transaction(() => {
      deleteStmt.run();
      posts.forEach((p) => {
        insertStmt.run(
          p.slug, p.title, p.date || "", p.dateLabel || "", p.category || "", p.excerpt || "",
          JSON.stringify(p.body || []), p.image || "", p.isDraft ? 1 : 0
        );
      });
    })();
  } catch (err) {
    return res.status(400).json({ error: "Could not save posts: " + err.message });
  }
  res.json({ success: true });
});

// --- Site content routes ------------------------------------------------
app.get("/api/site", (req, res) => {
  const content = db.prepare("SELECT * FROM site_content").all();
  const result = {};
  content.forEach((item) => {
    try {
      result[item.key] = JSON.parse(item.value);
    } catch {
      result[item.key] = item.value;
    }
  });
  res.json(result);
});

app.put("/api/site", authenticateToken, (req, res) => {
  const content = req.body;
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return res.status(400).json({ error: "Expected an object of site content keys" });
  }
  const stmt = db.prepare("INSERT OR REPLACE INTO site_content (key, value) VALUES (?, ?)");
  db.transaction(() => {
    Object.keys(content).forEach((key) => {
      stmt.run(key, JSON.stringify(content[key]));
    });
  })();
  res.json({ success: true });
});

// --- Sections routes ------------------------------------------------------
app.get("/api/sections", (req, res) => {
  const sections = db.prepare("SELECT * FROM sections ORDER BY ordering ASC").all();
  sections.forEach((s) => {
    s.is_visible = !!s.is_visible;
    if (s.content) {
      try {
        s.content = JSON.parse(s.content);
      } catch {
        s.content = null;
      }
    }
  });
  res.json(sections);
});

app.put("/api/sections", authenticateToken, (req, res) => {
  const sections = req.body;
  if (!isArray(sections)) return res.status(400).json({ error: "Expected an array of sections" });
  for (const s of sections) {
    if (!isNonEmptyString(s.id)) return res.status(400).json({ error: "Every section needs an id" });
  }

  const deleteStmt = db.prepare("DELETE FROM sections");
  const insertStmt = db.prepare(
    "INSERT INTO sections (id, title, is_visible, ordering, animation_type, font_family, type, content) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );

  try {
    db.transaction(() => {
      deleteStmt.run();
      sections.forEach((s, idx) => {
        insertStmt.run(
          s.id, s.title || "", s.is_visible ? 1 : 0, idx,
          s.animation_type || "default", s.font_family || "default", s.type || "predefined",
          s.content ? JSON.stringify(s.content) : null
        );
      });
    })();
  } catch (err) {
    return res.status(400).json({ error: "Could not save sections: " + err.message });
  }
  res.json({ success: true });
});

// --- GitHub proxy (contribution calendar + public profile stats) ------
registerGitHubRoutes(app);

// --- RAG assistant (retrieval + grounded answers over his own material) --
registerRagRoutes(app, authenticateToken);

// --- Health check (useful once this is deployed somewhere real) --------
app.get("/api/health", (req, res) => res.json({ ok: true }));

// --- 404 + error handling ------------------------------------------------
// Without these, an unknown route or a thrown error (a bad JSON body, a
// DB constraint failure that slips past the checks above) either hangs the
// request or crashes the whole process instead of returning a clean 4xx/5xx.
app.use((req, res) => res.status(404).json({ error: "Not found" }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[server] unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log("Admin API running on http://localhost:" + PORT);
});
