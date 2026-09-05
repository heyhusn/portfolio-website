import "./env.mjs";
import { repo, usingPostgres } from "./data/index.mjs";
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

    // Postgres starts empty — there is no file with a schema baked in, the
    // way the SQLite driver gets one from db.mjs on import.
    if (usingPostgres()) {
      const { applySchema } = await import("./data/postgres.mjs");
      await applySchema();
      console.log("Schema applied to Postgres.");
    }

    const db = await repo();

    // Seed Profile
    await db.saveProfile({
      ...profile,
      aboutEyebrow: profile.about?.eyebrow || "",
      aboutTitle: profile.about?.title || "",
      aboutLead: profile.about?.lead || "",
    });
    console.log("Profile seeded.");

    // Seed Projects
    await db.replaceProjects(projects);
    console.log("Projects seeded.");

    // Seed Posts — marked draft, matching the note at the top of posts.js.
    await db.replacePosts(posts.map((p) => ({ ...p, isDraft: true })));
    console.log("Posts seeded (as drafts — publish each from the admin dashboard once rewritten).");

    // Seed Site Content
    await db.saveSiteContent({
      services, tickerWords, recognition, faqs, experience,
      process: processSteps, serviceOptions,
      skillGroups, certifications, volunteering, github, recommendations,
    });
    // The old key is dead now that SkillsSection reads skillGroups.
    await db.deleteSiteContent("stack");
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

    for (const [i, section] of defaultSections.entries()) {
      await db.insertSectionIfMissing({ ...section, is_visible: !!section.is_visible }, section.ordering ?? i);
    }
    console.log("Sections seeded.");

    // Create a default admin user. The password is hashed with bcrypt before
    // it ever touches the database — server.mjs's login route compares with
    // bcrypt.compareSync, so a plaintext password here would never match.
    const defaultPassword = process.env.SEED_ADMIN_PASSWORD || "admin123";
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);
    await db.upsertUser("admin", passwordHash);
    console.log(
      `Default admin created: admin / ${defaultPassword}` +
        (process.env.SEED_ADMIN_PASSWORD ? "" : " — change this before deploying (set SEED_ADMIN_PASSWORD).")
    );

    console.log(
      `Seeding complete — wrote to ${usingPostgres() ? "Postgres (DATABASE_URL)" : "SQLite (backend/portfolio.db)"}.`
    );
    await db.close();
  } catch (err) {
    console.error("Error seeding:", err);
  }
}

seed();
