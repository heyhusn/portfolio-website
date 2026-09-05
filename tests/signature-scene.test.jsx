import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

/**
 * FR-AVT-01 / 02 — the gates around the WebGL avatar.
 *
 * The property under test is the one the whole design rests on: the poster is
 * the element, not a fallback. It is in the document in every state, at the
 * same size, and the canvas is a layer that appears on top of it only when
 * every gate opens. If that ever stops being true, the failure is a layout
 * shift in the hero on the slowest devices — the visitors least able to
 * absorb it — which is not something anyone notices on a dev machine.
 *
 * These tests never mount a real WebGL context: AvatarCanvas is the lazy
 * boundary, and what matters here is whether SignatureScene decides to reach
 * for it at all.
 */

const mocks = vi.hoisted(() => ({
  motion: { tier: "FULL", motion: "FULL", animate: true, webgl: true },
  manifest: { present: true, src: "/models/avatar.abc1234567.glb", bytes: 1, hash: "abc" },
}));

vi.mock("../src/motion/MotionProvider.jsx", () => ({
  useMotion: () => mocks.motion,
  MOTION: { FULL: "FULL", OFF: "OFF" },
  TIER: { FULL: "FULL", MID: "MID", LITE: "LITE" },
}));

vi.mock("../src/wgl/model-manifest.json", () => ({ default: mocks.manifest }));

// The chunk itself never loads in these tests; reaching for it is the signal.
const canvasMounted = vi.fn();
vi.mock("../src/wgl/AvatarCanvas.jsx", () => ({
  default: () => {
    canvasMounted();
    return <div data-testid="avatar-canvas" />;
  },
}));

const { default: SignatureScene } = await import("../src/wgl/SignatureScene.jsx");

function setEnv({ tier = "FULL", motionOn = true, present = true } = {}) {
  mocks.motion.tier = tier;
  mocks.motion.motion = motionOn ? "FULL" : "OFF";
  mocks.motion.animate = motionOn;
  mocks.motion.webgl = tier === "FULL" && motionOn;
  mocks.manifest.present = present;
}

beforeEach(() => {
  canvasMounted.mockClear();
  setEnv();
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(["glb"])) })
  );
  global.URL.createObjectURL = vi.fn(() => "blob:model");
  global.URL.revokeObjectURL = vi.fn();
});

describe("SignatureScene", () => {
  it("renders the poster at a fixed intrinsic size in every state", () => {
    for (const env of [
      { tier: "FULL" },
      { tier: "MID" },
      { tier: "LITE" },
      { tier: "FULL", motionOn: false },
      { tier: "FULL", present: false },
    ]) {
      setEnv(env);
      const { unmount } = render(<SignatureScene alt="Portrait of Husnain Aslam" />);
      const poster = screen.getByAltText("Portrait of Husnain Aslam");
      expect(poster).toBeInTheDocument();
      // The width/height attributes are what reserve the box before the image
      // decodes — the reason mounting or losing the canvas cannot shift layout.
      expect(poster).toHaveAttribute("width", "325");
      expect(poster).toHaveAttribute("height", "440");
      unmount();
    }
  });

  it("does not reach for the WebGL chunk below the FULL tier", async () => {
    for (const tier of ["MID", "LITE"]) {
      setEnv({ tier });
      const { container, unmount } = render(<SignatureScene alt="x" />);
      await act(async () => {});
      expect(canvasMounted).not.toHaveBeenCalled();
      expect(container.querySelector(".sig")).toHaveAttribute("data-scene", "poster");
      unmount();
    }
  });

  it("does not reach for the WebGL chunk when motion is off, even on FULL", async () => {
    setEnv({ tier: "FULL", motionOn: false });
    render(<SignatureScene alt="x" />);
    await act(async () => {});
    expect(canvasMounted).not.toHaveBeenCalled();
  });

  it("does not fetch a model the build does not contain", async () => {
    setEnv({ tier: "FULL", present: false });
    render(<SignatureScene alt="x" />);
    await act(async () => {});
    expect(global.fetch).not.toHaveBeenCalled();
    expect(canvasMounted).not.toHaveBeenCalled();
  });

  it("keeps the poster and stays silent when the model fetch fails", async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error("network")));
    setEnv({ tier: "FULL" });
    const { container } = render(<SignatureScene alt="Portrait of Husnain Aslam" />);
    await act(async () => {});
    expect(screen.getByAltText("Portrait of Husnain Aslam")).toBeInTheDocument();
    expect(container.querySelector(".sig")).toHaveAttribute("data-scene", "poster");
  });

  it("keeps the poster on an HTTP error rather than mounting an empty canvas", async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404 }));
    setEnv({ tier: "FULL" });
    const { container } = render(<SignatureScene alt="x" />);
    await act(async () => {});
    expect(canvasMounted).not.toHaveBeenCalled();
    expect(container.querySelector(".sig")).toHaveAttribute("data-scene", "poster");
  });
});
