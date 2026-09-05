import { handler, repo, requireAuth, readBody, guardDatabase, isNonEmptyString } from "./_admin.js";

export default handler(async (req, res) => {
  if (!guardDatabase(res)) return;
  const db = await repo();

  if (req.method === "GET") return res.status(200).json(await db.getProfile());

  if (req.method === "PUT") {
    if (!requireAuth(req, res)) return;
    const profile = await readBody(req);
    if (!isNonEmptyString(profile.name) || !isNonEmptyString(profile.email)) {
      return res.status(400).json({ error: "Name and email are required" });
    }
    await db.saveProfile(profile);
    return res.status(200).json({ success: true });
  }
  res.status(405).json({ error: "Method not allowed" });
});
