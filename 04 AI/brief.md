# Make 3D — AI Brief

**Updated:** 2026-11-02
**Status:** MVP built (v0.1–v0.6, viewer outlines still open). Four input scenes: garden planter, outdoor table with parasol (V1), outdoor table V2 (round 4, with object tags), kitchen. Library button. Cloud: `m3d_scenes` live in the Architecture project; sign-in by email code. IFC export for Revit built (convo v0.6): gear panel button, metres, Z up, placeable elements. Not yet: Revit import check by Jimmy, editable or parametric families (future), GitHub Pages publish, real iPad check, a real sign-in test by Jimmy, Quick Detail details tagged `make 3-D`.

## Goal

A structured, cumulative geometry repository with a visual inspection engine, for Jimmy and his family, used on iPad and iPhone. Three things kept apart:
- **Model**: what exists (`model.json`, objects with stable IDs; replayed from history).
- **Rules**: what is allowed (`worlds/default-world.json`).
- **Evidence**: how it was made (`history.json`, the source of truth; later `drawing.json` + `drawing.png`).

Four engines: input, geometry, rules, viewer. The viewer only reads; the engine has no DOM.

## Decisions

- Round 2 (convo v0.2): family users; iPad and iPhone, touch first; garden planter is the only MVP test model; outdoor table and kitchen are future; Y-up toggle and ground slider in the MVP; rotation about Y only; `description` per object; textures future and never stored; overlap allowed by default with a world mode; reject returns to the editor with delete-and-retry and preview; viewer MVP is orbit and zoom; cloud copy in the architecture database (`m3d_`); drawings drawn in the app; Quick Detail look; imperial units.
- Build choices (not yet confirmed by Jimmy): origin uses 25% outlier share, 70% trigger, volume-weighted origin (convo v0.3 Q1–Q3). Stored in inches (v0.3 Q4). Rotation literal about model Y.

## Architecture (as built)

- `js/core/`: units, schema, geometry (replay), origin (major box), rules, io. Pure, Node-testable.
- `js/viewer/viewer.js`: Three.js r160 classic build (vendored), custom orbit and pick.
- `js/ui/app.js`: the page. Every change goes through `applyOp`: check, record, redraw.
- `tools/build_samples.js` generates the planter and `js/samples.bundle.js`. `tools/smoke.js` runs the page headless.

## Library and cloud (2026-11-02)

- Library (lower right): built-in scenes, cloud scenes after sign-in, Quick Detail `make 3-D` references (read only, future).
- `m3d_scenes` (owner only, RLS). Quick Detail's `sketch_details` read by tag `make 3-D` (exact string).
- Only input scenes for now. LLM and drawn scenes come later, linked in as JSON.

## Open

- Object tags: a fixed set in `js/core/schema.js`. V2 is tagged; the other scenes are not yet.
- Rotation is about X, Y and Z (Z up). The V2 bonsai is 3-D: a slanting tapered trunk, one main limb arching up in steps, foliage pads on several sides, a leader above the crown.
- Clash check: `js/core/clash.js` (tested; not in the UI). The V2 parasol now stands outside the table end.
- Bonsai reach: the crown no longer reaches over the table. Open for Jimmy.

- Confirm convo v0.3 Q1–Q6. Confirm rotation axis. Confirm history-as-truth is in place (done).
- Cloud copy needs the SQL OK.

## Next steps

1. Jimmy answers convo v0.3 and checks the page on iPad.
2. Publish to GitHub Pages once Jimmy agrees.
3. Viewer outlines for warnings and rejects; per-operation note field; cloud copy.

## Living room from a photo (2026-11-02)

Jimmy gave a photo of a family living room and a rough description. Built in ten versions, each reviewed against the photo before the next (`03 Projects/Make 3D/tools/living_room.js`, one function `defsFor(v)`):

