# Make 3D — To-do

**Purpose of this list:** reach the MVP (v0.1–v0.6 in `schematic.md` §10), one version at a time, checking each before the next.

Status key: `[ ]` open · `[~]` in progress · `[x]` done · `[?]` waiting on Jimmy

## V2 (engine upgrade; UI stays as V1)

Change log: `changelog.md`.

Plan and research: `04 AI/Make 3D/research/v2_plan.md` and `trellis2_notes.md`. V1 is the frozen copy in `V1/`.

- [x] Archive V1 (`V1/`, frozen app), Settings > Versions links both ways, separate `make3d.v2.*` storage keys.
- [x] P1 material spec: `roughness` and `metalness` in the material table; `set_material` operation (history, validated); viewer uses them (`tests/test_materials.js`).
- [x] P2 canvas-free patterns: wood, tile, stripe as pixel tiles (`js/core/patterns.js`, `tests/test_patterns.js`). Set with a `set_material` operation for now.
- [x] P2b material controls in Settings: material, colour, roughness, metalness, pattern, pattern colour, repeats. Each change is a set_material step (checked headless).
- [x] P2c leaf pattern: veins and shading (`tests/test_patterns.js`).
- [x] P3 PBR viewer: lighting from a generated room (PMREM from a small scene in `js/viewer/viewer.js`, no addon). Hemisphere light lowered to 0.7 to keep the scene's brightness. Checked on the planter and kitchen in headless Chromium. [ ] Still to check: on iPad.
- [x] P4 staged passes: `js/core/stages.js` (structure, shape, material), each cached by a hash of the history it reads. A material edit reruns only the material stage (`tests/test_stages.js`). The viewer still uses the full replay; wiring it in is a later step.
- [x] P5 GLB export: `js/core/glb.js` writes glTF 2.0 from baked meshes, with PBR factors and pattern textures as PNG (`tests/test_glb.js`). Export GLB (3-D) button in Settings; the planter downloads as valid GLB in headless Chromium. Not done: decimation (not needed yet: planter about 5,000 triangles) and a check in a third-party glTF viewer.
- [?] P6 optional generator slot (load a GLB from an outside service). Off by default; no keys in the repo. Jimmy decides whether it is wanted (it breaks the client-side rule in the Make 3D preferences).
- [x] Measured in headless Chromium (software GL, so frame times are only a rough guide): planter 4,956 triangles, 20 meshes, about 28 ms a frame; outdoor table V2 44,280 triangles, 197 meshes, about 97 ms; kitchen 876 triangles, 24 meshes, about 50 ms. [ ] Still to check on a real iPad.
- [?] The V2 skill (`02 Refs/Skills/make_3d.md`) is unchanged. Jimmy says whether to draft `make_3d_v2` for review.
- [?] TRELLIS.2 paper: arXiv was blocked from this session. Read it from a connected session before relying on paper-level claims.

## Now
- [x] Set up the project folders, `CLAUDE.md`, `schematic.md`, `convo/convo v0.1.md`, `todo.md`.
- [x] Draft the MVP schematic from Jimmy's brief (proposed defaults marked *(Q#)*).
- [x] Jimmy answers `convo/convo v0.1.md`. Recorded in `convo/convo v0.2.md`; `schematic.md` §0 lists what changed.
- [x] Look at Quick Detail as the visual and structural reference (paper and ink palette, tests in Node, code map, `m3d_` cloud pattern).
- [x] Jimmy confirms round 2 in `convo/convo v0.2.md`: history as truth, Quick Detail look, editing a + c, imperial units.
- [?] Jimmy answers `convo/convo v0.3.md`: origin thresholds and weighting (Q1–Q3), units storage and precision (Q4–Q5), table length (Q6).
- [x] Freeze schema 0.1 (`model`, `history`, `world`, in inches) and write the garden planter sample and `worlds/default-world.json`.
- [x] Build v0.1–v0.6 (Jimmy said "proceed with the MVP"). Used the proposed defaults in convo v0.3 Q1–Q6; see the notes in the done log.

