import { useRef } from "react";
import { Link } from "react-router-dom";
import Reveal from "../components/Reveal.jsx";
import SectionHead from "../components/SectionHead.jsx";
import Accordion from "../components/Accordion.jsx";
import Marquee from "../components/Marquee.jsx";
import WordTicker from "../components/WordTicker.jsx";
import ProjectCard from "../components/ProjectCard.jsx";
import PostCard from "../components/PostCard.jsx";
import RecognitionCard from "../components/RecognitionCard.jsx";
import ContactSection from "../components/ContactSection.jsx";
import Socials from "../components/Socials.jsx";
import Stat from "../components/Stat.jsx";
import { ArrowUpRight } from "../components/Icons.jsx";
import { useTicker } from "../motion/hooks.js";
import { PRIORITY } from "../motion/kernel.js";
import { useStore } from "../store.js";
import AnimatedSection from "../components/AnimatedSection.jsx";
import SkillsSection from "../components/SkillsSection.jsx";
import CertificationsSection from "../components/CertificationsSection.jsx";
import VolunteeringSection from "../components/VolunteeringSection.jsx";
import GitHubActivity from "../components/GitHubActivity.jsx";
import RecommendationsSection from "../components/RecommendationsSection.jsx";
import AskAssistant from "../components/AskAssistant.jsx";

import FlowingPortrait from "../components/FlowingPortrait.jsx";

