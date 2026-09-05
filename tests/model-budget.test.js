import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync } from "node:zlib";
import { readGlbJson, auditCompression } from "../scripts/check-model-budget.mjs";

/**
 * FR-AVT-03 / 05 — the build gate is the only thing standing between a
 * re-export and a 60 MB hero asset, and its failure mode is silent: a model
 * that slipped through would still render, just ruinously. These tests
 * synthesise GLBs with known defects and assert the gate names each one.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MAX_TRANSFERRED = 3 * 1024 * 1024;

/** Build a minimal binary glTF around a given JSON chunk. */
function makeGlb(gltf) {
  const json = Buffer.from(JSON.stringify(gltf), "utf8");
  const pad = (4 - (json.length % 4)) % 4;
  const jsonChunk = Buffer.concat([json, Buffer.alloc(pad, 0x20)]);

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // "glTF"
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonChunk.length, 8);

  const chunkHeader = Buffer.alloc(8);
  chunkHeader.writeUInt32LE(jsonChunk.length, 0);
  chunkHeader.writeUInt32LE(0x4e4f534a, 4); // "JSON"

  return Buffer.concat([header, chunkHeader, jsonChunk]);
}

const COMPLIANT = {
  asset: { version: "2.0" },
  extensionsUsed: ["KHR_draco_mesh_compression", "KHR_texture_basisu"],
  meshes: [
    {
      primitives: [
        { extensions: { KHR_draco_mesh_compression: { bufferView: 0 } } },
      ],
    },
  ],
  textures: [{ extensions: { KHR_texture_basisu: { source: 0 } } }],
  images: [{ mimeType: "image/ktx2" }],
};

describe("readGlbJson", () => {
  it("parses a well-formed binary glTF", () => {
    expect(readGlbJson(makeGlb(COMPLIANT)).asset.version).toBe("2.0");
  });

  it("rejects a file that is not a GLB", () => {
    expect(() => readGlbJson(Buffer.from("not a model at all"))).toThrow(/magic|short/i);
  });

  it("rejects glTF 1.0", () => {
    const buf = makeGlb(COMPLIANT);
    buf.writeUInt32LE(1, 4);
    expect(() => readGlbJson(buf)).toThrow(/version/i);
  });
});

describe("auditCompression", () => {
  it("passes a Draco + KTX2 export", () => {
    const { problems, hasDraco, hasKtx2 } = auditCompression(COMPLIANT, "avatar.glb");
    expect(problems).toHaveLength(0);
    expect(hasDraco).toBe(true);
    expect(hasKtx2).toBe(true);
  });

  it("catches uncompressed geometry", () => {
    const bare = structuredClone(COMPLIANT);
    bare.extensionsUsed = ["KHR_texture_basisu"];
    bare.meshes[0].primitives = [{ attributes: { POSITION: 0 } }];
    const { problems } = auditCompression(bare, "avatar.glb");
    expect(problems.join(" ")).toMatch(/geometry is uncompressed/i);
  });

  it("catches a texture that came through as JPEG", () => {
    const jpeg = structuredClone(COMPLIANT);
    jpeg.extensionsUsed = ["KHR_draco_mesh_compression"];
    jpeg.textures = [{ source: 0 }];
    jpeg.images = [{ mimeType: "image/jpeg" }];
    const { problems } = auditCompression(jpeg, "avatar.glb");
    expect(problems.join(" ")).toMatch(/KHR_texture_basisu|compressed/i);
  });
});

describe("the model actually committed to this repo", () => {
  const dir = resolve(root, "public/models");
  // These run only when a model is committed. A tree with no .glb is a
  // supported state (FR-AVT-02, poster-only), not a test failure — but when a
  // model IS there, it has to satisfy every budget the gate enforces.
  const file = existsSync(dir)
    ? readdirSync(dir).find((f) => f.endsWith(".glb")) ?? null
    : null;

  it.runIf(file)("is inside the 3 MB transfer budget", () => {
    const buf = readFileSync(resolve(dir, file));
    expect(brotliCompressSync(buf).length).toBeLessThanOrEqual(MAX_TRANSFERRED);
  });

  it.runIf(file)("declares Draco geometry and KTX2 textures", () => {
    const gltf = readGlbJson(readFileSync(resolve(dir, file)));
    const { problems } = auditCompression(gltf, file);
    expect(problems).toEqual([]);
  });

  it.runIf(file)("is named with its content hash, and the manifest points at it", () => {
    expect(file).toMatch(/^avatar\.[0-9a-f]{10}\.glb$/);
    const manifest = JSON.parse(
      readFileSync(resolve(root, "src/wgl/model-manifest.json"), "utf8")
    );
    expect(manifest.present).toBe(true);
    expect(manifest.src).toBe(`/models/${file}`);
  });
});
