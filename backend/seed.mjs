import "./env.mjs";
import db from "./db.mjs";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Since src/data uses export const..., we can try to dynamically import them
// but to avoid module resolution issues, let's just parse or we can rename them to .mjs temporarily.
// Or we can use dynamic import if Node allows it.

async function seed() {
  try {
    // We will dynamically import the files. Node allows importing .js if there's no package.json 
    // blocking it, or we can use a URL trick.
    const profilePath = "file://" + path.resolve(__dirname, "../src/data/profile.js");
    const projectsPath = "file://" + path.resolve(__dirname, "../src/data/projects.js");
    const postsPath = "file://" + path.resolve(__dirname, "../src/data/posts.js");
    const sitePath = "file://" + path.resolve(__dirname, "../src/data/site.js");
    const skillsPath = "file://" + path.resolve(__dirname, "../src/data/skills.js");

    const profileModule = await import(profilePath);
    const projectsModule = await import(projectsPath);
    const postsModule = await import(postsPath);
    const siteModule = await import(sitePath);
    const skillsModule = await import(skillsPath);

    const profile = profileModule.profile;
    const projects = projectsModule.projects;
    const posts = postsModule.posts;
    
    // site.js exports multiple things
    const services = siteModule.services;
    const tickerWords = siteModule.tickerWords;
    const recognition = siteModule.recognition;
    const faqs = siteModule.faqs;
    const experience = siteModule.experience;
    const processSteps = siteModule.process;
    const serviceOptions = siteModule.serviceOptions;

    // Resume-derived content: the icon-backed skill groups that replaced the
    // old two-letter `stack` tiles, plus certifications, volunteering and the
    // GitHub panel config. All four are plain site_content keys, so the
    // existing PUT /api/site route already saves edits to them.
    const skillGroups = skillsModule.skillGroups;
    const certifications = skillsModule.certifications;
    const volunteering = skillsModule.volunteering;
    const github = skillsModule.github;
    const recommendations = skillsModule.recommendations;

    // Seed Profile
    const stmtProfile = db.prepare(`
      INSERT OR REPLACE INTO profile (
        id, name, heroWords, kicker, availability, role, location, tagline, intro,
        aboutEyebrow, aboutTitle, aboutLead, email, phone, phoneHref, socials, stats, education
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmtProfile.run(
      1,
      profile.name,
      JSON.stringify(profile.heroWords),
      profile.kicker,
      profile.availability,
      profile.role,
      profile.location,
      profile.tagline,
      profile.intro,
      profile.about.eyebrow,
      profile.about.title,
      profile.about.lead,
      profile.email,
      profile.phone,
      profile.phoneHref,
      JSON.stringify(profile.socials),
      JSON.stringify(profile.stats),
      JSON.stringify(profile.education)
    );
    console.log("Profile seeded.");

    // Seed Projects
    const stmtProject = db.prepare(`
      INSERT OR IGNORE INTO projects (
        slug, title, tag, year, image, featured, summary, description, highlights, stack, links, note, ordering
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    projects.forEach((p, idx) => {
      stmtProject.run(
        p.slug,
        p.title,
        p.tag,
        p.year,
        p.image,
        p.featured ? 1 : 0,
        p.summary,
        p.description,
        JSON.stringify(p.highlights || []),
        JSON.stringify(p.stack || []),
        JSON.stringify(p.links || []),
        p.note || null,
        idx
      );
    });
    console.log("Projects seeded.");

    // Seed Posts
    // Field names mirror what PostCard/BlogPost actually read (date +
    // dateLabel, excerpt, body[] blocks) — the previous version of this
    // script bound p.date/p.summary/p.content, none of which exist on the
    // real post objects (they're dateLabel/excerpt/body), so every seeded
    // post ended up with a missing date, blank excerpt, and no body at all
    // (BlogPost.jsx crashes on post.body.map when body is undefined).
    // The six scaffold posts are explicitly marked draft here, matching the
    // "these are drafts, not published work" note at the top of posts.js —
    // flip isDraft off for a post once you've rewritten it, from the admin
    // dashboard's Posts tab.
    const stmtPost = db.prepare(`
      INSERT OR IGNORE INTO posts (
        slug, title, date, dateLabel, category, excerpt, body, image, isDraft
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    posts.forEach((p) => {
      stmtPost.run(
        p.slug,
        p.title,
        p.date,
        p.dateLabel,
        p.category,
        p.excerpt,
        JSON.stringify(p.body || []),
        p.image,
        1
      );
    });
    console.log("Posts seeded (as drafts — publish each from the admin dashboard once rewritten).");

    // Seed Site Content
    const stmtSite = db.prepare("INSERT OR REPLACE INTO site_content (key, value) VALUES (?, ?)");
    stmtSite.run("services", JSON.stringify(services));
    stmtSite.run("tickerWords", JSON.stringify(tickerWords));
    stmtSite.run("recognition", JSON.stringify(recognition));
    stmtSite.run("faqs", JSON.stringify(faqs));
    stmtSite.run("experience", JSON.stringify(experience));
    stmtSite.run("process", JSON.stringify(processSteps));
    stmtSite.run("serviceOptions", JSON.stringify(serviceOptions));
    stmtSite.run("skillGroups", JSON.stringify(skillGroups));
    stmtSite.run("certifications", JSON.stringify(certifications));
    stmtSite.run("volunteering", JSON.stringify(volunteering));
    stmtSite.run("github", JSON.stringify(github));
    stmtSite.run("recommendations", JSON.stringify(recommendations));
    // The old key is dead now that SkillsSection reads skillGroups; drop it
    // so the admin panel's Site Text tab stops offering a field nothing renders.
    db.prepare("DELETE FROM site_content WHERE key = 'stack'").run();
    console.log("Site content seeded.");

    // Seed Sections
    const defaultSections = [
      { id: "hero", title: "Hero Section", is_visible: 1, ordering: 0 },
      { id: "ticker", title: "Word Ticker", is_visible: 1, ordering: 1 },
      { id: "services", title: "Services", is_visible: 1, ordering: 2 },
      // Not between hero and services: FlowingPortrait animates the portrait
      // across that gap and would glide it over the assistant panel.
      { id: "assistant", title: "Ask About My Work", is_visible: 1, ordering: 3 },
      { id: "about", title: "About", is_visible: 1, ordering: 4 },
      { id: "work", title: "Featured Projects", is_visible: 1, ordering: 5 },
      { id: "recognition", title: "Recognition", is_visible: 1, ordering: 6 },
      { id: "faq", title: "FAQ", is_visible: 1, ordering: 7 },
      // Resume-derived blocks always render on /about and /resume; these rows
      // only control whether they ALSO appear on the home page. Off by default
      // for the three that would duplicate About, on for the GitHub calendar.
      { id: "github", title: "GitHub Contributions", is_visible: 1, ordering: 8 },
      { id: "skills", title: "Technical Skills", is_visible: 0, ordering: 9 },
      { id: "certifications", title: "Certifications", is_visible: 0, ordering: 10 },
      { id: "volunteering", title: "Volunteering", is_visible: 0, ordering: 11 },
      { id: "recommendations", title: "Recommendations", is_visible: 1, ordering: 12 },
      { id: "notes", title: "Notes & Insights", is_visible: 1, ordering: 13 },
      { id: "contact", title: "Contact", is_visible: 1, ordering: 14 }
    ];

    const stmtSection = db.prepare("INSERT OR IGNORE INTO sections (id, title, is_visible, ordering, animation_type, font_family, type, content) VALUES (?, ?, ?, ?, 'default', 'default', 'predefined', NULL)");
    defaultSections.forEach(s => {
      stmtSection.run(s.id, s.title, s.is_visible, s.ordering);
    });
    console.log("Sections seeded.");

    // Create a default admin user. The password is hashed with bcrypt before
    // it ever touches the database — server.mjs's login route compares with
    // bcrypt.compareSync, so a plaintext password here would never match.
    const defaultPassword = process.env.SEED_ADMIN_PASSWORD || "admin123";
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);
    const stmtUser = db.prepare("INSERT OR REPLACE INTO users (username, password) VALUES (?, ?)");
    stmtUser.run("admin", passwordHash);
    console.log(
      `Default admin created: admin / ${defaultPassword}` +
        (process.env.SEED_ADMIN_PASSWORD ? "" : " — change this before deploying (set SEED_ADMIN_PASSWORD).")
    );

    console.log("Seeding complete.");
  } catch (err) {
    console.error("Error seeding:", err);
  }
}

seed();
