import Reveal from "./Reveal.jsx";
import SectionHead from "./SectionHead.jsx";
import { ArrowUpRight, Check } from "./Icons.jsx";
import { useStore } from "../store.js";

/**
 * Certifications & credentials. Credential IDs are shown in full because a
 * credential nobody can verify is decoration — each card carries the issuer,
 * the date, the ID, and a link out when one exists.
 */
export default function CertificationsSection({
  id = "certifications",
  title = "Certifications & Credentials",
  lead = "Verifiable, with the credential ID on the card — check any of them.",
}) {
  const { siteContent } = useStore();
  const certifications = siteContent?.certifications || [];

  if (!certifications.length) return null;

  return (
    <section className="section" id={id}>
      <div className="shell">
        <SectionHead title={title} lead={lead} />

        <div className="certs">
          {certifications.map((cert, i) => (
            <Reveal key={cert.id || i} delay={Math.min(i, 3)}>
              <article className="cert">
                <div className="cert__top">
                  <div>
                    <div className="cert__issuer">{cert.issuer}</div>
                    {cert.partner ? <div className="cert__partner">{cert.partner}</div> : null}
                  </div>
                  <span className="cert__date">{cert.date}</span>
                </div>

                <h3 className="cert__title">{cert.title}</h3>

                {cert.topics?.length ? (
                  <ul className="cert__topics">
                    {cert.topics.map((t) => (
                      <li key={t}>
                        <Check aria-hidden="true" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="cert__foot">
                  {cert.credentialId ? (
                    <span className="cert__id">
                      <span className="cert__id-k">Credential ID</span>
                      <code>{cert.credentialId}</code>
                    </span>
                  ) : null}
                  {cert.href ? (
                    <a className="cert__link" href={cert.href} target="_blank" rel="noreferrer">
                      View credential
                      <ArrowUpRight aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