## MVP build
- [x] **v0.1** Load JSON and render primitives. Three.js vendored, Z-up conversion, box, cylinder, sphere, cone, group. Test model: the garden planter.
- [x] **v0.2** Interactive viewer, touch first: orbit and zoom (custom, no OrbitControls), Y-up toggle, ground plane with slider, solid / edges / wireframe, Quick Detail look. Tap to select.
- [x] **v0.3** Add / modify / delete via form and paste box (operations). Reject flow: editor stays open, delete offenders, preview. Model name and description are operations too.
- [x] **v0.4** Save / reload bundle, localStorage autosave, unknown fields kept. Cloud copy: `m3d_scenes` in the Architecture project (RLS, owner only, registered in `table_index`), applied 2026-11-02 after a rolled-back test. Library → Save this scene to the cloud. Sign-in by email code (owner account only).
- [x] **v0.5** Rules engine: five rules, accept / warn / reject, overlap `mode` (allow by default, flag on model check), results panel. Outlines in the viewer: not done (the selection box only).
- [x] **v0.6** History: replay, scrubber (back to any step, editing only at the latest step). Author and note per operation: author is recorded; the note field is not yet in the UI.
- [x] Node tests (`node tests/test_core.js`, 19 groups) and the browser smoke run (`node tools/smoke.js`, no console errors) pass.
- [?] Publish on GitHub Pages and check online on iPad and iPhone. Blocked here: enabling Pages is a repo setting this session cannot change, and the page would be served at `/03%20Projects/Make%203D/`. Headless iPad-size screenshot checked; not on a real device.
- [x] `/summarize-code` on `index.html`: `index_summary.html` (line map, script order, CSS and JS variables to tweak).

## Round 4 (designed in convo v0.4, not built)
- [ ] Annotations in 3-D: click a surface to anchor, drag out a label with a leader line, screen-facing and legible. Autosave to the cloud. Session undo. Delete. Free and part annotations (A1–A6).
- [ ] Groups: drag an object into a group, recorded as an operation (G1).
- [ ] Visibility: hide a group or object; image export leaves hidden items out; 3-D export keeps them flagged hidden (G2–G4). Final choice still to make.
- [ ] Export a PNG of one view as a background for Quick Detail (E3).
- [x] Export IFC for Revit (convo v0.6): `js/core/export_ifc.js` (IFC4, metres, Z up, one `IfcBuildingElementProxy` per object with tessellated shape and colour). Button: Export IFC (Revit) in the gear panel. Tests: `node tests/test_ifc.js`. Checked with IfcOpenShell 0.9 on all sample scenes (bounding boxes within 5 mm of the engine).
- [?] Jimmy imports an exported `.ifc` into Revit and confirms scale and up.
- [ ] Tag scenes like Quick Detail details (S2).
- [ ] Read-only share link for presenting (S1).

## Scenes and library (round 3)
- [x] Outdoor table with parasol: 3 ft × 7 ft top on a yellow metal frame, bonsai-style tree, parasol with three canopies (one on the pole, one on each side arm). Table length (7 ft) still to confirm (v0.3 Q6).
- [x] Kitchen: fridge, counter and stove on the left; sink run with a triple sink and two faucets; dishwasher, drawers and a door on the right; upper cabinets with a sliding acrylic cup display.
- [x] Library button (lower right, next to the gear): built-in input scenes, cloud scenes after sign-in, Quick Detail details tagged `make 3-D` (read only, future references).
- [ ] Quick Detail: tag details `make 3-D` before they appear. None have it yet.
- [ ] LLM-made scenes and drawn scenes (linked in as JSON input): future, not built.

