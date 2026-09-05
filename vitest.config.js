import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Test config, separate from vite.config.js on purpose.
 *
 * The build config's manualChunks logic exists to keep three.js out of the
 * entry graph; none of it applies under Vitest, and pulling it in would mean
 * every change to the chunking strategy risks breaking the test run for
 * reasons that have nothing to do with the tests.
 *
 * Environment: jsdom for the component and DOM-facing tests, which is most of
 * them — the Motion Kernel, the capability tiers and the reveal hooks are all
 * about browser APIs. The retrieval tests are pure functions and do not care.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.js"],
    include: ["tests/**/*.test.{js,jsx,mjs}"],
    // The RAG modules are .mjs under backend/ and import each other by
    // relative path; nothing here needs a transform beyond esbuild's default.
    server: { deps: { inline: [/backend\//] } },
  },
});
