# Make 3D — Claude Code pointer

Purpose: a browser-based 3D sandbox where the **JSON file is the model**. Objects are appended as operations with stable IDs, a separate world file holds the rules they are checked against, and a Three.js viewer renders and inspects the result. No backend, no database, no LLM required. Later destination: three-view drawings → deterministic geometry.

- Design (MVP): `schematic.md`
- To-do log: `todo.md`
- Q&A history: `convo/` (never compact; start a new version instead). Open questions: `convo/convo v0.1.md`.
- AI notes: `04 AI/Make 3D/brief.md` and `lessons.md`
- Shared conventions: root `CLAUDE.md` (public repo, privacy)

How to run: open `index.html` in a browser (no server or build). Also works from GitHub Pages.

- Earth V22 (satellites on faded orbits, storms and rockets to scale): `tools/earth_v22.js` (`EARTH_VIEWS_V22`); test `node tests/test_earth_v22.js`; schematic §20.
- Earth dot map: `tools/earth_land_5deg.js` (land on a 5-degree grid from Natural Earth) and Earth V21 (`planet-earth-v21`, `EARTH_VIEWS_V21` in `tools/planet_views_v4.js`); test `node tests/test_earth_land.js`; schematic §19.
- True orbits and the one-shot timeline: `tools/solar_true.js` (solar V06), `js/core/motion.js` (kind `orbit`, `loop: false`), tests `node tests/test_orbits.js`, schematic §17. Planet and Earth views: `tools/planet_views.js` (planet-<name>-v02/v03, planet-earth-v02…v10).
- Linked views: `js/core/linked_views.js` (tags `link:<model_id>[:zoom|:fade]`, schematic §16), test `node tests/test_linked_views.js`.
- Solar System: `tools/solar_system.js` (V01–V05, planet views `planet-<name>`), world `worlds/solar-system-world.json`. Not to scale. Review: Increment Viewer `?set=solar_system`.
- Tests: `node tests/test_core.js` (engine, plain Node), `node tests/test_ifc.js` (IFC export), `node tests/test_motion.js` (motion and the robot walk), `node tests/test_mesh.js` (skeleton meshes, bends and the hawk).
- Motion: a separate `motion.json` per scene (`js/core/motion.js`, schematic §14). Every animation is a loop. Test scene: `tools/robot_banana.js`. Browser check: `node tools/anim_check.js <screenshotDir>` (autoplay, play bar, pinch zoom).
- Robot loop: `tools/robot_loop.js` (V02 to V05, one `defsFor(v)`): the robot walks the Quick Detail "Robot Loop" sketch; V03 frisbee (left hand), V04 top hat, V05 frisbee moved to the banana hand and the cape from the Quick Detail "Robot Cape" (`tools/robot_cape.js`, tests `node tests/test_robot_cape.js`). Parts dropdown (upper right): any group tagged `show:<label>` gets a checkbox that hides its branch (`js/core/visibility.js`). Tests: `node tests/test_robot_loop.js`, `node tests/test_visibility.js`.
- Skeleton meshes: `loft` (closed) and `sheet` (open, double sided) on a joint chain, with the `bend` motion kind and `attach` (schematic §15). Test scene: `tools/hawk.js` (V01 to V07; V07 flight and meadow in `tools/hawk_flight.js`, world `worlds/hawk-world.json`). Render stills or frames: `node tools/render_models.js <dir> hawk-v06@19.4 --follow=hawk`.
- Sample: the planter is generated. Edit the operation list in `tools/build_samples.js`, then run `node tools/build_samples.js`. Never hand-edit `model.json` or `js/samples.bundle.js`.
- Browser check: `node tools/smoke.js <screenshotDir>` (headless Chromium via pre-installed Playwright; save screenshots outside the repo).
- Cloud client test: `node tests/test_cloud.js` (fake Supabase, no network).
- Units are inches. Files: `model.json` (replayed result), `history.json` (source of truth), `worlds/default-world.json` (rules).
- Scenes: edit `tools/scenes.js`, then `node tools/build_samples.js`. Three samples: garden planter, outdoor table with parasol, kitchen.
- Supabase (Architecture project): `m3d_scene_log` is the log of every scene version (history, world, model, label, note); edit it there, not in JSON. Load with `node tools/push_scene_log.js` (owner session token, never committed; `--dry-run` needs no token). SQL in `supabase/002_m3d_scene_log.sql` (applied). `m3d_scenes` (saved scenes, owner only). Reads Quick Detail's `sketch_details` where a tag is `make3d` in any letter case (read only; the old `make 3-D` tag is retired). SQL in `supabase/001_m3d_scenes.sql` (applied).

- Architectural drafting table: `tools/drafting.js` (V01–V07, one `defsFor(v)`; V01–V03 build the table, lamp, stool and tools, V04–V07 animate the ink elevation), world `worlds/drafting-world.json`, test `node tests/test_drafting.js`. Open: `index.html?model=drafting-table-v07`.
- Aquarium: `tools/aquarium.js` (V01–V05, one `defsFor(v)` returning objects and motions), world `worlds/aquarium-world.json`, test `node tests/test_aquarium.js`. Review: Increment Viewer `?set=aquarium`. Taps pass through glass and water (opacity under 0.4).

Project rules:
- Public repo. Sample models are synthetic. Real architectural details or client drawings go in `private/`.
- Rendering never modifies the model. Rules live outside the geometry. Every change is an operation in the history.
- Living room from a photo: `tools/living_room.js` (V01–V10, one function `defsFor(v)`). Photo in `private/` only. Render a version with `node tools/render_versions.js <dir> "Living room V10"`.
