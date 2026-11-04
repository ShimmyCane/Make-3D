# TRELLIS.2: how it makes 3-D assets and textures, and what V2 can borrow

**Date:** 2026-11-03
**Status:** research notes for Make 3D V2. Not a build plan yet (see the end).

## Sources

- Code and README: `github.com/microsoft/TRELLIS.2` (fetched; the README is the primary source for stages, export and hardware).
- Model card: `huggingface.co/microsoft/TRELLIS.2-4B` (search snippet only).
- Paper: arXiv 2512.14692, "Native and Compact Structured Latents for 3D Generation". **Not read.** The fetch failed (DNS for arxiv.org blocked in this session). Paper-level claims below come from search snippets and are marked.

## What it is

An image-to-3D generator: one picture in, one textured mesh out (GLB, PBR material). 4B parameters, MIT licence. Runs on an NVIDIA GPU with at least 24 GB, Linux only. It cannot run in a browser or on an iPad.

## The passes (from the README's training section, in order)

The README does not describe each stage's tensors in prose; the names below are the config files it lists.

| # | Stage | What it does | Conditioned on |
|---|---|---|---|
| 1 | Sparse structure flow (`ss_flow_img_dit_1_3B_64`) | Decides where the object is: a coarse sparse occupancy layout | the image |
| 2 | Shape VAE (`shape_vae_next_dc_f16c32`) | Sparse 3-D VAE, 16× downsampling. Encodes and decodes the shape latent | — |
| 3 | Shape flow (`slat_flow_img2shape_dit_1_3B_512`) | Generates the shape latent at the 512 grid | the image |
| 4 | Texture VAE (`tex_vae_next_dc_f16c32`) | Encodes and decodes the material latent | — |
| 5 | Texture flow (`slat_flow_imgshape2tex_dit_1_3B_512`) | Generates the material (colour and PBR) latent | the image **and** the shape latent |
| 6 | Export | Extract the mesh, simplify, remesh, bake textures, write GLB | — |

Key idea: **shape first, then material, and the material pass is conditioned on the finished shape.** The timing table is split the same way ("Shape + Mat"). Texture is not painted on afterwards; it is a second generated pass over the same sparse voxels.

Paper (not confirmed): the O-Voxel representation is a field-free sparse voxel structure (no signed distance or iso-surface), which handles open surfaces and non-manifold geometry better than SDF or FlexiCubes. The README uses the same name.

## Representation

- **O-Voxel**: sparse voxels that carry attributes (the mesh's colour and PBR values sit on the voxels). The README's `mesh` object has `.vertices`, `.faces`, `.attrs`, `.coords`, `.layout`, `.voxel_size`.
- Conversion: textured mesh → O-Voxel under 10 s on one CPU; O-Voxel → textured mesh under 100 ms on CUDA.

## Export

`o_voxel.postprocess.to_glb(...)`: `decimation_target=1000000`, `texture_size=4096`, `remesh=True`, `remesh_band=1`. Saved as GLB with WebP textures. PBR channels named in the README: **Base Color, Roughness, Metallic, Opacity**. The GLB is OPAQUE by default; alpha has to be wired by hand in a DCC tool.

## Rendering: correction to the premise

TRELLIS.2 **does not use Three.js.** Its renderer is **nvdiffrast** (GPU rasterisation), with **nvdiffrec** for split-sum PBR lighting and an HDRI environment map (`forest.exr`). Its preview is a Python web demo (`app.py`) and a Hugging Face Space. Three.js is our viewer, not theirs, so the idea to take over is their **material and lighting model**, not their renderer.

## Timings (H100, README table)

| Resolution | Total | Shape | Material |
|---|---|---|---|
| 512³ | ~3 s | ~2 s | ~1 s |
| 1024³ | ~17 s | ~10 s | ~7 s |
| 1536³ | ~60 s | ~35 s | ~25 s |

## What V2 can take, and what it cannot

**Cannot take:** the 4B model, the GPU requirement, or a server-side call as part of the core. Jimmy's preferences say *zero server, all client-side, no build step*, so the neural generator stays out of V2's core.

**Can take (the pattern, done in the browser):**

1. **Staged pipeline with the same order.** V2 runs *structure → shape → material* as three passes over the history. Each pass is cached by a hash of the history prefix, so an edit reruns only the passes after it. This matches the history-as-truth rule.
2. **Material as its own layer.** Geometry stays as it is now. Each object gets a material spec (base colour, roughness, metallic, opacity, and an optional procedural pattern). Textures are generated on canvas at load time, so no image files are stored. The rules still live outside the geometry.
3. **Conditioned material.** As in stage 5, a material pass can read the shape (for example, wood grain follows the grain direction of a box; a leaf texture is only drawn on faces that point up). This is deterministic, not learned.
4. **Attributes on voxels for export only.** An optional sparse voxel grid per object carries colour and PBR values for the GLB and IFC exporters. It is not needed for the viewer.
5. **PBR in Three.js.** `MeshStandardMaterial` with `map`, `roughnessMap`, `metalnessMap`, and an environment from a generated room environment (RoomEnvironment, if the addon is vendored). This is the nvdiffrec idea in a browser.
6. **Decimation and clean-up on export.** The mesh is simplified before the GLB is written, as the README does.
7. **Optional neural pass, off by default.** A "generate" slot that takes a GLB from an external service and loads it with GLTFLoader. Only if Jimmy wants it, and it needs a decision (see below).

## Gaps and risks

- The paper was not read. Anything about SC-VAE internals, flow step counts or quality numbers is unverified.
- Procedural textures will not look like learned ones. They will look like clean, graphic toy-style textures, which suits the kids' look, but it is not photoreal.
- GLB export needs `GLTFExporter`. Check whether it is in `vendor/three` (the vendored build is `three.min.js` only, so an addon may need vendoring).

## Decisions needed from Jimmy

1. Keep V2 fully client-side (recommended), with the neural generator out of the core?
2. Is a PBR-style procedural material enough, or is a learned texture wanted later?
3. Should the V2 skill (`02 Refs/Skills/make_3d.md`) be rewritten for the staged passes? Only if Jimmy asks; this session has not edited it.
