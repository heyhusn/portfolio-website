import { useId } from "react";

/**
 * The rotating lime badge. Waves, then crossfades into a smile, then back —
 * one continuous loop rather than a single static wave, so it reads as a
 * greeting rather than a twitch. Both faces and the ring are CSS keyframes,
 * gated off by `[data-motion="off"]` (the site's own toggle) as well as the
 * OS-level reduced-motion media query already covering the rest of the site.
 *
 * The ring's textPath needs a unique id per instance — two copies on one page
 * (hero and contact) would otherwise both point at the first path.
 */
export default function SayHelloBadge({ float = false, className = "", style }) {
  const id = useId().replace(/:/g, "");
  const pathId = `ring-${id}`;

  return (
    <div
      className={`badge${float ? " badge--float" : ""}${className ? ` ${className}` : ""}`}
      style={style}
      aria-hidden="true"
    >
      <span className="badge__emoji">
        <span className="badge__face badge__face--wave">👋</span>
        <span className="badge__face badge__face--smile">🙂</span>
      </span>
      <svg className="badge__ring" viewBox="0 0 100 100">
        <defs>
          <path
            id={pathId}
            d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0"
          />
        </defs>
        <text
          fontFamily="Inter, sans-serif"
          fontSize="9.5"
          fontWeight="600"
          letterSpacing="2.6"
          fill="#1a1a1b"
        >
          <textPath href={`#${pathId}`}>SAY HELLO · SAY HELLO · </textPath>
        </text>
      </svg>
    </div>
  );
}
