# Engineering notes

The working record for this project: architecture decisions, the reasoning
behind them, and the bugs that were worth writing down — several of which were
subtle enough that the same mistake would otherwise be made twice.

For setup and deployment, see the [README](../README.md). This file is the
long-form companion to it, kept in rough chronological order.

---

The dark / lime portfolio, rebuilt as a component-driven React application with a
strictly gated WebGL avatar. **The design system is unchanged**: `src/styles/style.css`
is the original stylesheet, byte for byte, with only the seven `@font-face` URLs
rewritten from `../fonts/…` to `/assets/fonts/…`. Every token, selector, radius,
breakpoint and keyframe is the one you already had.

```
npm install      # also copies the Draco/KTX2 decoders into public/decoders
npm run dev      # http://localhost:5173
npm run build    # runs the avatar gate, then builds to dist/
npm run preview  # serve dist/
```

Deploy: push to Vercel. `vercel.json` is set up for SPA routing and long-lived
caching on fonts, decoders and models. No build configuration needed beyond the
defaults. **The site works fully with no backend at all** — see "The admin
dashboard" below for why, and what you get once you do run one.

---

## The admin dashboard

There's a small CMS at `/admin` (login at `/login`) for editing the profile,
projects, blog posts, site copy and section layout without touching code. It's
a separate Express + SQLite API in `backend/`, not part of the Vite app.

```
cd backend
npm install
cp .env.example .env       # set JWT_SECRET and SEED_ADMIN_PASSWORD — see the file
npm run seed                # creates backend/portfolio.db, seeded from src/data/
npm start                   # http://localhost:3001
```

With that running alongside `npm run dev`, sign in at `/login` with the admin
user `npm run seed` printed. Six blog posts seed as **drafts** — they're the
scaffolding described below, not real writing — publish each one from the
Blog Posts tab once you've rewritten it.

**The public site never depends on this API being reachable.** Every page
starts already rendered from the bundled content in `src/data/` (via
`src/data/fallback.js`), the same instant the JS entry runs — no network
round trip, no loading spinner. If the admin API responds, `App.jsx` quietly
refines the page with whatever's been edited there; if it doesn't (not
running, deployed without it, a slow connection), the site just keeps
showing the bundled content. This matters most in production: `VITE_API_URL`
controls where the built site looks for the API (unset, it only tries
`localhost:3001`, which is obviously never reachable from a visitor's own
browser) — so **deploying just the Vite build, with no `VITE_API_URL` and no
backend running anywhere, is a completely normal and supported way to run
this site.** It behaves exactly like the pre-admin static build: real
content, no admin editing.

To make edits actually go live on a real deployment, host `backend/`
somewhere that keeps a persistent filesystem — a small VPS, Railway, Render,
Fly.io. It won't run as a Vercel serverless function as-is: better-sqlite3
needs a writable file that survives between requests, which serverless
platforms don't guarantee. Once it's hosted, set `VITE_API_URL` (frontend)
and `CORS_ORIGIN` (backend/.env) to point at each other and rebuild.

Two things worth knowing if you edit `backend/` or the admin UI:

- The database is the source of truth once it's seeded. Editing
  `src/data/*.js` after that only changes what a fresh `npm run seed` (or a
  visitor with no backend reachable) starts from — it does not update
  already-seeded content.
- `backend/portfolio.db` and `backend/.env` are gitignored on purpose — the
  database holds a bcrypt hash of the admin password, and `.env` holds the
  token-signing secret. Never commit either.

---

## What changed from the static build

Everything visual is identical — verified by measuring both builds side by side.
The hero figure, hero words, availability chip, badge, ticker and nav all land on
the same pixel, and all fifteen design tokens match exactly.

What is new:

| | |
| --- | --- |
| **Routing** | Home / About / Projects / Blogs, plus a detail page per project (`/projects/:slug`) and per post (`/blogs/:slug`) |
| **Components** | Nav, Footer, Accordion, Marquee, cards, badge, reveal, counter, contact form — all reading the same class names |
| **Content** | Your real profile, projects, education, teaching roles and contact details, in `src/data/` |
| **Motion Kernel** | One `requestAnimationFrame` loop for the entire document |
| **Capability tiers** | FULL / MID / LITE, resolved before first paint |
| **WebGL avatar** | The whole FR-AVT module, gated as the SRS requires |
| **Motion toggle** | A control in the nav so a visitor can turn motion off without changing an OS setting |
| **No-JS path** | A real `<noscript>` page with the poster, not a blank screen |

Two effects were upgraded because they earned it, both gated to the FULL tier and
falling back to the original CSS everywhere else:

- **Marquee transport** is stepped by the kernel and coupled to scroll velocity, so
  the strip surges when the page moves and eases to a stop on hover instead of
  hard-pausing. On MID it is the original CSS keyframe; on LITE it is static.
- **Project cards** get a small pointer-tracked tilt, one transform write per frame.

Nothing else about the animation was touched. The reveals, counters, accordions,
card hovers, button fills, nav hide-on-scroll, rotating badge and hero parallax all
behave exactly as they did — they are just driven by the one ticker now.

### One honest substitution

