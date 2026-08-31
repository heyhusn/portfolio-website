/**
 * ADR-02 — Motion Kernel.
 *
 * One requestAnimationFrame loop for the whole document. Every animated effect
 * on the site — counters, hero parallax, marquee transport, the WebGL avatar's
 * baked clips — subscribes to this ticker. Nothing else is allowed to call
 * requestAnimationFrame (FR-AVT-07: "the avatar module shall not register its
 * own render loop").
 *
 * Why one loop: N independent rAF loops each pay their own callback and layout
 * cost, and they interleave unpredictably, so a frame budget can be blown by
 * effects that individually look cheap. One loop reads scroll state once per
 * frame and hands the same snapshot to every subscriber.
 *
 * The loop:
 *   - does not start until something subscribes,
 *   - stops entirely when the last subscriber leaves,
 *   - stops while the document is hidden and resumes without a time jump,
 *   - clamps dt so a backgrounded tab cannot produce a huge first step,
 *   - never runs at all when MotionMode is OFF; subscribers are instead called
 *     once with a terminal frame so they can settle to their final state.
 */

const MAX_DT = 1 / 20; // seconds — clamp after a tab regains focus

class MotionKernel {
  constructor() {
    /** @type {Set<{fn: Function, priority: number}>} */
    this.subs = new Set();
    this.ordered = [];
    this.raf = 0;
    this.running = false;
    this.enabled = true;
    this.last = 0;
    this.elapsed = 0;
    this.frame = {
      dt: 0,
      elapsed: 0,
      scrollY: 0,
      scrollDelta: 0,
      velocity: 0,
      viewportH: 0,
      frameCount: 0,
    };
    this._lastScrollY = 0;
    this._tick = this._tick.bind(this);
    this._onVisibility = this._onVisibility.bind(this);

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this._onVisibility, { passive: true });
    }
  }

  /**
   * Subscribe to the ticker.
   * @param {(frame: object) => void} fn
   * @param {number} priority lower runs first. Layout readers use < 0.
   * @returns {() => void} unsubscribe
   */
  subscribe(fn, priority = 0) {
    const entry = { fn, priority };
    this.subs.add(entry);
    this._reorder();
    this._maybeStart();

    // MotionMode OFF: deliver exactly one terminal frame so the effect can
    // paint its resting state, then never call it again.
    if (!this.enabled) {
      this._readScroll();
      try {
        fn({ ...this.frame, dt: 0, terminal: true });
      } catch (err) {
        report(err);
      }
    }

    return () => {
      this.subs.delete(entry);
      this._reorder();
      if (!this.subs.size) this.stop();
    };
  }

  /** Called by the motion-mode store when the user's preference changes. */
  setEnabled(enabled) {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
      this._readScroll();
      this._forEach((fn) => fn({ ...this.frame, dt: 0, terminal: true }));
    } else {
      this.last = 0;
      this._maybeStart();
    }
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.running = false;
  }

  /** Current frame snapshot, for effects that need it outside a tick. */
  snapshot() {
    this._readScroll();
    return { ...this.frame };
  }

  /* ---------------- internals ---------------- */

  _reorder() {
    this.ordered = [...this.subs].sort((a, b) => a.priority - b.priority);
  }

  _maybeStart() {
    if (this.running || !this.enabled || !this.subs.size) return;
    if (typeof document !== "undefined" && document.hidden) return;
    this.running = true;
    this.last = 0;
    this.raf = requestAnimationFrame(this._tick);
  }

  _onVisibility() {
    if (document.hidden) this.stop();
    else this._maybeStart();
  }

  _readScroll() {
    if (typeof window === "undefined") return;
    const y = window.scrollY || window.pageYOffset || 0;
    this.frame.scrollDelta = y - this._lastScrollY;
    this._lastScrollY = y;
    this.frame.scrollY = y;
    this.frame.viewportH = window.innerHeight || 0;
  }

  _forEach(cb) {
    for (const entry of this.ordered) {
      try {
        cb(entry.fn);
      } catch (err) {
        report(err);
      }
    }
  }

  _tick(now) {
    if (!this.running) return;

    const t = now / 1000;
    const dt = this.last ? Math.min(t - this.last, MAX_DT) : 0;
    this.last = t;
    this.elapsed += dt;

    this._readScroll();
    // Exponential smoothing keeps velocity usable for scroll-coupled motion
    // without the jitter of a raw per-frame delta.
    const instant = dt > 0 ? this.frame.scrollDelta / dt : 0;
    this.frame.velocity += (instant - this.frame.velocity) * Math.min(1, dt * 8);
    this.frame.dt = dt;
    this.frame.elapsed = this.elapsed;
    this.frame.frameCount += 1;
    this.frame.terminal = false;

    const snapshot = this.frame;
    this._forEach((fn) => fn(snapshot));

    if (this.subs.size && this.enabled) {
      this.raf = requestAnimationFrame(this._tick);
    } else {
      this.running = false;
      this.raf = 0;
    }
  }
}

function report(err) {
  // A broken subscriber must never take the loop down with it.
  if (import.meta.env?.DEV) console.error("[motion-kernel] subscriber threw:", err);
}

export const motionKernel = new MotionKernel();

/** Priorities, so subscribers that read layout run before those that write it. */
export const PRIORITY = {
  READ: -10,
  DEFAULT: 0,
  RENDER: 10,
};

export default motionKernel;
