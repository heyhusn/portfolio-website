import { useEffect, useRef, useState } from "react";
import { useTicker } from "../motion/hooks.js";
import { useMotion } from "../motion/MotionProvider.jsx";
import { PRIORITY } from "../motion/kernel.js";

/**
 * CustomCursor
 *
 * Renders an interactive lemon-colored cursor:
 * 1. Default state: Sleek lemon-green dot (#d0ff71) tracking the mouse.
 * 2. Link / Clickable / Card hover state: Expands into a 60px lemon circle with a dark arrow (↗) inside.
 * 3. Input state: Hides smoothly when typing in inputs/textareas.
 * 4. Touch/mobile devices: Automatically disabled.
 * 5. Reduced motion: disabled entirely — a cursor that lags the pointer is
 *    motion the visitor asked not to see, and there is nothing to degrade to.
 *
 * MOTION KERNEL
 * -------------
 * This component used to drive itself with its own requestAnimationFrame loop.
 * That is the one thing ADR-02 forbids: the kernel exists so the document has
 * exactly one rAF loop, reads scroll state once per frame, and can be stopped
 * dead when MotionMode is OFF. A second loop meant the site was never actually
 * running the architecture it documents — and, because this loop ignored the
 * motion setting, a prefers-reduced-motion visitor still got a lerping cursor
 * that never stopped.
 *
 * The easing is unchanged; it is stepped by the shared ticker instead, at
 * RENDER priority because it only writes.
 */
export default function CustomCursor() {
  const { animate, tier } = useMotion();
  const cursorRef = useRef(null);
  const dotRef = useRef(null);
  const [hoverType, setHoverType] = useState(null); // null | 'link' | 'card' | 'text'
  const [visible, setVisible] = useState(false);
  const [clicked, setClicked] = useState(false);

  // Position references for smooth interpolation
  const pos = useRef({ x: -100, y: -100 });
  const target = useRef({ x: -100, y: -100 });

  // A pointer-driven flourish on a device with no pointer, or for a visitor who
  // asked for less motion, is cost without benefit. LITE is excluded for the
  // same reason it gets no other kernel-driven effects.
  const enabled =
    animate &&
    tier !== "LITE" &&
    typeof window !== "undefined" &&
    !(typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches);

  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      setHoverType(null);
      return;
    }

    const onMouseMove = (e) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
      if (!visible) setVisible(true);
    };

    const onMouseDown = () => setClicked(true);
    const onMouseUp = () => setClicked(false);
    const onMouseLeave = () => setVisible(false);
    const onMouseEnter = () => setVisible(true);

    // Dynamic hover inspection on pointerover
    const onPointerOver = (e) => {
      const targetEl = e.target;
      if (!targetEl || !(targetEl instanceof Element)) return;

      // Check if target or ancestor is an interactive link, button, or card
      const interactive = targetEl.closest(
        'a, button, [role="button"], input, textarea, select, .card, .post, .acc__btn, .tool, .socials a, .theme-toggle-btn'
      );

      if (interactive) {
        const tagName = interactive.tagName.toLowerCase();
        if (tagName === "input" || tagName === "textarea" || tagName === "select") {
          setHoverType("text");
        } else {
          setHoverType("link");
        }
      } else {
        setHoverType(null);
      }
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseenter", onMouseEnter);
    document.addEventListener("mouseover", onPointerOver, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
      document.removeEventListener("mouseover", onPointerOver);
    };
    // `visible` is deliberately not a dependency: it is set from inside
    // onMouseMove, so listing it tore down and re-registered all six listeners
    // on the visitor's first pointer movement. The handlers read it through a
    // ref-free setter that already no-ops when unchanged.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  /* The easing step, on the one ticker (ADR-02). Writes only — no layout is
     read here — so it belongs at RENDER priority. */
  useTicker(
    (frame) => {
      const el = cursorRef.current;
      if (!el) return;
      // Motion off: settle on the pointer instead of easing toward it.
      const ease = frame.terminal ? 1 : 0.22;
      pos.current.x += (target.current.x - pos.current.x) * ease;
      pos.current.y += (target.current.y - pos.current.y) * ease;
      el.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
    },
    { active: enabled, priority: PRIORITY.RENDER }
  );

  if (!enabled) return null;

  return (
    <div
      ref={cursorRef}
      className={[
        "custom-cursor-wrap",
        visible ? "is-visible" : "",
        hoverType ? `is-${hoverType}` : "",
        clicked ? "is-clicked" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <div ref={dotRef} className="custom-cursor-body">
        {hoverType === "link" && (
          <svg
            className="custom-cursor-arrow"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        )}
      </div>
    </div>
  );
}
