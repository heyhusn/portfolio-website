/**
 * FR-AVT-06 — Draco / Meshopt / KTX2 decoder assets are served from this
 * origin. These are the only paths the loader is allowed to know about, and
 * scripts/check-model-budget.mjs greps this directory for third-party origins
 * on every build.
 *
 * The files are copied out of the `three` package into /public/decoders by
 * scripts/copy-decoders.mjs at install time, so they ship inside Vercel's
 * static output and are versioned with the site.
 */
export const DRACO_PATH = "/decoders/draco/";
export const KTX2_TRANSCODER_PATH = "/decoders/basis/";

/** How long a model fetch may take before we give up and keep the poster. */
export const MODEL_FETCH_TIMEOUT_MS = 5000; // FR-AVT-09
