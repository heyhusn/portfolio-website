import { useCounter } from "../motion/hooks.js";

/**
 * Replaces the template's testimonial card.
 *
 * Two shapes share the marquee: an award/fact card, and a lime stat card whose
 * number counts up when it first crosses the viewport. Both carry only things
 * that can be checked — no quotes are attributed to anyone.
 */
export default function RecognitionCard({ item }) {
  if (item.kind === "stat") return <StatCard item={item} />;

  const initials = (item.source || "•")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  return (
    <article className="quote rec">
      <p className="quote__text rec__text">{item.text}</p>
      <div className="rec__foot">
        <span className="rec__mark" aria-hidden="true">
          {initials}
        </span>
        <div>
          <div className="rec__source">{item.source}</div>
          <div className="rec__detail">{item.detail}</div>
        </div>
      </div>
    </article>
  );
}

function StatCard({ item }) {
  // This card rides the recognition marquee, so it can be carried horizontally
  // past the viewport without ever satisfying a vertical-intersection gate —
  // and the duplicated aria-hidden half of the track never satisfies one at
  // all. Gated, these rendered as "0.00" and "0/16" permanently, directly
  // under a heading about numbers that survived an audit.
  const [ref, text] = useCounter(item.value, {
    suffix: item.suffix ?? "",
    decimals: item.decimals ?? 0,
    startImmediately: true,
  });

  return (
    <article className="quote quote--lime rec">
      <div className="quote__stat" ref={ref}>
        {text}
      </div>
      <p className="quote__text rec__text" style={{ marginTop: 10 }}>
        {item.text}
      </p>
    </article>
  );
}
