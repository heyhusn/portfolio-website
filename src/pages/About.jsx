import Reveal from "../components/Reveal.jsx";
import SectionHead from "../components/SectionHead.jsx";
import ContactSection from "../components/ContactSection.jsx";
import SkillsSection from "../components/SkillsSection.jsx";
import CertificationsSection from "../components/CertificationsSection.jsx";
import VolunteeringSection from "../components/VolunteeringSection.jsx";
import GitHubActivity from "../components/GitHubActivity.jsx";
import RecommendationsSection from "../components/RecommendationsSection.jsx";
import { useStore } from "../store.js";

export default function About() {
  const { profile, siteContent } = useStore();
  const experience = siteContent?.experience || [];
  const processSteps = siteContent?.process || [];
  const education = profile?.education;

  return (
    <>
      <section className="section section--tight">
        <div className="shell">
          <Reveal>
            <div className="hero__top" style={{ justifyContent: "flex-start", marginBottom: 32 }}>
              <span className="chip">
                <i className="chip__dot" /> {profile?.availability}
              </span>
            </div>
          </Reveal>
          <Reveal delay={1}>
            <h1 className="h1" style={{ maxWidth: "20ch", marginBottom: 24 }}>
              I build the parts of a system that have to be right when nobody is watching.
            </h1>
          </Reveal>
          <div className="about-text">
            <Reveal delay={2}>
              <p className="lead">{profile?.intro}</p>
            </Reveal>
            <Reveal delay={3}>
              <p>
                That means owning the whole path from data to interface — NASA POWER telemetry into a Random Forest / XGBoost / LSTM ensemble for a solar digital twin, OCR- and ASR-fused evidence units for VLVRAG's retrieval layer, FastAPI services wrapping all of it. I don't just train models; I build the pipelines that feed them and the endpoints that serve them.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ JOURNEY ============ */}
      <section className="section" id="journey">
        <div className="shell">
          <SectionHead
            title="Where I've Worked"
            lead="Teaching and building in parallel — explaining a system daily is what keeps the design of it honest."
          />
          <div className="timeline">
            {experience.map((e, i) => (
              <Reveal key={e.role || i} delay={Math.min(i, 4)}>
                <div className="tl">
                  <h3 className="tl__role">{e.role}</h3>
                  <div className="tl__org">{e.org}</div>
                  <div className="tl__years">{e.years}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ EDUCATION ============ */}
      {education ? (
        <section className="section" id="education">
          <div className="shell">
            <SectionHead
              title="Education & Honours"
              lead="One degree, and the awards that came from finishing the final year project properly."
            />
            <div className="timeline">
              <Reveal>
                <div className="tl">
                  <h3 className="tl__role">{education.degree}</h3>
                  <div className="tl__org">{education.school}</div>
                  <div className="tl__years">{education.years}</div>
                </div>
              </Reveal>
            </div>
            {education.awards?.length ? (
              <Reveal delay={1}>
                <ul className="edu-awards">
                  {education.awards.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </Reveal>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ============ SKILLS ============ */}
      <SkillsSection id="stack" />

      {/* ============ CERTIFICATIONS ============ */}
      <CertificationsSection />

      {/* ============ GITHUB ============ */}
      <GitHubActivity />

      {/* ============ RECOMMENDATIONS ============ */}
      <RecommendationsSection />

      {/* ============ VOLUNTEERING ============ */}
      <VolunteeringSection />

      {/* ============ PROCESS ============ */}
      <section className="section" id="process">
        <div className="shell">
          <SectionHead
            title="Evidence Meets Craft"
            lead="Five stages, always in the same order. Nothing moves forward on a number that cannot be defended."
          />
          <div className="process">
            {processSteps.map((s, i) => (
              <Reveal key={s.n || i}>
                <div className="step">
                  <div className="step__n">{s.n}</div>
                  <h3 className="step__t">{s.t}</h3>
                  <p className="step__d">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <ContactSection />
    </>
  );
}
