import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { handler, repo, readBody, guardDatabase, isNonEmptyString, secretProblem } from "../_admin.js";

/**
 * Rate limiting is per warm instance only — serverless instances share no
 * memory, so this slows a single caller down rather than enforcing a global
 * ceiling. It is a speed bump, not a lock; the real protection is that the
 * password is bcrypt-hashed and the secret lives in the environment.
 */
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const LIMIT = 20;

export default handler(async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!guardDatabase(res)) return;

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const now = Date.now();
  const seen = (attempts.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  seen.push(now);
  attempts.set(ip, seen);
  if (seen.length > LIMIT) {
    return res.status(429).json({ error: "Too many login attempts. Try again later." });
  }

  // Refuse to issue a token we could not verify later, or one signed weakly.
  const problem = secretProblem();
  if (problem) return res.status(503).json({ error: problem });

  const { username, password } = await readBody(req);
  if (!isNonEmptyString(username) || !isNonEmptyString(password)) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const user = await (await repo()).findUser(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, { expiresIn: "24h" });
  res.status(200).json({ token });
});
