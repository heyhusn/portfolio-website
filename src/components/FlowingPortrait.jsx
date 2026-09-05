import { useCallback, useEffect, useRef, useState } from "react";
import { useTicker, useInViewport } from "../motion/hooks.js";
import { useMotion } from "../motion/MotionProvider.jsx";
import { PRIORITY } from "../motion/kernel.js";
import SayHelloBadge from "./SayHelloBadge.jsx";
import SignatureScene from "../wgl/SignatureScene.jsx";

/**
 * FlowingPortrait
 *
 * The signature single-figure scroll animation: the portrait starts centred in
 * the hero, glides across as the visitor scrolls, and docks into the sticky
 * media slot beside the services accordion.
 *
 * The figure itself is a SignatureScene, so the WebGL avatar's gates
 * (FR-AVT-01 … 11) apply to the element that actually renders on the page.
 * The poster is still the thing that sizes the box; the canvas is a layer on
 * top of it. That means this component's geometry maths is unchanged whether
 * the model mounts or not.
 *
 * READ / WRITE SPLIT — why there are two ticker subscriptions
 * ----------------------------------------------------------
 * This used to call getBoundingClientRect() on two elements and then write six
 * style properties, all inside one PRIORITY.RENDER callback. Reading layout
 * after writing it in the same frame forces a synchronous reflow, and this is
 * the hero animation, so it ran during the LCP window on every frame.
 *
 * The measurement cannot simply be cached: the services slot is
 * `position: sticky`, so its page-space position genuinely changes as the page
 * scrolls, and the portrait is supposed to follow it once docked.
 *
 * So the two halves are separated instead, which is exactly what the kernel's
 * priority scheme is for. A PRIORITY.READ subscriber measures both slots at
 * the top of the frame, before anything has written; a PRIORITY.RENDER
 * subscriber writes from that snapshot. One forced layout per frame, at a
 * point where the browser was going to lay out anyway.
 */
