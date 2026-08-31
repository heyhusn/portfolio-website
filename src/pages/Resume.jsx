import { useState } from "react";
import Reveal from "../components/Reveal.jsx";
import SkillsSection from "../components/SkillsSection.jsx";
import CertificationsSection from "../components/CertificationsSection.jsx";
import VolunteeringSection from "../components/VolunteeringSection.jsx";
import RecommendationsSection from "../components/RecommendationsSection.jsx";
import ContactSection from "../components/ContactSection.jsx";
import { Download, Share, ArrowUpRight } from "../components/Icons.jsx";
import { useStore } from "../store.js";

const CV_PATH = "/assets/cv/husnain-aslam-cv.pdf";
const CV_FILENAME = "Husnain-Aslam-Resume.pdf";

/**
 * The full-page resume, replacing the old modal viewer.
 *
 * The PDF gets a real page instead of a 90vh-capped dialog: it renders at
 * the full shell width with its own aspect box, so a reader can actually
 * read it rather than squint at it. Below it, the same skills, certification
 * and volunteering data the About page renders — which means the page is
 * still useful (and indexable) if the browser refuses to render the PDF
 * inline at all, as most mobile browsers do.
 */
export default function Resume() {
  const { profile } = useStore();
  const [shareState, setShareState] = useState("idle");

  const handleShare = async () => {
    const url = new URL(CV_PATH, window.location.origin).href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.name || "Husnain Aslam"} — Resume`,
          text: "Have a look at my resume.",
          url,
        });
      } catch {
        // AbortError just means the visitor dismissed the native share sheet.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
    } catch {
      setShareState("error");
    } finally {
      setTimeout(() => setShareState("idle"), 2200);
    }
  };

  return (
    <>
      <section className="section section--tight" id="resume">
        <div className="shell">
          <Reveal>
            <div className="hero__top" style={{ justifyContent: "flex-start", marginBottom: 32 }}>
              <span className="chip">
                <i className="chip__dot" /> {profile?.availability}
              </span>
              <span className="kicker">Resume</span>
            </div>
          </Reveal>

          <div className="resume-head">
            <Reveal delay={1}>
              <h1 className="h1" style={{ maxWidth: "16ch" }}>
                {profile?.name || "Husnain Aslam"}
              </h1>
            </Reveal>
            <Reveal delay={2}>
              <div className="resume-head__meta">
                <p className="lead">{profile?.role}</p>
                <p className="resume-head__line">
                  {profile?.location}
                  {profile?.email ? (
                    <>
                      {" · "}
                      <a href={`mailto:${profile.email}`}>{profile.email}</a>
                    </>
                  ) : null}
                  {profile?.phone ? (
                    <>
                      {" · "}
                      <a href={profile.phoneHref || `tel:${profile.phone}`}>{profile.phone}</a>
                    </>
                  ) : null}
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={3}>
            <div className="resume-actions">
              <a className="btn btn--lime" href={CV_PATH} download={CV_FILENAME}>
                <Download aria-hidden="true" />
                Download PDF
              </a>
              <a className="btn" href={CV_PATH} target="_blank" rel="noreferrer">
                Open in a new tab
                <ArrowUpRight aria-hidden="true" />
              </a>
              <button type="button" className="btn" onClick={handleShare}>
                <Share aria-hidden="true" />
                {shareState === "copied"
                  ? "Link copied"
                  : shareState === "error"
                  ? "Couldn't copy link"
                  : "Share"}
              </button>
            </div>
          </Reveal>

          <Reveal delay={4}>
            {/* <object> lets a browser that can't render PDFs inline fall
                through to its children instead of showing a blank frame —
                which is exactly what most mobile browsers do. */}
            <div className="resume-doc">
              <object data={`${CV_PATH}#view=FitH`} type="application/pdf" aria-label="Resume PDF">
                <iframe src={`${CV_PATH}#view=FitH`} title="Resume PDF" />
                <div className="resume-doc__fallback">
                  <p>Your browser can't display the PDF inline.</p>
                  <a className="btn btn--lime" href={CV_PATH} download={CV_FILENAME}>
                    <Download aria-hidden="true" />
                    Download the PDF
                  </a>
                </div>
              </object>
            </div>
          </Reveal>
        </div>
      </section>

      <SkillsSection
        id="resume-skills"
        title="Technical Skills"
        lead="The same stack as the PDF, grouped the way I actually use it."
      />
      <CertificationsSection id="resume-certifications" />
      <RecommendationsSection id="resume-recommendations" />
      <VolunteeringSection id="resume-volunteering" />

      <ContactSection />
    </>
  );
}
