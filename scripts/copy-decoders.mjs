/**
 * FR-AVT-06 — Draco / Meshopt / KTX2 decoder assets shall be served from the
 * same origin as the site. No third-party CDN reference shall appear in the
 * loader configuration.
 *
 * three ships the decoder binaries inside its own package. We copy them into
 * /public/decoders at install time so Vercel's static output serves them from
 * our origin, and the loader points at "/decoders/..." — a same-origin path.
 *
 * This runs on postinstall. It must never fail the install: if three is not yet
 * present (e.g. a partial install), it reports and exits 0. The build-time
 * budget check is the gate that actually enforces the requirement.
 */
import { cp, mkdir, access, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const libs = join(root, "node_modules", "three", "examples", "jsm", "libs");
const out = join(root, "public", "decoders");

// The encoder is authoring-side only; shipping it would add ~950 KB to the
// static output for no runtime benefit.
const SKIP = /(draco_encoder|README)/i;

const JOBS = [
  { from: join(libs, "draco", "gltf"), to: join(out, "draco"), label: "draco" },
  { from: join(libs, "basis"), to: join(out, "basis"), label: "ktx2 / basis" },
];

const exists = async (p) => {
  try {
    await access(p, constants.R_OK);
    return true;
  } catch {
    return false;
  }
};

async function main() {
  if (!(await exists(libs))) {
    console.log("[decoders] three not installed yet — skipping decoder copy.");
    return;
  }
  await mkdir(out, { recursive: true });

  for (const job of JOBS) {
    if (!(await exists(job.from))) {
      console.warn(`[decoders] missing source for ${job.label}: ${job.from}`);
      continue;
    }
    await cp(job.from, job.to, {
      recursive: true,
      filter: (src) => !SKIP.test(src),
    });
    const files = await readdir(job.to);
    console.log(`[decoders] ${job.label} → public/decoders (${files.length} files)`);
  }
}

main().catch((err) => {
  console.warn("[decoders] copy skipped:", err?.message ?? err);
});
