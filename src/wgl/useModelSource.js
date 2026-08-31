import { useEffect, useState } from "react";
import { MODEL_FETCH_TIMEOUT_MS } from "./decoders.js";

/**
 * FR-AVT-04 / FR-AVT-09 — fetch the model exactly once, only after the scene
 * has entered the viewport, with a hard 5s timeout, and hand the loader a blob
 * URL so there is no second request.
 *
 * Why the preflight rather than letting the loader fetch: Suspense gives no
 * timeout and no clean cancellation, and a rejection that lands after the
 * boundary has fallen back can escape as an unhandled rejection. Fetching here
 * makes every failure path — network error, 404, decode-time abort, slow link —
 * an ordinary `catch` that flips one piece of state, and the poster simply
 * never gets replaced.
 *
 * States: "idle" → "loading" → "ready" | "failed"
 */
export function useModelSource(url, enabled) {
  const [state, setState] = useState({ status: "idle", src: null });

  useEffect(() => {
    if (!enabled || !url) {
      setState({ status: "idle", src: null });
      return;
    }

    let objectUrl = null;
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MODEL_FETCH_TIMEOUT_MS);

    setState({ status: "loading", src: null });

    fetch(url, { signal: controller.signal, credentials: "omit" })
      .then((res) => {
        if (!res.ok) throw new Error(`model fetch failed: HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ status: "ready", src: objectUrl });
      })
      .catch((err) => {
        if (cancelled) return;
        // Silent by contract: the visitor sees the poster and nothing else.
        if (import.meta.env.DEV) {
          console.warn("[wgl] model unavailable, poster stands —", err.message);
        }
        setState({ status: "failed", src: null });
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, enabled]);

  return state;
}

export default useModelSource;
