import { describe, it, expect, beforeEach, vi } from "vitest";
import motionKernel, { PRIORITY } from "../src/motion/kernel.js";

/**
 * ADR-02 — the Motion Kernel is the one rAF loop for the document, and most of
 * its value is in what it refuses to do: run with no subscribers, run while the
 * tab is hidden, run when motion is off, or let one broken subscriber take the
 * loop down. Those are the properties tested here, because those are the ones
 * a refactor is most likely to break silently.
 */

/** Drive the loop by hand: rAF is stubbed, so frames only happen when asked. */
function makeFrameDriver() {
  const queued = [];
  vi.stubGlobal("requestAnimationFrame", (cb) => {
    queued.push(cb);
    return queued.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  return {
    get pending() {
      return queued.length;
    },
    /** Run exactly one queued frame at `t` ms. */
    step(t) {
      const cb = queued.shift();
      if (cb) cb(t);
    },
  };
}

describe("motionKernel", () => {
  let driver;

  beforeEach(() => {
    motionKernel.stop();
    motionKernel.subs.clear();
    motionKernel.ordered = [];
    motionKernel.setEnabled(true);
    motionKernel.enabled = true;
    driver = makeFrameDriver();
  });

  it("does not schedule a frame until something subscribes", () => {
    expect(driver.pending).toBe(0);
    const off = motionKernel.subscribe(() => {});
    expect(driver.pending).toBe(1);
    off();
  });

  it("stops scheduling once the last subscriber leaves", () => {
    const off = motionKernel.subscribe(() => {});
    driver.step(16);
    expect(driver.pending).toBe(1); // rescheduled itself
    off();
    driver.step(32); // the queued callback runs but must not reschedule
    expect(driver.pending).toBe(0);
  });

  it("runs subscribers in priority order, low first", () => {
    const order = [];
    motionKernel.subscribe(() => order.push("render"), PRIORITY.RENDER);
    motionKernel.subscribe(() => order.push("read"), PRIORITY.READ);
    motionKernel.subscribe(() => order.push("default"), PRIORITY.DEFAULT);

    driver.step(16);
    expect(order).toEqual(["read", "default", "render"]);
  });

  it("clamps dt so a backgrounded tab cannot produce a huge first step", () => {
    const seen = [];
    motionKernel.subscribe((frame) => seen.push(frame.dt));

    driver.step(1000); // first frame: dt is 0, there is no previous timestamp
    driver.step(11000); // ten seconds later
    expect(seen[0]).toBe(0);
    expect(seen[1]).toBeLessThanOrEqual(1 / 20);
  });

  it("delivers exactly one terminal frame when motion is switched off", () => {
    const frames = [];
    motionKernel.subscribe((frame) => frames.push({ ...frame }));
    driver.step(16);
    const before = frames.length;

    motionKernel.setEnabled(false);
    expect(frames.length).toBe(before + 1);
    expect(frames.at(-1).terminal).toBe(true);
    expect(frames.at(-1).dt).toBe(0);

    // And then nothing, however many frames are driven.
    driver.step(32);
    driver.step(48);
    expect(frames.length).toBe(before + 1);
  });

  it("gives a subscriber that joins while motion is off its resting state", () => {
    motionKernel.setEnabled(false);
    const frames = [];
    motionKernel.subscribe((frame) => frames.push(frame));
    expect(frames).toHaveLength(1);
    expect(frames[0].terminal).toBe(true);
    // No loop was started for it.
    expect(driver.pending).toBe(0);
  });

  it("keeps running when a subscriber throws", () => {
    const healthy = vi.fn();
    motionKernel.subscribe(() => {
      throw new Error("boom");
    });
    motionKernel.subscribe(healthy);

    expect(() => driver.step(16)).not.toThrow();
    expect(healthy).toHaveBeenCalledTimes(1);
    expect(driver.pending).toBe(1);
  });

  it("reports scroll position and a smoothed velocity on the frame", () => {
    const frames = [];
    motionKernel.subscribe((frame) => frames.push({ ...frame }));

    window.scrollY = 0;
    driver.step(16);
    window.scrollY = 120;
    driver.step(32);

    expect(frames.at(-1).scrollY).toBe(120);
    expect(frames.at(-1).scrollDelta).toBe(120);
    expect(frames.at(-1).velocity).toBeGreaterThan(0);
  });
});
