import { Link } from "react-router-dom";
import Reveal from "../components/Reveal.jsx";
import { ArrowUpRight } from "../components/Icons.jsx";

export default function NotFound() {
  return (
    <section className="nf">
      <div className="shell">
        <Reveal>
          <h1 className="display">404</h1>
        </Reveal>
        <Reveal delay={1}>
          <p className="lead" style={{ marginInline: "auto", marginTop: 12 }}>
            That page isn’t here. It may have moved, or it may never have existed —
            either way, the work is one click away.
          </p>
        </Reveal>
        <Reveal delay={2}>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 34 }}>
            <Link className="btn btn--lime btn--lg" to="/">
              Back Home
              <ArrowUpRight className="btn__arrow" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
