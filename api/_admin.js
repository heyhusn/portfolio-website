/**
 * Shared plumbing for the admin API on Vercel.
 *
 * This is the half that did not exist before. The chatbot functions were
 * deployed; the admin routes lived only on the local Express server, so on the
 * deployed site every content route 404'd and the page fell back to whatever
 * was bundled at build time. Editing in production was impossible — and had
 * SQLite been deployed instead, the edits would have been written to a
 * container filesystem that Vercel discards, which is worse: it looks like it
 * worked until the instance recycles.
 *
 * With Postgres behind it, writes go to a database that outlives the function.
 */
import jwt from "jsonwebtoken";
import { repo } from "../backend/data/index.mjs";

export { repo };

const MIN_SECRET_LENGTH = 32;
const SECRET = () => process.env.JWT_SECRET || "";

/**
 * Why this refuses instead of falling back to a generated secret:
 *
 * The local Express server mints a random secret when none is set, which is
 * safe for one long-lived process. Here it would be actively harmful — every
 * serverless instance would generate its own, so whether an admin token
 * verified would depend on which instance answered the request. Sessions
 * would appear to drop at random, and the cause would look like a bug in the
 * login rather than a missing environment variable.
 *
 * A too-short secret is rejected for the same reason a missing one is: a
 * token is a login, and a short secret can be brute-forced offline from any
 * token the holder has.
 */
function secretProblem() {
  const secret = SECRET();
  if (!secret) return "JWT_SECRET is not configured on the server.";
  if (secret.length < MIN_SECRET_LENGTH) {
    return `JWT_SECRET is too short (needs at least ${MIN_SECRET_LENGTH} characters).`;
  }
  return null;
}

export { secretProblem, MIN_SECRET_LENGTH };

export function applyCors(req, res) {
  // Same-origin is the normal case in production: the site and /api share an
  // origin, so the browser sends no Origin header and CORS never applies. The
  // header below exists for the cross-origin setups — a `vercel dev` on :3000
  // serving a Vite dev server on :5173, or an API hosted separately.
  //
  // Not `*`: that hands every website on the internet the ability to call
  // these routes from a visitor's browser. Unnecessary, since production does
  // not need the header at all, and wrong for the admin routes.
  const origin = req.headers.origin;
  if (origin) {
    const host = req.headers.host || "";
    const sameOrigin = origin === `https://${host}` || origin === `http://${host}`;
    const allowed = (process.env.CORS_ORIGIN || "")
      .split(",").map((s) => s.trim()).filter(Boolean);

    if (sameOrigin || allowed.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      // The response varies by Origin, so a cache must not serve one origin's
      // response to another.
      res.setHeader("Vary", "Origin");
    } else {
      // No header: the browser blocks it, which is the intent. Logged so a
      // genuine misconfiguration is diagnosable from the function logs rather
      // than only from a browser console on someone else's machine.
      console.warn(
        `[cors] refused origin ${origin} (host ${host}). ` +
          `Add it to CORS_ORIGIN if this is expected.`
      );
    }
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,POST,OPTIONS");
  if (req.method === "OPTIONS") { res.status(204).end(); return true; }
  return false;
}

export function readBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => { try { resolve(JSON.parse(raw || "{}")); } catch { resolve({}); } });
  });
}

/**
 * Returns true when the caller is authenticated; otherwise responds and
 * returns false.
 *
 * A missing JWT_SECRET is treated as "reject everything", not "allow
 * everything". Falling back to a random per-boot secret is right for a local
 * dev server and completely wrong here: each serverless instance would mint
 * its own, so tokens would validate or not depending on which instance the
 * request landed on.
 */
export function requireAuth(req, res) {
  const problem = secretProblem();
  if (problem) {
    res.status(503).json({ error: problem });
    return false;
  }
  const token = (req.headers.authorization || "").split(" ")[1];
  if (!token) { res.status(401).json({ error: "Missing token" }); return false; }
  try {
    jwt.verify(token, SECRET());
    return true;
  } catch {
    res.status(403).json({ error: "Invalid or expired token" });
    return false;
  }
}

export function guardDatabase(res) {
  if (!process.env.DATABASE_URL) {
    res.status(503).json({
      error:
        "No database configured. Set DATABASE_URL to a Postgres connection string " +
        "(Supabase) in the project's environment variables.",
    });
    return false;
  }
  return true;
}

export const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

/** Wraps a handler so a thrown error becomes a 500 rather than a hung request. */
export function handler(fn) {
  return async (req, res) => {
    if (applyCors(req, res)) return;
    try {
      await fn(req, res);
    } catch (err) {
      console.error("[admin]", req.url, err);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
