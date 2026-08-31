import { useState } from "react";
import Reveal from "./Reveal.jsx";
import SectionHead from "./SectionHead.jsx";
import Marquee from "./Marquee.jsx";
import { LinkedIn, ArrowUpRight } from "./Icons.jsx";
import { useStore } from "../store.js";

/** "Minahil Murtaza" -> "MM". There are no photos to publish here, and
 *  inventing one would be worse than initials. */
function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

// Class prefix is `reco`, not `rec`: RecognitionCard.jsx already owns `.rec`,
// `.rec__foot` and friends for the recognition marquee, and reusing them here
// silently restyled that whole section.
function Recommendation({ rec, open, onToggle }) {
  const body = Array.isArray(rec.body) ? rec.body : [rec.body].filter(Boolean);
  // These run 150+ words each. In a moving track a card shows its opening and
  // expands in place once the reader stops on it — the marquee halts on hover
  // anyway, and expanding holds it there.
  const needsToggle = body.length > 2;
  const shown = open || !needsToggle ? body : body.slice(0, 2);

  return (
    <article className={`reco${open ? " is-open" : ""}`}>
      <span className="reco__quote" aria-hidden="true">&ldquo;</span>

      <div className="reco__body">
        {shown.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      {needsToggle ? (
        <button type="button" className="reco__more" onClick={onToggle}>
          {open ? "Show less" : "Read the full recommendation"}
        </button>
      ) : null}

      <footer className="reco__foot">
        <span className="reco__avatar" aria-hidden="true">{initials(rec.name)}</span>
        <span className="reco__who">
          <span className="reco__name">
            {rec.name}
            {rec.href ? (
              <a href={rec.href} target="_blank" rel="noreferrer" aria-label={`${rec.name} on LinkedIn`}>
                <LinkedIn aria-hidden="true" />
              </a>
            ) : null}
          </span>
          {rec.headline ? <span className="reco__headline">{rec.headline}</span> : null}
          <span className="reco__meta">
            {[rec.relationship, rec.date].filter(Boolean).join(" · ")}
          </span>
        </span>
      </footer>
    </article>
  );
}

export default function RecommendationsSection({
  id = "recommendations",
  title = "What Colleagues Say",
  lead = "Unedited recommendations from people who were on the other side of the work — names, roles and dates attached.",
  profileHref,
}) {
  const { siteContent, profile } = useStore();
  const recommendations = siteContent?.recommendations || [];
  const [openId, setOpenId] = useState(null);

  const linkedin =
    profileHref || profile?.socials?.find?.((s) => s.kind === "linkedin")?.href || "";

  if (!recommendations.length) return null;

  return (
    <section className="section" id={id}>
      <div className="shell">
        <SectionHead title={title} lead={lead} />
      </div>

      {/* Full-bleed: the track runs edge to edge, with the marquee's own
          gradient masks fading it out at both sides. Keeping it inside .shell
          would clip the motion into a box and lose that. */}
      <Reveal>
        <Marquee
          className="recos-marquee"
          speed={26}
          gap={20}
          // An expanded card holds the track still while it is being read.
          // Without this the thing you just opened slides out from under you.
          paused={openId !== null}
        >
          {recommendations.map((rec, i) => (
            <Recommendation
              key={rec.id || i}
              rec={rec}
              open={openId === (rec.id || i)}
              onToggle={() => setOpenId(openId === (rec.id || i) ? null : rec.id || i)}
            />
          ))}
        </Marquee>
      </Reveal>

      {linkedin ? (
        <div className="shell">
          <Reveal>
            <a className="btn recos__cta" href={linkedin} target="_blank" rel="noreferrer">
              <LinkedIn aria-hidden="true" />
              See them on LinkedIn
              <ArrowUpRight aria-hidden="true" />
            </a>
          </Reveal>
        </div>
      ) : null}
    </section>
  );
}
