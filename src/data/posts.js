/**
 * Writing.
 *
 * ⚠ Only entries carrying `published: true` are finished work and reach the
 * site; fallbackPosts() in fallback.js marks everything else draft. The rest
 * are scaffolding — titles and outlines drawn from things you have actually
 * built, with body text started by tooling that should be rewritten in your
 * own words before it is published. Delete any entry you do not intend to
 * write, and set the flag only once a post no longer ends in a "Draft —" note.
 *
 * `body` is an array of blocks: { type: "p" | "h" | "list" | "quote", ... }
 */

export const posts = [
  {
    slug: "baseline-before-model",
    // The only entry below that is finished prose rather than scaffolding.
    // fallbackPosts() publishes exactly the posts that set this.
    published: true,
    title: "Build The Baseline Before You Build The Model",
    category: "Practice",
    date: "2026-07-18",
    dateLabel: "Jul 18, 2026",
    image: "/assets/img/post-1.svg",
    excerpt:
      "Equal spacing beat two weeks of tuning on my first segmentation attempt. That result was the most useful thing the project produced.",
    body: [
      {
        type: "p",
        text: "On the video retrieval project I spent a fortnight on a segmentation model before writing the baseline. When I finally did write it — cut the lecture into equal pieces, same number of pieces the model produced — the gap was smaller than I wanted to admit.",
      },
      { type: "h", text: "Why the order matters" },
      {
        type: "p",
        text: "A baseline is not a formality you clear on the way to the interesting work. It is the definition of what interesting would even mean. Without one, any number the model produces looks like progress.",
      },
      {
        type: "list",
        items: [
          "It gives every later claim something concrete to beat.",
          "It exposes evaluation bugs early, while the pipeline is small enough to read.",
          "It tells you whether the problem is worth the model you were about to build.",
        ],
      },
      { type: "h", text: "What the baseline actually scored" },
      {
        type: "p",
        text: "The baseline is count-matched equal spacing: take the number of segments the system proposes, then cut the lecture into that many equal pieces. It knows nothing about the content. On Pk it scored 0.512, and on WindowDiff 0.513 — both error metrics, so lower is better, and both sitting near the 0.5 you would expect from a boundary set that carries no information about where the topic actually changes.",
      },
      {
        type: "p",
        text: "The finished system reaches Pk 0.344 and WindowDiff 0.391 on the same held-out lectures, improving on 16 of 16 of them, Wilcoxon p < 0.001. That is a real gain and I am glad to have it. But the number I care about is the first pair, because without them the second pair means nothing at all — 0.344 is only good in relation to something, and for two weeks I had no idea what that something was.",
      },
      { type: "h", text: "The part that cost me" },
      {
        type: "p",
        text: "Writing the baseline late did not just delay the comparison. It hid an evaluation bug for a fortnight, and when the bug surfaced several figures I had already written down stopped being defensible. They were not wrong by a rounding error; they were measuring something adjacent to what I claimed they measured.",
      },
      {
        type: "p",
        text: "So they came out. Not softened, not re-framed with a caveat — removed, and replaced with numbers produced by a pipeline I had read end to end. That audit is the part of the project I would most want to be judged on, and it only happened because a trivially simple baseline eventually disagreed with a complicated model.",
      },
      { type: "h", text: "What I do now" },
      {
        type: "p",
        text: "The dumbest thing that could work gets built and measured first, before any model. It takes an afternoon, it is almost always embarrassing to look at, and it is the only reason any later number on the project means anything. If the clever approach cannot beat equal spacing, the problem is not the model — it is that nobody had yet defined what winning looked like.",
      },
    ],
  },
  {
    slug: "json-repair-layer",
    title: "The JSON Repair Layer Every LLM Feature Needs",
    category: "Engineering",
    date: "2026-06-02",
    dateLabel: "Jun 2, 2026",
    image: "/assets/img/post-2.svg",
    excerpt:
      "Models return almost-valid JSON often enough that 'almost' is an architecture decision, not an edge case.",
    body: [
      {
        type: "p",
        text: "ScholarMind asks a model for structured output on every document it reads. A trailing comma, a stray prose sentence before the opening brace, a truncated response — each one is a feature outage if the parser is the only thing standing there.",
      },
      { type: "h", text: "What the layer actually does" },
      {
        type: "list",
        items: [
          "Strips prose that arrives before or after the JSON body.",
          "Repairs the small set of malformations models actually produce, rather than attempting general recovery.",
          "Falls back to a partial object with the fields that did parse, so the feature degrades instead of failing.",
        ],
      },
      {
        type: "p",
        text: "Draft — add the failure taxonomy you collected and how often each shape appeared.",
      },
    ],
  },
  {
    slug: "physics-informed-features",
    title: "Give The Model The Physics You Already Know",
    category: "ML Systems",
    date: "2026-05-11",
    dateLabel: "May 11, 2026",
    image: "/assets/img/post-3.svg",
    excerpt:
      "Solar zenith angle and clear-sky irradiance are computable. Making a model rediscover them from raw weather columns is a waste of capacity.",
    body: [
      {
        type: "p",
        text: "The solar forecasting project has five and a half years of hourly meteorological data. It would be easy to hand those columns to a gradient-boosted model and let it work things out.",
      },
      {
        type: "p",
        text: "It works better to compute what astronomy already settles — where the sun is, what a cloudless sky would deliver — and let the model learn only the residual.",
      },
      {
        type: "p",
        text: "Draft — include the SHAP plot showing how the derived features displaced the raw ones.",
      },
    ],
  },
  {
    slug: "inference-on-the-client",
    title: "Send The Score, Not The Video",
    category: "Privacy",
    date: "2026-04-06",
    dateLabel: "Apr 6, 2026",
    image: "/assets/img/post-4.svg",
    excerpt:
      "Attention tracking that never transmits a frame. WebAssembly moved the whole question of trust off the server.",
    body: [
      {
        type: "p",
        text: "Attention tracking is the kind of feature that makes people uneasy for good reason. The usual architecture streams camera frames to a server, which is exactly the thing nobody wants to agree to.",
      },
      {
        type: "p",
        text: "Running MediaPipe Face Mesh in WebAssembly moves inference to the client. Head pose and eye aspect ratio fuse locally into a single bounded number, and that number is the only thing that crosses the socket.",
      },
      {
        type: "p",
        text: "Draft — cover the latency measurements on mid-tier hardware and where the approach stops being viable.",
      },
    ],
  },
  {
    slug: "auditing-your-own-results",
    title: "Auditing Your Own Results Before Someone Else Does",
    category: "Research",
    date: "2026-03-15",
    dateLabel: "Mar 15, 2026",
    image: "/assets/img/post-5.svg",
    excerpt:
      "A pipeline audit cost me five headline numbers. The paper is better for it.",
    body: [
      {
        type: "p",
        text: "Comparing against a published baseline is only valid if the comparison is calibrated. When I checked, several of mine were not — the baseline never published per-lecture scores, so no significance test against it was possible.",
      },
      {
        type: "quote",
        text: "The defensible result is the one that survives your own worst-faith reading of it.",
      },
      {
        type: "p",
        text: "Draft — walk through what the audit checked and what replaced the dropped claims.",
      },
    ],
  },
  {
    slug: "webgl-budget",
    title: "A 3 MB Budget For A 3D Avatar",
    category: "Performance",
    date: "2026-02-20",
    dateLabel: "Feb 20, 2026",
    image: "/assets/img/post-6.svg",
    excerpt:
      "Draco, Meshopt and KTX2 turn a 15 MB export into something a mid-tier phone can decline gracefully.",
    body: [
      {
        type: "p",
        text: "A rigged, textured avatar exports at 15 to 40 MB by default. That is not a slow load — it is a page that never becomes interactive on the devices most visitors are holding.",
      },
      {
        type: "list",
        items: [
          "Draco compresses geometry at export.",
          "Meshopt and KTX2 handle buffers and textures.",
          "A CI check fails the build if the result transfers over 3 MB.",
          "Everything below the top capability tier never requests the file at all — it gets a poster in the same box.",
        ],
      },
      {
        type: "p",
        text: "Draft — this site implements exactly that; write up the numbers once your own model is through the pipeline.",
      },
    ],
  },
];

export const findPost = (slug) => posts.find((p) => p.slug === slug);

export default posts;
