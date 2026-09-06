import "./env.mjs";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { repo, usingPostgres } from "./data/index.mjs";
import registerGitHubRoutes from "./github.mjs";
import registerRagRoutes from "./rag/routes.mjs";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// --- Secret key -------------------------------------------------------
// A hardcoded secret in source control means anyone who can read the repo can
// mint valid admin tokens, so it has to come from the environment.
//
// The dev fallback below is a per-boot random secret. That is right for one
// long-lived local process — a forgotten .env fails safe instead of shipping a
// known key — and completely wrong anywhere the process restarts: every
// restart mints a new secret, so every admin token issued before it silently
// stops verifying and the session drops with no explanation. On a host that
// redeploys, crashes or scales, that is constant.
//
// So: warn in development, refuse to start in production.
const LOOKS_LIKE_PRODUCTION =
  process.env.NODE_ENV === "production" || Boolean(process.env.DATABASE_URL);

// 32 characters ≈ 128 bits when hex. Shorter than this is brute-forceable
// offline against any token the holder has, and a token is a login.
const MIN_SECRET_LENGTH = 32;

const generateHint =
  'Generate one with:\n' +
  '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"';

let SECRET_KEY = process.env.JWT_SECRET;

if (!SECRET_KEY) {
  if (LOOKS_LIKE_PRODUCTION) {
    console.error(
      "\n[auth] JWT_SECRET is not set, and this looks like production " +
        `(${process.env.NODE_ENV === "production" ? "NODE_ENV=production" : "DATABASE_URL is set"}).\n\n` +
        "Refusing to start rather than invent a secret. A per-boot random secret\n" +
        "invalidates every admin session on every restart, which looks like a bug\n" +
        "in the login rather than a missing variable.\n\n" +
        generateHint +
        "\n"
    );
    process.exit(1);
  }
  SECRET_KEY = crypto.randomUUID() + crypto.randomUUID();
  console.warn(
    "[auth] JWT_SECRET is not set in backend/.env — using a random secret for " +
      "this process only. Restarting will sign you out of /admin. Fine for local " +
      "work; set a real one before deploying."
  );
} else if (SECRET_KEY.length < MIN_SECRET_LENGTH) {
  const message =
    `[auth] JWT_SECRET is only ${SECRET_KEY.length} characters. ` +
    `Use at least ${MIN_SECRET_LENGTH} — a short secret can be brute-forced offline ` +
    "from any token, and a token is a login.\n" + generateHint;
  if (LOOKS_LIKE_PRODUCTION) {
    console.error("\n" + message + "\n");
    process.exit(1);
  }
  console.warn(message);
}

// --- CORS ---------------------------------------------------------------
// cors() with no options reflects every Origin header, which is wide open.
// Restrict to the site's own origin(s), configurable for local dev vs prod.
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const isLocalDevOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin requests / curl / server-to-server calls send no Origin.
      if (!origin || allowedOrigins.includes(origin) || isLocalDevOrigin(origin)) {
        return callback(null, true);
      }
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
  limit: process.env.NODE_ENV === "production" ? 20 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." },
});

// --- Auth routes ------------------------------------------------------
app.post("/api/auth/login", loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!isNonEmptyString(username) || !isNonEmptyString(password)) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const db = await repo();
    const user = await db.findUser(username);
    const ok = user && bcrypt.compareSync(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ username: user.username }, SECRET_KEY, { expiresIn: "24h" });
    res.json({ token });
  } catch (err) { next(err); }
});

// --- Profile routes ------------------------------------------------------
app.get("/api/profile", async (req, res, next) => {
  try {
    res.json(await (await repo()).getProfile());
  } catch (err) { next(err); }
});

