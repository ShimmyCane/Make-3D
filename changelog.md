# Make 3D: change log

Two versions of the page are kept side by side:

- **V1**: the first app, frozen in `V1/` (its own copy of the page, CSS, JS and vendored Three.js). It keeps its own saved state (`make3d.v1.*`).
- **V2**: the live app at the root (`index.html`, `css/`, `js/`). The UI is the same as V1, with one new Settings block (Material) and two new export and version links. The engine underneath is new.

Projects (models, renders, drawings, worlds, tools and tests) stay at the root and are shared by both versions.

## V2 at a glance

| Area | What changed | Where |
|---|---|---|
| Versions | V1 archived; Settings > Versions links V1 and V2 both ways | `index.html`, `V1/index.html` |
| Storage | V2 uses `make3d.v2.*` keys, so V1 and V2 never share a saved model | `js/ui/app.js` |
| Materials (P1) | Roughness and metalness in the material table; `set_material` operation, in history and validated | `js/core/schema.js`, `js/core/geometry.js`, `js/core/rules.js`, `js/viewer/viewer.js` |
| Patterns (P2, P2c) | Canvas-free textures: wood, tile, stripe, leaf. One cached texture per pattern | `js/core/patterns.js`, `js/viewer/viewer.js` |
| Material controls (P2b) | Settings > Material: material, colour, roughness, metalness, pattern, pattern colour, repeats. Each change is a history step | `index.html`, `js/ui/app.js` |
| PBR lighting (P3) | Standard materials reflect a generated room (PMREM from a small scene). No image or addon. Hemisphere light lowered to 0.7 | `js/viewer/viewer.js` |
| Staged passes (P4) | Structure, shape and material as three stages, each cached by a hash of the history it reads. A material edit reruns only the material stage | `js/core/stages.js` |
| GLB export (P5) | Export GLB (3-D) button. Own writer: glTF 2.0 with PBR factors and pattern textures as PNG | `js/core/glb.js`, `js/viewer/viewer.js`, `js/ui/app.js` |
| Measurement | `viewer.stats()` (triangles, draws, meshes) for the headless checks | `js/viewer/viewer.js` |
| Design summary | `index_summary.html`: line-numbered map of the page, its scripts and the variables to tweak | `index_summary.html` |

## Changes, in order

Dates are 2026-11-03 unless stated. PR numbers are the GitHub PRs that merged each step.

1. **V1 archive and V2 start** (PR #78, merged as `98e970c`).
   - Froze the runnable app as `V1/` (index, css, js, vendor).
   - Settings > Versions links both ways.
   - V2 storage keys split from V1.
   - TRELLIS.2 research notes and the V2 plan (`04 AI/Make 3D/research/`).
   - Commits: `0f5a90e` (archive and notes), `d5efcbb` (P1), `b183acb` (P2), `4201910` (to-do).
2. **Materials, patterns, lighting and export** (PR #82, merged as `0304dfd`).
   - P3 PBR lighting: `9c63824` (first on the old branch, then carried to a new branch from `main`, because the old branch had already merged).
   - P2c leaf pattern: `aebdc8b`.
   - P4 staged passes: `fb65198`.
   - P5 GLB writer: `852acf0`. Export button: `df45a3f`.
   - P2b material controls: `2b56fb0`.
   - Viewer stats and the to-do update: `240bc7d`.
3. **Summary and change log** (this change): `index_summary.html`, this file, and the to-do update.

## Tests

Node suites, all passing at the time of the merge:

| Suite | Groups | Covers |
|---|---|---|
| `tests/test_materials.js` | 5 | `set_material`: apply, replay, defaults, rejects |
| `tests/test_patterns.js` | 9 | pattern specs, keys, pixels, seamless edges, leaf veins, validation |
| `tests/test_stages.js` | 6 | staged passes: recomputation counts for each kind of edit |
| `tests/test_glb.js` | 7 | GLB chunks, accessors, material, PNG (CRCs, zlib, multi-block) |
| `tests/test_core.js`, `test_mesh.js`, `test_motion.js`, `test_visibility.js`, `test_cloud.js`, `test_orbits.js`, `test_linked_views.js`, `test_robot_loop.js`, `test_aquarium.js`, `test_ifc.js` | 27, 27, 12, 4, 8, 14, 9, 11, 7, 12 | existing V1 engine tests, unchanged in behaviour |

Browser checks (headless Chromium, software GL):

- No page errors on the planter, outdoor table V2 and kitchen after the changes.
- Material controls: list, edits and roughness readout work.
- The GLB from the planter parses as glTF 2.0 with 20 meshes and one embedded texture.

## Measurements (headless, software GL)

| Sample | Triangles | Meshes | Frame time (indicative only) |
|---|---|---|---|
| Garden planter | 4,956 | 20 | about 28 ms |
| Outdoor table V2 | 44,280 | 197 | about 97 ms |
| Kitchen | 876 | 24 | about 50 ms |

Frame times come from software rendering, so they are only a rough guide. A real iPad check is still needed.

## Known limits

- **Not on a real iPad yet.** Touch, layout and frame rate are unverified on device.
- **Staged passes are not wired into the viewer.** The module and its tests exist; the viewer still rebuilds from the full replay.
- **No GLB decimation.** The export is at full resolution. The planter is about 5,000 triangles, so this is not a problem yet.
- **GLB not opened in a third-party viewer.** The file passes my own parser and zlib checks, but I have not loaded it in another glTF tool.
- **Pattern textures are generated at 64 pixels per tile.** They are tuned for the toy look; they will look soft up close.
- **Two debugging globals:** `window.__m3dViewer` (existing) and `window.M3D_viewer` (added in V2). They can be merged.
- **Procedural materials (clouds, Earth, bands) are not exported to GLB.** They are counted as skipped in the export message.

## Not built, and waiting on a decision

- **P6, optional generator slot** (load a GLB from an outside service). Off by default. It conflicts with the client-side rule in the Make 3D preferences, so it needs Jimmy's decision.
- **V2 skill** (`02 Refs/Skills/make_3d.md`) is unchanged. A `make_3d_v2` draft needs Jimmy's go-ahead.
- **TRELLIS.2 paper** (arXiv 2512.14692) was not readable from this session. Paper-level claims in the notes come from the GitHub README only.

## Publishing (MVP item still open)

The to-do asks for the page to be published on GitHub Pages and checked on an iPad and iPhone. Neither can be done from here:

- Enabling Pages is a repository setting, and this session has no tool for it.
- The root `index.html` is the nursery landing page, so the Make 3D page would be served at `/03%20Projects/Make%203D/`. That path works, because the page uses relative links only.
