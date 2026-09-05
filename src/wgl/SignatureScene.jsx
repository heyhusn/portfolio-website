import {
  Component,
  Suspense,
  lazy,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useMotion, TIER } from "../motion/MotionProvider.jsx";
import { useInViewOnce } from "../motion/hooks.js";
import { useModelSource } from "./useModelSource.js";
import manifest from "./model-manifest.json";

/**
 * The signature scene — ADR-20 and FR-AVT-01 … FR-AVT-11 in one component.
 *
 * The poster is not a fallback that swaps in when something fails. The poster
 * is the element: it is always rendered, always occupies the box, and the
 * canvas is an absolutely-positioned layer that fades in on top of it if and
 * only if every gate opens. That is what makes "no layout shift between the
 * poster and the mounted canvas" (FR-AVT-02) structural rather than a promise.
 *
 * The gates, in order:
 *   1. CapabilityTier === FULL and MotionMode !== OFF          (FR-AVT-01)
 *   2. a model is actually present in the build                (manifest)
 *   3. the scene has entered the viewport                      (FR-AVT-04)
 *   4. the model fetched inside 5s without error               (FR-AVT-09)
 *   5. the WebGL chunk imported and the scene mounted          (error boundary)
 *
 * Any gate that does not open leaves the poster exactly where it was, with no
 * error surfaced to the visitor.
 */

// Gate 5's payload. This dynamic import is the only reference to the WebGL
// chunk anywhere in the entry graph.
const AvatarCanvas = lazy(() => import("./AvatarCanvas.jsx"));

/** How many times a lost WebGL context may be re-requested before we stop. */
const MAX_RECOVERY_ATTEMPTS = 2;

/** Catches anything the lazy chunk or the scene throws during render. */
class SceneBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    // Silent by contract (FR-AVT-09) — visible only to a developer.
    if (import.meta.env.DEV) {
      console.warn("[wgl] scene failed, poster stands —", error?.message ?? error);
    }
    this.props.onFail?.();
  }

  componentDidUpdate(prev) {
    // A new generation (context restored) gets a fresh attempt.
    if (prev.generation !== this.props.generation && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

const SignatureScene = forwardRef(function SignatureScene(
  {
    poster = "/assets/img/avatar-poster.webp",
    alt = "",
    className = "",
    style,
    children,
    ...rest
  },
  outerRef
) {
  const { tier, webgl } = useMotion();
  const [viewRef, inView] = useInViewOnce({ threshold: 0.2, rootMargin: "200px" });

  // Gate 5 bookkeeping: a context loss bumps the generation, which remounts the
  // canvas from scratch once the browser restores the context (FR-AVT-08).
  const [generation, setGeneration] = useState(0);
  const [lost, setLost] = useState(false);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);
  // Recovery is bounded. A device that loses its context because too many
  // contexts already exist will lose the next one too, and an uncapped remount
  // loop turns one failure into a permanent cycle of allocating and discarding
  // GPU contexts. After MAX_RECOVERY_ATTEMPTS the poster stands for the rest of
  // the session - a supported state, not a degraded one (FR-AVT-02).
  const [exhausted, setExhausted] = useState(false);
  const attempts = useRef(0);

  // Gates 1–3.
  const eligible =
    webgl && manifest.present && inView && !failed && !lost && !exhausted;

  // Gate 4.
  const { status, src } = useModelSource(manifest.src, eligible);

  const handleLost = useCallback(() => {
    setLost(true);
    setVisible(false);
  }, []);

  const handleRestored = useCallback(() => {
    if (attempts.current >= MAX_RECOVERY_ATTEMPTS) {
      setExhausted(true);
      setLost(false);
      return;
    }
    attempts.current += 1;
    setLost(false);
    setGeneration((g) => g + 1);
  }, []);

  // If the browser never fires contextrestored — some drivers don't — come back
  // on our own after a moment rather than sitting on the poster forever.
  useEffect(() => {
    if (!lost) return;
    const t = setTimeout(() => {
      if (attempts.current >= MAX_RECOVERY_ATTEMPTS) {
        setExhausted(true);
        setLost(false);
        return;
      }
      attempts.current += 1;
      setLost(false);
      setGeneration((g) => g + 1);
    }, 1200);
    return () => clearTimeout(t);
  }, [lost]);

  const handleFail = useCallback(() => setFailed(true), []);
  const handleReady = useCallback(() => setVisible(true), []);

  const mountCanvas = eligible && status === "ready" && src;

  return (
    <figure
      ref={(node) => {
        viewRef.current = node;
        if (typeof outerRef === "function") outerRef(node);
        else if (outerRef) outerRef.current = node;
      }}
      className={`sig ${className}`.trim()}
      style={style}
      {...rest}
      data-scene={mountCanvas ? (visible ? "model" : "loading") : "poster"}
    >
      {/* The poster. Always present, always the element that sizes the box. */}
      <img
        className="sig__poster"
        src={poster}
        alt={alt}
        width="325"
        height="440"
        decoding="async"
        // Only the poster is eager: it is the LCP candidate on every tier.
        // Lowercase on purpose. React 18 does not recognise the camelCase
        // `fetchPriority` prop: it warns and drops the attribute entirely, so
        // the LCP priority hint this exists to set was never reaching the
        // document. React 19 accepts both spellings; this one works on both.
        fetchpriority="high"
      />

      {mountCanvas ? (
        <div className="sig__canvas" data-visible={visible ? "true" : "false"}>
          <SceneBoundary onFail={handleFail} generation={generation}>
            <Suspense fallback={null}>
              <AvatarCanvas
                key={generation}
                src={src}
                tier={tier}
                onLost={handleLost}
                onRestored={handleRestored}
                onReady={handleReady}
              />
            </Suspense>
          </SceneBoundary>
        </div>
      ) : null}

      {children}
    </figure>
  );
});

export default SignatureScene;
export { TIER };
