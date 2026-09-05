/**
 * Corpus builder — turns every source of truth about Husnain into documents
 * the chunker can index.
 *
 * Four sources, deliberately in this order of authority:
 *   1. site      — the live site content in SQLite (what the admin panel edits).
 *                  If he changes a fact on the site, the assistant should say
 *                  the new one, so this wins.
 *   2. resume    — the five role-specific resumes and the academic CV.
 *   3. linkedin  — the cleaned LinkedIn profile.
 *   4. github    — public repositories and their READMEs.
 *
 * Nothing here invents or infers. Every chunk is text he wrote or approved.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { repo } from "../data/index.mjs";
import { chunkDocument, recordChunk } from "./chunker.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCES = path.join(__dirname, "sources");

/* The whole site_content map is read once per build rather than key by key —
   against a hosted database that is one round trip instead of a dozen. */
let siteMap = {};
const readJSON = (key, fallback) => siteMap[key] ?? fallback;

const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();
const bullets = (arr) => (arr || []).map((x) => `- ${clean(x)}`).join("\n");

/* ------------------------------------------------------------------ */
/* 1. Live site content                                                */
/* ------------------------------------------------------------------ */
async function siteDocuments() {
  const db = await repo();
  siteMap = await db.getSiteContent();
  const docs = [];
  const profile = await db.getProfile();

  if (profile) {
    // The repository already returns these parsed, whichever driver is in use.
    const education = profile.education || {};
    const stats = profile.stats || [];

    docs.push({
      id: "site:profile",
      source: "site",
      kind: "profile",
      title: "Who Husnain is",
      url: "/about",
      text: [
        `# Identity`,
        `${profile.name} — ${profile.role}. Based in ${profile.location}.`,
        `Availability: ${profile.availability}.`,
        `Contact: ${profile.email}${profile.phone ? `, ${profile.phone}` : ""}.`,
        ``,
        `# Summary`,
        clean(profile.tagline),
        ``,
        clean(profile.intro),
        ``,
        `# Education`,
        `${education.degree || ""} — ${education.school || ""} (${education.years || ""}).`,
        education.cgpa ? `CGPA ${education.cgpa}.` : "",
        education.awards?.length ? `Awards:\n${bullets(education.awards)}` : "",
        ``,
        stats.length ? `# Figures\n${bullets(stats.map((s) => `${s.value}${s.suffix || ""} — ${s.label}`))}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }

  // Projects — one document each. A project is a unit; splitting one across
  // chunks is what makes a RAG answer attribute the wrong metric to the wrong
  // system, which is the single worst failure mode for this corpus.
  const projects = await db.listProjects();
  for (const p of projects) {
    const highlights = p.highlights || [];
    const stack = p.stack || [];
    const links = p.links || [];
    docs.push({
      id: `site:project:${p.slug}`,
      source: "site",
      kind: "project",
      title: `Project: ${p.title}`,
      url: `/projects/${p.slug}`,
      date: p.year || "",
      text: [
        `# ${p.title}`,
        p.tag ? `Category: ${p.tag}. Year: ${p.year || "n/a"}.` : "",
        clean(p.summary),
        clean(p.description),
        highlights.length ? `\nHighlights:\n${bullets(highlights)}` : "",
        stack.length ? `\nTech stack: ${stack.map(clean).join(", ")}.` : "",
        links.length ? `\nLinks: ${links.map((l) => `${clean(l.label)} (${clean(l.href)})`).join("; ")}.` : "",
        p.note ? `\nNote: ${clean(p.note)}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }

  const experience = readJSON("experience", []);
  if (experience.length) {
    docs.push({
      id: "site:experience",
      source: "site",
      kind: "experience",
      title: "Work history",
      url: "/about#journey",
      text:
        "# Work history\n" +
        experience.map((e) => `- ${clean(e.role)} — ${clean(e.org)} (${clean(e.years)}).`).join("\n"),
    });
  }

  const skillGroups = readJSON("skillGroups", []);
  if (skillGroups.length) {
    docs.push({
      id: "site:skills",
      source: "site",
      kind: "skills",
      title: "Technical skills",
      url: "/about#stack",
      text:
        "# Technical skills\n" +
        skillGroups
          .map((g) => {
            const names = (g.skills || [])
              .map((s) => (s.level ? `${clean(s.name)} (${clean(s.level)})` : clean(s.name)))
              .join(", ");
            return `${clean(g.title)}: ${names}.`;
          })
          .join("\n"),
    });
  }

  for (const cert of readJSON("certifications", [])) {
    docs.push({
      id: `site:cert:${cert.id}`,
      source: "site",
      kind: "certification",
      title: `Certification: ${cert.title}`,
      url: cert.href || "/about#certifications",
      date: cert.date || "",
      text: [
        `# ${clean(cert.title)}`,
        `Issued by ${clean(cert.issuer)}${cert.partner ? ` (${clean(cert.partner)})` : ""} in ${clean(cert.date)}.`,
        cert.credentialId ? `Credential ID ${clean(cert.credentialId)}.` : "",
        cert.topics?.length ? `Covered:\n${bullets(cert.topics)}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }

  const volunteering = readJSON("volunteering", []);
  if (volunteering.length) {
    docs.push({
      id: "site:volunteering",
      source: "site",
      kind: "volunteering",
      title: "Volunteering",
      url: "/about#volunteering",
      text:
        "# Volunteering\n" +
        volunteering
          .map((v) => `- ${clean(v.role)} at ${clean(v.org)} — ${clean(v.cause)} (${clean(v.years)}).`)
          .join("\n"),
    });
  }

  for (const rec of readJSON("recommendations", [])) {
    const body = Array.isArray(rec.body) ? rec.body.join("\n\n") : String(rec.body || "");
    docs.push({
      id: `site:recommendation:${rec.id}`,
      source: "site",
      kind: "recommendation",
      title: `Recommendation from ${rec.name}`,
      url: "/about#recommendations",
      date: rec.date || "",
      text: `# Recommendation from ${clean(rec.name)}\n${clean(rec.headline)}. ${clean(rec.relationship)}, ${clean(rec.date)}.\n\n${body}`,
    });
  }

  for (const faq of readJSON("faqs", [])) {
    docs.push({
      id: `site:faq:${faq.q.slice(0, 40).replace(/\W+/g, "-").toLowerCase()}`,
      source: "site",
      kind: "faq",
      title: `FAQ: ${clean(faq.q)}`,
      url: "/#faq",
      text: `# ${clean(faq.q)}\n${clean(faq.a)}`,
    });
  }

  const services = readJSON("services", []);
  if (services.length) {
    docs.push({
      id: "site:services",
      source: "site",
      kind: "services",
      title: "What Husnain can help with",
      url: "/#services",
      text:
        "# What Husnain can help with\n" +
        services.map((s) => `${clean(s.title)}:\n${bullets(s.items)}`).join("\n\n"),
    });
  }

  const recognition = readJSON("recognition", []);
  if (recognition.length) {
    docs.push({
      id: "site:recognition",
      source: "site",
      kind: "recognition",
      title: "Awards and recognition",
      url: "/#recognition",
      text:
        "# Awards and recognition\n" +
        recognition.map((r) => `- ${clean(r.text)}${r.source ? ` (${clean(r.source)})` : ""}`).join("\n"),
    });
  }

  // Blog posts, published only — a draft is by definition something he has not
  // chosen to say in public yet, and the assistant is public.
  const posts = (await db.listPosts()).filter((p) => !p.isDraft);
  for (const post of posts) {
    const text = (post.body || []).map((b) => clean(b.text || b)).filter(Boolean).join("\n\n");
    if (!text) continue;
    docs.push({
      id: `site:post:${post.slug}`,
      source: "site",
      kind: "post",
      title: `Article: ${post.title}`,
      url: `/blogs/${post.slug}`,
      date: post.dateLabel || post.date || "",
      text: `# ${clean(post.title)}\n${clean(post.excerpt)}\n\n${text}`,
    });
  }

  return docs;
}

/* ------------------------------------------------------------------ */
/* 2. Resumes + 3. LinkedIn                                            */
/* ------------------------------------------------------------------ */
function fileDocuments() {
  const docs = [];
  const resumeDir = path.join(SOURCES, "resumes");

  if (fs.existsSync(resumeDir)) {
    for (const file of fs.readdirSync(resumeDir).filter((f) => f.endsWith(".txt"))) {
      const text = fs.readFileSync(path.join(resumeDir, file), "utf-8");
      const title = (/^#\s+(.*)$/m.exec(text)?.[1] || file.replace(/\.txt$/, "")).trim();
      docs.push({
        id: `resume:${file.replace(/\.txt$/, "")}`,
        source: "resume",
        kind: "resume",
        title,
        url: "/resume",
        text,
      });
    }
  }

  const linkedin = path.join(SOURCES, "linkedin.md");
  if (fs.existsSync(linkedin)) {
    docs.push({
      id: "linkedin:profile",
      source: "linkedin",
      kind: "linkedin",
      title: "LinkedIn profile",
      url: "https://www.linkedin.com/in/husnain-aslam-0a959a1a7",
      text: fs.readFileSync(linkedin, "utf-8"),
    });
  }

  return docs;
}

/* ------------------------------------------------------------------ */
/* 4. GitHub                                                           */
/* ------------------------------------------------------------------ */
function githubDocuments() {
  const file = path.join(SOURCES, "github.json");
  if (!fs.existsSync(file)) return [];
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return [];
  }

  const docs = [];
  const repos = data.repos || [];

  // One index document, so "what has he built?" and "how many repos?" have
  // something to hit that isn't 23 separate chunks competing with each other.
  docs.push({
    id: "github:index",
    source: "github",
    kind: "github-index",
    title: `GitHub repositories (@${data.username})`,
    url: `https://github.com/${data.username}`,
    text:
      `# Public GitHub repositories\n` +
      `Husnain's GitHub username is ${data.username} (github.com/${data.username}). ` +
      `He has ${repos.length} public non-forked repositories. Listed newest first:\n` +
      repos
        .map(
          (r) =>
            `- ${r.name}${r.language ? ` (${r.language})` : ""}: ${clean(r.description) || "no description"} — last updated ${r.updatedAt}.`
        )
        .join("\n"),
  });

  for (const repo of repos) {
    // GitHub shows the repo named after the account as the profile README.
    // Titling it "GitHub repository: heyhusn" makes every citation from it
    // read like a stray repo, when it is actually his profile page.
    const isProfileReadme = repo.name.toLowerCase() === String(data.username).toLowerCase();
    const body = [
      `# ${repo.name}`,
      repo.description ? clean(repo.description) : "",
      `Primary language: ${repo.language || "not set"}. Last updated ${repo.updatedAt}. Created ${repo.createdAt}.`,
      repo.topics?.length ? `Topics: ${repo.topics.join(", ")}.` : "",
      repo.homepage ? `Live at ${repo.homepage}.` : "",
      repo.readme ? `\n${repo.readme}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    // A bare repo with no description and no README says nothing a human
    // would want retrieved; the index entry above already covers its name.
    if (!repo.description && !repo.readme) continue;

    docs.push({
      id: `github:${repo.name}`,
      source: "github",
      kind: isProfileReadme ? "github-profile" : "repository",
      title: isProfileReadme
        ? `GitHub profile README (@${data.username})`
        : `GitHub repository: ${repo.name}`,
      url: isProfileReadme ? `https://github.com/${data.username}` : repo.url,
      date: repo.updatedAt,
      text: body,
    });
  }

  return docs;
}

/* ------------------------------------------------------------------ */
export async function buildCorpus() {
  const docs = [...(await siteDocuments()), ...fileDocuments(), ...githubDocuments()];
  const chunks = [];
  for (const doc of docs) {
    // Structured site records are small and self-contained — keep them whole.
    if (doc.source === "site" && (doc.text || "").length <= 1400) {
      chunks.push(recordChunk(doc));
    } else {
      chunks.push(...chunkDocument(doc));
    }
  }
  return { docs, chunks };
}

export default buildCorpus;
