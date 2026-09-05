import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

/**
 * The marquee has three modes, and the third one was broken in a way that hid
 * content rather than degrading it.
 *
 * Every phone resolves to the LITE tier. `.marquee` is `overflow: hidden`, and
 * on a 393px viewport the tracks measure 1,900–3,500px. "No transport" was
 * implemented as a frozen track, so on mobile the second recognition card, the
 * second recommendation and everything after them existed in the DOM with no
 * way for anyone to reach them. Reduced-motion visitors on desktop hit exactly
 * the same wall.
 *
 * Auto-play is not the fix: content that moves by itself needs a pause
 * mechanism (WCAG 2.2.2), and the CSS marquee's is `:hover`, which a
 * touchscreen does not have. So the untransported mode hands the scroll to the
 * visitor, and these tests hold that line.
 */

const mocks = vi.hoisted(() => ({ motion: { tier: "FULL", motion: "FULL" } }));

vi.mock("../src/motion/MotionProvider.jsx", () => ({
  useMotion: () => mocks.motion,
  MOTION: { FULL: "FULL", OFF: "OFF" },
  TIER: { FULL: "FULL", MID: "MID", LITE: "LITE" },
}));

const { default: Marquee } = await import("../src/components/Marquee.jsx");

function setTier(tier, motion = "FULL") {
  mocks.motion.tier = tier;
  mocks.motion.motion = motion;
}

function renderStrip() {
  return render(
    <Marquee>
      <div>Card one</div>
      <div>Card two</div>
      <div>Card three</div>
    </Marquee>
  );
}

beforeEach(() => setTier("FULL"));

describe("Marquee transport modes", () => {
  it("is kernel-driven on FULL", () => {
    const { container } = renderStrip();
    expect(container.querySelector(".marquee")).toHaveAttribute("data-transport", "kernel");
  });

  it("is CSS-driven on MID", () => {
    setTier("MID");
    const { container } = renderStrip();
    expect(container.querySelector(".marquee")).toHaveAttribute("data-transport", "css");
  });

  it("becomes a scroller on LITE — the tier every phone gets", () => {
    setTier("LITE");
    const { container } = renderStrip();
    expect(container.querySelector(".marquee")).toHaveAttribute("data-transport", "scroll");
  });

  it("becomes a scroller when motion is off, on any tier", () => {
    for (const tier of ["FULL", "MID", "LITE"]) {
      setTier(tier, "OFF");
      const { container, unmount } = renderStrip();
      expect(container.querySelector(".marquee")).toHaveAttribute("data-transport", "scroll");
      unmount();
    }
  });
});

describe("the scroller is reachable", () => {
  it("can hold focus, so it can be scrolled from the keyboard", () => {
    // A scrollable region that cannot take focus cannot be operated without a
    // pointer at all — WCAG 2.1.1.
    setTier("LITE");
    const { container } = renderStrip();
    const strip = container.querySelector(".marquee");
    expect(strip).toHaveAttribute("tabindex", "0");
    expect(strip).toHaveAttribute("role", "group");
    expect(strip.getAttribute("aria-label")).toMatch(/scroll|swipe|arrow/i);
  });

  it("is not a tab stop when something else is doing the transporting", () => {
    for (const tier of ["FULL", "MID"]) {
      setTier(tier);
      const { container, unmount } = renderStrip();
      expect(container.querySelector(".marquee")).not.toHaveAttribute("tabindex");
      unmount();
    }
  });

  it("renders each card once when scrollable — no aria-hidden duplicate", () => {
    // The duplicate exists to hide the seam of a moving strip. A scroller has
    // no seam, and a second identical copy would double the swipe distance.
    setTier("LITE");
    const { container } = renderStrip();
    expect(screen.getAllByText("Card one")).toHaveLength(1);
    expect(container.querySelectorAll('.marquee__track > [aria-hidden="true"]')).toHaveLength(0);
  });

  it("still renders the duplicate for the transported modes", () => {
    setTier("FULL");
    const { container } = renderStrip();
    expect(container.querySelectorAll('.marquee__track > [aria-hidden="true"]')).toHaveLength(3);
    expect(screen.getAllByText("Card one")).toHaveLength(2);
  });

  it("keeps every card in the document in all three modes", () => {
    for (const tier of ["FULL", "MID", "LITE"]) {
      setTier(tier);
      const { unmount } = renderStrip();
      expect(screen.getAllByText("Card three").length).toBeGreaterThan(0);
      unmount();
    }
  });
});
