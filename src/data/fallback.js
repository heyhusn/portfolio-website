/**
 * Bundled, always-available content in the exact shape the admin API
 * returns. This is what the store renders with on first paint (see
 * store.js) and what the site keeps showing if the admin API is
 * unreachable, times out, or hasn't been seeded yet.
 *
 * Two things this fixes:
 *  - The public site used to render nothing (or an infinite spinner) until
 *    a network round trip to the admin API resolved, and broke completely
 *    in production because that API defaulted to http://localhost:3001.
 *    Starting from this content means every page is correct and complete
 *    the instant React mounts, no network required.
 *  - The static data files stayed in a slightly different shape than the
 *    API (profile.about.{eyebrow,title,lead} vs. the flat
 *    aboutEyebrow/aboutTitle/aboutLead every page component reads, and
 *    socials as {kind,label,href}[] vs. the admin form's old {linkedin,
 *    github} object). Normalizing here means the rest of the app only
 *    ever deals with one shape, live or bundled.
 */
import { profile as staticProfile } from "./profile.js";
import { projects as staticProjects } from "./projects.js";
import { posts as staticPosts } from "./posts.js";
import {
  services,
  tickerWords,
  recognition,
  faqs,
  experience,
  process as processSteps,
  serviceOptions,
} from "./site.js";
import {
  skillGroups,
  certifications,
  volunteering,
  github,
  recommendations,
} from "./skills.js";
import { snapshot } from "./snapshot.generated.js";

/**
 * Live content captured at build time, when there was a database to capture
 * it from (see snapshot.generated.js).
 *
 * This is what closes the "flash of inaccurate content" gap. First paint has
 * always been instant — that was the point of bundling content — but it was
 * instant with whatever was hand-written in src/data/, and fetchData() then
 * replaced it with the database's version. Where the two differed, the page
 * visibly re-laid out: a different job title, one more project card, an
 * edited service list. With a snapshot, first paint and the API response are
 * byte-identical for any deploy where nothing has been edited since, so
 * there is nothing to flash and nothing to shift. An edit made after the
 * deploy still arrives the same way it always did — it is just one changed
 * block instead of the entire page.
 *
 * Per key, not all-or-nothing: a snapshot taken from a database that has no
 * `posts` row still gets the bundled posts.
 */
const live = snapshot || {};

export function fallbackProfile() {
  if (live.profile) return live.profile;
  const { about, ...rest } = staticProfile;
  return {
    ...rest,
    aboutEyebrow: about?.eyebrow || "",
    aboutTitle: about?.title || "",
    aboutLead: about?.lead || "",
  };
}

export function fallbackProjects() {
  if (live.projects?.length) return live.projects;
  return staticProjects.map((p) => ({
    highlights: [],
    stack: [],
    links: [],
    note: null,
    ...p,
  }));
}

export function fallbackPosts() {
  if (live.posts?.length) return live.posts;
  // These six are explicitly scaffolding (see the note at the top of
  // posts.js) — mark them draft so they never show to a real visitor if
  // the site ever falls back to this bundled copy in production.
  return staticPosts.map((p) => ({ ...p, isDraft: true }));
}

export function fallbackSiteContent() {
  // Merged, not replaced, for the same reason mergeSiteContent in store.js
  // merges: a content block added in a later release is absent from a
  // snapshot taken against an older database, and taking the snapshot
  // wholesale would delete it from the page.
  const bundled = bundledSiteContent();
  return live.siteContent ? { ...bundled, ...live.siteContent } : bundled;
}

function bundledSiteContent() {
  return {
    services,
    tickerWords,
    recognition,
    faqs,
    experience,
    process: processSteps,
    serviceOptions,
    // Resume-derived blocks. `stack` (the old two-letter tiles) is gone —
    // skillGroups replaces it with the real, icon-backed skill set.
    skillGroups,
    certifications,
    volunteering,
    github,
    recommendations,
  };
}

/**
 * The saved section layout as of the build, or null if there was no database
 * to read one from. store.js runs it through the same mergeSections() the API
 * response goes through, so a snapshot can never drop a section the code
 * knows about but the database has not heard of.
 */
export function snapshotSections() {
  return live.sections?.length ? live.sections : null;
}

export const DEFAULT_SECTIONS = [
  { id: "hero", title: "Hero Section", is_visible: true, ordering: 0, animation_type: "default", font_family: "default", type: "predefined" },
  { id: "ticker", title: "Word Ticker", is_visible: true, ordering: 1, animation_type: "default", font_family: "default", type: "predefined" },
  // The RAG assistant is the first thing on the page a visitor can actually
  // use, so it sits as high as it can — but not higher. FlowingPortrait
  // interpolates the hero portrait from the hero slot to the services slot
  // as you scroll, so anything placed BETWEEN those two sections gets the
  // portrait gliding straight over it. Directly after services is the
  // highest position that is out of that flight path.
  { id: "services", title: "Services", is_visible: true, ordering: 2, animation_type: "default", font_family: "default", type: "predefined" },
  { id: "assistant", title: "Ask About My Work", is_visible: true, ordering: 3, animation_type: "default", font_family: "default", type: "predefined" },
  { id: "about", title: "About", is_visible: true, ordering: 4, animation_type: "default", font_family: "default", type: "predefined" },
  { id: "work", title: "Featured Projects", is_visible: true, ordering: 5, animation_type: "default", font_family: "default", type: "predefined" },
  { id: "recognition", title: "Recognition", is_visible: true, ordering: 6, animation_type: "default", font_family: "default", type: "predefined" },
  { id: "faq", title: "FAQ", is_visible: true, ordering: 7, animation_type: "default", font_family: "default", type: "predefined" },
  // Resume-derived blocks. They always render in full on /about and /resume;
  // these entries let the admin panel also surface them on the home page,
  // which is why only the GitHub calendar is on by default — the rest would
  // duplicate the About page above the fold.
  { id: "github", title: "GitHub Contributions", is_visible: true, ordering: 8, animation_type: "default", font_family: "default", type: "predefined" },
  { id: "skills", title: "Technical Skills", is_visible: false, ordering: 9, animation_type: "default", font_family: "default", type: "predefined" },
  { id: "certifications", title: "Certifications", is_visible: false, ordering: 10, animation_type: "default", font_family: "default", type: "predefined" },
  { id: "volunteering", title: "Volunteering", is_visible: false, ordering: 11, animation_type: "default", font_family: "default", type: "predefined" },
  { id: "recommendations", title: "Recommendations", is_visible: true, ordering: 12, animation_type: "default", font_family: "default", type: "predefined" },
  { id: "notes", title: "Notes & Insights", is_visible: true, ordering: 13, animation_type: "default", font_family: "default", type: "predefined" },
  { id: "contact", title: "Contact", is_visible: true, ordering: 14, animation_type: "default", font_family: "default", type: "predefined" },
];
