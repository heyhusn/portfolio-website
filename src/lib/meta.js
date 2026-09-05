/**
 * Runtime document metadata for client-side navigation.
 *
 * Scope, precisely: this fixes the browser tab and the history entry as the
 * visitor moves between routes, and it helps crawlers that DO execute
 * JavaScript (Google, mainly).
 *
 * It does NOT fix link previews, and nothing running in the browser can.
 * X, LinkedIn, Facebook, Slack and WhatsApp fetch the document and parse the
 * <head> without ever running a script — so the tags that matter for a shared
 * link are the ones already in the HTML when it arrives. Those are written per
 * route at build time by scripts/prerender-meta.mjs. Reaching for react-helmet
 * here would look like a fix and change nothing about what gets shared.
 *
 * Twelve lines instead of a dependency, because that is all this needs.
 */
import { useEffect } from "react";

function setTag(selector, attr, value) {
  if (!value) return;
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
}

/**
 * @param {{title?: string, description?: string}} meta
 */
export function useDocumentMeta({ title, description } = {}) {
  useEffect(() => {
    if (title) {
      document.title = title;
      setTag('meta[property="og:title"]', "content", title);
      setTag('meta[name="twitter:title"]', "content", title);
    }
    if (description) {
      setTag('meta[name="description"]', "content", description);
      setTag('meta[property="og:description"]', "content", description);
      setTag('meta[name="twitter:description"]', "content", description);
    }
    // The canonical link follows client-side navigation too, so a JS-rendering
    // crawler that lands mid-session does not attribute the content to "/".
    const canonical = document.head.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", window.location.origin + window.location.pathname);
  }, [title, description]);
}

export default useDocumentMeta;
