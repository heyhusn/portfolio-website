/**
 * ADR-09 — Capability tier and motion mode.
 *
 * CapabilityTier ∈ { FULL, MID, LITE }
 *   FULL  desktop-class device with memory and cores to spare, fine pointer,
 *         a healthy network and a working WebGL2 context. Only FULL may mount
 *         the WebGL scene, and therefore only FULL may render the avatar
 *         (FR-AVT-01).
 *   MID   capable enough for CSS transitions and the ticker, not for WebGL.
 *   LITE  small, slow, data-saving or unknown. Static everything.
 *
 * MotionMode ∈ { FULL, OFF }
 *   OFF whenever the OS reports prefers-reduced-motion: reduce, or the visitor
 *   turns motion off in the site's own control. OFF suppresses the ticker
 *   entirely and forces the avatar to its poster (FR-AVT-01/02).
 *
 * The first pass runs in an inline <head> script before paint and writes
 * data-tier / data-motion onto <html>. This module re-reads those attributes,
 * refines the tier with a real WebGL2 probe (which is too expensive for the
 * inline pass), and keeps both values in sync with live media queries.
 */

export const TIER = { FULL: "FULL", MID: "MID", LITE: "LITE" };
export const MOTION = { FULL: "FULL", OFF: "OFF" };

const STORAGE_KEY = "portfolio:motion";

let webglProbe; // memoised: creating a context is not free

/**
 * FR-WGL — a tier is only FULL if a WebGL2 context can actually be created.
 * A device that reports eight cores but refuses a context (blocklisted driver,
 * headless, GPU process crashed) must degrade, not throw at mount time.
 */
export function probeWebGL() {
  if (webglProbe !== undefined) return webglProbe;
  if (typeof document === "undefined") return (webglProbe = false);
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true }) || null;
    if (!gl) return (webglProbe = false);
    // A software rasteriser passes getContext but cannot hold 60fps.
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
    const software = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
    const lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext(); // release the probe context immediately
    return (webglProbe = !software);
  } catch {
    return (webglProbe = false);
  }
}

function readAttr(name, fallback) {
  if (typeof document === "undefined") return fallback;
  return document.documentElement.getAttribute(name) || fallback;
}

/** Resolve the tier, refining the pre-paint guess with the WebGL2 probe. */
export function resolveTier() {
  const preliminary = readAttr("data-tier", TIER.LITE);
  if (preliminary !== TIER.FULL) return preliminary;
  return probeWebGL() ? TIER.FULL : TIER.MID;
}

/** The OS-level preference, before the visitor's own override. */
export function systemMotion() {
  if (typeof window === "undefined") return MOTION.OFF;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? MOTION.OFF
    : MOTION.FULL;
}

/** The visitor's stored override, if they have set one. */
export function storedMotion() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === MOTION.OFF || v === MOTION.FULL ? v : null;
  } catch {
    return null;
  }
}

export function persistMotion(mode) {
  try {
    if (mode === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* private mode — the session-only value still applies */
  }
}

export function resolveMotion() {
  return storedMotion() ?? systemMotion();
}

/** Subscribe to OS-level reduced-motion changes. */
export function watchSystemMotion(cb) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handler = () => cb(mq.matches ? MOTION.OFF : MOTION.FULL);
  mq.addEventListener?.("change", handler);
  return () => mq.removeEventListener?.("change", handler);
}

/** Device pixel ratio, clamped — ADR-09's DPR clamp for the WebGL scene. */
export function clampedDpr(tier) {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  if (tier === TIER.FULL) return Math.min(dpr, 2);
  return 1;
}
