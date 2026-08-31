import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
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
function ScrollManager() {
  const { pathname, hash, key } = useLocation();
  const { animate } = useMotion();
  const lastKey = useRef(key);

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
  }, [pathname, hash, key, animate]);

  return null;
}

export default function Layout() {
  return (
    <>
      <ScrollManager />
      <CustomCursor />
      <TvStaticBackground />
      <Nav />
      <main>
        <Outlet />
      </main>
      <Footer />
      <ThemeFloatingWidget />
    </>
  );
}


