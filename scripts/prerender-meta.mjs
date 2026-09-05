/**
 * Per-route metadata prerendering.  Runs after `vite build`.
 *
 * WHY THIS EXISTS, AND WHY REACT-HELMET WOULD NOT DO
 * ---------------------------------------------------
 * Social crawlers — X, LinkedIn, Facebook, Slack, WhatsApp, Discord — do not
 * execute JavaScript. They request the URL, parse the <head> of the document
 * they get back, and leave. A client-side library that rewrites <title> and
 * <meta> after React mounts changes nothing they will ever see: every link
 * preview would still show whatever was hardcoded in index.html.
 *
 * (Helmet is still worth having for the browser tab and for Google, which does
 * render JS. That part is handled at runtime by src/lib/meta.js — a dozen
 * lines, no dependency. It is not a substitute for this file.)
 *
 * So: write real HTML. One file per route, each with its own <head>, all
 * sharing the same SPA bundle. Vercel checks the filesystem before applying
 * the SPA rewrite, so /projects/vlvrag serves projects/vlvrag.html to everyone
 * — crawler or human — and React takes over for the human.
 *
 * Content comes from the database when DATABASE_URL is set, and from the
 * bundled src/data files otherwise, so a build always produces something
 * correct even with no database configured.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import "../backend/env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

/* An absolute origin is not optional. og:image and og:url must be absolute
 * URLs — every major crawler ignores a relative one, which is why the preview
 * image never appeared. Vercel injects VERCEL_PROJECT_PRODUCTION_URL on the
 * production deployment; SITE_URL overrides it for a custom domain. */
const SITE_URL = (
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://portfolio-website-heyhusn.vercel.app")
).replace(/\/+$/, "");

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Trim to a length social cards actually display, without cutting mid-word. */
const clamp = (text, max = 200) => {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, t.lastIndexOf(" ", max - 1)).replace(/[,;:.\s]+$/, "") + "…";
};

const abs = (u) => {
  if (!u) return `${SITE_URL}/assets/img/avatar-poster.webp`;
  return /^https?:\/\//i.test(u) ? u : `${SITE_URL}${u.startsWith("/") ? "" : "/"}${u}`;
};

/* ------------------------------------------------------------------ */
/* Content                                                            */
/* ------------------------------------------------------------------ */
async function loadContent() {
  if (process.env.DATABASE_URL) {
    try {
      const { repo } = await import("../backend/data/index.mjs");
      const db = await repo();
      const profile = await db.getProfile();
      const projects = await db.listProjects();
      const posts = await db.listPosts();
      const site = await db.getSiteContent();
      if (profile) {
        console.log("[meta] content source: database");
        return { profile, projects, posts: posts.filter((p) => !p.isDraft), site };
      }
    } catch (err) {
      console.warn(`[meta] database unavailable (${err.message}) — using bundled content.`);
    }
  }

  const { profile } = await import("../src/data/profile.js");
  const { projects } = await import("../src/data/projects.js");
  const { posts } = await import("../src/data/posts.js");
  console.log("[meta] content source: bundled src/data");
  return {
    profile: { ...profile, aboutLead: profile.about?.lead },
    projects,
    // The bundled posts are scaffolding and ship as drafts, so they get no
    // page of their own here — a preview card for a placeholder is worse than
    // no card.
    posts: [],
    site: {},
  };
}

