import { handler, repo, requireAuth, readBody, guardDatabase, isNonEmptyString } from "./_admin.js";

export default handler(async (req, res) => {
  if (!guardDatabase(res)) return;
  const db = await repo();

  if (req.method === "GET") return res.status(200).json(await db.listPosts());

  if (req.method === "PUT") {
    if (!requireAuth(req, res)) return;
    const posts = await readBody(req);
    if (!Array.isArray(posts)) return res.status(400).json({ error: "Expected an array of posts" });
    for (const p of posts) {
      if (!isNonEmptyString(p.slug) || !isNonEmptyString(p.title)) {
        return res.status(400).json({ error: "Every post needs a slug and a title" });
      }
    }
    if (new Set(posts.map((p) => p.slug)).size !== posts.length) {
      return res.status(400).json({ error: "Post slugs must be unique" });
    }
    await db.replacePosts(posts);
    return res.status(200).json({ success: true });
  }
  res.status(405).json({ error: "Method not allowed" });
});
