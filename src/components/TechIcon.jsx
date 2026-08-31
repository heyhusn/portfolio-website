import { TECH_ICONS, GENERIC_ICON } from "../data/tech-icons.js";

/**
 * A single 24x24 brand glyph, drawn from the bundled Simple Icons paths in
 * src/data/tech-icons.js — no icon font, no CDN, no runtime fetch.
 *
 * The glyph is drawn in `currentColor` so the grid stays on the site's own
 * lime/dark palette; the brand colour is exposed as the `--brand` custom
 * property and only faded in on hover/focus by the stylesheet. That keeps
 * 46 different brand colours from shouting over the design at rest.
 */
export default function TechIcon({ slug, title, size = 26, className = "" }) {
  const icon = (slug && TECH_ICONS[slug]) || GENERIC_ICON;
  const label = title || icon.title;

  return (
    <svg
      className={`tech-icon${className ? " " + className : ""}`}
      role="img"
      aria-label={label}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      style={{ "--brand": icon.hex }}
    >
      <title>{label}</title>
      <path d={icon.path} fill="currentColor" />
    </svg>
  );
}
