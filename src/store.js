import { create } from 'zustand';
import { getProfile, getProjects, getPosts, getSiteContent, getSections, describeApiFailure } from './lib/api.js';
import {
  fallbackProfile,
  fallbackProjects,
  fallbackPosts,
  fallbackSiteContent,
  snapshotSections,
  DEFAULT_SECTIONS,
} from './data/fallback.js';

// The store starts already populated with the bundled content (see
// data/fallback.js), not null/loading. That's what lets every page render
// correctly on first paint with zero network round trips, and it's what the
// site keeps showing if the admin API never responds — previously the whole
// app blocked behind one fetchData() call with no fallback, so an
// unreachable API (the default in production, since it pointed at
// localhost:3001) meant a permanently empty site.
/**
 * Reconcile the API's saved section layout with the code's default list.
 *
 * The admin panel stores a section row per block, so a block added in a later
 * release simply isn't in an older database — and because the API's list used
 * to replace the defaults wholesale, that block would never render until
 * someone remembered to run a migration. That is exactly how the RAG
 * assistant ended up invisible: the code shipped it, the database had never
 * heard of it, and the site quietly showed nothing.
 *
 * Now the saved layout wins for everything it knows about (order, visibility,
 * animation are the admin's to set), and anything only the code knows about is
 * spliced in at its default position. New sections appear on their own; a
 * hand-arranged layout is left alone.
 */
function mergeSections(fromApi, current) {
  if (!fromApi?.length) return current;

  const known = new Set(fromApi.map((s) => s.id));
  const missing = DEFAULT_SECTIONS.filter((s) => !known.has(s.id));
  if (!missing.length) return fromApi;

  const merged = [...fromApi];
  for (const section of missing) {
    // Place it after the default section that precedes it, so it lands where
    // the design intends rather than at the end of the page.
    const defaultIndex = DEFAULT_SECTIONS.findIndex((s) => s.id === section.id);
    const previous = DEFAULT_SECTIONS[defaultIndex - 1]?.id;
    const at = previous ? merged.findIndex((s) => s.id === previous) : -1;
    if (at >= 0) merged.splice(at + 1, 0, section);
    else merged.push(section);
  }
  return merged.map((s, i) => ({ ...s, ordering: i }));
}

/**
 * Same reconciliation as mergeSections, for content rather than layout.
 *
 * The API's site_content is a key/value table, so a block added in a later
 * release is simply absent from an older database — and replacing the bundled
 * content wholesale with the API's object made that block disappear from the
 * site entirely. That is what happened to the recommendations: the section row
 * merged in correctly, the component rendered, found no `recommendations` key,
 * and returned null.
 *
 * Per-key merge instead. Anything the database has wins, including a
 * deliberately emptied array — only genuinely absent keys fall back to what is
 * bundled in src/data/. New content blocks now appear on their own, exactly
 * like new sections do.
 */
function mergeSiteContent(fromApi) {
  const bundled = fallbackSiteContent();
  if (!fromApi || !Object.keys(fromApi).length) return bundled;
  return { ...bundled, ...fromApi };
}

/**
 * Keep the object we already have when the incoming one says the same thing.
 *
 * Zustand compares by reference, so `set({ profile })` with a freshly parsed
 * but identical object re-renders every subscriber and makes React reconcile
 * a tree that cannot have changed. With the build-time snapshot in place that
 * is now the *normal* case — first paint and the API response are the same
 * content on any deploy nobody has edited since — so it is worth one
 * stringify to avoid the render entirely.
 *
 * JSON.stringify is order-sensitive, which would normally make it a poor
 * equality test; here both sides come out of the same serializer for the same
 * rows, so key order is stable. A false negative just means the old
 * behaviour: one extra render.
 */
const same = (a, b) => {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};
const keepIfUnchanged = (incoming, current) => (same(incoming, current) ? current : incoming);

export const useStore = create((set, get) => ({
  profile: fallbackProfile(),
  projects: fallbackProjects(),
  posts: fallbackPosts(),
  siteContent: fallbackSiteContent(),
  // A snapshot taken from an older database still gets sections the code has
  // added since — same reconciliation the API response gets, below.
  sections: mergeSections(snapshotSections(), DEFAULT_SECTIONS),
  loading: false,
  apiReachable: null, // null = not checked yet, true/false once fetchData settles
  apiError: null,     // human-readable reason, when it failed

  fetchData: async () => {
    try {
      const [profile, projects, posts, siteContent, sections] = await Promise.all([
        getProfile(),
        getProjects(),
        getPosts(),
        getSiteContent(),
        getSections(),
      ]);
      // A freshly-created (unseeded) backend returns empty/null shapes —
      // don't let that blank out content that's already on screen.
      const current = get();
      set({
        profile: keepIfUnchanged(profile || current.profile, current.profile),
        projects: keepIfUnchanged(projects?.length ? projects : current.projects, current.projects),
        posts: keepIfUnchanged(posts?.length ? posts : current.posts, current.posts),
        siteContent: keepIfUnchanged(mergeSiteContent(siteContent), current.siteContent),
        sections: keepIfUnchanged(mergeSections(sections, current.sections), current.sections),
        loading: false,
        apiReachable: true,
        apiError: null,
      });
    } catch (err) {
      // Warn in production too, not just in dev.
      //
      // Falling back to bundled content is the right behaviour — the site
      // stays up — but doing it silently means a broken API in production is
      // invisible: every page looks correct, serving content frozen at build
      // time, and the first symptom is an admin edit that "doesn't show up".
      // One line, naming the URL and the likely cause, turns that into a
      // thirty-second diagnosis.
      const reason = describeApiFailure(err);
      console.warn(
        `[portfolio] Content API unreachable — serving content bundled at build time. ${reason}`
      );
      set({ loading: false, apiReachable: false, apiError: reason });
    }
  },

  getFeaturedProjects: () => get().projects.filter(p => p.featured),
  getMoreProjects: () => get().projects.filter(p => !p.featured),
  findProject: (slug) => get().projects.find(p => p.slug === slug),

  getPublishedPosts: () => get().posts.filter(p => !p.isDraft),
  findPost: (slug) => {
    const post = get().posts.find(p => p.slug === slug);
    return post && !post.isDraft ? post : undefined;
  },
}));
