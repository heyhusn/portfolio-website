import { useEffect, useState, useCallback } from "react";

/**
 * ThemeToggle
 *
 * Provides a sleek pill-shaped switch to toggle between Dark Mode and Light Mode,
 * matching the exact visual design shown in the reference screenshots.
 *
 * Features:
 * - High-contrast lemon (#d0ff71) and dark pill switch with smooth sliding knob.
 * - Keyboard accessible (Space/Enter) and ARIA compliant (role="switch").
 * - Persists choice to localStorage.
 * - Floating bottom widget for instant access across all pages.
 */
export default function ThemeToggle({ className = "", showLabel = false }) {
  const [theme, setTheme] = useState(() => {
    if (typeof document !== "undefined") {
      const stored = localStorage.getItem("portfolio-theme");
      if (stored) return stored;
      return document.documentElement.getAttribute("data-theme") || "dark";
    }
    return "dark";
  });

  const applyTheme = useCallback((newTheme) => {
    setTheme(newTheme);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("portfolio-theme", newTheme);

      // Update meta theme-color for mobile browsers
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute("content", newTheme === "light" ? "#f5f6f8" : "#1a1a1b");
      }
    }
  }, []);

  useEffect(() => {
    // Initial sync
    const initial = localStorage.getItem("portfolio-theme") || "dark";
    applyTheme(initial);
  }, [applyTheme]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
  };

  const isLight = theme === "light";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={!isLight}
      aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
      className={["theme-toggle-btn", isLight ? "is-light" : "is-dark", className]
        .filter(Boolean)
        .join(" ")}
      onClick={toggleTheme}
    >
      <span className="theme-toggle-track">
        <span className="theme-toggle-thumb" />
      </span>
      {showLabel && (
        <span className="theme-toggle-text">
          {isLight ? "Light" : "Dark"}
        </span>
      )}
    </button>
  );
}

/**
 * Floating bottom bar for the Theme Toggle
 */
export function ThemeFloatingWidget() {
  return (
    <div className="theme-floating-wrap" aria-label="Theme selector">
      <ThemeToggle />
    </div>
  );
}
