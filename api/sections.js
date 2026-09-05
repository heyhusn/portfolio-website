import { handler, repo, requireAuth, readBody, guardDatabase, isNonEmptyString } from "./_admin.js";

export default handler(async (req, res) => {
  if (!guardDatabase(res)) return;
  const db = await repo();

  if (req.method === "GET") return res.status(200).json(await db.listSections());

  if (req.method === "PUT") {
    if (!requireAuth(req, res)) return;
    const sections = await readBody(req);
    if (!Array.isArray(sections)) return res.status(400).json({ error: "Expected an array of sections" });
    for (const s of sections) {
      if (!isNonEmptyString(s.id)) return res.status(400).json({ error: "Every section needs an id" });
    }
    await db.replaceSections(sections);
    return res.status(200).json({ success: true });
  }
  res.status(405).json({ error: "Method not allowed" });
});
