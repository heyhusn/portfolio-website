import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import motionKernel from "./kernel.js";
import {
  MOTION,
  TIER,
  resolveTier,
  resolveMotion,
  systemMotion,
  storedMotion,
  persistMotion,
  watchSystemMotion,
} from "./capability.js";

const MotionContext = createContext({
  tier: TIER.LITE,
  motion: MOTION.OFF,
  animate: false,
  webgl: false,
  setMotion: () => {},
  toggleMotion: () => {},
});

/**
 * Owns the two values every gated effect on the site reads, and keeps the
 * Motion Kernel's enabled flag in step with them. Mounted once, at the root.
 */
export function MotionProvider({ children }) {
  // The inline head script already wrote a safe pre-paint guess; the first
  // render matches it, then the WebGL probe refines the tier in an effect so
  // the probe never blocks paint.
  const [tier, setTier] = useState(() =>
    typeof document === "undefined"
      ? TIER.LITE
      : document.documentElement.getAttribute("data-tier") || TIER.LITE
  );
  const [motion, setMotionState] = useState(() =>
    typeof document === "undefined"
      ? MOTION.OFF
      : document.documentElement.getAttribute("data-motion") || MOTION.FULL
  );

  useEffect(() => {
    setTier(resolveTier());
    setMotionState(resolveMotion());
  }, []);

  // Follow the OS preference unless the visitor has set an explicit override.
  useEffect(
    () =>
      watchSystemMotion((next) => {
        if (storedMotion() === null) setMotionState(next);
      }),
    []
  );

  // Mirror onto <html> so CSS can gate without waiting for React, and drive the
  // kernel. MotionMode OFF stops the single rAF loop dead (ADR-02).
  useEffect(() => {
    document.documentElement.setAttribute("data-tier", tier);
    document.documentElement.setAttribute("data-motion", motion);
    motionKernel.setEnabled(motion !== MOTION.OFF);
  }, [tier, motion]);

  const setMotion = useCallback((next) => {
    persistMotion(next === systemMotion() ? null : next);
    setMotionState(next);
  }, []);

  const toggleMotion = useCallback(() => {
    setMotionState((prev) => {
      const next = prev === MOTION.OFF ? MOTION.FULL : MOTION.OFF;
      persistMotion(next === systemMotion() ? null : next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      tier,
      motion,
      /** the single boolean most components want */
      animate: motion !== MOTION.OFF,
      /** FR-AVT-01 — the exact gate the avatar and the WebGL scene share */
      webgl: tier === TIER.FULL && motion !== MOTION.OFF,
      setMotion,
      toggleMotion,
    }),
    [tier, motion, setMotion, toggleMotion]
  );

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export function useMotion() {
  return useContext(MotionContext);
}

export { MOTION, TIER };
