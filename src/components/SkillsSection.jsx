import Reveal from "./Reveal.jsx";
import SectionHead from "./SectionHead.jsx";
import TechIcon from "./TechIcon.jsx";
import { useStore } from "../store.js";

/**
 * The icon-based skills grid that replaced the old three-across tiles with
 * two-letter abbreviations ("Py", "Fa", "3js"). Groups come from the store,
 * so the admin panel's Skills tab can reorder, rename, add or drop any of
 * them without a rebuild.
 */
export default function SkillsSection({
  id = "skills",
  title = "Technical Skills",
  lead = "Grouped the way I actually use them — the research stack, the services behind it, and the tooling that gets both shipped.",
  groups,
}) {
  const { siteContent } = useStore();
  const skillGroups = groups || siteContent?.skillGroups || [];

  if (!skillGroups.length) return null;

  return (
    <section className="section" id={id}>
      <div className="shell">
        <SectionHead title={title} lead={lead} />

        <div className="skills">
          {skillGroups.map((group, gi) => (
            <Reveal key={group.id || gi} delay={Math.min(gi, 4)}>
              <article className="skillgrp">
                <header className="skillgrp__head">
                  <h3 className="skillgrp__title">{group.title}</h3>
                  {group.lead ? <p className="skillgrp__lead">{group.lead}</p> : null}
                </header>

                <ul className="skillgrp__list">
                  {(group.skills || []).map((skill, si) => (
                    <li className="skill" key={(skill.name || "") + si}>
                      <span className="skill__ico">
                        <TechIcon slug={skill.icon} title={skill.name} />
                      </span>
                      <span className="skill__body">
                        <span className="skill__name">{skill.name}</span>
                        {skill.level ? <span className="skill__level">{skill.level}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
