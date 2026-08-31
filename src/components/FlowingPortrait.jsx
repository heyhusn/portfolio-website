import { useEffect, useRef, useState, useCallback } from "react";
import { useTicker } from "../motion/hooks.js";
import { useMotion } from "../motion/MotionProvider.jsx";
import { PRIORITY } from "../motion/kernel.js";
import SayHelloBadge from "./SayHelloBadge.jsx";

/**
 * FlowingPortrait
 *
 * Implements the signature single-image scroll animation from the Framer template (portfolio.mp4):
 * 1. At the top of the page, the user's portrait is centered in the Hero section with the SayHello badge.
 * 2. As the user scrolls down towards Services, the single portrait smoothly translates, scales,
 *    and docks into the right-hand sticky Services media slot.
 * 3. In the Services section, the portrait stays sticky alongside the accordion list.
 * 4. Eliminates the previous two disconnected duplicate images.
 */
export default function FlowingPortrait({ profile, heroSlotRef, servicesSlotRef }) {
  const portraitRef = useRef(null);
  const badgeRef = useRef(null);
  const { animate } = useMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 820);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile, { passive: true });
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const updatePosition = useCallback((scrollY) => {
    const portrait = portraitRef.current;
    const heroSlot = heroSlotRef.current;
    const servicesSlot = servicesSlotRef.current;
    const badge = badgeRef.current;

    if (!portrait || !heroSlot || !servicesSlot) return;

    if (isMobile || !animate) {
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
      return;
    }

    const heroRect = heroSlot.getBoundingClientRect();
    const servicesRect = servicesSlot.getBoundingClientRect();

    // Absolute page offsets
    const heroTop = heroRect.top + scrollY;
    const heroLeft = heroRect.left;
    const heroWidth = heroRect.width || 325;
    const heroHeight = heroRect.height || 440;

    const servicesTop = servicesRect.top + scrollY;
    const servicesLeft = servicesRect.left;
    const servicesWidth = servicesRect.width || 380;
    const servicesHeight = servicesRect.height || 475;

    // Transition scroll range
    const startScroll = Math.max(0, heroTop - 120);
    const endScroll = servicesTop - 120;
    const scrollRange = Math.max(100, endScroll - startScroll);

    const rawT = (scrollY - startScroll) / scrollRange;
    const t = Math.max(0, Math.min(1, rawT));

    // Smooth cubic bezier easing
    const easedT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    if (t <= 0) {
      // Hero state (at the top)
      portrait.style.position = "absolute";
      portrait.style.top = `${heroTop}px`;
      portrait.style.left = `${heroLeft}px`;
      portrait.style.width = `${heroWidth}px`;
      portrait.style.height = `${heroHeight}px`;
      portrait.style.transform = `translate3d(0, ${(scrollY * -0.05).toFixed(2)}px, 0)`;
      portrait.style.borderRadius = "var(--r-xl)";
      portrait.style.zIndex = "4";

      if (badge) {
        badge.style.opacity = "1";
        badge.style.transform = "scale(1)";
      }
    } else if (t < 1) {
      // Transitioning state (smooth gliding from Hero center to Services right)
      const curLeft = heroLeft + (servicesLeft - heroLeft) * easedT;
      const curTop = heroTop + (servicesTop - heroTop) * easedT;
      const curWidth = heroWidth + (servicesWidth - heroWidth) * easedT;
      const curHeight = heroHeight + (servicesHeight - heroHeight) * easedT;

      portrait.style.position = "absolute";
      portrait.style.top = `${curTop}px`;
      portrait.style.left = `${curLeft}px`;
      portrait.style.width = `${curWidth}px`;
      portrait.style.height = `${curHeight}px`;
      portrait.style.transform = "translate3d(0, 0, 0)";
      portrait.style.borderRadius = "var(--r-xl)";
      portrait.style.zIndex = "5";

      if (badge) {
        const badgeFade = Math.max(0, 1 - t * 2.2);
        badge.style.opacity = String(badgeFade);
        badge.style.transform = `scale(${Math.max(0.4, 1 - t * 0.6)})`;
      }
    } else {
      // Docked in Services section (sticky)
      portrait.style.position = "absolute";
      portrait.style.top = `${servicesTop}px`;
      portrait.style.left = `${servicesLeft}px`;
      portrait.style.width = `${servicesWidth}px`;
      portrait.style.height = `${servicesHeight}px`;
      portrait.style.transform = "translate3d(0, 0, 0)";
      portrait.style.borderRadius = "var(--r-xl)";
      portrait.style.zIndex = "4";

      if (badge) {
        badge.style.opacity = "0";
        badge.style.transform = "scale(0.5)";
      }
    }
  }, [animate, isMobile, heroSlotRef, servicesSlotRef]);

  // Hook into central Motion Kernel ticker
  useTicker(
    (frame) => {
      if (frame.terminal) {
        updatePosition(window.scrollY);
        return;
      }
      updatePosition(frame.scrollY);
    },
    { active: animate && !isMobile, priority: PRIORITY.RENDER }
  );

  return (
    <div
      ref={portraitRef}
      className="flowing-portrait-wrap"
      aria-label={`Portrait of ${profile?.name || "Husnain Aslam"}`}
    >
      <figure className="sig hero__figure flowing-portrait-figure" data-scene="poster">
        <img
          className="sig__poster flowing-portrait-img"
          src="/assets/img/avatar-poster.webp"
          alt={`Portrait of ${profile?.name || "Husnain Aslam"}`}
          width="325"
          height="440"
          decoding="async"
          fetchPriority="high"
        />
      </figure>
      <div ref={badgeRef} className="flowing-portrait-badge">
        <SayHelloBadge float={false} className="badge--avatar" />
      </div>
    </div>
  );
}
