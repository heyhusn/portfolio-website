# Avatar model

`avatar.f83a15ad0d.glb` is your bust, compressed to ship. The hash in the
filename is FR-AVT-10 — a redeploy cannot serve a stale asset against changed
loader code. `src/wgl/model-manifest.json` points at it and is regenerated on
every build.

## What was done to the source

The export out of Hi3D was **61.1 MB**: 2,000,000 triangles and a 4096×4096
JPEG. That is roughly twenty times the SRS budget, and on a mid-tier phone it
would not have been a slow load so much as a page that never becomes
interactive.

| Step | Result |
| --- | --- |
| source | 61.1 MB, 2,000,000 tris, 4096² JPEG |
| `weld` + `simplify --ratio 0.02` | 39,996 tris — the silhouette is unchanged at the 330 px the figure is drawn at |
| `resize --width 2048` | texture down from 4096² |
| `etc1s --quality 255` | KTX2 / Basis, 2048², 700 KB GPU |
| `draco --method edgebreaker` | **0.85 MB** |

That is 28% of the 3 MB budget, 1.4% of the original. A 1024² texture variant
came out at 0.36 MB and looked identical at 1× but visibly softer on a retina
display, so the 2048² won.

## Reproducing it

```bash
npm install -g @gltf-transform/cli
# KTX2 needs the Khronos encoder on PATH:
#   https://github.com/KhronosGroup/KTX-Software/releases

gltf-transform dedup    source.glb  s1.glb
gltf-transform weld     s1.glb      s2.glb
gltf-transform simplify s2.glb      s3.glb --ratio 0.02 --error 0.002
gltf-transform resize   s3.glb      s4.glb --width 2048 --height 2048
gltf-transform etc1s    s4.glb      s5.glb --quality 255
gltf-transform draco    s5.glb      avatar.glb --method edgebreaker
```

Then drop `avatar.glb` into `public/models/` and run `npm run build`. The gate
rejects it if it transfers over 3 MB or if geometry or textures came through
uncompressed, renames it with its content hash, and writes the manifest.

With no `.glb` in `public/models/` the build still passes and the site runs the poster-only
path (FR-AVT-02). That is a supported state, not a broken one.

## The poster

`/public/assets/img/avatar-poster.webp` (32 KB) is a transparent render of this
same model, captured from the canvas framebuffer at the hero's exact camera and
lighting. It is what LITE and MID tiers, reduced-motion visitors and the no-JS
path see — ADR-20 requires the poster to come from the model rather than being
a second asset. Layered over the figure's own gradient it is
indistinguishable from the live scene.

Re-render it after any change to the model, camera or lighting in
`src/wgl/AvatarCanvas.jsx`, or the two states will drift apart.
