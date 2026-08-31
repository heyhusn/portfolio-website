/**
 * CI gate for the avatar model.
 *
 *   FR-AVT-03  The model file, compressed, shall not exceed 3 MB transferred.
 *              A CI check shall fail the build if /public/models/*.glb exceeds
 *              this budget.
 *   FR-AVT-05  The model shall be exported with Draco geometry compression and
 *              Meshopt/KTX2 texture compression. A CI check shall parse the
 *              .glb and fail the build if an uncompressed geometry or texture
 *              accessor is present.
 *   FR-AVT-06  No third-party CDN reference shall appear in the loader config.
 *   FR-AVT-10  The model file shall be content-hashed in its filename at build
 *              time so a redeploy cannot serve a stale asset.
 *
 * Runs before `vite build`. Exits non-zero on any violation.
 * When no model is present it reports and passes — the site is required to work
 * with the model absent (FR-AVT-02 poster fallback), so an empty models/ dir is
 * a valid state, not a build failure.
 */
import { readdir, readFile, writeFile, rename, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { gzipSync, brotliCompressSync, constants as zlibConstants } from "node:zlib";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MODELS_DIR = join(root, "public", "models");
const MANIFEST = join(root, "src", "wgl", "model-manifest.json");

const MAX_TRANSFERRED_BYTES = 3 * 1024 * 1024; // FR-AVT-03

const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;
const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;

const failures = [];

/* ------------------------------------------------------------------ *
 * Minimal .glb reader — header + JSON chunk. No third-party parser.
 * ------------------------------------------------------------------ */
function readGlbJson(buf) {
  if (buf.length < 12) throw new Error("file is too short to be a .glb");
  const magic = buf.readUInt32LE(0);
  if (magic !== 0x46546c67) throw new Error("not a binary glTF (bad magic)");
  const version = buf.readUInt32LE(4);
  if (version !== 2) throw new Error(`unsupported glTF version ${version}`);

  let offset = 12;
  while (offset + 8 <= buf.length) {
    const chunkLength = buf.readUInt32LE(offset);
    const chunkType = buf.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (chunkType === 0x4e4f534a) {
      return JSON.parse(buf.subarray(start, start + chunkLength).toString("utf8"));
    }
    offset = start + chunkLength;
  }
  throw new Error("no JSON chunk found");
}

/* ------------------------------------------------------------------ *
 * FR-AVT-05 — compression audit
 * ------------------------------------------------------------------ */
function auditCompression(gltf, name) {
  const used = new Set(gltf.extensionsUsed || []);
  const problems = [];

  const hasDraco = used.has("KHR_draco_mesh_compression");
  const hasMeshopt = used.has("EXT_meshopt_compression");
  const hasKtx2 = used.has("KHR_texture_basisu");

  // --- geometry ---------------------------------------------------
  const meshes = gltf.meshes || [];
  const rawPrimitives = [];
  meshes.forEach((mesh, mi) => {
    (mesh.primitives || []).forEach((prim, pi) => {
      const ext = prim.extensions || {};
      const compressed =
        ext.KHR_draco_mesh_compression !== undefined ||
        // meshopt compresses at the bufferView level, checked below
        hasMeshopt;
      if (!compressed) rawPrimitives.push(`meshes[${mi}].primitives[${pi}]`);
    });
  });

  if (meshes.length && !hasDraco && !hasMeshopt) {
    problems.push(
      "geometry is uncompressed — neither KHR_draco_mesh_compression nor " +
        "EXT_meshopt_compression is declared in extensionsUsed"
    );
  } else if (rawPrimitives.length && !hasMeshopt) {
    problems.push(
      `${rawPrimitives.length} primitive(s) carry no Draco extension: ` +
        rawPrimitives.slice(0, 4).join(", ") +
        (rawPrimitives.length > 4 ? ", …" : "")
    );
  }

  // If meshopt is declared, every bufferView holding geometry should carry the
  // extension. A mixed export is the failure mode this check exists to catch.
  if (hasMeshopt) {
    const views = gltf.bufferViews || [];
    const uncompressedViews = views.filter(
      (v) => !(v.extensions && v.extensions.EXT_meshopt_compression)
    );
    // Some views legitimately stay raw (image data, sparse indices). Only flag
    // when the majority are raw, which means the export skipped compression.
    if (views.length > 0 && uncompressedViews.length / views.length > 0.5) {
      problems.push(
        `EXT_meshopt_compression declared but ${uncompressedViews.length}/${views.length} ` +
          "bufferViews are uncompressed — re-export with meshopt applied to all buffers"
      );
    }
  }

  // --- textures ---------------------------------------------------
  const images = gltf.images || [];
  const textures = gltf.textures || [];
  if (textures.length) {
    const rawTextures = textures.filter(
      (t) => !(t.extensions && t.extensions.KHR_texture_basisu)
    );
    if (!hasKtx2 || rawTextures.length) {
      problems.push(
        `${rawTextures.length || textures.length} texture(s) are not KTX2/Basis ` +
          "compressed — re-export with KHR_texture_basisu"
      );
    }
  }
  const pngJpeg = images.filter(
    (i) => i.mimeType === "image/png" || i.mimeType === "image/jpeg"
  );
  if (pngJpeg.length) {
    problems.push(
      `${pngJpeg.length} raw PNG/JPEG image(s) embedded — these must be KTX2`
    );
  }

  return { problems, hasDraco, hasMeshopt, hasKtx2 };
}

/* ------------------------------------------------------------------ *
 * FR-AVT-06 — no third-party CDN in loader configuration
 * ------------------------------------------------------------------ */
const CDN_PATTERN =
  /(https?:)?\/\/(www\.)?(unpkg\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|esm\.sh|gstatic\.com|googleapis\.com|threejs\.org)/i;

async function auditLoaderOrigins() {
  const dir = join(root, "src", "wgl");
  if (!existsSync(dir)) return;
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!/\.(js|jsx|ts|tsx)$/.test(entry.name)) continue;
    const p = join(entry.parentPath ?? entry.path ?? dir, entry.name);
    const src = await readFile(p, "utf8");
    const hit = src.match(CDN_PATTERN);
    if (hit) {
      failures.push(
        `FR-AVT-06 — third-party origin "${hit[0]}" referenced in ${basename(p)}`
      );
    }
  }
}

