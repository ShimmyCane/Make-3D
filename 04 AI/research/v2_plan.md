# Make 3D V2: plan (2026-11-03)

**Rule:** the UI stays as V1 (same panels, same Library, same gear panel). Only the engine changes. Each increment below ends with the app still running and V1 still opening from Settings.

## Done today

- **V1 archived** in `03 Projects/Make 3D/V1/`: a frozen copy of `index.html`, `css/`, `js/` and `vendor/` (identical to the pre-change app; the page title and brand now say V1).
- **Projects stay at the root:** `models/`, `renders/`, `drawings/`, `worlds/`, `convo/`, `supabase/`, and the tools and tests that build them. V1 runs on its own bundled samples, so it does not read the root data.
- **Settings → Versions** in both pages: V2 opens V1; V1 opens V2.
- **Storage split:** V2 uses `make3d.v2.*` keys; V1 keeps `make3d.v1.*`. Under `file://` both would otherwise share one saved model.
- Checked headless: both pages load with no console errors.

## Increments

| # | Name | Change | Test |
|---|---|---|---|
| P1 | Material layer | Schema: each object may carry a `material` spec (base colour, roughness, metallic, opacity, optional pattern). Ops `set_material`. Rules unchanged. | `tests/test_core.js` gains material replay cases |
| P2 | Canvas textures | Generate pattern textures (wood grain, tile, leaf, stripe) on canvas at load. Cache by spec hash. No image files. | Node: spec → hash is stable |
| P3 | PBR viewer | `MeshStandardMaterial` with `map`, `roughnessMap`, `metalnessMap`; a generated room environment for lighting. Display dropdown stays. | Headless screenshot, planter and kitchen |
| P4 | Staged passes | `structure → shape → material` as three functions in `js/core/`, each cached by the hash of the history prefix. An edit reruns only later passes. | Node: an edit to the material reruns only the material pass |
| P5 | GLB export | `GLTFExporter` (vendor the addon) with textures and decimation. IFC export unchanged. | Load the GLB back with `GLTFLoader` in a test |
| P6 | Optional generator slot | Off by default. A "load generated GLB" control. No keys in the repo. | Decision first (below) |

## Decisions for Jimmy

1. Confirm P6 is out of scope unless asked. (Recommended: keep V2 fully client-side, per the zero-server preference.)
2. Confirm procedural materials are enough for now.
3. The V2 skill (`02 Refs/Skills/make_3d.md`) is not changed. Say so and I will draft `make_3d_v2` for review.

## Open facts

- The TRELLIS.2 paper was not read (arxiv.org blocked). Paper claims are not used in the plan.
- `GLTFExporter` and `RoomEnvironment` are not in the vendored `three.min.js`. Vendoring them is part of P3 and P5.
