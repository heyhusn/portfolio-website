import Reveal from "./Reveal.jsx";
import SectionHead from "./SectionHead.jsx";
import { ArrowUpRight } from "./Icons.jsx";
import { useStore } from "../store.js";

/**
 * LinkedIn's `/details/volunteer-experiences/` sub-path is the profile owner's
 * own view of that section — it is what you land on from your own profile, and
 * it is what I originally seeded these entries with. A visitor clicking it does
 * not get "his LinkedIn profile", they get a sub-page that may not resolve for
 * them at all.
 *
 * Narrowly scoped on purpose: this collapses only that one stale default back
 * to the profile root. Any other href set in the admin panel is left exactly as
 * entered — this is here to fix a bad default, not to overrule the admin.
 */
function resolveHref(entry, profileLinkedIn) {
  const href = String(entry?.href || "").trim();
  if (!href) return profileLinkedIn || "";
  if (/linkedin\.com\/in\/[^/]+\/details\/volunteer-experiences/i.test(href)) {
    return profileLinkedIn || href.replace(/\/details\/volunteer-experiences.*$/i, "/");
  }
  return href;
}

export default function VolunteeringSection({
  id = "volunteering",
  title = "Volunteering",
  lead = "Human rights work, alongside the engineering.",
}) {
  const { siteContent, profile } = useStore();
  const volunteering = siteContent?.volunteering || [];
  const profileLinkedIn =
    profile?.socials?.find?.((s) => s.kind === "linkedin")?.href || "";

  if (!volunteering.length) return null;

  return (
    <section className="section" id={id}>
      <div className="shell">
        <SectionHead title={title} lead={lead} />

        <div className="vols">
          {volunteering.map((v, i) => {
            const href = resolveHref(v, profileLinkedIn);
            // The whole card is the target when there is somewhere to go —
            // a 300px card with one small link in the corner reads as
            // clickable long before you find the corner.
            const Card = href ? "a" : "article";
            const linkProps = href
              ? { href, target: "_blank", rel: "noreferrer" }
              : {};

            return (
              <Reveal key={v.id || i} delay={Math.min(i, 3)}>
                <Card className={`vol${href ? " vol--link" : ""}`} {...linkProps}>
                  <div className="vol__cause">{v.cause}</div>
                  <h3 className="vol__org">{v.org}</h3>
                  <div className="vol__role">{v.role}</div>
                  <div className="vol__years">{v.years}</div>
                  {v.note ? <p className="vol__note">{v.note}</p> : null}
                  {href ? (
                    /* A span, not a nested <a> — the card is already the link,
                       and an anchor inside an anchor is invalid HTML that
                       browsers resolve by silently closing the outer one. */
                    <span className="vol__link">
                      View on LinkedIn
                      <ArrowUpRight aria-hidden="true" />
                    </span>
                  ) : null}
                </Card>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
