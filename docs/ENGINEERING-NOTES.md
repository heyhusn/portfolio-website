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
geometry compression. `public/models/README.md` has the exact pipeline and how to
re-run it if you re-export.

To replace it: drop a new `avatar.glb` in `public/models/` and run `npm run build`.

**The poster is the element, not the fallback.** `SignatureScene` always renders
`avatar-poster.webp` — a 32 KB transparent render of the same model, captured from
the canvas framebuffer at the hero's exact camera and lighting, so the static and
live states are indistinguishable — at the size the layout expects; the canvas is an absolutely
positioned layer that fades in on top of it only when every gate opens. There is
no state in which the box changes size, which makes "no layout shift" structural
rather than a promise.

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
| FR-AVT-08 | `webglcontextlost` is prevented, the poster takes over, and a generation counter remounts the scene on restore — with a timer fallback for drivers that never fire `contextrestored` |
| FR-AVT-09 | Preflight fetch with `AbortController` and a 5s timeout; an error boundary catches render failures; `main.jsx` suppresses asset-pipeline rejections only |
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

Both builds were rendered and compared programmatically. Layout geometry and all
design tokens match. The avatar module was exercised end to end against a test
model — the FULL path, the reduced-motion path, a failed fetch, and a forced
context loss and recovery — with no console errors and no unhandled rejections in
any of them. The compression gate was confirmed to reject an uncompressed export.

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
