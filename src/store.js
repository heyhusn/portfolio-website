import { create } from 'zustand';
import { getProfile, getProjects, getPosts, getSiteContent, getSections } from './lib/api.js';
import {
  fallbackProfile,
  fallbackProjects,
  fallbackPosts,
  fallbackSiteContent,
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

export const useStore = create((set, get) => ({
  profile: fallbackProfile(),
  projects: fallbackProjects(),
  posts: fallbackPosts(),
  siteContent: fallbackSiteContent(),
  sections: DEFAULT_SECTIONS,
  loading: false,
  apiReachable: null, // null = not checked yet, true/false once fetchData settles

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
      set({
        profile: profile || get().profile,
        projects: projects?.length ? projects : get().projects,
        posts: posts?.length ? posts : get().posts,
        siteContent: mergeSiteContent(siteContent),
        sections: mergeSections(sections, get().sections),
        loading: false,
        apiReachable: true,
      });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn("[store] admin API unreachable, showing bundled content:", err?.message || err);
      }
      set({ loading: false, apiReachable: false });
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
