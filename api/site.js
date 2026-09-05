import { handler, repo, requireAuth, readBody, guardDatabase } from "./_admin.js";

export default handler(async (req, res) => {
  if (!guardDatabase(res)) return;
  const db = await repo();

  if (req.method === "GET") return res.status(200).json(await db.getSiteContent());

  if (req.method === "PUT") {
    if (!requireAuth(req, res)) return;
    const content = await readBody(req);
    if (!content || typeof content !== "object" || Array.isArray(content)) {
      return res.status(400).json({ error: "Expected an object of site content keys" });
    }
    await db.saveSiteContent(content);
    return res.status(200).json({ success: true });
  }
  res.status(405).json({ error: "Method not allowed" });
});
