import { Component } from "react";

/**
 * The last line of defence.
 *
 * Without a boundary at the root, one thrown render anywhere in the tree
 * unmounts the whole application and leaves the visitor a blank white page —
 * on a portfolio, the single worst failure mode there is, because it looks
 * like the site does not exist rather than like a bug.
 *
 * This is deliberately not the WebGL boundary. SignatureScene has its own,
 * scoped one that keeps the poster and says nothing (FR-AVT-09); this catches
 * everything else, and it does surface something, because a visitor staring at
 * a broken page needs a way forward.
 *
 * It renders without any of the app's own components on purpose: whatever just
 * threw might be one of them.
 */
export default class RootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // No analytics endpoint to report to, so the console is where this goes.
    // Kept in production deliberately: a bug someone can screenshot from
    // devtools is worth more than a silent one.
    console.error("[app] unhandled render error:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          textAlign: "center",
          background: "#1a1a1b",
          color: "#f4f4f2",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
          Something on this page broke
        </h1>
        <p style={{ margin: 0, maxWidth: 460, lineHeight: 1.6, opacity: 0.75 }}>
          Not your doing. Reloading usually clears it — and if it doesn&rsquo;t,
          I&rsquo;d genuinely like to know.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 22px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              background: "#d0ff71",
              color: "#1a1a1b",
              font: "600 15px/1 Inter, system-ui, sans-serif",
            }}
          >
            Reload the page
          </button>
          <a
            href="mailto:mhusnainaslam2003@gmail.com?subject=Something%20broke%20on%20your%20site"
            style={{
              padding: "12px 22px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,.22)",
              color: "#f4f4f2",
              textDecoration: "none",
              font: "600 15px/1 Inter, system-ui, sans-serif",
            }}
          >
            Tell me about it
          </a>
        </div>
      </div>
    );
  }
}
