import { useRef, useState, useEffect, Children } from "react";
import { useTicker, useMeasure, useInViewport } from "../motion/hooks.js";
import { useMotion, TIER, MOTION } from "../motion/MotionProvider.jsx";
import { PRIORITY } from "../motion/kernel.js";

/**
 * Infinite marquee.
 *
 * Three behaviours, chosen by capability tier — the visual language is the same
 * in all three, only the mechanism changes:
 *
 *   FULL   transport is stepped by the Motion Kernel. Scroll velocity feeds
 *          into the speed, so the strip surges slightly when the page moves and
 *          settles back when it stops. Hover eases it to a halt rather than
 *          hard-pausing. This is the one upgrade over the static build.
 *   MID    the original CSS `slide` keyframe animation, paused on hover.
 *   LITE / motion off
 *          no transport — the strip becomes a horizontal scroller the visitor
 *          swipes or arrows through.
 *
 * That last mode used to mean "frozen". It was wrong, and on a phone it was
 * badly wrong: every phone resolves to LITE, `.marquee` is `overflow: hidden`,
 * and the tracks are 1,900–3,500 px wide inside a 393 px viewport. So the
 * recognition cards, the recommendations and the word ticker all sat at offset
 * zero with 1,500–3,100 px of content walled off and no way to reach it. The
 * same trap caught anyone on desktop with reduced motion turned on.
 *
 * Auto-play is deliberately NOT the fix for touch. Content that moves on its
 * own for more than five seconds needs a pause mechanism (WCAG 2.2.2), and the
 * CSS marquee's only one is `:hover` — which does not exist on a touchscreen.
 * A scroller is both the accessible answer and the one a thumb expects.
 *
 * In the two transported modes the content is rendered twice and the transport
 * wraps at half the track width, so the seam is never visible; the duplicate is
 * aria-hidden. A scroller renders it once — a second identical copy would just
 * double the swipe distance.
 */
export default function Marquee({
  children,
  speed = 48, // px per second at rest
  reverse = false,
  className = "",
  style,
  gap,
  // Lets a consumer stop the transport for a reason of its own — a card
  // expanded to be read, say. Hover already eases to a halt; this is the
  // same halt, held open until the consumer releases it.
  paused = false,
  /** Announced when the strip is a scroller and takes focus. */
  scrollLabel = "Scrollable list — use the arrow keys or swipe",
}) {
  const { tier, motion } = useMotion();
  const kernelDriven = tier === TIER.FULL && motion !== MOTION.OFF;
  const cssDriven = tier === TIER.MID && motion !== MOTION.OFF;
  /** Nothing transports it, so the visitor does. */
  const scrollable = !kernelDriven && !cssDriven;

  const [trackRef, trackRect] = useMeasure();
  // Off-screen strips are frozen rather than stepped: there are several of
  // these on the home page (ticker words, recognition, recommendations) and
  // at most one is ever on screen at a time.
  const [viewRef, inViewport] = useInViewport();
  const innerRef = useRef(null);
  const offset = useRef(0);
  const currentSpeed = useRef(speed);
  const [hover, setHover] = useState(false);

  // Half the rendered track: the duplicated content means wrapping at this
  // distance puts us back exactly where we started.
  const half = trackRect.width / 2;

  useEffect(() => {
    if (kernelDriven) return;
    // Leaving kernel mode: drop any transform we applied so CSS owns it again.
    if (innerRef.current) innerRef.current.style.transform = "";
    offset.current = 0;
  }, [kernelDriven]);

  useTicker(
    (frame) => {
      const el = innerRef.current;
      if (!el || !half) return;

      if (frame.terminal) {
        el.style.transform = "";
        return;
      }

      // Scroll coupling: a fraction of page velocity, clamped so a flick of the
      // wheel accelerates the strip without launching it.
      const coupled = Math.max(-260, Math.min(260, frame.velocity * 0.18));
      const target = hover || paused ? 0 : speed + Math.abs(coupled) * 0.55;
      // Ease toward the target so hover in/out and scroll surges are smooth.
      currentSpeed.current += (target - currentSpeed.current) * Math.min(1, frame.dt * 4);

      const dir = reverse ? -1 : 1;
      offset.current -= currentSpeed.current * frame.dt * dir;

      // Wrap in both directions.
      if (offset.current <= -half) offset.current += half;
      if (offset.current >= 0 && dir < 0) offset.current -= half;

      el.style.transform = `translate3d(${offset.current.toFixed(2)}px,0,0)`;
    },
    { active: kernelDriven && half > 0 && inViewport, priority: PRIORITY.RENDER }
  );

  const kids = Children.toArray(children);

  return (
    <div
      ref={viewRef}
      className={`marquee${reverse && cssDriven ? " marquee--rev" : ""}${paused ? " is-paused" : ""} ${className}`.trim()}
      style={style}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      data-transport={kernelDriven ? "kernel" : cssDriven ? "css" : "scroll"}
      /* A scrollable region has to be reachable without a pointer, and an
         element only takes keyboard scrolling if it can hold focus. role and
         label give screen readers something to announce when it does. */
      {...(scrollable
        ? { tabIndex: 0, role: "group", "aria-label": scrollLabel }
        : null)}
    >
      <div
        className="marquee__track"
        ref={(node) => {
          trackRef.current = node;
          innerRef.current = node;
        }}
        style={gap !== undefined ? { gap } : undefined}
      >
        {kids}
        {scrollable
          ? null
          : kids.map((child, i) => (
              <div key={`clone-${i}`} aria-hidden="true" style={{ display: "contents" }}>
                {child}
              </div>
            ))}
      </div>
    </div>
  );
}
