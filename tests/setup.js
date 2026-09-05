import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

/**
 * jsdom implements neither of the two browser APIs this codebase is built on,
 * so both are stubbed here rather than in every test file.
 *
 *  - matchMedia: the capability tier, the motion mode and three components all
 *    read it. The default answers "no" to every query, which is the
 *    conservative branch everywhere; individual tests override it.
 *  - IntersectionObserver: useInViewOnce / useInViewport gate the reveals and
 *    the WebGL mount on it. The stub reports nothing, so tests that need an
 *    intersection drive it explicitly.
 */

if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

if (!window.IntersectionObserver) {
  class StubIntersectionObserver {
    constructor(callback) {
      this.callback = callback;
      this.elements = new Set();
    }
    observe(el) {
      this.elements.add(el);
    }
    unobserve(el) {
      this.elements.delete(el);
    }
    disconnect() {
      this.elements.clear();
    }
    /** Test helper: fire the callback for everything currently observed. */
    trigger(isIntersecting = true) {
      this.callback(
        [...this.elements].map((target) => ({
          target,
          isIntersecting,
          boundingClientRect: { bottom: isIntersecting ? 10 : -10 },
        })),
        this
      );
    }
  }
  window.IntersectionObserver = StubIntersectionObserver;
  globalThis.IntersectionObserver = StubIntersectionObserver;
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  globalThis.ResizeObserver = window.ResizeObserver;
}

/** jsdom has no rAF timing model; a microtask-ish shim is enough here. */
if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
  window.cancelAnimationFrame = (id) => clearTimeout(id);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