| Version | Change after review |
|---|---|
| V01 | Blockout: room shell, bookcase, TV, plants, sofa, children's table and chairs as boxes |
| V02 | Layout mirrored in x (the first render had the TV on the wrong side). Bookcase split into eight cubbies. Window glass |
| V03 | Books in the cubbies, a basket in the bottom cubby. Door made thicker |
| V04 | Chairs with four legs and backs. Chair 2 moved to the front of the table (chairs can only face along y). Sofa with back, arms and cushions |
| V05 | Plants as leaf clusters instead of single balls |
| V06 | Table: water bottle, dark box, two puzzle sheets. Two shoes on the rug |
| V07 | White trim: window frames, baseboards, light switch |
| V08 | Boxed puzzle on the bookcase. Camera kept; door checked with a zoom-out shot |
| V09 | Door frame and round handle |
| V10 | Objects grouped (room shell, windows, TV wall, plants, children's table, floor items). Layout unchanged |

**Sizes:** visual estimates, scaled from the TV (about 56 in wide) and the bookcase (120 in, four cubes). Not measured. Room about 200 × 144 in, walls 96 in high.

**Known limits:**
- The right wall hides the door and light switch from the default camera. A zoom-out shot shows the room but not behind that wall. A "hide walls" toggle is needed in the viewer.
- Chairs can only face along y, so the photo's chairs are placed to suit.
- Sofa and plants are simplified. No textures.
- All ten versions show in the Library as "Living room V01" to "V10".

**Questions for Jimmy:**
1. Are the room sizes close? Give the TV width, the bookcase length or the room size and I will rescale.
2. Keep all ten versions in the Library, or only V10?
3. Is the table and sofa placement right?

**Privacy:** the photo is in `03 Projects/Make 3D/private/` (git-ignored) and is not committed. The committed model is approximate geometry with no personal details.

## Living room, second look (V11 to V15, 2026-11-02)

Two more photos came in (a TV wall close up, and a view from the near end of the room). They show the room is longer than the first layout, with the TV wall on a side wall. V11 redraws the room in that orientation (`tools/living_room_second_look.js`, final coordinates, no mirror). V12 to V15 are increments on it.

| Version | Change after review |
|---|---|
| V11 | Re-layout: 156 × 216 in room. TV wall on the left, sofa, big window, two narrow windows and front door on the far wall. Bookcase two units of 14 in cubes |
| V12 | Ceiling: cork tiles in a straight grid (photo's tiles are angled, rotation is Y only) and two light panels |
| V13 | Review: cork tiles hid the room from above, so they are see-through. Wall decor from the photos: red paper cut-outs and chart on the TV wall, blue poster and switch on the right wall, white frame round the door, paper lantern |
| V14 | Bookcase contents: printer, storage boxes, bags and 37 upright books with a basket. Wooden chair with a jacket near the camera |
| V15 | Final pass: leaf clusters on the plants, objects grouped into 16 groups |

**Open for Jimmy:** the second photo shows a pink chair near the camera and a fig tree in a blue pot by the door; the fig is a simplified cluster. The chairs and table are estimates. The viewer still has no wall or ceiling hide toggle, so interior checks rely on see-through materials and camera angles.

## Plans and elevations, and V16 (2026-11-02)

Drawings are generated from the model by `03 Projects/Make 3D/tools/drawings.js`, so they cannot drift from the 3-D scene: `node tools/drawings.js <model id> <dir>`. Each set has a plan and one elevation per side of the room (the walls you see standing inside facing that side). Sets are in `drawings/v10`, `drawings/v15` and `drawings/v16`.

**V16 is the merge.** It keeps the V15 layout and restores what V10 had that V15 lost:
- Window frames on every window; baseboards on the walls; the door handle.
- A window on the TV wall, near the far corner (one window, as you noted). Its position is inferred from the blinds beyond the bookcase in the second photo.
- The blue and pink fans and the boxed puzzle on the bookcase top; the water bottle, dark box, two puzzle sheets and the third wooden chair at the table.
- More books in the near unit.

**Changed on purpose:** the V10 bookcase plants cannot stay on the bookcase, because the TV console now sits on the far unit. They moved to the floor by the near end.

**Assumptions to confirm:**
1. The sofa has two windows: one behind it (the big window) and one on its left (the narrow window). The narrow window on the right of the big one is kept from the photo; you did not mention it.
2. The TV wall window sits near the far corner, behind the monstera.
3. The chairs and table are estimates.

## V2.1 to V2.5 (2026-11-02)

Rebuilt against all three photos. Internal versions 21 to 25; scene ids `living-room-v2-1` to `living-room-v2-5`.
- **V2.1:** one window on the TV wall, at the far corner (the window beside the sofa, above the far end of the bookcase). The far wall keeps the big window behind the sofa and the narrow window by the door.
- **V2.2:** the TV stands on the near unit; the printer, plants and fans sit on the far unit top, near the corner window, as in the first photo. The boxed puzzle sits on the TV console.
- **V2.3:** the narrow window by the door has its sill at 36 in, as the big window does.
- **V2.4:** a pink chair at the near end by the bookcase.
- **V2.5:** a small floor fan by the bookcase.

Drawings: `drawings/v2-1` and `drawings/v2-5`, each with a plan, four elevations and `sheet.svg`, which stitches them on one page.

**Please check:** the TV's position (near unit in V2.2, far unit in V16) is the main conflict between the photos. Sizes are still estimates.

## Scene log in Supabase (2026-11-02)

Each scene version now lives as a row in `public.m3d_scene_log` (Architecture project), not only as JSON in the project folder. The row holds the history (source of truth), the rules it was checked against, the replayed model, a label (V16, V2.1) and a note. Edit a note or label with an UPDATE, with no merge and no rebuild.

- JSON files in `models/` and `js/samples.bundle.js` are build output for the viewer. Rebuild them from `tools/scenes.js` and `tools/living_room*.js`.
- Load or refresh: `node tools/push_scene_log.js` with the owner's session token (script header has the variables). `--dry-run` lists the 25 versions without network.
- Open: the table is empty until the owner runs the loader.

## Status and what is still needed (2026-11-02)

- **Done:** V01 to V16 and V2.1 to V2.5 built, drawn and merged (#40, #41). Scene log table live, with the upload button in the app (#43, #45). Lessons consolidated in `04 AI/lessons_pool.md`.
- **Needs Jimmy:** (1) check the room sizes (156 × 216 in, 14 in cubes, 96 in ceiling); (2) the TV position conflict between the photos (near unit in V2.2, far unit in V16); (3) sign in on the iPad and tap **Save all scenes to the log**, then confirm 25 rows appear.
- **Not acted on yet:** the viewer "hide walls and ceiling" toggle (a viewer change); moving the owner's email out of the public migrations into a config row; the PR #44 loader, which the log button now makes optional.
- **Further work is not queued.** Nothing else will be done until Jimmy answers the items above or asks for a change.

## Kitchen mockup from photos (V01 to V10, 2026-11-02)

Two photos of a display kitchen (not committed). `tools/kitchen_mockup.js`, one function `defsFor(v)`, ten increments in the Library as "Kitchen mockup V01" to "V10". Layout: U of runs, back run with the stove between two tiled counters, sink run on the green left wall, return run on the right with a wood bar outside it. Sizes are visual estimates in inches.

| Version | Increment |
|---|---|
| V01 | Blockout: room shell, base runs as boxes, wood bar |
| V02 | Steel counter tops, checkered tile insets, red patches |
| V03 | Stove: oven door, drawer, handles, knobs, burners |
| V04 | Doors and drawers; fridge door at the sink run |
| V05 | Stainless backsplash, upper cabinets, wood top shelf |
| V06 | Frying pan on the backsplash, hooks |
| V07 | Wood ledge on the wood bar |
| V08 | Double sink bowls, two faucets |
| V09 | Ceiling light, yellow panel above the cabinets |
| V10 | Final pass, objects grouped into seven groups |

**Known limits:** the tile is a flat colour with a few patches, not a checker pattern (no textures in the model). Cylinders stand vertical only, so the stove knobs are spheres. Pan uses `rotation_x` 90. The sink run's position on the left wall is a reading of the photos, not a measurement.

**Version log (kitchen mockup, V01 to V11)**

| Version | Change |
|---|---|
| V01 | Blockout: room shell, base runs as boxes, wood bar |
| V02 | Steel counter tops, checkered tile insets, red patches |
| V03 | Stove: oven door, drawer, handles, knobs, burners |
| V04 | Doors and drawers; fridge door at the sink run |
| V05 | Stainless backsplash, upper cabinets, wood top shelf |
| V06 | Frying pan on the backsplash, hooks |
| V07 | Wood ledge on the wood bar |
| V08 | Double sink bowls, two faucets |
| V09 | Ceiling light, yellow panel above the cabinets |
| V10 | Final pass, objects grouped into seven groups |
| V11 | Left door of the back run becomes an open bay with two wood shelves (first photo). Layout unchanged |

V01 to V10 are unchanged by V11 (checked: their generated files do not change). The Library lists all eleven. The version log is also in each scene's description.

## Adventure Coaster Park (2026-11-02, research mode)

- **Subject:** a family theme park with one adventure roller coaster. Ten increments, V01 to V10, capacity from 250 to 1,000 persons an hour.
- **Mode:** research (outside spec figures and capacity formula). Sources and disagreements: `research/adventure_park.md`.
- **Build:** `03 Projects/Make 3D/tools/adventure_park.js`, one `defsFor(v)`, feet converted to inches. World: `worlds/adventure-park-world.json` (bounds ±360 by ±240 ft, 120 ft high), because the default world is only 40 ft across.
- **Ladder:** V01 250 (Pip's kiddie coaster), V02 350 (Bumble River), V03 450 (teacups), V04 450 safety, V05 850 (Thunder Trail), V06 850 safety, V07 1,000 (Splash Falls), V08 to V10 1,000 (fineness, safety check, finish).
- **Checks run:** build: 10 scenes accept with 0 issues; `tests/test_core.js` passes; ten renders checked (V01, V05, V07, V10 by eye in detail).
- **Viewer:** `Increment Viewer/data/adventure_park.js`, in the drop-down.
- **Open for Jimmy:** (1) Thunder's 60 ft lift is above the traveller-guide examples; 50 ft would fit. (2) Keep the step-by-step ladder, or spread the 1,000 target over V05 to V10. (3) The default camera does not frame the whole park; a fit-to-park view is needed. (4) Is a real ASTM or EN review wanted before any figure is treated as a design?

## Animation, round 7 (2026-11-02)

- **Decisions (convo v0.7):** motion is a separate file (`motion.json`, `make3d.motion/0.1`); every animation is a loop; autoplay twice, then pause; tap-to-start and chained motions are future (door opens, then the cuckoo comes out). Two-finger pinch zoom on the canvas.
- **Built:** `js/core/motion.js` (`poseAt`, `checkMotion`, `motionBox`; kinds path, swing, bob, slide, spin). The viewer now makes a node per object with children inside their group, applies the pose each frame, redraws only while playing or touched, and frames the whole motion. Play bar under the scene; speed and autoplay in ⚙️. Pinch zoom by touch events (one finger orbits, a tap selects).
- **Test scene:** robot with a banana (`tools/robot_banana.js`, `models/robot-banana/`): 62 parts, nine motions, an 18 s loop round a winding closed path of stepping stones.
- **Checks:** `node tests/test_motion.js` (12 groups), `node tools/anim_check.js <dir>`; the existing tests and the smoke run still pass.
- **Open:** Jimmy checks on iPad (walk, pinch). Next: clash check over time (A6), frame strips for the Increment Viewer (A7). The make-3d skill has a motion step (A8, done when Jimmy asked). The Library folds versions by project, newest first.

## Adventure Coaster Park, compact and animated (V11 to V15, 2026-11-02)

- **Build:** `03 Projects/Make 3D/tools/adventure_park_compact.js` (`defsFor(v)` and `motionFor(v, uuid)`), scenes V11 to V15 in the Library under "Adventure park". Renders in `renders/adventure_park_compact/`. Review page `viewer.html?set=adventure_park_compact`.
- **Ladder:** V11 compact footprint (about 300 by 250 ft, was 600 by 400), Thunder Trail lift lowered to 50 ft; V12 Pip and Thunder cars run their tracks; V13 teacups spin, Bumble boats slide, Splash boats bob; V14 Sky Wheel turns (show ride, not counted in capacity), flags wave, balloons bob; V15 plaza fountain wave, so every ride moves.
- **Motion:** one loop of 24 s per version, autoplay twice. Path motions use the car centre (rail + 2 ft) and `M.pathAt` for the second car's start. Checks: `build_samples` motion check accepts each file, `tests/test_motion.js` passes, poses are finite.
- **Open for Jimmy:** (1) Does the Sky Wheel count toward capacity? (2) Keep the 50 ft lift, or go back to 60 ft? (3) Cars move on a smoothed curve through the track points, so they can sit a little off the rails; a straight-segment path would fix that but look less smooth. (4) Motion uses the browser's play bar; the Increment Viewer shows renders only, not the motion.

## Curves, physics speeds, shareable model link (2026-11-02)

- **Curves:** the rails and cars follow a Catmull-Rom spline through the plan points (about 10 ft between samples). Rails are short straight pieces, so the curve reads smooth.
- **Physics (feet, seconds, real time):** the chain lift pulls at 6 ft/s; past the top, energy gives v² = 6² + 2g(zTop − z) − 2·0.015·g·distance (g = 32.2 ft/s², rolling and air resistance 0.015 of g). Thunder Trail: 60 ft lift, top speed about 40 mph, lap about 18 s. Splash Falls boats: lift at 6 ft/s, drop into the pool, top about 28 mph, then a conveyor at 4 ft/s back to the start. Pip runs at a steady speed.
- **Engine change:** `js/core/motion.js` takes an optional `profile` on a path: [[t, s], …] from [0, 0] to [1, 1], mapping loop time to distance along the path. Validated by `checkMotion`; `warpTime` is exported.
- **Shareable link:** `index.html?model=<sample id>` loads that model (it wins over the saved copy). Loading a sample from the picker updates the address. Checked in headless Chromium.
- **Changed in place:** V11 to V15 are rebuilt (60 ft lift, curves, physics). Git keeps the previous merged versions.
- **Open for Jimmy:** (1) the coaster's 40 mph top speed fits the family-coaster range the traveller guides give; keep it or push the drop higher? (2) Splash boats stay level on the slope (they don't pitch); add pitch? (3) the Sky Wheel is still a show ride, not counted.

## Cars on the slope, faster rides, life in the park (V11 to V16, 2026-11-02)

- **Cars flying off the track:** cars turned only in the flat plane, so on the steep drops they stuck out into the air. Now they pitch with the slope: the motion engine has `face: "tangent3d"` (yaw about Z, pitch about Y) with `rest_yaw_deg` and `rest_pitch_deg`. Checked: the car's forward direction matches the track tangent at every point (0° error); the rest pose is the identity at the start.
- **Speed:** the people's loop stays at about 18 s. The rides run for 80% of it and wait at the station for the last 20% (`RIDE_FRAC = 0.8`). That is 1.25× faster than the physical ride (top speed about 40 mph in real time, about 50 mph in the animation). Pip uses the same timing.
- **Steepest slope:** about 80° on the coaster's first drop. Steeper than typical family coasters; open for Jimmy whether to soften it.
- **V16 life in the park:** visitors in and out of the gate (80 ft loop, about 4.4 ft/s) and round the plaza (14 ft ring, about 4.9 ft/s), four vendor stalls with keepers, five birds on a 3-D loop (about 31 ft/s) with a wing-beat bob, three free balloons.
- **Open:** (1) keep the 80° drop, or soften it? (2) keep the ride speed at 1.25× or go back to real time?

## Hawk: closed skeleton meshes (2026-11-02, research mode)

- **Request (Jimmy):** a hawk looping around and diving down before picking back up. Move beyond polygon extrusions to **closed meshes set up with a line** (a skeleton), so animation is more realistic; use **thin double-sided meshes** for leaves, grass and flags. Log it in the lessons. Merge.
- **Mode:** research. Sizes and sources in `research/hawk.md` (Cornell Lab: 17.7 to 25.6 in long, 44.9 to 52.4 in wingspan).
- **Engine (new):** types `loft` (closed) and `sheet` (open, double sided) with a `shape` (joints, facing, rings); `attach` to a joint; motion kind `bend`; `keys`, `envelope`; `face: "flight"`. Schematic §15. Code in `js/core/mesh.js`, `js/core/motion.js`; viewer builds a geometry per part and moves vertices each frame.
- **Build:** `tools/hawk.js`, one `defsFor(v)`, six increments; scenes `hawk-v01` to `hawk-v06`; library project "Hawk". Renders `renders/hawk/`. Review page `viewer.html?set=hawk`.

| Version | Increment |
|---|---|
| V01 | Blockout: body, tail and two wings as closed meshes on straight skeleton lines |
| V02 | Wings with shoulder, elbow, wrist and tip; five-joint body; tail rides the rump joint |
| V03 | Beak, eyes, legs and feet riding body joints |
| V04 | Meadow: 120 grass blades and 6 leaves (double-sided sheets), pennant flag, mouse |
| V05 | Cream breast, eye ridges, smaller eyes set lower |
| V06 | Motion: 23 s loop of circling, stoop, flare, skim and climb; wings bend, head dips, legs drop, grass and flag move |

- **Checks run:** build (six scenes accept, 0 issues); `tests/test_mesh.js` 14 groups (closed meshes, FK bends, keys, rest pose, loop closes, frame is a rotation, lowest point 4.9 in, wings tuck from 49 in to about 3 in); `test_core`, `test_motion`, `test_ifc`, `test_cloud`, `smoke`, `anim_check` still pass; older scenes' generated files unchanged.
- **Open for Jimmy:** (1) "looping around" was built as circling the meadow, then a stoop. Did you mean a vertical loop-the-loop? The flight frame can do one if the up-axis floor is lifted. (2) The talons skim 3.4 in above the mouse rather than touching it. (3) The loop is slow (about 43 in/s at the bottom) so the wing bends can be read. (4) IFC export skips lofts and sheets. (5) Check on iPad (play bar, pinch, speed).

## Grand Ocean Aquarium (2026-11-02)

- **Subject:** a large imagined public aquarium, in the style of the California Science Center kelp tank (Los Angeles): 100 x 60 ft tank, 28 ft deep, a 100 ft round acrylic walk-through tunnel along the floor, a front viewing gallery, entry lobby, exit hall and a pool deck. Sharks, large fish, schools of small fish, kelp and reef plants. Tap an animal to read its name and description.
- **Mode:** research. Sources and estimates in `04 AI/Make 3D/research/aquarium.md` (CSC kelp tank about 188,000 gallons and a 24 ft tunnel; Georgia Aquarium 100 ft tunnel; sand tiger, zebra and bonnethead shark sizes). Our tank is larger than the CSC tank and its layout is an estimate. Manta ray wingspan sources disagree (26 versus 29 ft); not used.
- **Build:** `03 Projects/Make 3D/tools/aquarium.js`, one `defsFor(v)` that returns the objects and the motions. World `worlds/aquarium-world.json` (bounds ±100 by ±75 ft). Test: `tests/test_aquarium.js`. Review: Increment Viewer `?set=aquarium`.

| Version | Objects | Change |
|---|---|---|
| V01 | 102 | Blockout: tank, tunnel, lobby, exit, gallery, deck; 8 animals; 4 kelp; rocks. Still |
| V02 | 159 | Animated: swim loops, tail beats, kelp sway; 8 more animals; fins |
| V03 | 215 | Guest spaces: tunnel ribs, benches, piers, lamps, signs, rails |
| V04 | 525 | Schools (3), kelp forest, reef, moray, 12 more animals, eyes, guests walking the tunnel |
| V05 | 1,028 | 8 schools, 8 jellyfish, a diver, bubble vents, eelgrass, anemones with clownfish, urchins, stars, a crowd, deck lamps |

- **Motion:** one 60 s loop (autoplays twice), 44 motions in V02 up to 150 in V05. Swimmers follow closed organic loops that stay in the water and out of the tunnel (tested at 90 times per loop).
- **Viewer change:** taps now pass through anything with opacity under 0.4 (glass and water), so fish behind a glass wall can be picked. Other scenes are unaffected.

**Open for Jimmy:** the tunnel ribs are straight chords, not a smooth arch; rays, turtles and eels do not beat wings or flippers; fish are boxes and cones; a "hide walls" toggle would help view the gallery; tap-to-start and chained motions are still future.

### Aquarium V06: two storeys and small rooms (2026-11-02)

Jimmy asked for a tank at least two stories tall with multiple small rooms, some with a sunroom view in the low sun, and tunnels and windows where kids can see the fish swim and somewhat interact. V06 (1,178 objects) adds: 8 small rooms on two levels (Reef, Jelly, Shark, Kids' Den; Dive, Quiet, Sunroom, Lookout), kid-height round windows, 3 bubble domes into the tank, a crawl tube, a touch pool with 2 small rays, a low drifting sun with beams, stairs, and a second-floor gallery. The 28 ft tank is read as two 14 ft floors. Interpretation to confirm: "interact" is taken as bubble domes plus a touch pool; "tunnels where kids can see" as the crawl tube and low windows. Open: ramp, doors, room sizes against a child's height.

## Hawk V07: physical flight, larger loop (2026-11-02)

- **Request (Jimmy, after V06):** fly much faster; a larger loop; multiple cycles; more flapping when climbing; less diagrammatic, more real: gravity, friction, a rising air channel, a bluff.
- **Built:** V07 in the same `tools/hawk.js`, with `tools/hawk_flight.js` and `worlds/hawk-world.json` (bounds ±520 by ±420 in, 460 in high). V01 to V06 are unchanged (checked: their generated files do not change).
- **The lap (26 s):** glide, stoop onto the mouse, flared skim, flapping climb, ride the bluff updraft, then 2.5 turns up a thermal with no flapping.
- **Physics:** speed from gravity, drag (spread, tucked, flared) and flap thrust; rising air holds the soaring speed (130 in/s); thrust solved (about 100 in/s²) so the lap closes. Banking from the turn (coordinated turn, g = 150 in/s² in a world about a tenth of real size), capped at 55° and lower near the ground.
- **Numbers:** path about 3,430 in, stoop about 240 in/s at the bottom (about 1.9 times soaring speed), 62 wing beats a lap at 2.4 per second, all in the climb; thermal 2.5 turns, 120 in per turn.
- **Checks:** `tests/test_mesh.js` 26 groups (V06 and V07 rigs; speed constant in rising air; stoop energy balance within 8%; flare sheds speed; arrival at the bluff at soaring speed; flaps only when climbing; lowest point 5.3 in; nose turns under 10 rad/s). Other suites, smoke and anim_check pass.
- **Open for Jimmy:** (1) Is a tenth-scale world right, or should the hawk be scaled down inside a bigger arena? (2) The air is drawn as ribbons, not simulated. (3) Talons skim 4 in above the mouse. (4) ~~Should the mouse react?~~ Answered: Jimmy said the mouse bolts for a hole, and the hawk size is good. Done: burrow 52 in west of the mouse, bolt at about 160 in/s as the hawk flares in, hides underground, walks home before the wrap (`mouseRun` in `tools/hawk_flight.js`).

## Solar System (2026-11-02)

- Subject: Solar System, not to scale (sun, nine planets, orbit lines, asteroid belt, gas giants with bands and rings, Pluto, moons in planet views). Five increments (`tools/solar_system.js`, `solar-system-v01` to `v05`) and one view per planet (`planet-<name>`). Research note: `04 AI/Make 3D/research/solar-system.md`. Mode: research (NASA fact sheet values and a Pluto/Charon page; the live NASA table was not reachable in search, so re-check before public use).
- Linked views toolset: `js/core/linked_views.js` with the page button, zoom/fade transitions, and full screen. Schematic §16. Tests: `tests/test_linked_views.js`.
- Review set: Increment Viewer `?set=solar_system`, renders in `renders/solar-system/`.
- Open: planet views are V01 only; no retrograde spin; orbits are circles; gas-giant bands look stepped.

## Round 9: planets to V03, Earth to V10, true orbits (2026-11-02)

- Solar system V06: true orbits from JPL approximate elements for 2026-11-02, one lap of Pluto (240 s), played once, then held. Date tracker lower right. Research: `research/solar-system-true.md`.
- Planet views: V02 and V03 for the eight planets (textures, more moons). Earth V02 to V10 (continents through a second launch). Earth V10 loop is 480 s.
- Back to the Solar System is a page button (`header.links`), not an object.
- Open: positions past 2050 are extrapolated; the element values were entered from the standard table, to be checked against the JPL page; belt rocks are a fixed pattern, not real asteroids; fast spins alias at one lap per 240 s.

## Coastal Habitat Aquarium (2026-11-02)

Jimmy's note on the Grand Ocean Aquarium: it is a water tank, but "Disneyfied": about the experience of standing in it, not a volume where the plants and animals live. It should be organic and modelled. Asked for a few increments on that, then to import the marine assets and populate the new scene.

- **New subject** (the old one stays as built): `tools/habitat_aquarium.js`, four increments, test `tests/test_habitat_aquarium.js`, review `?set=habitat_aquarium`, world `aquarium-world`.
- **H01** curved, lobed outline (polar function, 40 angled glass panels), sand floor, S-shaped tunnel. **H02** rockwork (four tiers of boulders, ledges, spires, three caves, tide shelf), rolling seabed, front window with frames. **H03** kelp forest (24), eelgrass, reef, anemones, light shafts. **H04** all marine assets from `tools/aquarium.js` (species table and fish shapes; the builders are copied, deliberately, so the old versions stay untouched), 38 large animals, 11 schools, jellies, diver, critters, front gallery and tunnel guests.
- **Object counts:** 254, 615, 908, 1,710.
- **Swim loops** are rejection-sampled against the outline (distance to the wall), the S-tunnel and the floor, and tested at 90 times per loop.
- **Not carried over:** the rooms, sunroom, kids' den, bubble domes and touch pool of Grand Ocean V06. They belonged to the glass box. Open for Jimmy: where should they go (pavilions round the lobed outline?).
- **Open:** rock is made of spheres, so it looks pebbly; plain cones and slabs only help a little. Rays, turtles and eels still glide stiffly.

### Coastal Habitat Aquarium V05 to V07 (2026-11-02)

Jimmy: the tank is not a vertical extrusion; some portions should be shallow with space below, others have bridges over them or tunnels through them. Built as three more increments of the habitat scene (H01 to H04 unchanged; checked by hashing their output before and after).

- **V05 Not an extrusion:** the wall leans by angle (`lean(θ)`, ±10% at the top, so some stretches overhang and others flare); the rock cliff, ledges and spires, the rim and the tilted front window (7°) follow it. Three floor levels: deep basin 0 ft; solid rock terrace 8 ft (SE); shelf plateau 16 ft (NW) with 12 ft of water over it and a cavern gallery beneath, looking into the deep basin through a curved glass wall. The flat sand, mounds and tide terraces are replaced by this terrain.
- **V06 Bridges and tunnels:** a deck ring; an arched skybridge over the deep basin; the Kelp Walk from the west deck over the plateau up to the skybridge; a 32 ft clear tunnel through the plateau water; a spiral stair tube up through the shelf from the cavern; two guests cross the skybridge.
- **V07 Repopulated:** plateau residents and schools, terrace kelp and coral, plateau critters, guests on the Kelp Walk. A **cutaway** scene (front half of rock, glass, rim and deck removed) is included for review only; its images are the V07 render.
- **Counts:** 1,768, 1,988, 2,175 (cutaway 1,890). **Swim loops** now test the leaning wall, the floor and terrain, the plateau tunnel and the shelf edge (`tests/test_habitat_aquarium.js`, 12 tests).
- **Open:** no way into the cavern or onto the plateau (stairs from the deck and the gallery are only markers); no tunnel through solid rock; the rooms from Grand Ocean V06 are still unplaced. `js/samples.bundle.js` is now about 20 MB, because every scene is in it; it should be split or loaded on demand.

## Robot loop, Parts dropdown, make3d tag (2026-11-02)

- **Quick Detail:** "Robot Loop" (`sketch_details` 3c4c380d-…, tags `make3d` and `make 3-d`). Its only stroke is the walk. The cloud filter now matches `make3d` ignoring case; `make 3-d` no longer matches (retired).
- **Built:** `tools/robot_loop.js`, scenes `robot-loop-v02` to `v04`, project "Robot loop". V02 walk along the sketch (48 points, closed, rest heading +X, 38 s lap); V03 frisbee in the left hand; V04 top hat. V01 robot-banana is unchanged. Renders in `renders/robot-loop/`. Review `viewer.html?set=robot_loop`.
- **Parts dropdown (upper right):** any group tagged `show:<label>` gets a checkbox that hides its whole branch. Pure rules in `js/core/visibility.js`; the viewer hides nodes and skips them when picking.
- **Scale and seam:** the closed shape is labelled 19'-7" at 3"=1'-0". Its longest side is taken as 235 in, so sketch units × 3.72 in. The stroke does not join at its ends (about 8 in gap, sharp turn); a Gaussian average (sigma 3 points) closes it, turning the seam by about 1.6 degrees and moving no point more than about 3 in.
- **Open:** the scale is an estimate (Jimmy to confirm); the antenna passes through the hat (not moved); the frisbee is held at the rim, not gripped.
## Round 10: shaders, zoom-linked time, 1958 start, more increments (2026-11-02)

- Solar system V07: starts 31 January 1958 (Explorer 1); Halley's Comet, Encke and Tempel 1 on true orbits.
- Tracker steps by year, month, week or day with the zoom; playback slows when zoomed in (about 0.1 times at close range).
- Planet views fill three quarters of the screen (`header.view`). V04 to V06 added (shaded surfaces and bands). Earth V11 to V20 added (shaded continents, a cloud shell, more features; loop 480 s).
- Procedural materials replace flat dots for clouds and surfaces; the numbers live in the header, no images.
- Open: continents are ellipses (real coastlines need a map texture and a decision about image assets); comet elements to be checked against JPL; Halley dips inside the drawn Sun.

## Earth dot map, V21 (2026-11-02, research mode)

- **Request (Jimmy):** the continents do not look right. Keep the dots, but make the grid four times denser and the dots smaller, and be more precise.
- **Mode:** research. Source and checks: `research/earth-land.md` (Natural Earth 1:50m land, sampled at 5-degree cell centres; public domain).
- **Plan (before building):** keep V20 as it is; V21 replaces the ellipse continents with one dot per land cell of a 5-degree grid (4x the cells of the 10-degree grid of V02 to V10), each dot about a third of the old diameter. Sea is plain (no noise land). Antarctica is ice-white; deserts are sand dots in rough boxes. Clouds, storms, launches, Moon and rotation are unchanged.
- **Build:** `tools/earth_land_5deg.js` (the mask and the desert boxes), `tools/planet_views_v4.js` (`earthV4Defs` at v >= 21, `earth_ocean21` material, `EARTH_VIEWS_V21`), `js/viewer/viewer.js` (`no_land` flag: the shader's land is off, so the sea has no noise continents). Scene `planet-earth-v21`, 1,134 objects, model check accept with 0 issues.
- **Older versions:** unchanged. The V21 sea material is kept out of the shared list, so the V01 to V20 files are byte-identical (checked with `git status` after the build).
- **Checks:** `tests/test_earth_land.js` (6 tests), `tests/test_core.js`, and the other Make 3D suites pass. Renders checked at the default camera and four azimuths (`renders/earth/v21.png`).
- **Review:** Increment Viewer `?set=earth_views_v21`.
- **Open for Jimmy:** (1) Is 5 degrees precise enough, or do you want a finer map (for example 2.5 degrees, which means 4x again)? (2) Coastal cities sit a cell off (Sydney, Tokyo); do you want the city lights (V15) moved onto the new grid? (3) Deserts are rough boxes; do you want a real desert map?
## Robot cape and the Parts control (2026-11-02, round 2)

- **Quick Detail "Robot Cape"** (`sketch_details` f3e32d04-…, tag `make3d`): a closed outline (ink), a yellow border, six brown tassels at the bottom, nine circles in the middle (four red, five blue). Its notes say the holes should show the circles, the tassels should be brown, and the cape should move like fabric with a sheen.
- **Built:** `tools/robot_cape.js`, used by Robot loop V05 (`robot-loop-v05`). The outline is a sheet on a 7-joint skeleton down the back; the border is 24 beads on the outline; tassels are brown cylinders; the circles are coloured discs on the back.
- **Motion:** a wave runs down the cape all the time (joints 1 to 6, 3 cycles per loop). The lower cape swings sideways on turns. Both follow the walk's turn rate (computed from the path), so tight turns flow more. Every key list starts at 0, so the first frame is the rest pose.
- **Scale decision:** the cape is 22 in from the shoulders to near the ground, with the drawing's proportions. The drawn 7'-10" is not used, because it does not fit a 3 ft robot.
- **Frisbee:** V05 moves it to the banana's right hand. V02 to V04 keep their history (the frisbee stays left there).
- **Parts control:** now under Full screen in the stage's upper right, not in the header.
- **Known limits:** a sheet cannot have holes (discs stand in), the border is beads, no sheen (flat colour), and the cape does not collide with the robot.

## Earth V22: satellites, storms, rockets and clouds to scale (2026-11-02, research mode)

- **Request (Jimmy):** fix the floating things (storms, clouds, satellites, rockets). Closer to scale, exaggeration fine. Faded orbit lines. About ten times the satellites. Hubble, and others.
- **Mode:** research (scale figures, `research/earth-scale.md`).
- **Plan (before building):** keep V21; replace the floating parts. Earth's radius is 9.5 in (about 670 km per inch). Satellites on four LEO rings, a navigation ring, a geostationary ring (turns with the Earth), the ISS, Hubble and a polar weather satellite. Faded orbit lines on the real planes. Storms about 2.5 in across on the cloud shell, cloud shells 0.1 and 0.2 in above the ground, rockets about 0.85 in tall.
- **Build:** `tools/earth_v22.js` (`earthV22Defs`, `RINGS`, `EARTH_VIEWS_V22`), built on `earthV4Defs(21)` with the replaced parts filtered out. Scene `planet-earth-v22`: 1,190 objects, 81 satellites (V21 had 8), 10 orbit lines, 150 storm puffs, 4 launches.
- **Rules:** every part is at least 0.25 in in each dimension (the minimum-dimension rule); orbit lines use a thin tube inside a 0.25 in box. The first build gave 262 warnings from the small parts; they are fixed, and the build has none.
- **Older versions:** unchanged (checked with `git status`: only the V22 folder is new among the model files).
- **Checks:** `tests/test_earth_v22.js` (10 tests): the satellite count, each satellite on its ring, the ISS/Hubble/polar radii, every orbit line a closed, faded tube, storm puffs on the shell, rockets under 0.9 in, the cloud shells, materials, and V21 unchanged. The full Make 3D suite passes.
- **Review:** Increment Viewer `?set=earth_views_v22`.
- **Open for Jimmy:** (1) the minimum size (0.25 in) makes the satellites and rockets chunkier than to scale; is that fine? (2) the mountains (V12) are still large cones; do you want them scaled? (3) the Moon's distance (30 in) is not to scale; leave it, or move it out? (4) James Webb is not drawn.

## Earth V23: launches, deployment, large satellites only, mountain ranges (2026-11-02)

- **Request (Jimmy):** the rockets are unclear: fix the launch sites and show the launch and return. Show deployment of new satellites. Reduce the satellites to large units (Hubble class, the station if still there). The mountains look weird.
- **Decision on deployment (Jimmy, after a question):** the satellite is released at the top and disappears; the rocket returns to its pad or splashes into the sea. No full-length animation needed.
- **Build:** `tools/earth_v23.js`, built on V22 with the replaced parts dropped. Six real sites (`research/earth-launches.md`); four rockets back to their pads, two first stages falling into the sea (Kourou, Wenchang). Each carries a new satellite that drops into the planet and is hoisted back to the nose so the loop closes. Large satellites only: ISS, Tiangong (new), Hubble, a geostationary weather satellite (new). Mountains: small peaks along the Andes, Rockies, Alps and Himalaya (base 0.25 in, 0.35 to 0.6 in tall).
- **Checks:** `tests/test_earth_v23.js` (9 tests): the satellites, the sites and climb along the normal, the profiles, the sea splashes, the deployed satellites, the mountains, and V22 unchanged.
- **Review:** Increment Viewer `?set=earth_views_v23`.
- **Open for Jimmy:** (1) the deployed satellite drops into the planet instead of staying in orbit; OK for now? (2) the first stages do not break up; add a break-up? (3) the rockets are still much bigger than to scale.


## One name for the robots (2026-11-03)

- All robots are one Library project, "Robot going for a stroll": V01 (`robot-banana`, was "Robot with a banana") and V02 to V05 (`robot-loop-v02` to `v05`, was "Robot loop"). Scene ids are unchanged, so existing links (`?model=robot-loop-v04`) still work.
- The name lives in one constant, `ROBOT_PROJECT` in `tools/robot_banana.js`. The Increment Viewer set is "Robot going for a stroll: V02 to V05".
- Only names and headers changed. Motions and geometry are the same.

## Robot Path (2026-11-03)

- **Quick Detail "Robot Path"** (`sketch_details` eec507d8-9272-457b-a84e-d39f378ef324, tag `make3d`): one closed figure-eight stroke (x = 12 sin t, y = 12 sin t cos t, 80 points). I created it because no path had been drawn. Redraw it in Quick Detail to change the shape; the robot code uses its own copy of the formula, so update `tools/robot_loop.js` too.
- **Built:** `robot-loop-v06` ("Robot going for a stroll V06") walks it at 3.5 in per unit, with the same parts as V05 (frisbee, hat, cape). V02 to V05 are unchanged.
- The library lists the detail only when signed in (the page reads `sketch_details` with owner access).

## Robot Path 2 replaces the figure-eight (2026-11-03)

- V06 now walks Jimmy's sketch, Quick Detail "Robot Path 2" (`fd1878e1-ac12-4355-afee-3ebeeb07d4d9`, one stroke that crosses itself). The figure-eight from earlier was my draft; it's no longer used.
- Sized to the built V06 (9.09 in per unit, about 76 in across). The sketch has no dimension label, so this is an estimate. Confirm with Jimmy.
- Sampled at 120 points (about 3 in apart): 48 was too coarse for the inner loop and made the path angular.
- The "Robot Path" row I inserted (`eec507d8-…`) is still in the database. It isn't used now; it can be soft-deleted if Jimmy wants.
- QC: the plan-view comparison (sketch against the built stones) is in the scratchpad (`qc-compare-v06.png`).

## Robot Path 2 at 10 times the size (2026-11-03)

- V06 walks Robot Path 2 at 90.9 in per unit (10 times the earlier 9.09), about 760 in across. Estimate; the sketch has no label.
- The lap is now 178 s (same walking speed, longer path), with 240 stones. V06 has its own world, `worlds/robot-path-world.json` (±1200 in), because the default world (±240 in) is too small.
- V02 to V05 are unchanged.
## Cornice sketch source (2026-11-03)

- **Sketch:** Quick Detail "Profile for Cornice", `sketch_details` row `5b87bdcb-9cac-452b-b70d-1fb0e0031e9f`, tag `make3d`, scale 3"=1'-0", updated 2026-11-03 05:12 UTC.
- **Where found:** Supabase project `xabgankckrcuhcgdolrg` (Architecture), table `sketch_details`, query: tag `make3d` (case-insensitive) with `deleted_at is null`. The name was "Profile for corners" in the request; the row is named "Profile for Cornice".
- **Used by:** `tools/cornice.js` (V01 blockout, V02 traced profile). Its outline numbers were read by a summary query, not copied point by point.

## V1 archive and V2 start (2026-11-03)

- **V1** is a frozen copy of the app in `03 Projects/Make 3D/V1/` (index, css, js, vendor). Models, renders, drawings, worlds, tools and tests stay at the root. Settings → Versions opens V1 from V2 and V2 from V1.
- **V2** is the live app at the root. Storage keys moved to `make3d.v2.*` so the two versions do not share a saved model.
- **Research:** `04 AI/Make 3D/research/trellis2_notes.md`. TRELLIS.2 uses nvdiffrast, not Three.js, and needs a 24 GB GPU; V2 borrows its staged passes and PBR material model, not the model. The arXiv paper was not readable from this session.
- **Plan:** `04 AI/Make 3D/research/v2_plan.md` (material layer, canvas textures, PBR viewer, staged passes, GLB export, optional generator slot off by default).
- Not done: no V2 engine work beyond the storage split; the V2 skill is unchanged pending Jimmy's decision.

## Cornice V04: half scale, swept with arcs (2026-11-03)

- **Request (Jimmy):** the cornice is too large, reduce it by 50%; the walls should run up from the floor to the cornice; the cornice should have arcs and curves, built as a sweep.
- **Built:** `tools/cornice.js` V04 (`defsFor(4)`). Scale is half the V01 to V03 scale (about 1.9 in per sketch unit, so the cornice is about 48 in tall). The same profile is swept along the three walls of each room, with inside corner arcs (radius 24 in, six pieces each). Walls run from the floor to the cornice top, so nothing floats. Cutaway and flipped profile as in V03. Lamps moved under the shelf.
- **Sweep, honestly:** the engine has no sweep object (its only skeleton shapes are ellipse rings). V04 is a sweep built from boxes: 1,175 objects, arc pieces rotated about Z. The profile is still stepped (one sketch unit per band, about 1.9 in), so the curves come from the corners, not from the outline.
- **Checks:** V01 to V03 unchanged in git. Build passes (166 scenes, world-bounds warnings only).
- **Open:** scale still an estimate (Jimmy to confirm); a real sweep object in the engine needs a schema and rules change (next step if wanted); the outline's freehand curves are still not modelled.

## Solar System V08: the five dwarf planets (2026-11-04, research mode)

- **Request (Jimmy):** Pluto is one of five dwarf planets; tell the other four, and make a 3-D increment.
- **Answer:** the five IAU dwarf planets are Ceres, Pluto, Haumea, Makemake and Eris.
- **Quick Detail:** a `make3d` query on `sketch_details` (Architecture project) found no sketch for the solar system. The matches were Profile for Cornice, Robot Path, Robot Path 2, Robot Cape and Robot Loop, none used here.
- **Mode:** research. Sources in `research/dwarf-planets.md` (Britannica, UNLV table, Space.com, worksheets).
- **Build:** `tools/solar_true.js` adds `DWARFS` (orbits, spins), `DWARF_PLANETS` (radii) and scene `solar-system-v08` (start 1958-01-31 as V07, comets kept). V06 and V07 are unchanged. Registered in `tools/scenes.js`. Built with `node tools/build_samples.js`: 1,674 objects, 190 motions (8 new: orbit and spin for each dwarf).
- **Checks:** `tests/test_core.js` (27 groups) and `tests/test_orbits.js` (14 tests) pass. Render: `renders/solar-system/v08.png`, no console errors.
- **Review:** Increment Viewer `?set=solar_system`, item V08 added; the set label and title now say V01 to V08.
- **Open:** (1) Inclination, node and perihelion of Ceres, Haumea, Makemake and Eris are from memory of the JPL SBDB, not re-checked. (2) Starting places are a placeholder (perihelion at J2000), not the 1958 positions. (3) Eris laps less than once in the 240 s loop. (4) Haumea is drawn as a sphere. (5) Makemake's diameter differs between sources (1,430 vs 1,500 km).
