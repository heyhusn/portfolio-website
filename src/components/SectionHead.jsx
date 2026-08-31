import Reveal from "./Reveal.jsx";

export default function SectionHead({ title, lead, center = false, single = false, id }) {
  return (
    <header
      className={`sec-head${center ? " sec-head--center" : ""}`}
      style={single ? { gridTemplateColumns: "1fr" } : undefined}
      id={id}
    >
      <Reveal>
        <h2 className="h2">{title}</h2>
      </Reveal>
      {lead ? (
        <Reveal delay={1}>
          <p className="lead">{lead}</p>
        </Reveal>
      ) : null}
    </header>
  );
}