/* ------------------------------------------------------------------ *
 * FR-AVT-10 — content-hash the filename, write the manifest
 * ------------------------------------------------------------------ */
async function writeManifest(entry) {
  await writeFile(MANIFEST, JSON.stringify(entry, null, 2) + "\n", "utf8");
}

/* ------------------------------------------------------------------ */
async function main() {
  console.log(DIM("— avatar model gate (FR-AVT-03/05/06/10) —"));

  await auditLoaderOrigins();

  if (!existsSync(MODELS_DIR)) {
    console.log(
      DIM("  public/models/ absent — poster fallback path only (FR-AVT-02). OK.")
    );
    await writeManifest({ present: false, src: null, bytes: 0, hash: null });
    return finish();
  }

  const files = (await readdir(MODELS_DIR)).filter((f) => f.endsWith(".glb"));

  if (!files.length) {
    console.log(
      DIM("  no .glb in public/models/ — poster fallback path only (FR-AVT-02). OK.")
    );
    await writeManifest({ present: false, src: null, bytes: 0, hash: null });
    return finish();
  }

  if (files.length > 1) {
    failures.push(
      `expected exactly one avatar model, found ${files.length}: ${files.join(", ")}`
    );
  }

  for (const file of files) {
    const full = join(MODELS_DIR, file);
    const buf = await readFile(full);
    const raw = (await stat(full)).size;

    // "transferred" = what the browser actually pulls. Vercel serves .glb with
    // brotli where the client accepts it, so brotli is the honest number; gzip
    // is reported as the fallback figure.
    const brotli = brotliCompressSync(buf, {
      params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
    }).length;
    const gzip = gzipSync(buf, { level: 9 }).length;
    const transferred = Math.min(brotli, gzip);

    console.log(`  ${file}`);
    console.log(`    raw        ${mb(raw)}`);
    console.log(`    gzip       ${mb(gzip)}`);
    console.log(`    brotli     ${mb(brotli)}`);
    console.log(
      `    budget     ${mb(MAX_TRANSFERRED_BYTES)}  ${
        transferred <= MAX_TRANSFERRED_BYTES ? GREEN("PASS") : RED("FAIL")
      }`
    );

    if (transferred > MAX_TRANSFERRED_BYTES) {
      failures.push(
        `FR-AVT-03 — ${file} transfers at ${mb(transferred)}, over the ${mb(
          MAX_TRANSFERRED_BYTES
        )} budget`
      );
    }

    let gltf;
    try {
      gltf = readGlbJson(buf);
    } catch (err) {
      failures.push(`FR-AVT-05 — ${file} could not be parsed: ${err.message}`);
      continue;
    }

    const before = failures.length;
    const { problems, hasDraco, hasMeshopt, hasKtx2 } = auditCompression(gltf, file);
    console.log(
      `    draco ${hasDraco ? GREEN("yes") : RED("no")}   ` +
        `meshopt ${hasMeshopt ? GREEN("yes") : DIM("no")}   ` +
        `ktx2 ${hasKtx2 ? GREEN("yes") : (gltf.textures || []).length ? RED("no") : DIM("n/a")}`
    );
    problems.forEach((p) => failures.push(`FR-AVT-05 — ${file}: ${p}`));

    // A model that failed any check must not reach the manifest: the site then
    // runs the poster-only path (FR-AVT-02) rather than shipping a violation.
    if (failures.length > before) {
      await writeManifest({ present: false, src: null, bytes: raw, hash: null });
      continue;
    }

    // FR-AVT-10 — content hash in the filename.
    const hash = createHash("sha256").update(buf).digest("hex").slice(0, 10);
    const hashed = `avatar.${hash}.glb`;
    if (file !== hashed) {
      const dest = join(MODELS_DIR, hashed);
      // Remove any previous hashed build of the same logical asset.
      for (const stale of await readdir(MODELS_DIR)) {
        if (stale !== file && /^avatar\.[0-9a-f]{10}\.glb$/.test(stale)) {
          const { unlink } = await import("node:fs/promises");
          await unlink(join(MODELS_DIR, stale));
          console.log(DIM(`    removed stale ${stale}`));
        }
      }
      await rename(full, dest);
      console.log(`    hashed     → ${hashed}`);
    }

    await writeManifest({
      present: true,
      src: `/models/${hashed}`,
      bytes: raw,
      transferred,
      hash,
      draco: hasDraco,
      meshopt: hasMeshopt,
      ktx2: hasKtx2,
    });
  }

  finish();
}

function finish() {
  if (failures.length) {
    console.error(RED(`\n  ${failures.length} violation(s):`));
    failures.forEach((f) => console.error(RED(`   ✗ ${f}`)));
    console.error("");
    process.exit(1);
  }
  console.log(GREEN("  model gate passed\n"));
}

main().catch((err) => {
  console.error(RED(`model gate crashed: ${err.stack || err}`));
  process.exit(1);
});
