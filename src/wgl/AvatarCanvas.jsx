import { Suspense, useEffect, useMemo, useRef, useCallback } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { AnimationMixer, ACESFilmicToneMapping, SRGBColorSpace, Box3, Vector3 } from "three";
import { DRACO_PATH, KTX2_TRANSCODER_PATH } from "./decoders.js";
import { useTicker } from "../motion/hooks.js";
import { PRIORITY } from "../motion/kernel.js";
import { clampedDpr, TIER } from "../motion/capability.js";

/**
 * The WebGL chunk. Nothing in this file is reachable from the entry bundle —
 * SignatureScene imports it with a dynamic import(), and vite.config.js pins
 * three and @react-three/* into their own "wgl" chunk, so a visitor below the
 * FULL tier never downloads any of it (NFR-PERF-05 / ADR-20).
 */

/* ------------------------------------------------------------------ *
 * FR-AVT-07 — the model does not run its own requestAnimationFrame loop.
 *
 * The Canvas is created with frameloop="never", which means r3f renders only
 * when something calls advance(). That something is the Motion Kernel ticker,
 * the single rAF loop for the whole document (ADR-02). Baked clips are stepped
 * with the same delta, so the animation and the render can never drift apart.
 * ------------------------------------------------------------------ */
function KernelDriver({ onFrame }) {
  const advance = useThree((s) => s.advance);
  const clock = useRef(0);

  useTicker(
    (frame) => {
      if (frame.terminal) return;
      clock.current += frame.dt;
      onFrame?.(frame);
      // r3f expects a timestamp in seconds for its internal clock.
      advance(clock.current);
    },
    { priority: PRIORITY.RENDER }
  );

  return null;
}

/* ------------------------------------------------------------------ *
 * KTX2 needs the renderer to detect which compressed texture formats the GPU
 * supports, so the loader is configured inside the canvas rather than at
 * module scope. Both decoder paths are same-origin (FR-AVT-06).
 * ------------------------------------------------------------------ */
function useLoaderExtensions() {
  const gl = useThree((s) => s.gl);
  return useCallback(
    (loader) => {
      const ktx2 = new KTX2Loader()
        .setTranscoderPath(KTX2_TRANSCODER_PATH)
        .detectSupport(gl);
      loader.setKTX2Loader(ktx2);
    },
    [gl]
  );
}

/* ------------------------------------------------------------------ *
 * The model.
 * ------------------------------------------------------------------ */
