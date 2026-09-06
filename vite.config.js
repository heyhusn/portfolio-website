import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Build config.
 *
 * SRS notes:
 *  - NFR-PERF-05: the initial JS budget is small, so everything WebGL related is
 *    split into its own async chunk ("wgl"). Nothing in that chunk may be
 *    reachable from the entry graph except through a dynamic import().
 *  - FR-AVT-06: Draco / Meshopt / KTX2 decoders are copied into /public/decoders
 *    at install time and served from our own origin. No third-party CDN.
 *  - FR-AVT-10: the .glb is content-hashed at build time by the model manifest,
 *    so a redeploy can never serve a stale asset against changed loader code.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2020",
    cssCodeSplit: true,
    assetsInlineLimit: 2048,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vite's __vitePreload helper is a virtual module with no natural
          // home. Left to Rollup it can land inside the "wgl" chunk, which
          // makes the entry statically import wgl and earns it a
          // <link rel="modulepreload"> — every visitor would then download the
          // whole three.js bundle regardless of tier, defeating ADR-20. Pin it
          // to a chunk the entry already needs.
          if (id.includes("preload-helper")) return "react";
          if (!id.includes("node_modules")) return undefined;

          const parts = id.split("node_modules/");
          const isTopLevelPkg = parts.length === 2; // exactly one node_modules/ boundary
          const pkgPath = parts[parts.length - 1];

          // The app's own top-level zustand (used by src/store.js for the
          // public pages' data) must never land in "wgl". It's easy to get
          // this wrong: @react-three/fiber ships a private nested copy of
          // zustand for its own internal state, and something in the
          // three.js/@react-three dependency tree also reaches the
          // top-level copy — so once that shared module is pulled into the
          // wgl chunk's graph, Rollup can fold the whole module in there,
          // and the entry ends up statically importing `create` from wgl to
          // get it. That earns the entry an eager
          // <link rel="modulepreload"> on the whole three.js bundle for
          // every visitor, tier notwithstanding — the exact regression the
          // preload-helper pin above exists to prevent. Pinning the
          // top-level zustand explicitly, before the wgl check runs at all,
          // is the reliable fix regardless of which dependency creates that
          // cross-reference.
          if (isTopLevelPkg && (pkgPath === "zustand" || pkgPath.startsWith("zustand/"))) {
            return "react";
          }

          // Match the innermost node_modules/<package> segment, not "does
          // this path contain the substring anywhere" — a plain
          // id.includes("@react-three") also swept in nested transitive
          // dependencies living under an @react-three/* folder (like the
          // zustand copy above). Only a package's own files should land in
          // "wgl"; its transitive dependencies go through normal automatic
          // chunking (and naturally end up alongside wgl if that's the only
          // place they're reachable from).
          if (
            pkgPath.startsWith("three/") || pkgPath === "three" ||
            pkgPath.startsWith("@react-three/") ||
            pkgPath.startsWith("postprocessing/") ||
            pkgPath.startsWith("meshoptimizer/")
          ) {
            return "wgl";
          }
          if (id.includes("react-router")) return "router";
          if (id.includes("react-dom") || id.includes("/react/")) return "react";
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
});