/* ------------------------------------------------------------------ */
/* Routes                                                             */
/* ------------------------------------------------------------------ */
function buildRoutes({ profile, projects, posts }) {
  const name = profile?.name || "Husnain Aslam";
  const role = profile?.role || "Software & AI Engineer";
  const baseImage = "/assets/img/avatar-poster.webp";

  const routes = [
    {
      file: "index.html",
      url: "/",
      title: `${name} — ${role}`,
      description: clamp(profile?.tagline || profile?.intro),
      type: "website",
    },
    {
      file: "about.html",
      url: "/about",
      title: `About — ${name}`,
      description: clamp(profile?.intro || profile?.aboutLead),
      type: "profile",
    },
    {
      file: "projects.html",
      url: "/projects",
      title: `Projects — ${name}`,
      description: clamp(
        `Selected engineering work by ${name}: ${projects.slice(0, 3).map((p) => p.title).join(", ")}.`
      ),
      type: "website",
    },
    {
      file: "blogs.html",
      url: "/blogs",
      title: `Notes & Insights — ${name}`,
      description: clamp(`Writing on retrieval systems, applied ML and backend engineering by ${name}.`),
      type: "website",
    },
    {
      file: "resume.html",
      url: "/resume",
      title: `Resume — ${name}`,
      description: clamp(`${role} in ${profile?.location || "Lahore"}. Experience, skills, certifications and references.`),
      type: "profile",
    },
  ];

  for (const p of projects) {
    routes.push({
      file: path.join("projects", `${p.slug}.html`),
      url: `/projects/${p.slug}`,
      title: `${p.title} — ${name}`,
      description: clamp(p.summary || p.description),
      image: p.image || baseImage,
      type: "article",
    });
  }

  for (const post of posts) {
    routes.push({
      file: path.join("blogs", `${post.slug}.html`),
      url: `/blogs/${post.slug}`,
      title: `${post.title} — ${name}`,
      description: clamp(post.excerpt),
      image: post.image || baseImage,
      type: "article",
      published: post.date || null,
    });
  }

  return routes;
}

function metaBlock(route, profile) {
  const image = abs(route.image);
  const url = `${SITE_URL}${route.url === "/" ? "" : route.url}`;
  const lines = [
    `<title>${esc(route.title)}</title>`,
    `<meta name="description" content="${esc(route.description)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:type" content="${esc(route.type)}">`,
    `<meta property="og:site_name" content="${esc(profile?.name || "Husnain Aslam")}">`,
    `<meta property="og:title" content="${esc(route.title)}">`,
    `<meta property="og:description" content="${esc(route.description)}">`,
    `<meta property="og:image" content="${esc(image)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    // Without twitter:card, X renders no card at all rather than a plain one.
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(route.title)}">`,
    `<meta name="twitter:description" content="${esc(route.description)}">`,
    `<meta name="twitter:image" content="${esc(image)}">`,
  ];
  if (route.published) lines.push(`<meta property="article:published_time" content="${esc(route.published)}">`);
  return lines.join("\n");
}

/** One Person record on the home page, so search engines have something
 *  structured to attach to the name rather than inferring it from prose. */
function personJsonLd(profile) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile?.name || "Husnain Aslam",
    jobTitle: profile?.role || "Software & AI Engineer",
    email: profile?.email ? `mailto:${profile.email}` : undefined,
    url: SITE_URL,
    image: abs("/assets/img/avatar-poster.webp"),
    address: profile?.location ? { "@type": "PostalAddress", addressLocality: profile.location } : undefined,
    sameAs: (profile?.socials || []).map((s) => s.href).filter((h) => /^https?:\/\//.test(h)),
  };
  return `<script type="application/ld+json">${JSON.stringify(data, (k, v) => (v === undefined ? undefined : v))}</script>`;
}

/* ------------------------------------------------------------------ */
const template = fs.readFileSync(path.join(dist, "index.html"), "utf-8");
const START = "<!--meta:start-->";
const END = "<!--meta:end-->";

if (!template.includes(START) || !template.includes(END)) {
  console.error(
    "[meta] index.html has no <!--meta:start--> / <!--meta:end--> markers.\n" +
      "       Nothing was prerendered; link previews would be wrong on every route."
  );
  process.exit(1);
}

const content = await loadContent();
const routes = buildRoutes(content);

const head = template.slice(0, template.indexOf(START));
const tail = template.slice(template.indexOf(END) + END.length);

let written = 0;
for (const route of routes) {
  let block = metaBlock(route, content.profile);
  if (route.url === "/") block += "\n" + personJsonLd(content.profile);

  const html = head + START + "\n" + block + "\n" + END + tail;
  const target = path.join(dist, route.file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
  written++;
}

// sitemap.xml and robots.txt — cheap, and the sitemap is the only way a
// crawler discovers routes that exist solely as client-side navigation.
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  routes.map((r) => `  <url><loc>${SITE_URL}${r.url === "/" ? "/" : r.url}</loc></url>`).join("\n") +
  `\n</urlset>\n`;
fs.writeFileSync(path.join(dist, "sitemap.xml"), sitemap);
fs.writeFileSync(
  path.join(dist, "robots.txt"),
  `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /login\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
);

console.log(`[meta] prerendered ${written} routes at ${SITE_URL}`);
console.log(`[meta] + sitemap.xml, robots.txt`);
process.exit(0);

