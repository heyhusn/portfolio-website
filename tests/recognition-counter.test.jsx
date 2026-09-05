import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

/**
 * The recognition marquee shipped two stat cards that permanently rendered
 * their initial zero: "0.00" under "CGPA across the B.S. Software Engineering
 * programme" and "0/16" under "held-out lectures where VLVRAG beat its
 * baseline". Both sat directly beneath a heading reading "the numbers that
 * survived an audit", so the failure did not merely hide a figure — it
 * asserted the opposite of the fact it was reporting.
 *
 * Cause: useCounter gated its count-up on useInViewOnce({ threshold: 0.4 }).
 * These cards ride a horizontally transported track that is wider than the
 * viewport, and the duplicated half of that track is aria-hidden but still
 * mounts the hook, so a vertical-intersection gate is the wrong trigger for
 * them and frequently never fires at all.
 *
 * The stub IntersectionObserver in tests/setup.js reports nothing, which
 * reproduces that production condition exactly: if the value is gated, it
 * stays at zero here.
 */

vi.mock("../src/motion/MotionProvider.jsx", () => ({
  useMotion: () => ({ animate: true, tier: "FULL", motion: "FULL" }),
  MOTION: { FULL: "FULL", OFF: "OFF" },
  TIER: { FULL: "FULL", MID: "MID", LITE: "LITE" },
}));

// Stand in for the rAF-driven kernel: any active subscriber is handed a single
// terminal frame synchronously, so a counter that is allowed to run settles on
// its target immediately and one that is gated off stays at zero.
vi.mock("../src/motion/kernel.js", () => {
  const motionKernel = {
    subscribe: (fn) => {
      fn({ elapsed: 0, delta: 0, terminal: true });
      return () => {};
    },
  };
  return {
    motionKernel,
    default: motionKernel,
    PRIORITY: { DEFAULT: 0, LOW: -1, HIGH: 1 },
  };
});

const { default: RecognitionCard } = await import(
  "../src/components/RecognitionCard.jsx"
);

describe("recognition stat cards", () => {
  it("reaches its value without ever intersecting the viewport", () => {
    render(
      <RecognitionCard
        item={{
          kind: "stat",
          value: 3.94,
          decimals: 2,
          text: "CGPA across the B.S. Software Engineering programme, out of 4.00.",
        }}
      />
    );

    expect(screen.getByText("3.94")).toBeInTheDocument();
    expect(screen.queryByText("0.00")).not.toBeInTheDocument();
  });

  it("renders a suffixed stat rather than a bare zero", () => {
    render(
      <RecognitionCard
        item={{
          kind: "stat",
          value: 16,
          suffix: "/16",
          text: "Held-out lectures where VLVRAG beat its baseline.",
        }}
      />
    );

    expect(screen.getByText("16/16")).toBeInTheDocument();
    expect(screen.queryByText("0/16")).not.toBeInTheDocument();
  });

  it("still renders award cards, which carry no counter", () => {
    render(
      <RecognitionCard
        item={{
          kind: "award",
          text: "Best Final Year Project Award — Software Engineering department.",
          source: "UMT",
          detail: "Big Brains",
        }}
      />
    );

    expect(screen.getByText(/Best Final Year Project Award/)).toBeInTheDocument();
    expect(screen.getByText("Big Brains")).toBeInTheDocument();
  });
});
