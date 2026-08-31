/**
 * Re-pull the GitHub corpus:  node rag/refresh-github.mjs  (npm run refresh:github)
 *
 * Writes rag/sources/github.json — public repositories and their READMEs — so
 * the assistant's answers about his code stay current without a code change.
 * Run it, then `npm run ingest`.
 *
 * Forks are skipped: they are other people's work and say nothing about his.
 * Set GITHUB_TOKEN in .env to lift the 60 requests/hour anonymous limit.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import "../env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "sources", "github.json");
const USERNAME = process.argv[2] || process.env.GITHUB_USERNAME || "heyhusn";

const headers = {
  "User-Agent": "portfolio-rag-ingest",
  Accept: "application/vnd.github+json",
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

const stripNoise = (md) =>
  md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")   // badge images: bytes, no facts
    .replace(/<[^>\n]{1,200}>/g, "")        // raw HTML blocks
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 9000);

async function readme(repo) {
  for (const branch of [repo.default_branch, "main", "master"].filter(Boolean)) {
    for (const name of ["README.md", "readme.md", "README.MD"]) {
      const res = await fetch(
        `https://raw.githubusercontent.com/${USERNAME}/${repo.name}/${branch}/${name}`
      );
      if (res.ok) {
        const text = await res.text();
        if (text.trim() && !text.startsWith("404")) return stripNoise(text);
      }
    }
  }
  return "";
}

const res = await fetch(
  `https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=updated`,
  { headers }
);
if (!res.ok) {
  console.error(`GitHub returned ${res.status}. ${res.status === 403 ? "Rate-limited — set GITHUB_TOKEN in .env." : ""}`);
  process.exit(1);
}

const all = await res.json();
const repos = [];
for (const r of all) {
  if (r.fork) continue;
  process.stdout.write(`  ${r.name}… `);
  const md = await readme(r);
  console.log(md ? `${md.length} chars of README` : "no README");
  repos.push({
    name: r.name,
    url: r.html_url,
    description: r.description || "",
    language: r.language || "",
    topics: r.topics || [],
    stars: r.stargazers_count || 0,
    createdAt: r.created_at.slice(0, 10),
    updatedAt: r.updated_at.slice(0, 10),
    homepage: r.homepage || "",
    readme: md,
  });
}

repos.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(
  OUT,
  JSON.stringify({ username: USERNAME, fetchedAt: new Date().toISOString().slice(0, 10), repos }, null, 1)
);

console.log(`\nWrote ${repos.length} repositories to rag/sources/github.json.`);
console.log("Now run `npm run ingest` to fold them into the knowledge base.");
