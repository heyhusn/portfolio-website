import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

/**
 * The accessibility fundamentals that a client-side router quietly removes and
 * that nothing else in the app puts back: a way past the nav, a landmark to
 * land in, and something that speaks when the page changes.
 *
 * These are the kind of thing that regress the moment Layout is refactored,
 * because nothing visible breaks when they go.
 */

vi.mock("../src/components/TvStaticBackground.jsx", () => ({ default: () => null }));
vi.mock("../src/components/CustomCursor.jsx", () => ({ default: () => null }));
vi.mock("../src/components/Nav.jsx", () => ({
  default: () => (
    <header>
      <a href="/about">About</a>
    </header>
  ),
}));
vi.mock("../src/components/Footer.jsx", () => ({ default: () => <footer /> }));
vi.mock("../src/components/ThemeToggle.jsx", () => ({
  ThemeFloatingWidget: () => null,
  default: () => null,
}));
vi.mock("../src/motion/MotionProvider.jsx", () => ({
  useMotion: () => ({ tier: "FULL", motion: "FULL", animate: true, webgl: false }),
  MOTION: { FULL: "FULL", OFF: "OFF" },
  TIER: { FULL: "FULL", MID: "MID", LITE: "LITE" },
}));

const { default: Layout } = await import("../src/components/Layout.jsx");

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<h1>Home</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("Layout accessibility", () => {
  it("offers a skip link as the first focusable element", () => {
    const { container } = renderLayout();
    const focusable = container.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])');
    expect(focusable[0]).toHaveTextContent(/skip to content/i);
    expect(focusable[0]).toHaveAttribute("href", "#main");
  });

  it("points the skip link at a main landmark that actually exists", () => {
    renderLayout();
    const main = document.getElementById("main");
    expect(main).toBeInTheDocument();
    expect(main.tagName).toBe("MAIN");
  });

  it("makes main programmatically focusable but keeps it out of the tab order", () => {
    // -1 is the point: route changes move focus here, but a visitor tabbing
    // through the page never stops on a whole page container.
    renderLayout();
    expect(document.getElementById("main")).toHaveAttribute("tabindex", "-1");
  });

  it("has a polite live region already in the DOM for route announcements", () => {
    // Already in the DOM, and empty: a live region inserted at the same moment
    // as its text is routinely missed by screen readers.
    renderLayout();
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("aria-atomic", "true");
    expect(region).toBeEmptyDOMElement();
  });
});
