import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import RootErrorBoundary from "./components/RootErrorBoundary.jsx";
import { MotionProvider } from "./motion/MotionProvider.jsx";
import "./styles/style.css";
import "./styles/app.css";

/**
 * FR-AVT-09 — "A failed model fetch (network error, decode error, timeout > 5s)
 * shall fall back to the poster image with no unhandled promise rejection and
 * no visible error surfaced to the visitor."
 *
 * drei's useGLTF suspends on a cached promise. When that promise rejects after
 * the boundary has already fallen back, the rejection can still reach the
 * window with nothing left to catch it. This listener swallows exactly the
 * rejections that originate in the asset pipeline and lets every other one
 * through, so real bugs stay loud.
 */
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const text = String(reason?.message ?? reason ?? "");
    const fromAssetPipeline =
      reason?.__wglAsset === true ||
      /\/models\/|\.glb|draco|ktx2|basis|GLTFLoader|THREE\.WebGLRenderer/i.test(text);
    if (fromAssetPipeline) {
      event.preventDefault();
      if (import.meta.env.DEV) {
        console.warn("[wgl] asset rejection suppressed, poster stands:", text);
      }
    }
  });
}

// The noscript block is a peer of #root, not a child, so React never owns it.
// Remove it as soon as we know scripting is alive.
document.querySelectorAll("noscript").forEach((n) => n.remove());

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RootErrorBoundary>
      <BrowserRouter>
        <MotionProvider>
          <App />
        </MotionProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  </StrictMode>
);
