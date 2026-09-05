import { describe, it, expect } from "vitest";
import { posts } from "../src/data/posts.js";
import { fallbackPosts } from "../src/data/fallback.js";

/**
 * posts.js carries a mix of finished writing and scaffolding whose body text
 * still ends in a "Draft — …" note addressed to the author. Shipping one of
 * those to a visitor would be worse than shipping nothing, particularly on a
 * site whose stated thesis is that a claim only stays up if it survives being
 * checked.
 *
 * The guard is opt-in: fallbackPosts() marks every bundled post draft unless
 * it sets `published: true`. These tests hold that line, so adding a post
 * cannot accidentally publish an unfinished one.
 */

const DRAFT_MARKER = /Draft —/;

function bodyText(post) {
  return JSON.stringify(post.body ?? []);
}

describe("bundled post publishing", () => {
  it("never publishes a post whose body still carries a draft note", () => {
    const leaked = fallbackPosts()
      .filter((p) => !p.isDraft)
      .filter((p) => DRAFT_MARKER.test(bodyText(p)))
      .map((p) => p.slug);

    expect(leaked).toEqual([]);
  });

  it("defaults to draft — publishing is opt-in per post", () => {
    const unflagged = posts.filter((p) => p.published !== true);
    const published = fallbackPosts().filter((p) => !p.isDraft);

    expect(unflagged.length).toBeGreaterThan(0);
    for (const p of published) {
      expect(p.published).toBe(true);
    }
  });

  it("publishes the finished baseline post", () => {
    const live = fallbackPosts().filter((p) => !p.isDraft);
    expect(live.map((p) => p.slug)).toContain("baseline-before-model");
  });

  it("gives every published post an excerpt and a dated label", () => {
    for (const p of fallbackPosts().filter((x) => !x.isDraft)) {
      expect(p.excerpt, `${p.slug} excerpt`).toBeTruthy();
      expect(p.dateLabel, `${p.slug} dateLabel`).toBeTruthy();
      expect(p.body?.length, `${p.slug} body`).toBeGreaterThan(3);
    }
  });
});
