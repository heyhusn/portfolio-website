import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The capability tier is decided by an inline <script> in index.html, before
 * first paint, so it cannot be imported. It is also the single most
 * consequential branch on the site: FULL is the only tier allowed to mount
 * WebGL, so a bug here makes the avatar invisible to a whole class of visitor
 * and nothing else goes wrong to give it away.
 *
 * That is exactly the shape of thing that needs a test, so rather than
 * duplicate the logic, this extracts the real script out of the real
 * index.html and runs it against synthetic browsers.
 *
 * The regression it exists to prevent is specific: `navigator.deviceMemory` is
 * Chromium-only, and a `mem >= 8` gate could never be satisfied in Firefox or
 * Safari — every visitor on either was pinned to MID, a desktop Mac included.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");

const source = (() => {
  // The one inline <script> in the head — identified by what it writes, not by
  // its position, so reordering the head does not break the test.
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const found = blocks.find((b) => b.includes('setAttribute("data-tier"'));
  if (!found) throw new Error("capability script not found in index.html");
  return found;
})();

/** Run the real inline script against a fabricated environment. */
function resolveTier(env) {
  const attrs = {};
  const documentElement = {
    setAttribute: (k, v) => {
      attrs[k] = v;
    },
  };
  const queries = {
    "(prefers-reduced-motion: reduce)": env.reducedMotion === true,
    "(any-pointer: fine)": env.finePointer !== false,
    "(any-hover: hover)": env.hover !== false,
    "(pointer: coarse)": env.coarsePointer === true,
  };
  const scope = {
    document: { documentElement },
    navigator: {
      deviceMemory: env.deviceMemory,
      hardwareConcurrency: env.cores,
      connection: env.connection,
    },
    screen: { width: env.screenW ?? 1920, height: env.screenH ?? 1080 },
    matchMedia: (q) => ({ matches: Boolean(queries[q]) }),
  };
  scope.window = scope;

  // eslint-disable-next-line no-new-func
  new Function("window", "document", "navigator", "screen", source)(
    scope,
    scope.document,
    scope.navigator,
    scope.screen
  );
  return attrs;
}

describe("pre-paint capability tier", () => {
  it("gives a desktop Chromium machine FULL", () => {
    expect(resolveTier({ deviceMemory: 8, cores: 16 })["data-tier"]).toBe("FULL");
  });

  it("gives Firefox and Safari FULL too — they report no deviceMemory at all", () => {
    // The exact regression: undefined memory used to fall through to MID, and
    // MID may not mount WebGL, so the avatar could never render on either.
    expect(
      resolveTier({ deviceMemory: undefined, cores: 10 })["data-tier"]
    ).toBe("FULL");
  });

  it("still refuses FULL to a Chromium machine that reports low memory", () => {
    expect(resolveTier({ deviceMemory: 4, cores: 16 })["data-tier"]).toBe("MID");
  });

  it("gives a touchscreen laptop FULL — a coarse primary pointer is not a phone", () => {
    expect(
      resolveTier({ deviceMemory: 8, cores: 12, coarsePointer: true })["data-tier"]
    ).toBe("FULL");
  });

  it("refuses FULL to a device with no pointer at all", () => {
    expect(
      resolveTier({ cores: 12, finePointer: false, hover: false })["data-tier"]
    ).toBe("MID");
  });

  it("refuses FULL to a phone-sized viewport however many cores it claims", () => {
    const tier = resolveTier({
      cores: 8,
      screenW: 390,
      screenH: 844,
      finePointer: false,
      hover: false,
    })["data-tier"];
    expect(tier).toBe("LITE");
  });

  it("drops to LITE on save-data or a 2g connection, whatever the hardware", () => {
    expect(
      resolveTier({ deviceMemory: 32, cores: 32, connection: { saveData: true } })[
        "data-tier"
      ]
    ).toBe("LITE");
    expect(
      resolveTier({
        deviceMemory: 32,
        cores: 32,
        connection: { effectiveType: "slow-2g" },
      })["data-tier"]
    ).toBe("LITE");
  });

  it("writes motion OFF when the OS asks for reduced motion", () => {
    const attrs = resolveTier({ deviceMemory: 8, cores: 16, reducedMotion: true });
    expect(attrs["data-motion"]).toBe("OFF");
    // The tier is independent of the motion preference — the avatar gate is
    // the conjunction of the two, and it is resolved in React, not here.
    expect(attrs["data-tier"]).toBe("FULL");
  });

  it("writes both attributes on every path", () => {
    const attrs = resolveTier({ cores: 1, screenW: 320, screenH: 480 });
    expect(attrs["data-tier"]).toBe("LITE");
    expect(attrs["data-motion"]).toBe("FULL");
  });
});
