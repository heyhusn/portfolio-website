import { Outlet, useLocation } from "react-router-dom";
import { Suspense, useEffect, useRef, useState } from "react";
import Nav from "./Nav.jsx";
import Footer from "./Footer.jsx";
import TvStaticBackground from "./TvStaticBackground.jsx";
import CustomCursor from "./CustomCursor.jsx";
import { ThemeFloatingWidget } from "./ThemeToggle.jsx";
import { useMotion } from "../motion/MotionProvider.jsx";

/**
 * Scroll management for a client-side router.
 *
 *  - A new path starts at the top.
 *  - A hash scrolls to the target with the nav's 90px offset, matching the
 *    smooth-anchor behaviour of the static build.
 *  - Reduced motion means an instant jump, never a smooth scroll.
 */
function ScrollManager({ mainRef, onNavigate }) {
  const { pathname, hash, key } = useLocation();
  const { animate } = useMotion();
  const lastKey = useRef(key);
  const first = useRef(true);

  useEffect(() => {
    if (hash) {
      // Give the route's content a frame to mount before measuring.
      const id = requestAnimationFrame(() => {
        const target = document.querySelector(hash);
        if (!target) return;
        const y = target.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top: y, behavior: animate ? "smooth" : "auto" });
      });
      return () => cancelAnimationFrame(id);
    }
    if (lastKey.current !== key) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    lastKey.current = key;

    /* A client-side router changes the page without any of the things a real
       navigation does: focus stays wherever it was — often on the nav link
       just activated — and assistive technology is told nothing at all. Both
       are fixed here rather than in every page.

       `main` is focused programmatically (it carries tabIndex={-1}, so it is
       focusable but not in the tab order), which puts a keyboard user at the
       top of the new content instead of back in the nav. The announcement is
       a separate polite live region, because moving focus to a container does
       not reliably read anything out on its own. */
    if (first.current) {
      first.current = false;
      return;
    }
    const main = mainRef?.current;
    if (main) main.focus({ preventScroll: true });
    onNavigate?.(document.title || pathname);
  }, [pathname, hash, key, animate]);

  return null;
}

export default function Layout() {
  const mainRef = useRef(null);
  const [announcement, setAnnouncement] = useState("");

  return (
    <>
      {/* First focusable thing on every page. Visually hidden until focused —
          see .skip-link in app.css — so a keyboard visitor can get past a nav
          that is otherwise 8 tab stops on every single route. */}
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <ScrollManager mainRef={mainRef} onNavigate={setAnnouncement} />
      <CustomCursor />
      <TvStaticBackground />
      <Nav />

      <main id="main" ref={mainRef} tabIndex={-1}>
        {/* The public pages are route-split (see App.jsx), so the boundary sits
            here: the nav, footer and background stay on screen while a route
            chunk arrives. The fallback reserves height and says nothing — a
            spinner for the ~30ms these take on a warm connection reads as
            jank, and it is aria-hidden so the route announcer is the only
            thing that speaks. */}
        <Suspense fallback={<div style={{ minHeight: "60vh" }} aria-hidden="true" />}>
          <Outlet />
        </Suspense>
      </main>

      {/* Route changes are announced here. aria-live on a node that already
          exists in the DOM is the only form screen readers act on reliably —
          a region that appears at the same moment as its text is often
          missed. */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <Footer />
      <ThemeFloatingWidget />
    </>
  );
}