## Round 4 (convo v0.5, from the outdoor-table answers)
- [x] Outdoor table V2 (`outdoor-table-v2`): white oak top, yellow angle legs, rectangular frame, centre beam, low back bar (back only); one large red folding canopy at the far end on a square base with two sandbags; bonsai in a 2 ft box on the ground 8 ft from the table, one limb with three forks (3, 2, 2), sparse leaves.
- [x] Object tags (`surface`, `frame`, `stand`, `shade`, `ballast`, `plant`, `container`): chips in the objects panel, purpose row in the selection card, status line next to Check model.
- [x] Library shows four built-in scenes.
- [x] Outdoor table V2 rebuilt: parasol moved outside the table end (pole no longer through the top); the bonsai is a slanting, tapered trunk with a leader, one main limb arching up in steps, forks on several sides, a balance branch, a dead branch (jin) and foliage pads.
- [x] Canopy: one draped cloth (101 tilted panels on a wavy surface, ridges at three arms, edge sagging) held by three equal metal arms from the apex. Replaces the flat cone.
- [x] Clash check (`js/core/clash.js`): finds solids that pass into each other; V2 has none; tested in `tests/test_core.js`.
- [ ] Clash check in the UI (show clashes on Check model). Not built yet.
- [ ] Bonsai reach: the crown no longer reaches over the table (a bonsai form in a 2 ft box can't do 8 ft of horizontal reach without looking like a bare arm). Jimmy to decide.
- [?] Jimmy checks the V2 scene on iPad: tree lean and reach, canopy size, base and sandbags.
- [ ] Tags on the planter, V1 table and kitchen (not done; V2 only).
- [ ] Tag filter in the objects panel (not asked yet).

## Animation (round 7, convo v0.7)
- [x] Jimmy answers convo v0.7 A–D: always a loop; organic closed path; robot look OK; length as needed; controls OK.
- [x] Two-finger pinch zoom on the canvas (E). Touch events, page zoom blocked over the canvas. Checked headless with two-finger touch; not yet on a real iPad.
- [x] A1 Groups as scene nodes; children inherit the parent transform. Every library scene still renders (smoke run).
- [x] A2 `motion.json` format (`make3d.motion/0.1`), optional fourth part of the bundle; `checkMotion`.
- [x] A3 `js/core/motion.js` `poseAt`: `swing`, `bob`, `slide`, `spin`, `path` (closed, constant speed, faces along the curve). `node tests/test_motion.js`.
- [x] A4 Viewer clock: autoplay twice then pause, ▶/⏸, ⟲, time slider; speed and autoplay in ⚙️; redraw only while playing or touched.
- [x] A5 Robot-with-banana scene on a winding closed loop; steps timed to the walk, flat feet, no sliding into the ground. `node tools/anim_check.js <dir>`.
- [?] Jimmy watches the robot on iPad: walk, speed, path, banana; and tries the pinch.
- [ ] A6 Clash check sampled over time.
- [ ] A7 `render_versions.js` at a time / frame strip for the Increment Viewer.
- [x] A8 `make-3d` skill: motion as its own last increment, step 4b, report line (Jimmy asked).
- [ ] Motion editing in the page (now motion comes from the scene file only).
- [x] Library folds each project's versions under one row, most recently changed project first (convo v0.7 G–H). Dates in `models/scene_dates.json`, kept by `tools/build_samples.js`.
- [x] Merge the pull request so the robot is on the live site (Jimmy asked).
- [ ] Future: tap a part to start a motion, and chain motions (door opens, then the cuckoo comes out).

## Future (flat list, round 2)
- [ ] Editable, resizable and parametric families in Revit (Dynamo or Revit API, `.rfa`). Not needed for the first IFC import.
- [ ] Walk mode, section box, measure, PNG export (viewer).
- [ ] Gizmo editing (drag handles).
- [ ] Textures on/off toggle (the model never stores images).
- [ ] Per-operation author and note.
- [ ] Blocks: link models; import a rebuilt component as a block.
- [ ] Material list beyond colour.
- [ ] Viewer: full orthographic views, hierarchy isolate, and the rest of schematic §6.
- [ ] Editable cloud scenes: versions table (the `m3d_scenes` row is one scene; editing history is kept in its bundle).

## After MVP
- [ ] **v0.7** Import glTF / OBJ / STL as `mesh` objects.
- [ ] **v0.8** Three-view drawings: `drawing.json` format, deterministic generator, `unresolved` items.
- [ ] Extrusions (profile + path).
- [ ] Booleans: pick a kernel (OpenCascade WASM or similar) only when needed.
- [ ] Architectural components: wall, opening, door, window, assembly.
- [ ] Lego-style connection points (studs/sockets) as rule data.
- [ ] Optional LLM helper that writes operations (never a dependency).

## Decisions made while building (please check)
- Origin: used the convo v0.3 proposals: 25% outlier share, 70% trigger, volume-weighted origin. Thresholds still to confirm (v0.3 Q1–Q3).
- Units: inches, displayed as feet and inches to 1/8 in (v0.3 Q4–Q5).
- Rotation: about the model's Y axis, literally. In a Z-up file that is a horizontal axis, so tilting is what you'd see. Confirm whether you meant vertical (Z) for the umbrella and plants.
- Added `set_header` (name and description) as a history operation.
- Viewer: custom orbit controls, no OrbitControls, so the page works from file://.

## Not done yet
- Outlines in the viewer for warnings and rejects (v0.5).
- Note field per operation in the UI (v0.6).
- GitHub Pages publish.
- Walk, section, measure, gizmo, orthographic views, hierarchy isolate (future).

## Done log
- 2026-11-01: project started with `/start-project`; schematic and convo v0.1 written.
- 2026-11-01: round 2 answers recorded in convo v0.2; schematic §0 added; Quick Detail reviewed as the reference.
- 2026-11-01: round 2 inline answers recorded in v0.2; convo v0.3 opened with origin, units and table-length questions.
- 2026-11-01: MVP built (v0.1–v0.6 except cloud copy and outlines): engine, viewer, UI, planter sample, 19 test groups, headless smoke run.
- 2026-11-02: round 4 outdoor table V2 and object tags built (convo v0.5 answers); smoke run covers four library scenes.
- 2026-11-02: outdoor table and kitchen samples; Library button; cloud client (`m3d_scenes`, read-only `sketch_details` by tag); migration applied after a rolled-back test; 8 cloud test groups; smoke run covers the library.
- 2026-11-02: round 4 notes (iPad): paste is the default tab, step counter removed, one gear icon, panels collapse. Annotation, groups, visibility and export designed in convo v0.4 and the schematic §13; not built.

## Living room from a photo (2026-11-02)
- [x] Process logged in `04 AI/Make 3D/lessons.md` before modelling.
- [x] V01 blockout, then V02 to V10 by review of each render against the photo (`tools/living_room.js`, one function, `defsFor(v)`).
- [x] Browser check of each version (`node tools/render_versions.js <dir> "Living room V01" ...`), plus smoke and engine tests.
- [ ] Jimmy checks the sizes against the room (estimates, not measured). Questions in `04 AI/Make 3D/brief.md`.
- [ ] Viewer: a "hide walls" toggle, so the door and the far walls can be checked from any side.
- [ ] Commit and publish when Jimmy agrees (not committed yet).

## Living room, second look (2026-11-02)
- [x] V11 re-layout from the two new photos (`tools/living_room_second_look.js`).
- [x] V12 ceiling, V13 decor and see-through ceiling, V14 bookcase contents and near chair, V15 final grouping and leaf clusters.
- [x] Each version rendered and reviewed; engine, cloud and smoke tests pass.
- [ ] Jimmy checks the new sizes (156 × 216 in room, 14 in cubes, 96 in ceiling) against the room.
- 2026-11-02: kitchen mockup V01 to V10 from two photos (`tools/kitchen_mockup.js`), added to the Library. Build, tests and renders pass. Not committed.
- 2026-11-02: kitchen mockup V11 (open shelf bay at the left end of the back run). V01 to V10 unchanged. Version log added to `04 AI/Make 3D/brief.md`.

## Hawk: closed meshes on a skeleton line (2026-11-02)
- [x] `loft` (closed mesh) and `sheet` (open, double sided) types on a skeleton line; `bend` motion, `attach`, `keys`, `envelope`, flight-frame paths (schematic §15).
- [x] Hawk V01 to V06 (`tools/hawk.js`), meadow of sheet grass and leaves, a pennant flag, a mouse; `tests/test_mesh.js` (14 groups).
- [x] V07 mouse bolts for a burrow hole as the hawk flares in (Jimmy: 'let the mouse bolt for a hole; hawk size is good').
- [x] V07 physical flight: larger meadow, bluff, thermal, energy-based speed, flapping only on the climb, 21 -> 26 test groups.
- [ ] IFC export of lofts and sheets (tessellated); clash check for lofts; a form to add one.
- [ ] Jimmy checks the hawk on iPad (play bar, pinch) and says whether "looping around" meant circling (built) or a vertical loop.

## Robot loop, Parts dropdown, make3d tag (2026-11-02)

- [x] Quick Detail tag: `make3d` in any letter case is the tag; `make 3-D` is retired (cloud filter now matches case only; `tests/test_cloud.js`).
- [x] Robot loop V02: the walk follows the sketched "Robot Loop" (48 points, seam averaged, rest heading +X), `tools/robot_loop.js`, `tests/test_robot_loop.js`.
- [x] Robot loop V03 frisbee and V04 top hat, each a group with a `show:<label>` tag.
- [x] Parts dropdown in the upper right: a checkbox per tagged group, hides its branch (`js/core/visibility.js`, `tests/test_visibility.js`).
- [ ] Jimmy checks the sketch scale (closed shape taken as 19'-7" on its longest side = 235 in) and the seam on iPad.
- [ ] Antenna passes through the top hat (not moved; V05 could shorten it or tilt the hat).
- [ ] Supabase migration `001` comment still says `make 3-D`; the migration is applied, so only its comment is out of date.

## Robot cape and the Parts control (2026-11-02, round 2)

- [x] Frisbee in the banana hand (V05); V02 to V04 unchanged.
- [x] Parts control under Full screen in the stage (upper right), not in the header.
- [x] Robot cape from the Quick Detail (`tools/robot_cape.js`): sheet on 7 joints, border beads, tassels, holes as discs; a wave all the time, a sideways swing in turns (`tests/test_robot_cape.js`).
- [ ] Jimmy checks the cape size (22 in, drawn 7'-10" not used) and whether the sway in turns is too much (bottom up to about 7 in).
- [ ] Holes are discs, not cut-outs; the border is beads, not a trim; no sheen. Tell me if these matter.
- [ ] Cape does not collide with the robot; check on iPad.

## Requests and the to-do skill (2026-11-05)

- [x] "New request" in each front-page category; form saves to `m3d_requests` (owner only); `tests/test_requests.js`.
- [x] Migration `supabase/003_m3d_requests.sql` applied; policy matches the live email rule.
- [x] Skill `.claude/skills/gather-todo`: reads `new` requests, writes them here, deletes the gathered rows.
- [ ] Jimmy signs in through the Library and saves a test request in the browser (not checked from this session: the sign-in needs the email code).
- [ ] Jimmy decides on analytics: first-party `m3d_events` table, as in schematic §22, or no tracking.
- [ ] Split the 37 MB sample bundle so a project loads on demand (the real start-up cost).
- [ ] Fix the `platform_is_owner` mentions in `001` and `002` so they match the live policies.

## Front page split (2026-11-05)

- [x] `index.html` is the light front page; `viewer.html` is the viewer (engine, bundle, Library). Picking a project opens `viewer.html?model=<id>`.
- [x] `tools/build_front_index.js` writes `js/front_index.js` (183 scenes, about 26 KB); the front page reads it, not the bundle.
- [x] New request loads the cloud library only when saved; `tests/test_front_page.js` guards the split.
- [ ] Split the 37 MB bundle so the viewer loads one model on demand (the viewer's own start-up cost).
