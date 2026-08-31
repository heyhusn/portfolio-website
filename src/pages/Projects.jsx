import { Link } from "react-router-dom";
import Reveal from "../components/Reveal.jsx";
import SectionHead from "../components/SectionHead.jsx";
import ProjectCard from "../components/ProjectCard.jsx";
import ContactSection from "../components/ContactSection.jsx";
import { ArrowUpRight } from "../components/Icons.jsx";
import { useStore } from "../store.js";

export default function Projects() {
  const { getFeaturedProjects, getMoreProjects } = useStore();
  const featuredProjects = getFeaturedProjects();
  const moreProjects = getMoreProjects();

  return (
    <>
      <section className="section section--tight">
        <div className="shell">
          <Reveal>
            <h1 className="h1" style={{ marginBottom: 24 }}>
              Projects & Systems
            </h1>
          </Reveal>
          <Reveal delay={1}>
            <p className="lead" style={{ maxWidth: "42ch" }}>
              The systems that had to work in production, and the experiments
              that answered a specific question. Every metric here was measured,
              not guessed.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ============ FEATURED ============ */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="shell">
          <div className="projects">
            {featuredProjects.map((p, i) => (
              <Reveal key={p.slug} delay={i % 2}>
                <ProjectCard project={p} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ MORE ============ */}
      <section className="section">
        <div className="shell">
          <SectionHead
            title="More Work"
            lead="Smaller tools, academic builds, and the scaffolding that led to the bigger systems."
          />
          <div className="projects">
            {moreProjects.map((p, i) => (
              <Reveal key={p.slug} delay={i % 2}>
                <ProjectCard project={p} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <ContactSection />
    </>
  );
}
