import { useRef, useState, useEffect, Children } from "react";
import { useTicker, useMeasure } from "../motion/hooks.js";
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
 *          no transport at all — a static, readable strip.
 *
 * The content is rendered twice and the transport wraps at half the track
 * width, so the seam is never visible. The duplicate is aria-hidden.
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
}) {
  const { tier, motion } = useMotion();
  const kernelDriven = tier === TIER.FULL && motion !== MOTION.OFF;
  const cssDriven = tier === TIER.MID && motion !== MOTION.OFF;

  const [trackRef, trackRect] = useMeasure();
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
    { active: kernelDriven && half > 0, priority: PRIORITY.RENDER }
  );

  const kids = Children.toArray(children);

  return (
    <div
      className={`marquee${reverse && cssDriven ? " marquee--rev" : ""}${paused ? " is-paused" : ""} ${className}`.trim()}
      style={style}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      data-transport={kernelDriven ? "kernel" : cssDriven ? "css" : "static"}
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
        {kids.map((child, i) => (
          <div key={`clone-${i}`} aria-hidden="true" style={{ display: "contents" }}>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