The template's "Kind Words" carousel held six testimonials attributed to invented
people. Publishing those as real endorsements would be a fabrication, so that
section is now **Recognition** — same marquee, same card design, carrying your
actual awards and results (Best FYP, Rector's and Dean's Merit, the VLVRAG
figures, the ICASF acceptance). When you have a real quote you are allowed to
publish, add it to `recognition` in `src/data/site.js` with the person's name and
role and it renders in the same card.

The six blog entries in `src/data/posts.js` are **drafts written as
scaffolding**. Once seeded into the admin database they stay marked
`isDraft`, which keeps them out of `/blogs` and 404s their detail pages —
rewrite each one and flip it to published from the admin dashboard's Blog
Posts tab when it's ready.

---

## Architecture

```
src/
  motion/          the frame budget
    kernel.js        one rAF loop, priority-ordered subscribers (ADR-02)
    capability.js    tier + motion-mode resolution, WebGL2 probe (ADR-09)
    MotionProvider   React binding; owns the gate every effect reads
    hooks.js         useTicker, useReveal, useCounter, useInViewOnce
  wgl/             the avatar, lazy-loaded, never in the entry bundle
    SignatureScene   the five gates and the poster that is always present
    AvatarCanvas     r3f canvas with frameloop="never" (FR-AVT-07)
    useModelSource   fetch with a 5s timeout and no escaping rejection
    decoders.js      the only place a decoder path is written
    model-manifest   generated at build time; the app's single source of truth
  components/      the design system as components
  pages/           one file per route
    admin/           the /admin CMS — its own lazy-loaded route, see below
  data/            bundled content — the store's starting state, and what a
                   fresh `npm run seed` reads to populate the database
    fallback.js      normalizes data/*.js into the exact shape the admin
                     API returns, so the rest of the app only knows one shape
  lib/api.js       the admin API client (axios, VITE_API_URL, auth header)
  store.js         zustand store — starts from data/fallback.js, refined by
                   the admin API if and when it responds (see "The admin
                   dashboard" above)
  styles/
    style.css        your original stylesheet (fonts paths only)
    app.css          additions; changes nothing above
scripts/
  check-model-budget.mjs   the CI gate
  copy-decoders.mjs        same-origin decoder install
backend/           the admin API — Express + SQLite, entirely separate from
                   the Vite app and optional at runtime (see above)
```

### The Motion Kernel

Every animated thing on the site subscribes to `motionKernel`. It runs one rAF
loop, starts only when something subscribes, stops when the last subscriber
leaves, stops while the tab is hidden, and clamps `dt` so a backgrounded tab
cannot produce a huge first step. When motion is off it does not run at all —
subscribers get exactly one terminal frame so they can paint their resting state.

Subscribers take a priority so readers run before writers, which keeps layout
thrash out of the frame.

### Capability tiers

An inline script in `<head>` resolves the tier before first paint and writes
`data-tier` / `data-motion` onto `<html>`, so the document never flashes a state
it is about to leave. `capability.js` then refines FULL with a real WebGL2 probe
that also rejects software rasterisers — a machine that reports eight cores but
renders through SwiftShader is MID, not FULL.

| Tier | Gets |
| --- | --- |
| FULL | everything, including the WebGL avatar |
| MID | CSS transitions, kernel-driven counters and parallax, no WebGL |
| LITE | static; no transport, no tilt, no canvas |

`prefers-reduced-motion: reduce` forces MotionMode OFF at any tier. The nav toggle
overrides the OS preference in either direction and persists in `localStorage`.

---

## The avatar module (SRS v1.2, FR-AVT-01 … 11)

The model is in and shipping. The Hi3D export was 61.1 MB — 2,000,000 triangles
and a 4096² JPEG — and now transfers at **0.85 MB**, 28% of the SRS budget, via
mesh simplification to 40k triangles, a 2048² KTX2/ETC1S texture and Draco
geometry compression. [`docs/avatar-model.md`](avatar-model.md) has the exact pipeline and how to
re-run it if you re-export. (It used to live in `public/models/`, where it was
deployed as a public asset and served with `Content-Type: model/gltf-binary` by
the cache rule meant for the model.)

To replace it: drop a new `avatar.glb` in `public/models/` and run `npm run build`.

**Where it renders.** `SignatureScene` is the figure inside `FlowingPortrait`,
which is the hero portrait on the home page — so the gates below apply to the
element visitors actually see, not to a component sitting beside the app. This
was not true until Sept 2026: the scene existed, was fully written, and was
imported by nothing, so the site shipped the poster and no build ever emitted a
`wgl` chunk. CI now asserts the chunk exists and stays out of the entry graph,
because that failure was completely silent.

**The poster is the element, not the fallback.** `SignatureScene` always renders
`avatar-poster.webp` (32 KB) at the size the layout expects; the canvas is an
absolutely positioned layer that fades in on top of it only when every gate
opens. There is no state in which the box changes size, which makes "no layout
shift" structural rather than a promise. Re-render the poster from the same
camera and lighting after any change to the model or to `AvatarCanvas.jsx`, or
the two states drift apart.

The gates, in order:

1. `CapabilityTier === FULL` **and** `MotionMode !== OFF` — FR-AVT-01
2. A model is present in the build manifest
3. The scene has entered the viewport — FR-AVT-04
4. The model fetched inside 5 seconds without error — FR-AVT-09
5. The lazy WebGL chunk imported and mounted without throwing

Any gate that stays shut leaves the poster exactly where it was, silently.

| Requirement | How |
| --- | --- |
| FR-AVT-01 | `useMotion().webgl` — the single boolean both the scene and the chunk import are behind |
| FR-AVT-02 | Poster always rendered; canvas is `position: absolute; inset: 0` |
| FR-AVT-03 | `check-model-budget.mjs` brotli-compresses the file and fails over 3 MB |
| FR-AVT-04 | `useInViewOnce` gates the fetch; the model is requested exactly once |
| FR-AVT-05 | The gate parses the GLB's JSON chunk and rejects uncompressed geometry or non-KTX2 textures |
| FR-AVT-06 | Decoders copied out of `three` into `/public/decoders`; the gate greps `src/wgl` for CDN origins and fails the build if one appears |
| FR-AVT-07 | `frameloop="never"`; the kernel calls `advance()`. The mixer steps on the same delta |
| FR-AVT-08 | `webglcontextlost` is prevented, the poster takes over, and a generation counter remounts the scene on restore — with a timer fallback for drivers that never fire `contextrestored`, and a hard cap of two attempts so a device that keeps losing its context settles on the poster instead of looping |
| FR-AVT-09 | Preflight fetch with `AbortController` and a 5s timeout; an error boundary catches render failures; `main.jsx` suppresses asset-pipeline rejections only |
| Disposal | `AvatarCanvas` clears drei's `useGLTF` cache entry and disposes geometries, materials and textures on unmount — the loader is handed a fresh `blob:` URL per generation, so nothing would ever evict those entries on its own |
| FR-AVT-10 | The gate renames the file to `avatar.<sha256-10>.glb` and writes the manifest |
| FR-AVT-11 | The model conveys nothing the surrounding text does not; the poster carries the accessible name |

### Bundle split

The WebGL chunk is never in the entry graph:

```
index    ~246 kB  (84 kB gzip)   ← app + store + bundled content (data/fallback.js)
react    ~144 kB  (46 kB gzip)
router    ~22 kB  ( 8 kB gzip)
──────────────────────────────
initial  ~138 kB gzip             ← under the 150 kB budget
wgl      ~945 kB (263 kB gzip)    ← FULL tier only, after the viewport gate
admin    ~119 kB (35 kB gzip)     ← /admin and /login only, never for a public visitor
```

