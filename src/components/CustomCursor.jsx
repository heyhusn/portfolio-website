import { useEffect, useRef, useState } from "react";

/**
 * CustomCursor
 *
 * Renders an interactive lemon-colored cursor:
 * 1. Default state: Sleek lemon-green dot (#d0ff71) tracking the mouse.
 * 2. Link / Clickable / Card hover state: Expands into a 60px lemon circle with a dark arrow (↗) inside.
 * 3. Input state: Hides smoothly when typing in inputs/textareas.
 * 4. Touch/mobile devices: Automatically disabled.
 */
export default function CustomCursor() {
  const cursorRef = useRef(null);
  const dotRef = useRef(null);
  const [hoverType, setHoverType] = useState(null); // null | 'link' | 'card' | 'text'
  const [visible, setVisible] = useState(false);
  const [clicked, setClicked] = useState(false);

  // Position references for smooth interpolation
  const pos = useRef({ x: -100, y: -100 });
  const target = useRef({ x: -100, y: -100 });
  const rafId = useRef(null);

  useEffect(() => {
    // Disable on touch screens
    if (typeof window === "undefined" || window.matchMedia("(pointer: coarse)").matches) {
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

    // Smooth position tick loop
    const tick = () => {
      const ease = 0.22;
      pos.current.x += (target.current.x - pos.current.x) * ease;
      pos.current.y += (target.current.y - pos.current.y) * ease;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
      }

      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
      document.removeEventListener("mouseover", onPointerOver);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [visible]);

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