function AvatarModel({ src, onReady }) {
  const extend = useLoaderExtensions();
  // useGLTF(path, dracoPath, useMeshopt, extendLoader) — the string form of the
  // second argument points DRACOLoader at our own origin.
  const gltf = useGLTF(src, DRACO_PATH, true, extend);
  const group = useRef(null);
  const mixer = useMemo(
    () => (gltf.animations?.length ? new AnimationMixer(gltf.scene) : null),
    [gltf]
  );

  // Fit the model into a consistent box so a re-export at a different scale
  // cannot change the composition of the hero (FR-AVT-02: no layout shift, and
  // no visual jump either).
  //
  // The frame is portrait (325×440), so the fit is driven by height and only
  // clamped by width. FRAME_H / FRAME_W are the world-space dimensions visible
  // at the camera distance and fov set below — recompute them if either moves.
  const fit = useMemo(() => {
    const FRAME_H = 2.08; // 2 * 3.4 * tan(34°/2)
    const FRAME_W = FRAME_H * (325 / 440);
    const box = new Box3().setFromObject(gltf.scene);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const byHeight = (FRAME_H * 0.86) / (size.y || 1);
    const byWidth = (FRAME_W * 0.92) / (size.x || 1);
    return { scale: Math.min(byHeight, byWidth), center };
  }, [gltf]);

  useEffect(() => {
    if (!mixer) return;
    gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
    return () => mixer.stopAllAction();
  }, [mixer, gltf]);

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  /* ---------------------------------------------------------------- *
   * Disposal.
   *
   * useModelSource hands the loader a fresh blob: URL on every generation, and
   * drei's useGLTF caches by URL. Nothing would ever evict those entries: the
   * URL is revoked the moment the fetch effect tears down, so the cache keeps
   * a parsed scene keyed on a string that can never be requested again, and
   * the GPU-side buffers and textures it holds are never released. Two or
   * three context-loss recoveries and the tab is carrying several copies of
   * the model it can no longer reach.
   *
   * So: drop the cache entry and dispose the resources explicitly when this
   * component goes away. r3f disposes the renderer on unmount, but it does not
   * own anything drei cached outside the canvas.
   * ---------------------------------------------------------------- */
  useEffect(() => {
    const scene = gltf.scene;
    return () => {
      try {
        useGLTF.clear(src);
      } catch {
        /* cache shape changed under us — disposal below still runs */
      }
      scene.traverse((obj) => {
        obj.geometry?.dispose?.();
        const materials = Array.isArray(obj.material)
          ? obj.material
          : obj.material
          ? [obj.material]
          : [];
        for (const material of materials) {
          for (const key of Object.keys(material)) {
            const value = material[key];
            if (value && value.isTexture) value.dispose();
          }
          material.dispose?.();
        }
      });
    };
  }, [src, gltf]);

  // Runs inside advance(), never in a loop of its own.
  //
  // Idle motion is a slow sway rather than a full turn: a half-body avatar
  // spun 180° shows the back of a head, which is not the signature piece. If
  // the .glb carries baked clips the mixer drives them and the sway rides on
  // top at a low amplitude.
  const t = useRef(0);
  useFrame((_, delta) => {
    if (mixer) mixer.update(delta);
    t.current += delta;
    if (group.current) {
      const amp = mixer ? 0.1 : 0.26;
      group.current.rotation.y = Math.sin(t.current * 0.32) * amp;
      group.current.position.y = -0.15 + Math.sin(t.current * 0.5) * 0.012;
    }
  });

  return (
    <group ref={group} scale={fit.scale}>
      <primitive
        object={gltf.scene}
        position={[
          -fit.center.x,
          -fit.center.y,
          -fit.center.z,
        ]}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * FR-AVT-08 — context loss.
 *
 * On loss: prevent the default (which would make the loss permanent), tell the
 * host to show the poster, and dispose the GPU-side resources. On restore, the
 * host remounts this component with a new key, which re-requests the model from
 * cache. The canvas is never left blank or corrupted — the poster occupies the
 * same box the whole time.
 * ------------------------------------------------------------------ */
function ContextLossGuard({ onLost, onRestored }) {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const canvas = gl.domElement;

    const handleLost = (event) => {
      event.preventDefault();
      onLost?.();
    };
    const handleRestored = () => onRestored?.();

    canvas.addEventListener("webglcontextlost", handleLost, false);
    canvas.addEventListener("webglcontextrestored", handleRestored, false);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleLost);
      canvas.removeEventListener("webglcontextrestored", handleRestored);
    };
  }, [gl, onLost, onRestored]);

  return null;
}

/* ------------------------------------------------------------------ */
export default function AvatarCanvas({
  src,
  tier = TIER.FULL,
  onLost,
  onRestored,
  onReady,
}) {
  const dpr = clampedDpr(tier);

  return (
    <Canvas
      // FR-AVT-07: no internal render loop.
      frameloop="never"
      dpr={dpr}
      shadows={false}
      camera={{ position: [0, 0.15, 3.4], fov: 34, near: 0.1, far: 20 }}
      gl={{
        antialias: dpr < 2,
        alpha: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
        // Let the browser hand the context back rather than losing it for good.
        failIfMajorPerformanceCaveat: false,
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.outputColorSpace = SRGBColorSpace;
      }}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <ContextLossGuard onLost={onLost} onRestored={onRestored} />
      <KernelDriver />

      {/*
        Lighting for a photogrammetry-style bust: the texture already carries
        baked light, so the job here is to keep it readable rather than to
        relight it. A broad neutral ambient does most of the work, the key is
        gentle, and the lime is a rim from behind at low intensity — enough to
        tie the figure to the palette, not enough to tint skin or hair.
      */}
      <ambientLight intensity={0.95} />
      <directionalLight position={[2.5, 3, 2.5]} intensity={0.75} color="#ffffff" />
      <directionalLight position={[-2.8, 1.4, -2.2]} intensity={0.42} color="#d0ff71" />
      <directionalLight position={[0, -1.5, 1.8]} intensity={0.16} color="#9fb2c0" />

      <Suspense fallback={null}>
        <AvatarModel src={src} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}

export { useGLTF };
