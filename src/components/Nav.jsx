import { useState, useRef, useEffect } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { useTicker } from "../motion/hooks.js";
import { PRIORITY } from "../motion/kernel.js";
import MotionToggle from "./MotionToggle.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import { FileText } from "./Icons.jsx";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/about", label: "About" },
  { to: "/projects", label: "Projects" },
  { to: "/blogs", label: "Blogs" },
];

/**
 * The floating pill. Hides on scroll down past 220px, returns on scroll up —
 * same behaviour as the static build, but the scroll position is read once per
 * frame by the Motion Kernel instead of on every scroll event.
 */
export default function Nav() {
  const navRef = useRef(null);
  const lastY = useRef(0);
  const hidden = useRef(false);
  const [open, setOpen] = useState(false);
  const burgerRef = useRef(null);
  const { pathname } = useLocation();

  // Close the mobile menu whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  useTicker(
    (frame) => {
      const el = navRef.current;
      if (!el) return;
      if (frame.terminal) {
        el.classList.remove("is-hidden");
        return;
      }
      if (!open) {
        const y = frame.scrollY;
        const hideThreshold = typeof window !== "undefined" && window.innerWidth <= 820 ? 70 : 220;
        const shouldHide = y > lastY.current && y > hideThreshold;
        if (shouldHide !== hidden.current) {
          hidden.current = shouldHide;
          el.classList.toggle("is-hidden", shouldHide);
        }
        lastY.current = y;
      }
    },
    { priority: PRIORITY.READ }
  );

  // Reopening the menu must always bring the bar back.
  useEffect(() => {
    if (!open) return;
    hidden.current = false;
    navRef.current?.classList.remove("is-hidden");
  }, [open]);

  /* Escape closes the open menu and hands focus back to the control that
     opened it. Without this a keyboard visitor who opens the menu has no way
     out of it except tabbing through every link. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      burgerRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className={`nav${open ? " is-open" : ""}`} id="nav" ref={navRef}>
      <Link className="nav__avatar" to="/" aria-label="Home">
        <img src="/assets/img/avatar-poster.webp" alt="Husnain Aslam" width="34" height="34" style={{ objectFit: "cover", width: "100%", height: "100%" }} />
      </Link>

      <nav className="nav__links" id="navLinks" aria-label="Primary">
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => `nav__link${isActive ? " is-active" : ""}`}
          >
            {l.label}
          </NavLink>
        ))}
        <div className="nav__mobile-theme">
          <span className="small muted">Theme</span>
          <ThemeToggle showLabel />
        </div>
      </nav>

      <MotionToggle />

      <NavLink
        className={({ isActive }) => `cv-btn${isActive ? " is-active" : ""}`}
        to="/resume"
        title="View resume"
        aria-label="View resume"
      >
        <FileText aria-hidden="true" />
      </NavLink>

      <Link className="btn nav__cta" to="/#contact">
        Contact
      </Link>

      <button
        className="nav__burger"
        id="burger"
        ref={burgerRef}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="navLinks"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <span />
        <span />
      </button>

    </header>
  );
}
