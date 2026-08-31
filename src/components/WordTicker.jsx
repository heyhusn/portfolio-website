import Marquee from "./Marquee.jsx";

/**
 * The band of condensed words under the hero. Every other word is rendered as
 * an outline — that alternation is a CSS `:nth-child(even)` rule, so the list
 * is repeated to an even length before it reaches the DOM.
 */
export default function WordTicker({ words }) {
  const doubled = [...words, ...words];

  return (
    <Marquee className="ticker" speed={64} gap={0}>
      {doubled.map((word, i) => (
        <div className="ticker__item" key={`${word}-${i}`}>
          <span>{word}</span>
          <i aria-hidden="true" />
        </div>
      ))}
    </Marquee>
  );
}
