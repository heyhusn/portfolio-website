import { useMotion, MOTION } from "../motion/MotionProvider.jsx";
import { MotionOn, MotionOff } from "./Icons.jsx";

/**
 * Lets the visitor turn the site's motion off without changing an OS setting,
 * and turn it back on if their OS says reduce but they want the full thing.
 * Flipping this switch stops the Motion Kernel and unmounts the WebGL scene,
 * so it is the same gate the SRS describes, exposed to the person it is for.
 */
export default function MotionToggle() {
  const { motion, toggleMotion } = useMotion();
  const on = motion !== MOTION.OFF;

  return (
    <button
      type="button"
      className="motion-toggle"
      onClick={toggleMotion}
      aria-pressed={on}
      title={on ? "Turn motion off" : "Turn motion on"}
      aria-label={on ? "Turn motion off" : "Turn motion on"}
    >
      {on ? <MotionOn aria-hidden="true" /> : <MotionOff aria-hidden="true" />}
    </button>
  );
}
