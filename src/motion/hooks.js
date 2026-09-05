import { useEffect, useRef, useState, useCallback } from "react";
import motionKernel, { PRIORITY } from "./kernel.js";
import { useMotion } from "./MotionProvider.jsx";

/* ------------------------------------------------------------------ *
 * Shared IntersectionObserver pool.
 *
 * The static build created a new observer per effect. One observer per unique
 * option set, shared across every element, costs less and keeps the callback
 * count down on long pages.
 * ------------------------------------------------------------------ */
const pools = new Map();

function getPool(options) {
  const key = JSON.stringify(options);
  let pool = pools.get(key);
  if (pool) return pool;

  const callbacks = new WeakMap();
  const observer =
    typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver((entries) => {
          for (const entry of entries) {
            const cb = callbacks.get(entry.target);
            if (cb) cb(entry, observer);
          }
        }, options);

  pool = {
    observe(el, cb) {
      if (!observer) {
        cb({ isIntersecting: true, target: el }, null);
        return () => {};
      }
      callbacks.set(el, cb);
      observer.observe(el);
      return () => {
        callbacks.delete(el);
        observer.unobserve(el);
      };
    },
  };
  pools.set(key, pool);
  return pool;
}

/**
 * Fires once, the first time the element enters the viewport, then stops
 * observing. The building block for reveals, counters and the WebGL mount gate.
 */
export function useInViewOnce(options = { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const pool = getPool(options);
    const stop = pool.observe(el, (entry, observer) => {
      // `isIntersecting` is the normal path. The second clause is the safety
      // net: a fast or programmatic scroll can carry an element past the
      // viewport between two observer ticks, and the only entry we then get is
      // a non-intersecting one for an element already above the fold. Without
      // this, that element stays at opacity 0 forever.
      const scrolledPast = entry.boundingClientRect.bottom <= 0;
      if (!entry.isIntersecting && !scrolledPast) return;
      setInView(true);
      observer?.unobserve(entry.target);
    });
    return stop;
    // options is a stable literal per call site in this codebase
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  return [ref, inView];
}

/**
 * Continuous version of useInViewOnce: tracks visibility for the element's
 * whole life instead of latching on the first entry.
 *
 * This exists to gate per-frame work. The Motion Kernel already stops the
 * whole loop when the tab is hidden, but a subscriber whose element has
 * scrolled out of the viewport is still stepped every frame on a tab that is
 * very much visible — writing transforms nobody can see. `useTicker`'s
 * `active` flag is the off switch; this hook is what decides when to flip it.
 *
 * The default rootMargin deliberately runs ahead of the viewport: work
 * resumes a little before the element is on screen, so the first visible
 * frame is already correct rather than a stale position from wherever the
 * animation was frozen.
 *
 * Starts true, not false. An element that is above the fold must animate on
 * the very first frame; waiting for the observer's first callback would cost
 * it a frame or two of stillness on every page load.
 */
export function useInViewport(options = { rootMargin: "20% 0px" }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const pool = getPool(options);
    return pool.observe(el, (entry) => setInView(entry.isIntersecting));
    // options is a stable literal per call site in this codebase
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [ref, inView];
}

/**
 * Subscribe a callback to the one Motion Kernel ticker (ADR-02).
 * `active` lets a component hold its place in the subscriber list without
 * paying for frames it does not need — e.g. an off-screen parallax.
 */
export function useTicker(fn, { active = true, priority = PRIORITY.DEFAULT } = {}) {
  const cb = useRef(fn);
  cb.current = fn;

  useEffect(() => {
    if (!active) return;
    return motionKernel.subscribe((frame) => cb.current(frame), priority);
  }, [active, priority]);
}

/**
 * Scroll reveal. Identical visual result to the static build's
 * `[data-reveal] → .is-in` pass, but driven by the shared observer, and it
 * settles instantly when motion is off.
 */
export function useReveal(delay = 0) {
  const { animate } = useMotion();
  const [ref, inView] = useInViewOnce();
  const shown = !animate || inView;

  return {
    ref,
    props: {
      "data-reveal": "",
      ...(delay ? { "data-reveal-delay": String(delay) } : null),
      className: shown ? "is-in" : undefined,
    },
    shown,
  };
}

/**
 * Counting statistic. Same cubic ease-out and 1.5s duration as the original,
 * but stepped by the shared ticker instead of its own rAF loop.
 */
export function useCounter(target, { suffix = "", duration = 1.5, decimals = 0 } = {}) {
  const { animate } = useMotion();
  const [ref, inView] = useInViewOnce({ threshold: 0.4 });
  const [value, setValue] = useState(() => (animate ? 0 : target));
  const startedAt = useRef(0);
  const done = useRef(false);

  const running = animate && inView && !done.current;

  useTicker(
    (frame) => {
      if (frame.terminal) {
        setValue(target);
        done.current = true;
        return;
      }
      if (!startedAt.current) startedAt.current = frame.elapsed;
      const p = Math.min((frame.elapsed - startedAt.current) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p >= 1) {
        setValue(target);
        done.current = true;
      }
    },
    { active: running }
  );

  useEffect(() => {
    if (!animate) setValue(target);
  }, [animate, target]);

  const shown = decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
  return [ref, `${shown}${suffix}`];
}

/**
 * Reads a fresh measurement whenever the element resizes. Used by the marquee
 * so its transport speed stays correct across breakpoints.
 */
export function useMeasure() {
  const ref = useRef(null);
  const [rect, setRect] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setRect((prev) =>
        Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1
          ? prev
          : { width, height }
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, rect];
}

/** Stable callback ref that also exposes the node in state. */
export function useNode() {
  const [node, setNode] = useState(null);
  const ref = useCallback((el) => setNode(el), []);
  return [ref, node];
}
