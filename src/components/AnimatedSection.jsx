import { useMotion } from '../motion/MotionProvider.jsx';
import { useInViewOnce } from '../motion/hooks.js';

const fontStyles = {
  default: {},
  serif: { fontFamily: 'Georgia, serif' },
  mono: { fontFamily: 'monospace' }
};

export default function AnimatedSection({ section, children }) {
  const { animate } = useMotion();
  const [ref, inView] = useInViewOnce({ threshold: 0.05, rootMargin: "0px 0px -80px 0px" });

  if (!section || !section.is_visible) return null;

  const fontStyle = fontStyles[section.font_family] || fontStyles.default;
  const animType = section.animation_type || 'default';

  // If animations are disabled, or type is default, render statically
  if (!animate || animType === 'default') {
    return <div style={fontStyle}>{children}</div>;
  }

  const animClass = `section-anim section-anim--${animType}${inView ? " is-in" : ""}`;

  return (
    <div
      ref={ref}
      className={animClass}
      style={fontStyle}
    >
      {children}
    </div>
  );
}
