import { handler, repo, requireAuth, readBody, guardDatabase, isNonEmptyString } from "./_admin.js";

export default handler(async (req, res) => {
  if (!guardDatabase(res)) return;
  const db = await repo();

  if (req.method === "GET") return res.status(200).json(await db.listProjects());

  if (req.method === "PUT") {
    if (!requireAuth(req, res)) return;
    const projects = await readBody(req);
    if (!Array.isArray(projects)) return res.status(400).json({ error: "Expected an array of projects" });
    for (const p of projects) {
      if (!isNonEmptyString(p.slug) || !isNonEmptyString(p.title)) {
        return res.status(400).json({ error: "Every project needs a slug and a title" });
      }
    }
    if (new Set(projects.map((p) => p.slug)).size !== projects.length) {
      return res.status(400).json({ error: "Project slugs must be unique" });
    }
    await db.replaceProjects(projects);
    return res.status(200).json({ success: true });
  }
  res.status(405).json({ error: "Method not allowed" });
});