export default function FlowingPortrait({ profile, heroSlotRef, servicesSlotRef }) {
  const portraitRef = useRef(null);
  const badgeRef = useRef(null);
  const { animate } = useMotion();
  const [isMobile, setIsMobile] = useState(false);

  // The portrait's flight path spans hero → services and nothing more: once
  // it has docked, every subsequent frame recomputes the same three numbers
  // and writes the same six style properties, for the rest of the page. This
  // stops that. The 20% lead-in means it is already back in step by the time
  // it is visible again — and the whole thing is a no-op on the first paint,
  // since the hook starts visible.
  const [viewportRef, inViewport] = useInViewport();

  /** Snapshot written by the READ pass, consumed by the RENDER pass. */
  const geom = useRef(null);
  /** So the reset path writes once instead of on every frame. */
  const parked = useRef(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 820);
    checkMobile();
    window.addEventListener("resize", checkMobile, { passive: true });
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  /* ---------------- READ: measure, never write ---------------- */
  const measure = useCallback(() => {
    const heroSlot = heroSlotRef.current;
    const servicesSlot = servicesSlotRef.current;
    if (!heroSlot || !servicesSlot) {
      geom.current = null;
      return;
    }

    const hero = heroSlot.getBoundingClientRect();
    const services = servicesSlot.getBoundingClientRect();
    // Page space, not viewport space. `left` needs scrollX for the same reason
    // `top` needs scrollY — the portrait is positioned absolutely against the
    // document, so mixing the two coordinate systems only happened to work
    // while the page had no horizontal scroll.
    const sx = window.scrollX || window.pageXOffset || 0;
    const sy = window.scrollY || window.pageYOffset || 0;

    geom.current = {
      heroTop: hero.top + sy,
      heroLeft: hero.left + sx,
      heroW: hero.width || 325,
      heroH: hero.height || 440,
      servicesTop: services.top + sy,
      servicesLeft: services.left + sx,
      servicesW: services.width || 380,
      servicesH: services.height || 475,
    };
  }, [heroSlotRef, servicesSlotRef]);

  useTicker(measure, {
    active: animate && !isMobile && inViewport,
    priority: PRIORITY.READ,
  });

  /* ---------------- WRITE: no layout reads below this line ---------------- */
  const park = useCallback(() => {
    const portrait = portraitRef.current;
    const badge = badgeRef.current;
    if (!portrait || parked.current) return;
    portrait.style.transform = "";
    portrait.style.position = "";
    portrait.style.top = "";
    portrait.style.left = "";
    portrait.style.width = "";
    portrait.style.height = "";
    if (badge) {
      badge.style.opacity = "1";
      badge.style.transform = "none";
    }
    parked.current = true;
  }, []);

  const paint = useCallback((scrollY) => {
    const portrait = portraitRef.current;
    const badge = badgeRef.current;
    const g = geom.current;

    if (!portrait || !g || isMobile || !animate) {
      park();
      return;
    }
    parked.current = false;

    const startScroll = Math.max(0, g.heroTop - 120);
    const endScroll = g.servicesTop - 120;
    const scrollRange = Math.max(100, endScroll - startScroll);
    const t = Math.max(0, Math.min(1, (scrollY - startScroll) / scrollRange));

    // Smooth cubic in-out
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const left = g.heroLeft + (g.servicesLeft - g.heroLeft) * eased;
    const top = g.heroTop + (g.servicesTop - g.heroTop) * eased;
    const width = g.heroW + (g.servicesW - g.heroW) * eased;
    const height = g.heroH + (g.servicesH - g.heroH) * eased;

    portrait.style.position = "absolute";
    portrait.style.top = `${top}px`;
    portrait.style.left = `${left}px`;
    portrait.style.width = `${width}px`;
    portrait.style.height = `${height}px`;
    portrait.style.borderRadius = "var(--r-xl)";
    portrait.style.zIndex = t > 0 && t < 1 ? "5" : "4";
    // The hero state keeps a slight counter-parallax; everything after it is
    // driven by the interpolation above, so the transform stays identity.
    portrait.style.transform =
      t <= 0 ? `translate3d(0, ${(scrollY * -0.05).toFixed(2)}px, 0)` : "translate3d(0, 0, 0)";

    if (badge) {
      if (t <= 0) {
        badge.style.opacity = "1";
        badge.style.transform = "scale(1)";
      } else if (t < 1) {
        badge.style.opacity = String(Math.max(0, 1 - t * 2.2));
        badge.style.transform = `scale(${Math.max(0.4, 1 - t * 0.6)})`;
      } else {
        badge.style.opacity = "0";
        badge.style.transform = "scale(0.5)";
      }
    }
  }, [animate, isMobile, park]);

  useTicker(
    (frame) => {
      // A terminal frame arrives when motion is switched off. There is no READ
      // pass behind it, so measure once here — this is the one place a read and
      // a write share a frame, and it happens at most once per toggle.
      if (frame.terminal) {
        measure();
        paint(window.scrollY);
        return;
      }
      paint(frame.scrollY);
    },
    { active: animate && !isMobile && inViewport, priority: PRIORITY.RENDER }
  );

  // Reduced motion or a narrow viewport: park the portrait in normal flow and
  // leave it there. No ticker is running in either case.
  useEffect(() => {
    if (!animate || isMobile) {
      parked.current = false;
      park();
    }
  }, [animate, isMobile, park]);

  /* Below 820px the wrapper is `display: none` and the hero renders its own
     portrait, so this mounted a second SignatureScene — a duplicate image
     element, a duplicate poster in the DOM, and a WebGL gate evaluated for a
     box with no size. CSS was hiding it; nothing was stopping it existing. */
  if (isMobile) return null;

  return (
    <div
      ref={(node) => {
        portraitRef.current = node;
        viewportRef.current = node;
      }}
      className="flowing-portrait-wrap"
    >
      {/*
        No aria-label here. This is a plain <div> with no role, so an
        aria-label on it is not exposed to assistive technology at all — and
        the poster inside already carries the accessible name (FR-AVT-11).
      */}
      <SignatureScene
        className="hero__figure flowing-portrait-figure"
        poster="/assets/img/avatar-poster.webp"
        alt={`Portrait of ${profile?.name || "Husnain Aslam"}`}
      />
      <div ref={badgeRef} className="flowing-portrait-badge">
        <SayHelloBadge float={false} className="badge--avatar" />
      </div>
    </div>
  );
}
