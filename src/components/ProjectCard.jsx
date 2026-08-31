import { Link } from "react-router-dom";
import { useRef, forwardRef } from "react";
import { ArrowUpRight } from "./Icons.jsx";
import { useTicker } from "../motion/hooks.js";
import { useMotion, TIER, MOTION } from "../motion/MotionProvider.jsx";
import { PRIORITY } from "../motion/kernel.js";

/**
 * Project card.
 *
 * The hover behaviour — image zoom, description reveal, lime arrow badge — is
 * pure CSS and unchanged from the static build.
 *
 * On FULL tier only, the card adds a small pointer-tracked tilt, stepped by the
 * Motion Kernel rather than by pointermove, so a grid of eight cards costs one
 * subscriber each and never more than one layout write per frame. The tilt is
 * a transform on a wrapper, so it composes with the CSS scale on the image
 * instead of fighting it.
 */
const ProjectCard = forwardRef(function ProjectCard({ project, className, ...rest }, outerRef) {
  const wrapRef = useRef(null);
  const pointer = useRef({ x: 0, y: 0, active: false });
  const current = useRef({ x: 0, y: 0 });
  const { tier, motion } = useMotion();
  const tilt = tier === TIER.FULL && motion !== MOTION.OFF;

  useTicker(
    (frame) => {
      const el = wrapRef.current;
      if (!el) return;
      if (frame.terminal) {
        el.style.transform = "";
        return;
      }
      const target = pointer.current.active ? pointer.current : { x: 0, y: 0 };
      const k = Math.min(1, frame.dt * 9);
      current.current.x += (target.x - current.current.x) * k;
      current.current.y += (target.y - current.current.y) * k;

      const { x, y } = current.current;
      if (Math.abs(x) < 0.0005 && Math.abs(y) < 0.0005) {
        el.style.transform = "";
        return;
      }
      el.style.transform =
        `perspective(1100px) rotateX(${(-y * 4).toFixed(3)}deg) ` +
        `rotateY(${(x * 4).toFixed(3)}deg)`;
    },
    { active: tilt, priority: PRIORITY.RENDER }
  );

  const onPointerMove = (e) => {
    if (!tilt) return;
    const rect = e.currentTarget.getBoundingClientRect();
    pointer.current = {
      x: (e.clientX - rect.left) / rect.width - 0.5,
      y: (e.clientY - rect.top) / rect.height - 0.5,
      active: true,
    };
  };

  const onPointerLeave = () => {
    pointer.current.active = false;
  };

  return (
    <div
      className={["card-tilt", className].filter(Boolean).join(" ")}
      ref={(node) => {
        wrapRef.current = node;
        if (typeof outerRef === "function") outerRef(node);
        else if (outerRef) outerRef.current = node;
      }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      {...rest}
    >
      <Link className="card" to={`/projects/${project.slug}`}>
        <div className="card__media">
          <img src={project.image} alt="" loading="lazy" decoding="async" />
        </div>
        <span className="card__arrow" aria-hidden="true">
          <ArrowUpRight />
        </span>
        <div className="card__body">
          <span className="card__tag">{project.tag}</span>
          <h3 className="card__title">{project.title}</h3>
          <p className="card__desc">{project.summary}</p>
        </div>
      </Link>
    </div>
  );
});

export default ProjectCard;
