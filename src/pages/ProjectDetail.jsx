import { useParams, Link, Navigate } from "react-router-dom";
import Reveal from "../components/Reveal.jsx";
import ProjectCard from "../components/ProjectCard.jsx";
import ContactSection from "../components/ContactSection.jsx";
import SectionHead from "../components/SectionHead.jsx";
import { ArrowUpRight, Check } from "../components/Icons.jsx";
import { useStore } from "../store.js";

export default function ProjectDetail() {
  const { slug } = useParams();
  const { findProject, projects } = useStore();
  const project = findProject(slug);

  if (!project) return <Navigate to="/projects" replace />;

  const related = projects.filter((p) => p.slug !== project.slug).slice(0, 2);

  return (
    <>
      <section className="detail-head">
        <div className="shell">
          <Reveal>
            <Link className="back" to="/projects">
              <ArrowUpRight aria-hidden="true" /> All projects
            </Link>
          </Reveal>
          <Reveal delay={1}>
            <h1 className="display" style={{ marginTop: 18 }}>
              {project.title}
            </h1>
          </Reveal>
          <Reveal delay={2}>
            <div className="detail-meta">
              <span className="card__tag" style={{ marginBottom: 0 }}>
                {project.tag}
              </span>
              <span className="small">{project.year}</span>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section--tight" style={{ paddingTop: 36 }}>
        <div className="shell">
          <Reveal>
            <figure className="detail-hero">
              <img src={project.image} alt="" />
            </figure>
          </Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 20 }}>
        <div className="shell">
          <div className="detail-grid">
            <div className="detail-body">
              <Reveal>
                <h2 className="h3">{project.summary}</h2>
              </Reveal>
              <Reveal delay={1}>
                <p style={{ marginTop: 24 }}>{project.description}</p>
              </Reveal>

              {project.highlights?.length ? (
                <Reveal delay={2}>
                  <ul className="detail-list">
                    {project.highlights.map((h) => (
                      <li key={h}>
                        <span className="acc__check" aria-hidden="true">
                          <Check />
                        </span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ) : null}

              {project.note ? (
                <Reveal delay={3}>
                  <p className="detail-note">{project.note}</p>
                </Reveal>
              ) : null}
            </div>

            <Reveal delay={1}>
              <aside className="detail-side">
                <div>
                  <div className="detail-side__k">Built with</div>
                  <div className="chips">
                    {(project.stack || []).map((s) => (
                      <span className="chip" key={s}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {project.links?.length ? (
                  <div>
                    <div className="detail-side__k">Links</div>
                    {project.links.map((l) => (
                      <a
                        key={l.href}
                        className="contact-mini__v"
                        href={l.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                      >
                        {l.label}
                        <ArrowUpRight style={{ width: 12, height: 12 }} />
                      </a>
                    ))}
                  </div>
                ) : null}

                <div>
                  <div className="detail-side__k">Year</div>
                  <div className="contact-mini__v">{project.year}</div>
                </div>
              </aside>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="shell">
          <SectionHead title="Next" lead="Two more worth a look." />
          <div className="projects">
            {related.map((p, i) => (
              <Reveal key={p.slug} delay={i}>
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