`index` carries more than it used to: the bundled fallback content (all of
`src/data/`) and the admin API client now ship with every visitor, so the
public site never needs a network round trip to render (see "The admin
dashboard" above). `admin` — framer-motion, @hello-pangea/dnd, the CMS forms
— is `React.lazy()`-loaded only when someone actually opens `/admin` or
`/login`; a public visitor's browser never fetches it.

One thing worth knowing if you touch `vite.config.js`: Vite's `__vitePreload`
helper is a virtual module with no natural home, and Rollup will happily put it
inside the `wgl` chunk. That makes the entry statically import `wgl` and earns it
a `<link rel="modulepreload">` — every visitor then downloads all of three.js
regardless of tier. `manualChunks` pins the helper to the `react` chunk to stop
that. It is a silent regression if it comes back; check `dist/index.html` for a
`modulepreload` pointing at `wgl-*.js`.

The same regression can come back a second way: `manualChunks` buckets by
`id.includes("@react-three")`, and `@react-three/fiber` ships its own private
nested copy of zustand for its internal state. A plain `.includes()` check
sweeps that nested copy — and, transitively, the app's own top-level zustand
import in `store.js` — into the `wgl` chunk too, which reintroduces the exact
same eager `modulepreload`. `manualChunks` matches the *innermost*
`node_modules/<package>` segment for that reason (a package's own files vs.
its transitive dependencies), and pins the app's top-level zustand to the
`react` chunk explicitly, before that check runs. If you add another
dependency of `three`/`@react-three/*` that itself depends on something the
main app also imports directly, re-run `npm run build` and check
`dist/index.html` again.

---

## Editing content

Two ways to do this, and they don't overlap:

- **The admin dashboard** (`/admin`, see above) — the live way, for content
  that changes after launch: text, projects, blog posts, section visibility
  and per-section animation. Edits there go straight into
  `backend/portfolio.db` and the site picks them up on next load.
- **`src/data/`** — the bundled starting point. It's what a fresh
  `npm run seed` populates the database from, and what the site itself falls
  back to if the admin API is never reached (see "The admin dashboard"
  above). Edit it before your first seed, or to change what a from-scratch
  install starts with.

| File | Holds |
| --- | --- |
| `profile.js` | Name, hero words, tagline, contact, socials, stats, education |
| `projects.js` | All twelve projects; `featured: true` puts one on the home page and drives its detail route |
| `posts.js` | Blog entries and their bodies |
| `site.js` | Services accordion, ticker words, recognition cards, FAQ, work history, tech stack, process, contact-form options |

Add a project to `projects.js` and its card, its detail page and its route all
appear together. No JSX to edit.

### The contact form

It validates, then hands off to `mailto:` so nothing is lost. To send it
server-side instead, set `VITE_CONTACT_ENDPOINT` to a URL that accepts
`POST {name, email, service, message}`. Nothing else in the component changes.

---

## Verification

`npm test` — 51 tests, six files, run on every push by `.github/workflows/ci.yml`
alongside the production build.

An earlier version of this section claimed the two builds had been "rendered and
compared programmatically" and the avatar module "exercised end to end". Neither
was true: there was no test file in the repository at all. The claims are
replaced here by the suite that now exists, which is narrower and real.

| File | What it pins down |
| --- | --- |
| `tests/motion-kernel.test.js` | The kernel does not start without subscribers, stops when the last leaves, orders by priority, clamps `dt`, delivers exactly one terminal frame when motion goes off, and survives a subscriber that throws |
| `tests/capability-tier.test.js` | Extracts the real pre-paint script out of `index.html` and runs it against synthetic browsers. Includes the Firefox/Safari case directly: those report no `navigator.deviceMemory`, and a `mem >= 8` gate pinned every one of their visitors to MID — where WebGL may not mount |
| `tests/signature-scene.test.jsx` | The poster is in the document at a fixed intrinsic size in all five states; the WebGL chunk is not reached for below FULL, with motion off, with no model in the manifest, on a failed fetch, or on a 404 |
| `tests/model-budget.test.js` | The gate's GLB parser and compression audit against synthesised exports with known defects, plus the model actually committed — budget, Draco, KTX2, content-hashed filename, manifest agreement |
| `tests/rag-pipeline.test.js` | Citation numbering matches what the reader is shown, an unanswerable question retrieves nothing, "who is he" still answers, and a forged `system` turn in client-supplied history cannot become a second system message |
| `tests/accessibility.test.jsx` | Skip link is the first focusable element and points at a real `main`; `main` is focusable but out of the tab order; the route-announcement live region exists before it has anything to say |

CI additionally asserts what no test can see from inside the app: that
`dist/index.html` does not preload the `wgl` chunk and that three.js has not
become statically reachable from the entry. That regression makes every visitor
download ~950 KB of renderer regardless of tier, and it shows up as nothing but
a slower site.

**Not covered.** No browser-level rendering test, so a real context loss, an
actual GPU decode of the KTX2 texture, and the visual match between poster and
live scene are all still checked by hand. No Postgres integration test in CI —
the database work was verified against a real Postgres 16 locally (see the
Supabase section) but CI runs no database.

## Resume, skills, credentials and GitHub (Aug 2026)

Four blocks were added on top of the SRS v1.2 build. All four read from
`site_content`, so every one of them is editable from the admin panel with no
rebuild.

**Skills grid** — `src/components/SkillsSection.jsx` replaced the old
three-across tiles that showed two-letter abbreviations (`Py`, `Fa`, `3js`)
with real brand glyphs, grouped by domain. The 24x24 paths live in
`src/data/tech-icons.js`, generated from Simple Icons (CC0) and checked in, so
the site never loads an icon font or a third-party CDN — the same same-origin
rule the SRS applies to the WebGL decoders. Glyphs render in `currentColor` at
rest and only fade to their brand colour on hover, which keeps 46 saturated
logos from overwhelming the lime/dark palette. Content lives in
`src/data/skills.js` (bundled fallback) and the `skillGroups` site_content key.

**Certifications and volunteering** — `certifications` / `volunteering` keys,
rendered by `CertificationsSection.jsx` and `VolunteeringSection.jsx`.
Credential IDs are shown in full so anyone can verify them.

**GitHub contributions** — `GitHubActivity.jsx` renders a contribution
calendar and profile stats. It tries three sources in order:

1. `GET /api/github/:username` on this project's own backend
   (`backend/github.mjs`). This is the good path: one shared rate limit
   instead of one per visitor, an hour of server-side caching, and access to
   `github.com/users/<u>/contributions`, which sends no CORS header and so is
   unreachable from a browser. Set `GITHUB_TOKEN` in `backend/.env` (a PAT
   with no scopes) to use the official GraphQL calendar instead of the HTML
   parse.
2. A public contributions mirror plus `api.github.com` direct from the
   browser, if the backend isn't deployed.
3. A plain note in place of the calendar, if all of that fails. The section
   never renders broken.

Clearing the GitHub username in the admin panel hides the section entirely.

**`/resume`** — a real page (`src/pages/Resume.jsx`) instead of the old modal.
The PDF renders at full shell width inside an `<object>` so a browser that
can't display PDFs inline falls through to a download prompt rather than a
blank frame, and the skills/certifications/volunteering blocks repeat below it
so the page still says something useful when the PDF doesn't render. The nav's
document button now links here; `CvViewer.jsx` was retired.

### Admin panel

Two new tabs: **Skills** (add, reorder and delete groups; add and remove
skills; pick an icon from the bundled set with a live preview, so a slug with
no glyph behind it can't be saved) and **Credentials & GitHub**
(certifications, volunteering, and the GitHub username / headings / API base).

### Sections

`skills`, `certifications`, `volunteering` and `github` were added to the
sections registry, so they can be shown, hidden, reordered and animated on the
**home page** from the Sections Layout tab. Only `github` is on by default —
the other three would duplicate the About page. They always render in full on
`/about` and `/resume` regardless of these switches.

> On an existing `portfolio.db`, `npm run seed` adds the four new section rows
> but leaves existing rows' ordering alone (it uses `INSERT OR IGNORE`), so the
> new ones may land out of order the first time. Drag them into place once in
> the Sections Layout tab and save.

### Recommendations

`RecommendationsSection.jsx` renders the LinkedIn recommendations from the
`recommendations` site_content key (bundled fallback in `src/data/skills.js`).
Each is stored as an array of paragraphs; the card shows the first two and
expands in place, with the full text always in the DOM so it stays indexable.

Two things to know before editing this section:

- The class prefix is `reco`, **not** `rec`. `RecognitionCard.jsx` already owns
  `.rec` / `.rec__foot` for the recognition marquee, and the first version of
  this section silently restyled that whole marquee by reusing them.
- The collapsed state fades with a CSS `mask-image`, not a gradient overlay. An
  overlay has to fade to whatever colour sits behind the text — the card, not
  the page, and different again on hover and in light mode — which paints a
  visible dark band when it's wrong. The mask is background-agnostic.

The admin panel's **Recommendations** tab edits them. The body field is plain
text there, with blank lines separating paragraphs, converted to and from the
stored array on the way in and out — typing JSON is a bad way to write prose.
These are quotes from named real people, so the tab's own copy says to edit
them only to fix a transcription error.

## The RAG assistant (`backend/rag/`)

A retrieval-augmented assistant on the home page. Visitors ask about Husnain's
background; it answers **only** from indexed passages of his own material and
cites them, or says it doesn't know.

### Pipeline

```
sources ──► corpus.mjs ──► chunker.mjs ──► SQLite (rag_chunks)
                                                │
                              retriever.mjs (BM25 + MMR)
                                                │
                                pipeline.mjs (LLM rerank → grounded answer)
                                                │
                                     routes.mjs (/api/rag/*)
```

**Sources**, in descending authority: the live site content in SQLite (what
the admin panel edits — if he changes a fact on the site, the assistant should
say the new one), the five role-specific resumes plus the academic CV, the
cleaned LinkedIn profile, and public GitHub repositories with their READMEs.
Files live in `backend/rag/sources/`.

**Chunking** is two-strategy. Structured site records (a project, a
certification, a job) are already the right size and stay whole — splitting a
project across chunks is what makes a RAG answer attribute the wrong metric to
the wrong system, the single worst failure mode for this corpus. Long documents
split on headings, then on paragraphs with a 180-character overlap.

**Retrieval is BM25, not embeddings.** The corpus is a few hundred chunks about
one person and the queries are overwhelmingly about named things — "VLVRAG",
"FastAPI", "Hariyali", "NASA POWER". Lexical matching is exactly right for
named entities, needs no embedding endpoint (DeepSeek has none), is
deterministic, and costs nothing per query. The recall gap embeddings would
close is handled by query expansion and the rerank stage. Title terms are
weighted ×2, source priors nudge the site above an old resume, and MMR
diversifies so "tell me about his RAG work" doesn't return five near-identical
chunks of one README.

**Reranking** is one cheap LLM call that reorders the shortlist by usefulness
rather than word overlap. It is strictly optional — any failure and the BM25
order stands.

**Generation** is grounded by the system prompt: answer only from the passages,
refuse rather than guess, cite with bracketed numbers, never state a number
that isn't in a passage verbatim. Retrieval finishing before the first token
means the client gets its sources up front and renders them while text streams.

### Setup

```
cd backend
npm run refresh:github     # optional — re-pull repos and READMEs
npm run ingest             # build the knowledge base
npm start
```

`backend/.env` needs `LLM_API_KEY`. `LLM_BASE_URL` and `LLM_MODEL` default to
DeepSeek; every OpenAI-compatible provider (OpenAI, Groq, OpenRouter, Together,
a local Ollama) works by changing those two lines and nothing else.

**The key stays server-side.** The browser calls `/api/rag/*`; it never sees a
provider or a key. That is the entire reason this runs on the backend rather
than in the React app, where the key would be readable by every visitor.
`RAG_RATE_LIMIT` (default 25 questions per IP per 10 minutes) is the throttle
between a public portfolio and a surprise bill.

### Routes

| Route | Auth | Purpose |
| --- | --- | --- |
| `GET /api/rag/meta` | public | readiness, index size, suggested questions |
| `POST /api/rag/ask` | public | question in, grounded answer + sources out |
| `POST /api/rag/stream` | public | the same, server-sent events |
| `POST /api/rag/retrieve` | admin | retrieval only — no LLM call, no cost |
| `POST /api/rag/reindex` | admin | rebuild the index without a restart |

The admin panel's **RAG Assistant** tab wraps the last two. The retrieval probe
there is the one to reach for when an answer is bad: it shows exactly which
passages a question retrieves before any model sees them, so "retrieval missed
it" and "the model mishandled good passages" — which have completely different
fixes — stop being a guess.

### Two things that are easy to get wrong here

- **Citation numbering must be deduplicated before the context is built, not
  after.** Numbering the context `[1..5]` and then collapsing duplicates for
  display produced a visible list reading `[1][2][3][5]` — and a `[4]` in the
  answer pointed at a passage the reader was never shown. Citations that don't
  resolve are worse than no citations: they look like evidence and aren't.
- **The assistant section cannot sit between the hero and services.**
  `FlowingPortrait` interpolates the hero portrait between those two slots as
  you scroll, so anything in between gets the portrait gliding over it.
  Directly after services is the highest position clear of that path, and the
  migration anchors to the services row by lookup rather than to a fixed
  number so it still lands right on a reordered layout.

### Refreshing

Re-run `npm run ingest` after editing site content in the admin panel, dropping
a new resume into `rag/sources/resumes/`, or running `npm run refresh:github`.
Or hit **Rebuild knowledge base** in the admin panel, which does the same
without a restart.

### Running the chatbot in production

The Express server in `backend/` is the local development path. The deployed
site does not use it — it would need a host with a persistent filesystem, and
the browser cannot be handed an API key. Instead the chatbot runs as **Vercel
functions** in `api/rag/`, alongside the static site, on the same origin:

```
api/
  _rag-index.js     generated — the knowledge base as a bundled module
  _engine.js        index provider, rate limiting, request helpers
  rag/meta.js       GET  /api/rag/meta
  rag/ask.js        POST /api/rag/ask
  rag/stream.js     POST /api/rag/stream
```

They import the retrieval and generation code from `backend/rag/` directly
rather than copying it, so there is one implementation to fix. The only thing
that differs is where chunks come from — SQLite locally, `_rag-index.js` in
production — which is why `pipeline.mjs` takes an injected index provider
instead of importing the store. Importing the store there would drag
`better-sqlite3`, a native binary, into a serverless bundle that can neither
build nor use it.

**To deploy:**

1. `cd backend && npm run export:index` — writes `api/_rag-index.js`. Commit it;
   Vercel has no database to read, so this file *is* the knowledge base.
2. In the Vercel dashboard, **Settings → Environment Variables**, set
   `LLM_API_KEY` (and `LLM_BASE_URL` / `LLM_MODEL` if you have moved off
   DeepSeek). The key lives only there and in your local `.env` — never in the
   repo, never in the browser bundle.
3. Deploy. Re-run step 1 and redeploy whenever the content changes.

`vercel.json`'s SPA catch-all excludes `/api/` so the functions are reachable.
Vercel checks the filesystem before applying rewrites, so this is belt and
braces — but the exclusion means nobody has to remember that rule.

**The admin panel is still local-only.** Its routes (`/api/profile`,
`/api/sections`, …) exist on the Express server, not as Vercel functions, so on
the deployed site they 404 and the store falls back to the content bundled into
`src/data/`. That is deliberate: an admin API on a public host needs a database
and a hardening pass that a static portfolio does not otherwise require. Edit
locally, re-export, redeploy.

### It sets itself up now

Three things used to have to happen in the right order before the assistant
would answer, and forgetting any of them produced the same unexplained
"Assistant offline" panel:

- **`npm start` builds the index if it's missing.** Ingestion runs on boot when
  the chunk table is empty, and the server logs whether the assistant came up
  ready and why not if it didn't.
- **New sections no longer need a migration.** The store merges the API's saved
  layout with the code's `DEFAULT_SECTIONS`: the saved layout wins for
  everything it knows about, and any block only the code knows about is spliced
  in at its default position. That is what had gone wrong — the code shipped
  the assistant, the database had never heard of it, and the section silently
  never rendered.
- **The offline panel says which of the three problems it is.** Visitors get a
  plain sentence; in dev only, the exact command to fix it is printed
  underneath.

## Running it: one command

```
npm install            # once, in this folder
cd backend && npm install && cd ..
npm run dev
```

`npm run dev` starts the Vite dev server **and** the API together, in one
terminal with prefixed output, and shuts both down on Ctrl-C. The API builds
the RAG knowledge base on boot if it is missing, and logs whether the
assistant came up ready.

This replaced "run the backend in a second terminal", which is the step that
actually went wrong in practice: forgetting it produced an "Assistant offline"
panel that looked like a bug in the site rather than a process that was never
started. The most common version of the mistake was running `npm start` in
*this* folder, which has no such script — the API's package.json is in
`backend/`.

`npm run dev:web` runs the front end alone; `npm run dev:api` runs the API alone.

### Two load-order traps in the backend

Both of these produced the same misleading symptom — an assistant reporting no
API key from a `.env` that plainly had one — so they are worth knowing about
before editing how the backend boots:

- **`import "dotenv/config"` resolves against the working directory**, not the
  file. Running `node backend/server.mjs` from the project root therefore
  loaded nothing, silently. `backend/env.mjs` now loads `.env` by a path
  derived from its own location.
- **ES modules evaluate every import before any statement in the importing
  module's body.** Calling `dotenv.config()` in `server.mjs`'s body runs it
  *after* `rag/llm.mjs` has already been evaluated. So env loading has to be a
  side-effecting import (`import "./env.mjs"` on the first line), and
  `llm.mjs` reads `process.env` lazily at call time rather than snapshotting it
  at module scope. Either fix alone is enough; both together mean a future
  change to one cannot silently break it again.

### Three kinds of question, not two

Retrieval routes a question one of three ways, and the distinction matters:

| Query | Route | Why |
| --- | --- | --- |
| "Who is Husnain", "what does he do", "summarise him" | **identity** | Reduces to zero search terms (or only overview words), so the profile blocks are returned directly |
| "What is VLVRAG?", "does he know Kotlin?" | **search** | Real terms, real matches |
| "What is the capital of France?" | **refuse** | Real terms, no matches |

The first row is the one that had to be added. His own name is deliberately a
stopword — in a corpus about one person it matches everything and therefore
discriminates nothing — so "Who is Husnain" tokenized to an *empty* query,
matched nothing, and got the refusal meant for off-topic questions. The single
most likely opening question a visitor could ask was the one it couldn't
answer.

An empty token set is not "no answer exists", it is "nothing specific was
asked", which has an obvious right answer. It now returns the identity,
work-history, skills, awards and services blocks — deterministically, and
skipping the reranker, since reshuffling a deliberately ordered list would only
cost a call.

**There is no relevance threshold, on purpose.** A junk question can still
scrape a weak lexical match ("write me a poem" hits a README containing the
word "write"). Measured across this corpus the score distributions overlap —
the weakest genuine question scores 4.35, the strongest junk one 5.46 — so any
cutoff that suppressed the junk would also suppress real questions. Instead,
passages that matched weakly are passed to the model *with a caution*, and the
model, which can actually read them, decides. Withholding evidence from the
judge would be the worse failure.

### Two small front-end fixes worth remembering

**Citation numbers were pinned to the left of their circles.** Not a centring
bug — a specificity one. `.ask__sources span[class]` (0,2,1) outranked
`.ask__src-n` (0,1,0), so the badge's `display: grid` never applied and it fell
back to the wrapper rule's `inline-flex`. In a flex box `place-items` centres
the cross axis only, so the digit sat hard against the left edge. The broad
rule is gone (the `> li > *` rule already styled the wrappers, which is all it
was for) and the badge's `line-height` is collapsed to `1`, since the body's
1.5 builds a 15px line box inside an 18px circle. Measured after: 6.9px each
side, 3.0px top and bottom.

If a badge ever drifts again, measure the computed `display` before touching
the centring properties — a `place-items` that "doesn't work" usually means the
element is not the box type you think it is.

**Volunteering cards are the link, not the small text inside them.** A 300px
card with one corner link reads as clickable long before you find the corner,
so the whole card is an `<a>` (`.vol--link`, with a focus ring — a card-sized
link showing nothing on keyboard focus is unusable). The "View on LinkedIn" cue
is a `<span>`: an anchor inside an anchor is invalid HTML that browsers resolve
by silently closing the outer one.

They point at the LinkedIn profile root. The seeded default used
`/details/volunteer-experiences/`, which is the *owner's* view of that section —
fine when he clicks it, not necessarily resolvable for a visitor.
`resolveHref()` collapses that one stale value back to the profile and leaves
every other href exactly as entered in the admin panel, so it fixes a bad
default without overruling the admin.

### The recommendations vanished — the same bug, a second time

The section disappeared entirely on a database that predated it. `site_content`
is a key/value table, so a content block added in a later release is simply
absent from an older database — and the store *replaced* the bundled content
wholesale with whatever the API returned. The section row merged in correctly,
the component rendered, found no `recommendations` key, and returned `null`.

This is exactly the bug that had already been fixed for `sections`, in the
adjacent line of the same function, and not for `siteContent`. `mergeSiteContent`
now does the per-key merge: anything the database has wins — including a
deliberately emptied array — and only genuinely absent keys fall back to
`src/data/`. New content blocks appear on their own, like new sections do.

**If a block is defined in code but missing on screen, check the merge before
checking the component.** Both halves of that reconciliation now behave the
same way, so this class of failure should be finished.

### Recommendations are a marquee, not a grid

They ride the existing `Marquee`, which already does everything needed: the
Motion Kernel drives it on FULL, a CSS keyframe on MID, and it goes static on
LITE or with motion off. Track items get a fixed `width` with `flex: none` —
without a definite basis, flexbox sizes each card to its own text and the strip
pulses as it scrolls.

`Marquee` gained a `paused` prop. Hover already eases the strip to a halt, but
an expanded card needs it held open past that: without it the recommendation
you just opened slides out from under you while you are reading it.

One consequence worth knowing when testing: a moving element cannot be clicked
by an automated driver, which refuses to act on an unstable target and so never
hovers, and therefore never triggers the pause. Hover explicitly first, then
click. A real visitor does this without thinking.

---

## Layout stability and off-screen work (Aug 2026)

Four items came in from a UX review. Two were real, two were not; all four were
measured before anything was changed, because a fix aimed at the wrong cause is
worse than no fix — it looks like diligence and leaves the bug in place.

### 1. "Flash of inaccurate content" — real

The store renders bundled content first and the API's content second (see
*Editing content*). That is deliberate: it is what makes first paint instant and
what keeps the site up when the API is unreachable. But the bundled copy was the
hand-written `src/data/` content and the live copy came from the database, so
where the two disagreed the page rewrote itself a few hundred milliseconds in.

Three separate causes, three separate fixes:

**a. The bundled content was not the live content.**
`scripts/snapshot-content.mjs` runs before `vite build`, reads the repository
directly, and writes the result into `src/data/snapshot.generated.js`.
`fallback.js` prefers it per key. The endpoints it stands in for
(`api/profile.js`, `projects.js`, `posts.js`, `site.js`, `sections.js`) all
return `await db.<method>()` verbatim, so the payloads are byte-identical — if
one of them ever starts reshaping its result, the snapshot has to reshape it the
same way, or this quietly stops being true.

It can never fail a build: no `DATABASE_URL`, an unreachable database, or a
database with no profile row all leave the snapshot `null` and the build
proceeds on bundled content. Drafts are stripped — the only deliberate
difference from the API response, and the reason the store may still take one
(invisible) update of the posts list.

`snapshot.generated.js` is committed holding `null`. It is imported statically,
so ignoring it would break `npm run dev` on a fresh clone. Cost: **+1.6 kB
gzipped**, because the hand-written content stays in the bundle as the fallback
and the two compress well together.

**b. An identical payload still re-rendered.** Zustand compares by reference, so
a freshly parsed but identical object re-rendered every subscriber. With the
snapshot in place that is now the *normal* case, so `keepIfUnchanged` in
`store.js` keeps the existing object when a stringify comparison matches. Key
order is stable because both sides come out of the same serializer; a false
negative costs one render, which is the old behaviour.

**c. Two things genuinely cannot be known at build time**, and both were bigger
than the content problem:

- The **GitHub calendar** is a live third-party call. Its arrival grew the
  section by **318px**. It now renders a full-size skeleton — 53 empty weeks and
  four blank stat tiles — so the response changes colours and numbers, not
  geometry. The "Loading…" line moved into a visually-hidden `role="status"`,
  because a visible line is itself a height the loaded state does not have.
- The **assistant's readiness** comes from `/api/rag/meta`. Its arrival moved
  the panel by 24px: the starter chips did not exist until the response landed,
  and the model chip made the status bar 4px taller. The chips now render from
  `src/data/suggested-questions.js` — re-exported by `backend/rag/pipeline.mjs`
  so the browser and the server return the same six strings, *one list, not two
  that drift* — and `.ask__bar` reserves the chip's height.

The offline state is genuinely shorter than a working panel, and no floor
reconciles a two-sentence message with an input row and six chips without
leaving a cavern. `.ask__body` has a `min-height` that bounds that shrink rather
than pretending to eliminate it.

Result, measured by holding the API for 1.2s and diffing the DOM at first paint
against the settled state: **no section changes height**. The only text that
changes is placeholders filling in inside boxes that were already the right
size.

### 2. Text contrast — real, and worse than reported

The review said `--text-faint` was about 3.3:1. Computed properly it was
**4.06:1** in dark mode — still an AA failure for body text, but not that
number — and **3.07:1** in light mode, which the review had not looked at and
which was the worse of the two. Both were raised (dark `.42 → .48`, light
`.46 → .62`) and now measure **4.91:1** and **5.08:1**.

Worth doing the arithmetic rather than trusting the estimate: had the fix been
sized to 3.3:1, light mode would still have been failing afterwards.

### 3. "The WebGL tax on scrolling" — did not apply as described

The review asked for the WebGL render loop to be paused off-screen. There is no
WebGL render loop to pause: `FlowingPortrait` is a DOM `<img>` with
`style.transform` (zero canvas or three.js references), there is no `.glb` in
`public/models/`, so `AvatarCanvas` never mounts, and the Motion Kernel already
stops entirely on `visibilitychange`.

The *idea* under the claim was sound, though, for the animations that do exist.
`useInViewport` gates kernel subscribers on visibility, and `Marquee` and
`FlowingPortrait` use it. Off-screen style writes went from ~60/s to **0**;
`rootMargin: 20%` restarts them before they are visible, so nothing is ever seen
catching up. The hook starts `true` so above-the-fold elements animate on the
first frame instead of waiting for the observer's first callback.

### 4. Missing form submission feedback — already implemented, with one real gap

`ContactForm` already had `status === "sending"`, a disabled button and a
"Sending…" label. What it did not have was a guard against submission that does
not go through the button at all: **Enter in any text field submits a form, and
a disabled submit button does not prevent it**. One line at the top of
`onSubmit` closes that, plus `aria-busy` on the form. Verified by clicking and
then pressing Enter: one network POST.

### Verifying all of it

`verify-ux.mjs` (not committed — a session tool) drives Playwright against a
production build served the way Vercel serves it. Two things it has to do that
are easy to get wrong:

- **Force the FULL tier.** Headless Chromium reports few cores, and
  `capability.js` rejects SwiftShader by name, so the marquees fall back to the
  CSS transport and the kernel gate under test never runs. The context script
  overrides `deviceMemory`/`hardwareConcurrency` and hides
  `WEBGL_debug_renderer_info`.
- **Separate first paint from the settled state.** Route interception holds the
  API for 1.2s; without that the two snapshots are taken after the same event
  and every comparison passes trivially.