app.put("/api/profile", authenticateToken, async (req, res, next) => {
  try {
    const profile = req.body || {};
    if (!isNonEmptyString(profile.name) || !isNonEmptyString(profile.email)) {
      return res.status(400).json({ error: "Name and email are required" });
    }
    await (await repo()).saveProfile(profile);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// --- Projects routes -------------------------------------------------
app.get("/api/projects", async (req, res, next) => {
  try {
    res.json(await (await repo()).listProjects());
  } catch (err) { next(err); }
});

app.put("/api/projects", authenticateToken, async (req, res, next) => {
  const projects = req.body;
  if (!isArray(projects)) return res.status(400).json({ error: "Expected an array of projects" });
  for (const p of projects) {
    if (!isNonEmptyString(p.slug) || !isNonEmptyString(p.title)) {
      return res.status(400).json({ error: "Every project needs a slug and a title" });
    }
  }
  if (new Set(projects.map((p) => p.slug)).size !== projects.length) {
    return res.status(400).json({ error: "Project slugs must be unique" });
  }
  try {
    await (await repo()).replaceProjects(projects);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Could not save projects: " + err.message });
  }
});

// --- Posts routes ------------------------------------------------------
app.get("/api/posts", async (req, res, next) => {
  try {
    res.json(await (await repo()).listPosts());
  } catch (err) { next(err); }
});

app.put("/api/posts", authenticateToken, async (req, res, next) => {
  const posts = req.body;
  if (!isArray(posts)) return res.status(400).json({ error: "Expected an array of posts" });
  for (const p of posts) {
    if (!isNonEmptyString(p.slug) || !isNonEmptyString(p.title)) {
      return res.status(400).json({ error: "Every post needs a slug and a title" });
    }
  }
  if (new Set(posts.map((p) => p.slug)).size !== posts.length) {
    return res.status(400).json({ error: "Post slugs must be unique" });
  }
  try {
    await (await repo()).replacePosts(posts);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Could not save posts: " + err.message });
  }
});

// --- Site content routes ------------------------------------------------
app.get("/api/site", async (req, res, next) => {
  try {
    res.json(await (await repo()).getSiteContent());
  } catch (err) { next(err); }
});

app.put("/api/site", authenticateToken, async (req, res, next) => {
  const content = req.body;
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return res.status(400).json({ error: "Expected an object of site content keys" });
  }
  try {
    await (await repo()).saveSiteContent(content);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// --- Sections routes ------------------------------------------------------
app.get("/api/sections", async (req, res, next) => {
  try {
    res.json(await (await repo()).listSections());
  } catch (err) { next(err); }
});

app.put("/api/sections", authenticateToken, async (req, res, next) => {
  const sections = req.body;
  if (!isArray(sections)) return res.status(400).json({ error: "Expected an array of sections" });
  for (const s of sections) {
    if (!isNonEmptyString(s.id)) return res.status(400).json({ error: "Every section needs an id" });
  }
  try {
    await (await repo()).replaceSections(sections);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Could not save sections: " + err.message });
  }
});

// --- GitHub proxy (contribution calendar + public profile stats) ------
registerGitHubRoutes(app);

// --- RAG assistant (retrieval + grounded answers over his own material) --
registerRagRoutes(app, authenticateToken);

// --- Health check (useful once this is deployed somewhere real) --------
// Reports configuration readiness, never values. "Why is the admin panel
// failing on the deployed site" is almost always one of these three being
// unset, and this answers it without a redeploy or a log dive.
app.get("/api/health", (req, res) =>
  res.json({
    ok: true,
    dataStore: usingPostgres() ? "postgres" : "sqlite",
    jwtSecret: process.env.JWT_SECRET
      ? process.env.JWT_SECRET.length >= MIN_SECRET_LENGTH
        ? "configured"
        : "too-short"
      : "missing (random per-boot — sessions drop on restart)",
    llm: process.env.LLM_API_KEY ? "configured" : "missing",
  })
);

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
  console.log(
    `Admin API running on http://localhost:${PORT} — data store: ` +
      (usingPostgres() ? "Postgres (DATABASE_URL)" : "SQLite (backend/portfolio.db)")
  );
});