export default function Home() {
  const { profile, siteContent, sections, getFeaturedProjects, getPublishedPosts } = useStore();
  const featuredProjects = getFeaturedProjects();
  const posts = getPublishedPosts();
  const heroSlotRef = useRef(null);
  const servicesSlotRef = useRef(null);

  if (!profile || !siteContent) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading content...</div>;
  }

  const { services = [], tickerWords = [], recognition = [], faqs = [] } = siteContent;
  const [wordL, wordR] = profile.heroWords || ["", ""];

  // Render a specific block based on section ID
  const renderSectionContent = (section) => {
    switch (section.id) {
      case "hero":
        return (
          <section className="hero">
            <div className="shell">
              <div className="hero__top">
                <span className="chip">
                  <i className="chip__dot" /> {profile.availability}
                </span>
                <span className="kicker">{profile.kicker}</span>
              </div>
              <div className="hero__row">
                <Reveal>
                  <div className="hero__col hero__col--l">
                    <span className="kicker hero__name">{profile.name}</span>
                    <h1 className="display hero__word hero__word--l">{wordL}</h1>
                  </div>
                </Reveal>
                <div ref={heroSlotRef} className="hero__figure-wrap hero__figure-slot">
                  <figure className="sig hero__figure hero__figure--mobile-only" data-scene="poster">
                    <img
                      className="sig__poster"
                      src="/assets/img/avatar-poster.webp"
                      alt={`Portrait of ${profile.name}`}
                      width="325"
                      height="440"
                      decoding="async"
                      fetchPriority="high"
                    />
                  </figure>
                </div>
                <Reveal delay={2}>
                  <h1 className="display hero__word hero__word--r">{wordR}</h1>
                </Reveal>
              </div>
              <div className="hero__bottom">
                <Reveal delay={3}>
                  <p className="hero__tag">{profile.tagline}</p>
                </Reveal>
              </div>
            </div>
          </section>
        );
      case "ticker":
        return <WordTicker words={tickerWords} />;
      case "services":
        return (
          <section className="section" id="services">
            <div className="shell">
              <div className="services">
                <div>
                  <SectionHead
                    title="How I Can Help"
                    lead="Four ways I plug into a team — from the data pipeline nobody wants to own to the interface it ends up behind."
                    single
                  />
                  <Accordion items={services} />
                </div>
                <div ref={servicesSlotRef} className="services__media-slot">
                  <figure className="services__media services__media--mobile-only">
                    <img src="/assets/img/avatar-poster.webp" alt="" loading="lazy" decoding="async" />
                  </figure>
                </div>
              </div>
            </div>
          </section>
        );
      case "about":
        return (
          <section className="section" id="about">
            <div className="shell">
              <div className="about-grid">
                <div>
                  <Reveal>
                    <span className="eyebrow">{profile.aboutEyebrow}</span>
                  </Reveal>
                  <Reveal delay={1}>
                    <h2 className="h2" style={{ marginTop: 14 }}>
                      {profile.aboutTitle}
                    </h2>
                  </Reveal>
                  <Reveal delay={2}>
                    <p className="lead" style={{ marginTop: 20 }}>
                      {profile.aboutLead}
                    </p>
                  </Reveal>
                  <Reveal delay={3}>
                    <div className="contact-mini">
                      <div>
                        <div className="contact-mini__k">Call today</div>
                        <a className="contact-mini__v" href={profile.phoneHref}>
                          {profile.phone}
                        </a>
                      </div>
                      <div>
                        <div className="contact-mini__k">Email</div>
                        <a className="contact-mini__v" href={`mailto:${profile.email}`}>
                          {profile.email}
                        </a>
                      </div>
                    </div>
                  </Reveal>
                  <Reveal delay={4}>
                    <div style={{ marginTop: 32, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                      <Link className="btn btn--lime btn--lg" to="/about">
                        My Story
                        <ArrowUpRight className="btn__arrow" />
                      </Link>
                      <Socials />
                    </div>
                  </Reveal>
                </div>
                <div className="stats">
                  {profile.stats.map((s, i) => (
                    <Reveal key={s.label} delay={i}>
                      <Stat {...s} />
                    </Reveal>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      case "work":
        return (
          <section className="section" id="work">
            <div className="shell">
              <SectionHead
                title="Featured Projects"
                lead="Four systems that had to work outside a notebook — a research pipeline, a platform in production, a forecaster and an assistant."
              />
              <div className="projects">
                {featuredProjects.map((p, i) => (
                  <Reveal key={p.slug} delay={i % 2}>
                    <ProjectCard project={p} />
                  </Reveal>
                ))}
              </div>
              <Reveal>
                <div style={{ display: "flex", justifyContent: "center", marginTop: 52 }}>
                  <Link className="btn btn--lime btn--lg" to="/projects">
                    Browse All Projects
                    <ArrowUpRight className="btn__arrow" />
                  </Link>
                </div>
              </Reveal>
            </div>
          </section>
        );
      case "recognition":
        return (
          <section className="section section--tight" id="recognition">
            <div className="shell">
              <SectionHead
                title="Recognition"
                lead="Awards, results and the numbers that survived an audit."
                center
              />
            </div>
            <Marquee style={{ marginBottom: 20 }} speed={40}>
              {recognition.map((item, i) => (
                <RecognitionCard key={i} item={item} />
              ))}
            </Marquee>
          </section>
        );
      case "faq":
        return (
          <section className="section" id="faq">
            <div className="shell">
              <SectionHead
                title="Frequently Asked Questions"
                lead="The questions that come up in almost every first conversation."
                center
              />
              <Reveal>
                <Accordion items={faqs} className="faq" />
              </Reveal>
            </div>
          </section>
        );
      case "notes":
        return (
          <section className="section" id="notes">
            <div className="shell">
              <SectionHead
                title="Notes & Insights"
                lead="Occasional writing on retrieval, evaluation and the parts of a build that are easy to skip."
              />
              <div className="posts">
                {posts.slice(0, 2).map((p, i) => (
                  <Reveal key={p.slug} delay={i}>
                    <PostCard post={p} />
                  </Reveal>
                ))}
              </div>
              <Reveal>
                <div style={{ display: "flex", justifyContent: "center", marginTop: 52 }}>
                  <Link className="btn btn--lime btn--lg" to="/blogs">
                    Browse All Insights
                    <ArrowUpRight className="btn__arrow" />
                  </Link>
                </div>
              </Reveal>
            </div>
          </section>
        );
      // Resume-derived blocks. Each one is self-contained and reads its own
      // slice of siteContent, so the admin panel can show, hide or reorder
      // them here exactly like any other predefined section.
      case "skills":
        return <SkillsSection id="skills" title={section.title || "Technical Skills"} />;
      case "certifications":
        return <CertificationsSection id="certifications" title={section.title || "Certifications & Credentials"} />;
      case "volunteering":
        return <VolunteeringSection id="volunteering" title={section.title || "Volunteering"} />;
      case "assistant":
        return <AskAssistant id="assistant" />;
      case "github":
        return <GitHubActivity id="github" />;
      case "recommendations":
        return <RecommendationsSection id="recommendations" title={section.title || "What People I've Worked With Say"} />;
      case "contact":
        return <ContactSection />;
      default:
        // Handle custom sections
        if (section.type === 'custom_text') {
          return (
            <section className="section" id={section.id}>
              <div className="shell">
                <SectionHead title={section.title} />
                <Reveal>
                  <p className="lead" style={{ maxWidth: '800px', whiteSpace: 'pre-wrap' }}>
                    {section.content?.text || ""}
                  </p>
                </Reveal>
              </div>
            </section>
          );
        }
        if (section.type === 'custom_boxes') {
          const boxes = section.content?.boxes || [];
          return (
            <section className="section" id={section.id}>
              <div className="shell">
                <SectionHead title={section.title} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                  {boxes.map((box, i) => (
                    <Reveal key={i} delay={i % 3}>
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '2rem', borderRadius: '12px', height: '100%' }}>
                        <h3 className="h4" style={{ marginBottom: '1rem' }}>{box.title}</h3>
                        <p style={{ color: 'var(--text-dim)' }}>{box.desc}</p>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            </section>
          );
        }
        return null;
    }
  };

  return (
    <>
      <FlowingPortrait
        profile={profile}
        heroSlotRef={heroSlotRef}
        servicesSlotRef={servicesSlotRef}
      />
      {sections.map((section) => (
        <AnimatedSection key={section.id} section={section}>
          {renderSectionContent(section)}
        </AnimatedSection>
      ))}
    </>
  );
}
