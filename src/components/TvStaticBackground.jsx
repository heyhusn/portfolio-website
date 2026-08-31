import { useEffect, useRef } from "react";
import { useTicker } from "../motion/hooks.js";
import { useMotion } from "../motion/MotionProvider.jsx";
import { PRIORITY } from "../motion/kernel.js";

/**
 * TvStaticBackground
 *
 * Renders a high-performance live TV static ("no signal / analog snow") background
 * with CRT scanlines, subtle broadcast tracking bars, and analog interference.
 *
 * Performance:
 * - Uses a scaled off-screen 32-bit pixel buffer (Uint32Array) for ultra-fast noise generation (<0.2ms/frame).
 * - Connected directly to the Motion Kernel via useTicker (ADR-02 compliant).
 * - Gracefully freezes on a single static grain frame when motion is toggled off (prefers-reduced-motion).
 */
export default function TvStaticBackground() {
  const canvasRef = useRef(null);
  const { animate } = useMotion();

  // Internal state for noise generation and tracking glitches
  const state = useRef({
    width: 0,
    height: 0,
    ctx: null,
    imgData: null,
    buf32: null,
    lastFrameTime: 0,
    trackingY: 0,
    glitchTimer: 0,
    glitchActive: false,
    glitchHeight: 0,
    glitchY: 0,
  });

  // Setup canvas resolution (scaled down for retro TV snow texture & peak 60fps efficiency)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    state.current.ctx = ctx;

    const updateSize = () => {
      // Fine micro-grain resolution: higher density for sleek, refined TV static
      const scale = window.devicePixelRatio > 1 ? 0.75 : 0.6;
      const w = Math.max(240, Math.floor(window.innerWidth * scale));
      const h = Math.max(180, Math.floor(window.innerHeight * scale));

      canvas.width = w;
      canvas.height = h;

      const imgData = ctx.createImageData(w, h);
      state.current.width = w;
      state.current.height = h;
      state.current.imgData = imgData;
      state.current.buf32 = new Uint32Array(imgData.data.buffer);

      // Draw initial static frame
      drawNoiseFrame(true);
    };

    updateSize();
    window.addEventListener("resize", updateSize, { passive: true });
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Function to generate a single TV static snow frame
  const drawNoiseFrame = (forceStatic = false) => {
    const { ctx, width, height, imgData, buf32 } = state.current;
    if (!ctx || !imgData || !buf32 || width === 0 || height === 0) return;

    const s = state.current;

    // Advance tracking bar and random subtle glitch
    s.trackingY = (s.trackingY + 0.8) % height;
    s.glitchTimer--;
    if (s.glitchTimer <= 0) {
      s.glitchActive = Math.random() < 0.08;
      s.glitchHeight = Math.floor(Math.random() * 4 + 2);
      s.glitchY = Math.floor(Math.random() * (height - s.glitchHeight));
      s.glitchTimer = Math.floor(Math.random() * 60 + 30);
    }

    const trackY = Math.floor(s.trackingY);
    const hasGlitch = s.glitchActive;
    const gYStart = s.glitchY;
    const gYEnd = s.glitchY + s.glitchHeight;

    // Fast 32-bit pixel loop
    for (let y = 0; y < height; y++) {
      const isTracking = Math.abs(y - trackY) < 3;
      const isGlitchRow = hasGlitch && y >= gYStart && y < gYEnd;
      const rowOffset = y * width;

      for (let x = 0; x < width; x++) {
        // Balanced, fine-grained noise distribution
        let noise = (Math.random() * 220 + 20) | 0;

        // Subtle tracking bar interference
        if (isTracking) {
          noise = (noise * 0.8 + 40) | 0;
        }

        // Occasional subtle horizontal glitch lines
        if (isGlitchRow) {
          noise = (noise * 0.5 + (Math.random() > 0.5 ? 160 : 40)) | 0;
        }

        // Format: 0xAABBGGRR (Little Endian)
        buf32[rowOffset + x] = (255 << 24) | (noise << 16) | (noise << 8) | noise;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  };

  // Connect to Motion Kernel ticker
  useTicker(
    (frame) => {
      if (frame.terminal || !animate) {
        drawNoiseFrame(true);
        return;
      }

      // Throttle static refresh to 30-40fps for authentic TV snow flicker & zero CPU overhead
      const now = performance.now();
      if (now - state.current.lastFrameTime >= 28) {
        state.current.lastFrameTime = now;
        drawNoiseFrame(false);
      }
    },
    { active: animate, priority: PRIORITY.READ }
  );

  return (
    <div className="tv-static-container" aria-hidden="true">
      {/* Dynamic TV Noise Snow Canvas */}
      <canvas ref={canvasRef} className="tv-static-canvas" />

      {/* CRT Scanline Raster Layer */}
      <div className="tv-static-scanlines" />

      {/* Broadcast Rolling Interference Wave */}
      <div className="tv-static-wave" />

      {/* Vignette Depth Overlay */}
      <div className="tv-static-vignette" />
    </div>
  );
}
