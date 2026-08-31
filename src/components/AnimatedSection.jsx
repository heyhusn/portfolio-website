import { motion } from 'framer-motion';
import { useMotion } from '../motion/MotionProvider.jsx';

const variants = {
  default: {
    hidden: { opacity: 1 },
    visible: { opacity: 1 }
  },
  'fade-up': {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  },
  'slide-in': {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  },
  'scale-up': {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'backOut' } }
  }
};

const fontStyles = {
  default: {},
  serif: { fontFamily: 'Georgia, serif' },
  mono: { fontFamily: 'monospace' }
};

export default function AnimatedSection({ section, children }) {
  const { animate } = useMotion();
  if (!section || !section.is_visible) return null;

  const style = fontStyles[section.font_family] || fontStyles.default;

  // `animate` is false for prefers-reduced-motion, the site's own motion
  // toggle switched off, or a non-FULL/MID capability tier (see
  // MotionProvider). This component previously ran unconditionally, making
  // it the one animation on the site that ignored all three — ship the
  // section in its resting state instead of fading/sliding/scaling it in.
  if (!animate || section.animation_type === 'default') {
    return <div style={style}>{children}</div>;
  }

  const anim = variants[section.animation_type] || variants.default;

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={anim}
      style={style}
    >
      {children}
    </motion.div>
  );
}
