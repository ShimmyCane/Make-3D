# Make 3D — Lessons

Appended over time. Promote anything reusable to `04 AI/lessons_pool.md`.

- **Check the page from file:// early.** ES module imports (`<script type="module">`) do not load from `file://`, so Jimmy's double-click use breaks. Use classic scripts, and a UMD build of the library (Three.js r160 `build/three.min.js`). Promoted to the pool.
- **Generate sample files from one operation list and check them by replay.** A test that replays `history.json` and compares it with `model.json` stops the two from drifting. Promoted to the pool.
- **Test shapes with real bulk.** A one-off far spire made the bulk look like outliers, so the first version of the origin test failed for the wrong reason. Give bulk objects real size when testing origin rules.
- **Floating buttons need room in the footer.** The lower-right gear covered the model-check chip. Reserved padding on the footer fixed it.
- **On narrow screens, the view comes first.** On iPad portrait, the panels above the view hid the model. The stage now sits on top, and the panels scroll below.
- **Headless Chromium with WebGL** needs `--no-sandbox --use-gl=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist` with the pre-installed Chromium at `/opt/pw-browsers/chromium`.
- **Use the project's own names for the UI.** "Not applied" and "Accepted with notes" say what happened; "error" is kept for the opt-in area.

## Photo to 3D: living room (started 2026-11-02)

- **Process agreed with Jimmy:** he gives a photo and a rough description of what is in it. Claude blocks out the room in inches from visual estimates, builds version V01, renders it, and reviews the render against the photo. Each review leads to the next numbered version, V02 to V10. Each version is a full scene rebuilt from one code path, so older versions can be regenerated.
- **Keep the photo private.** A photo of a home goes in `private/` (git-ignored). Only synthetic, approximate geometry is committed.
- **Scale from one known object.** Use something of known size (a TV, a sofa, a child's chair) to set the scale for the rest, and say in the brief that the sizes are estimates.
- **Rotation is about Y only** (`rotation_y`), so chairs and the sofa can only face along the room's Y axis. Lay the room out to match, rather than rotating in the photo's way.
- **Review each render against the photo** and write down what was wrong, so the next version fixes it and the lesson is kept.

**Outcomes after V01 to V10 (2026-11-02)**

- **Check the handedness before the first layout.** With Z up, a viewer standing at the front and facing the back wall has +x on the left, not the right. The first layout came out mirrored, so the final x is mirrored once at the end (`200 - x`), as the kitchen did. Check the first render against the photo before adding detail.
- **Parents before children.** Groups must be added before their members, or the rules reject the operation. A grouping step adds the group first.
- **Chairs cannot turn to face sideways.** With rotation about Y only, a chair beside the table cannot face it. Move the chair to the end of the table instead.
- **A wall can hide what you want to check.** The right wall hides the door from the default camera. A zoom-out shot shows the whole room, but not behind a wall. A "hide walls" toggle is the real fix (noted for the viewer).
- **Keep old versions reproducible.** Each version is a `if (v >= N)` block in one function, so V01 to V10 all rebuild from the same file.

## 2026-11-02: check the picture, not the numbers

- A pass on the numbers is not a pass on the shape. The first bonsai "passed" every test and still looked like a bare line of sticks. Look at each screenshot from at least two angles (default and side) and ask what a real tree of this kind does: taper, lean, apex above the crown, branches that arch up, not flat arms.
- Dimensions that look fine on paper can clash in 3-D (a pole through a table top). Run the clash check (`js/core/clash.js`) after every scene change.
- "Sparse" in a user's description can be a complaint, not a spec. Re-read the user's sentence before building to it.
- Shell: never run `cat > file` without input in a command that is not meant to read stdin; it hangs the shell.

**Second look (V11 to V15, 2026-11-02)**

- **New photos can change the layout, not just the details.** The second photo showed the room was longer and the TV wall was a side wall. Redrawing the room was faster and clearer than patching V01 to V10. Keep the first version reproducible and start a new file with its own coordinates.
- **Pick the camera by where the room is open.** When the near end is open, the camera belongs there (azimuth 34° in this file), not outside the far wall.
- **Ceilings hide rooms.** An opaque ceiling blocks the default view from above. Make it see-through (opacity 0.4) when a room is viewed from above.
- **Rotation about Y only again.** Ceiling tiles that are angled in a photo become a straight grid here. Say so in the brief.
- **Check the data when a close-up misses.** A zoomed camera can land on the wrong part of the room. Confirm the object positions in `model.json` instead of guessing from a screenshot.

**Consolidated 2026-11-02:** general lessons from this file are in `04 AI/lessons_pool.md` (sections on Make 3D, Supabase and logs). Project detail stays here. The scene log is in Supabase (`m3d_scene_log`), so edit scene notes there.


## Kitchen mockup from photos (V01 to V10, 2026-11-02)

- **Thin parts fail the minimum dimension.** A 0.2 in tile patch gave three warnings in every version. Use 0.25 in or more for anything that is meant to read as a surface.
- **Cylinders are vertical only.** Knobs that face the room need spheres; a rotated cylinder (`rotation_x`) works for a pan, but not for a row of knobs.
- **Check the handedness against the photo.** Layout in view coordinates, then one mirror at the end, as the living room does. The V10 render has the green wall and wood bar on the photo's sides.

## Kitchen mockup V11, and merging the PR (2026-11-02)

- **Keep old versions reproducible, and prove it.** After V11 was added, the generated files for V01 to V10 were checked with `git diff`. None changed. Do this check after every new version.
- **Removing a part in a later version:** filter it out by key before the grouping step, and add the replacement parts before grouping too. Otherwise the new parts have no group.
- **An opening needs the carcass split.** A solid carcass box clashes with anything placed inside it, so an open bay is built from side, top, bottom and back panels.
- **A draft PR cannot be merged.** Mark it ready for review first, then merge with the head SHA that was checked (`expectedHeadSha`), so a late push cannot slip in.
- **`mergeable_state: dirty` means a conflict.** Merge the base into the branch, keep both sides when both added a section, and commit the merge. Do not rebase a branch that has a PR open.

## Adventure Coaster Park (2026-11-02)

- **Gate every version block.** The first build ran every increment in every version (V05 had the same 141 objects as V01). Check the object count per version after the build; it must climb.
- **Round the height first, then the position.** A post centred at half of a rounded height dipped 0.0005 in below the ground and failed the bounds rule. Round the size, then place the centre at or above half of it.
- **A park needs its own world bounds.** The default world is 480 in across; a park of 600 ft needs a world file with bounds sized to it. Keep the rules in the world file, not the geometry.
- **Plan the capacity as a sum.** Capacity = seats × 3600 / dispatch interval; a ladder of rides with exact totals (250, 350, 450, 850, 1000) made the iterations easy to explain.

## Animation (round 7, 2026-11-02)

- **Make every motion loop by construction.** One loop length per file, and each motion repeats a whole number of times per loop. Then the last frame equals the first, and a test can prove it.
- **Make the first frame the rest pose.** Start the path at the model's position, with the tangent along the way the model faces, and use phases that are zero at the start. Then editing, IFC export and the still renders don't need a separate pose.
- **A swinging leg tilts the foot.** The heel corner digs into the ground. Turn the foot back at the ankle by the same angle, and dip the whole body by the hip-to-ankle drop, so one foot stays on the ground.
- **Groups need scene nodes for motion.** With every part loose in the scene, nothing can carry the banana with the hand. Nodes rest at identity, so still scenes render exactly as before.
- **Pinch on iPad: use touch events and block Safari's gesture events.** Pointer events can be cancelled when Safari takes the pinch for page zoom. Check headless with CDP `Input.dispatchTouchEvent` and two touch points.
- **A uniform Catmull-Rom curve bulges past sharp corners.** It was fine for an organic path; don't expect the curve's length to equal the polygon's.
- **"Not on the website" can mean "not merged".** GitHub Pages serves `main`; work on a pull request branch isn't live until it merges. Say so up front.
- **Sort by a stored date, not by build time.** Keep each scene's created and updated dates plus a content hash in a file the build maintains, so rebuilding changes nothing and only a real change moves a project to the top. Break ties by build order (later scenes are newer), not by name ("V16" sorts above "V2.5").

## Adventure Coaster Park, compact and animated (2026-11-02)

- **Give each motion its real anchor.** A path motion moves the target's pivot along the path, so the pivot must be the object's rest centre. A car drawn 2 ft above the rail needs a path 2 ft higher, or it drops onto the rail.
- **A rotating part needs a visible feature.** A flagpole spinning about its own axis shows nothing; the flag box has to hang off the pole and be the target.
- **Check motion numbers, not just the rest pose.** Run `poseAt` at a few times and check the values are finite and the targets move. A rest-pose render cannot show a path or a loop.
- **Units twice is a bug.** Dividing a path by 12 and then multiplying by 12 again leaves it in feet; check the first point of each path is in inches.

## Curves, physics speeds, shareable link (2026-11-02)

- **Closed splines pull their neighbours.** A closed Catmull-Rom through a lift top dragged the return leg underground. For a path with a straight return, use an open spline with doubled ends, then a straight line back.
- **Physics speed needs a time profile, not a speed.** The motion engine walks a path at constant speed by distance; a profile [[t, s]] maps loop time to distance, so a coaster can speed up on a drop and slow up a hill. The profile is checked by `checkMotion` like the rest of the file.
- **Let the loop length come from the ride.** Setting the loop to one real lap of the coaster keeps the speeds physical, and other rides can take their speed from it (Pip runs one lap per loop).

## Cars on the slope, faster rides, life in the park (2026-11-02)

- **A car that stays flat on a slope looks like it is flying.** Turning it only about Z is right on the flat, wrong on a drop. Give the path a 3-D tangent (yaw and pitch), and check the car's forward direction against the track tangent at many points.
- **Keep the crowd's loop, change the ride's share of it.** Other motions must share one loop, so make the ride a fraction of it and let it wait at the station for the rest. That gives a faster ride without changing the loop.
- **Check the rest pose is the identity.** If a motion's pose at its start is not the identity, the object jumps when the motion plays. Check it numerically.
- **Bounds checks need absolute positions.** A pose's translation is an offset from rest, so checking it against the world bounds gives false alarms. Use the pivot transformed by the pose.

## Hawk: closed meshes on a skeleton line, double-sided sheets (2026-11-02)

Jimmy's direction: the models so far were mostly polygon extrusions (boxes, cylinders, cones). Start exploring **closed meshes**, each set up with a **line** (a skeleton), so that animating gives more realistic components. Keep a place for **meshes that are truly thin** (leaves, grasses, flags), and make those **double sided**.

- **Closed mesh plus a line.** A `loft` is a smooth tube along a chain of joints, with cross-sections of any width and height and capped ends. The same line is the rig: a `bend` at joint k turns everything after it, so a wing flaps from the shoulder, folds at the elbow and wrist, and the surface stays smooth and joined. A stack of rotated boxes can only hinge at its seams.
- **Prove a mesh is closed with a number.** Every edge must belong to exactly two triangles, and the signed volume must be positive (negative means the faces point in). `meshStats` does both, and the test runs it on every part of the hawk.
- **Thin things are a different type, not a thin box.** A `sheet` is open, so it has edges and no volume, and it is drawn double sided (`THREE.DoubleSide`), so the back of a leaf or a flag is not invisible. It gets the same skeleton, so grass and flags bend, and an exemption from the minimum-dimension rule.
- **Parts that follow a joint need an `attach`.** Eyes, beak and tail are separate meshes, but ride a joint of the body skeleton, so the head dipping carries them. Without it each would need its own copy of the head motion.
- **Keyframes beat sine waves for a story.** Folding for the dive, flaring on the pull-out, dropping the feet: each happens once per loop. Eased `keys` that close back to their first value, plus an `envelope` for a flap that starts and stops, kept the loop closed.
- **Bank and pitch from the path, not from keys.** A flight frame (nose along the path, up axis leaning into the turn) gave banking and pitching for free. Keeping a floor on the up axis stops a bird rolling onto its back in a push-over.
- **First frame is the rest pose, again.** A sine with a phase is not zero at t = 0. Make each bend cancel its own offset, and let the envelope multiply the whole angle. The test caught a 17° wrist bend at the start.
- **Numbers found real faults.** Checking every vertex over the loop found a wing tip 0.7 in below the ground at the pull-out (the bank was too strong, and the path too low). Looking at one picture would not have shown it.
- **A tolerance for rounding.** Rounding sway angles to 0.01° left 0.009 in of pivot error. Round to 0.0001°, and test with 1e-3 in.
- **A rig test is a distance test.** "The talons reach the mouse" became "the closest talon is within 4 in" (it is 3.4 in). That told us the hawk skims over the mouse rather than touching it, which we state openly.
- **Look from where the action is.** The default camera frames the whole motion, so the dive was tiny. `--follow=<part>` in `render_models.js` keeps the hawk centred in each frame.
- **Shell habit.** Don't print every failing item from a loop; filter the output (one run printed 150 lines of grass).
- **`render_versions.js` no longer finds older versions.** The library folds versions into one row per project, so the old click-by-name script can't open V01 to V05. The shareable link `index.html?model=<id>` works for any version, so use `render_models.js`.

## Grand Ocean Aquarium (2026-11-02)

- **Glass blocks taps.** The picker used the nearest hit, so a glass wall in front of a fish selected the glass. Picking now skips anything with opacity under 0.4. Make see-through surfaces below that and anything meant to be selected above it.
- **Count objects early.** A fish with eyes, fins and a tail is 6 to 10 objects, so ten animals were already 100. Set the count per increment first, then choose how much detail each fish gets (detail level by version). Drop parts (a stalk, one eye) before dropping animals.
- **Moving thousands of parts cheaply.** A school is one group with a path motion, and its fish are plain children (a body and a tail). Each fish stays named and tappable, but only one motion runs per school.
- **First frame is the rest pose for every kind.** A swing starts mid-angle only at phase 0 or 0.5; a bob starts at 0 only at phase 0. Use phase 0 or 0.5 and vary the cycle count instead.
- **Compute the heading from the same points you write.** A rest heading worked out from feet, then rounded, left a 0.06 in jump at the first frame; take it from the inch points.
- **Seed every random choice by the object's key.** Then adding objects in a later increment never moves the ones in an earlier one.
- **Cone points along Z.** To point a cone or cylinder along X, set rotation_y = 90 (then rotation_z for the heading); check one of each animal in a small test scene before building many.
- **Tall walls hide the inside.** From the front, opaque gallery walls hid the benches and guests. Semi-transparent walls (opacity 0.5) keep them tappable and let the room show.

## Small test models and views, then compose (2026-11-02, Jimmy liked this)

- **Build the part on its own, look at it, then place it in the scene.** Before making dozens of fish, a scratch scene with one of each animal at two headings showed the shark tail floating off its body and the cone pointing the right way. Fix the part in the small model, then build the full scene.
- **Look from several views, not one.** The same scene from the front, from behind and from the side caught different things: walls hiding the benches (front), rooms and levels (behind), the sun and the beams (side). Name each view and keep its camera moves (zoom, drag) in a scratch script.
- **Check the motion at two times.** A render at t = 14 s and at t = 40 s shows things moved; a single frame cannot.
- **Keep the scratch tools outside the repo** (the scratchpad folder), and only commit the renders you chose.

## Hawk V07: making a flight look real (2026-11-02)

Jimmy's note on V06: too slow, too small, "too diagrammatic and not real enough (gravity, friction, air channel rising, bluff)". He wanted a faster, larger loop, several cycles, and more flapping when climbing.

- **Real means energy, not a chosen speed.** V06 picked a speed from height, which looked like a ride. V07 integrates d(v²/2)/ds = −g sin(slope) − k v² + thrust along the path. Gravity makes the stoop fast, drag caps it, the open wings brake the pull-out, and flapping is the only thing that adds energy on the way up. Each of the four things Jimmy named became a term or a visible object.
- **Close the loop by solving, not by hand.** Rising air holds the soaring speed; the thrust of the climb is found by bisection so the hawk reaches the bluff at exactly that speed. The lap closes with no speed jump, and a test reads the energy balance back from the saved profile.
- **Show the air.** Rising air that cannot be seen is invisible physics: thermal as spinning translucent bands over a warm patch, bluff wind as ribbons curling up the rock face. The hawk flaps where there is no lift and rests its wings where there is.
- **Scale the world, then scale gravity with it.** The arena is about a tenth of real size, so g is 150 in/s², not 386. Bank angle, speeds and the time to fall all use the same g, so a 40° bank at the thermal radius and a stoop of about 240 in/s are consistent.
- **Bank from the turn, then cap it.** A coordinated turn banked the inside wing tip 10 in below the ground during the skim. A roll cap that shrinks near the ground (`half_span`, `ground_z`) fixed it. The ground test (every vertex, over the loop) found it; a picture did not.
- **A joint at the rest pose needs a calm start.** The loop starts on a straight glide, so the flight frame at t = 0 (the rest pose) is level. Starting on a banked turn would put the hawk at a tilt in the first frame, or cancel the bank for the whole loop.
- **Off-by-one in a spline chain.** Two context points before the first control shifted every label by one segment, so the path folded back on itself at the join. The jump in the nose direction (2.3 rad between samples) is what showed it: sample the orientation densely and test the largest step.
- **Judge a turn rate, not a step.** A fixed limit per sample changes when the sampling does; a limit in rad/s (a pull-out is a few) does not.
- **Keep older versions byte-identical.** New materials went into a V07-only list, not the shared one, so the V01 to V06 files did not change.
- **Do not flap near the ground.** A big flap at 13 in altitude put a wing tip 10 in below the ground. Start flapping when the hawk has climbed clear.
- **Give the prey a story (V07, Jimmy: "let the mouse bolt for a hole").** The mouse is a group on a closed path with a time profile: still until the hawk flares in, a 0.35 s dash, a dive under the ground (z below the meadow top, so the ground hides it, with a dark hole and rim drawn over the entry), a long wait, then a slow walk home. A flat stretch in the profile is how a path motion waits. Keep the start of the path straight and collinear so the heading is exactly the rest pose; a curved start was 0.1 degrees off and failed the first-frame test.

## Solar System and linked views (2026-11-02)
- A world file must cover the whole scene. With the default world (±240 in), a solar system warned on about 550 objects. A separate `worlds/solar-system-world.json` (±800 in) cleared them. Check the warnings before calling a build done.
- Whole-number motion cycles: a loop closes only if every motion is a whole number of cycles. Real orbit ratios cannot all be whole, so speeds are stylised and the order is kept. Say so in the description.
- Retrograde spin cannot be expressed (cycles must be positive), so Venus and Pluto spin the normal way. Logged as a gap in the review set.
- Link tags stay on the object (`link:<id>[:zoom|:fade]`), not in the model format. Nothing in the schema changes, and the rules check ignores them.
- The library list shows only the latest version of each project; older versions fold under "versions". `render_versions.js` names must match the latest version. Render by `?model=<id>` (see the screenshot helper) when a version is not the latest.
- Object list labels carry the type ("Earthsphere"). Match them with a prefix, not an exact name.
- Gas-giant bands as stacked flat cylinders look stepped from close up. More bands (12+) or a true sphere-with-stripes primitive would fix it; not yet built.

## True orbits, one-shot timeline, date tracker (2026-11-02, round 9)
- A one-shot timeline is the honest pace for true orbits: integer loops force orbit ratios that are not real. `loop: false` lets cycles be fractional and negative (retrograde spins), at no cost to the other rules.
- Orbits from elements need a Kepler solver in the engine itself (not baked points), so the viewer, the build and the tests all share one formula (`orbitPosition`). Rest pose = position at u = 0, so the first frame matches the model.
- Earth's start longitude is a cheap check (about 40 degrees on 2 November); a wrong epoch shows up at once.
- Rotations compose Z then Y then X in the viewer. Surface features use rotation_y = 90 - lat and rotation_z = lon for a cylinder whose axis is z, which lays a disc on the surface at that latitude and longitude.
- Anything a planet's child must follow (a rocket on a pad, a storm on the Earth) must sit under the spinning body group, or it stays behind while the body turns.
- The world file must cover the whole timeline, not only the rest pose: Pluto's aphelion reaches about 942 in, and its tilt about 300 in up.
- Viewer tap targets: a button in the page is more reliable than a marker in 3-D space for "go back".

## Habitat, not a box (2026-11-02, Jimmy's note on the aquarium)

- **When Jimmy says a scene is too "set-like", change the container, not the contents.** The fish, kelp and rooms were fine; the glass rectangle was what read as a display. A lobed outline, rock walls hiding the glass, a rolling seabed and zones (kelp, reef, meadow, sand) turned it into a place. Redo the shell first, then populate it.
- **A polar outline gives you everything.** One function R(angle) gave the wall panels, the rock stations, the window arc, a depth-from-wall test, and a bounds check for swimmers. Define the shape once as a function and derive the rest.
- **Rejection-sample swim loops against the shape.** Try seeded loops until every sample point is far enough from the wall and the tunnel; it always finds one, and the test then proves it at many times.
- **Spheres on a floor must not sink below it.** Half-buried spheres hang under the model. Rest each sphere on the floor (centre at its radius) and make its radius the height you want, or the model shows pieces below the ground.
- **Opaque rock, transparent water.** Semi-transparent boulders look like bubbles; opaque ones look like stone. Keep the front as the only glass.
- **Copy the builders when you must not change the old versions.** The habitat copies the fish builder and species table instead of refactoring them, so Grand Ocean V01 to V06 stay byte-for-byte as reviewed.

## Not an extrusion (2026-11-02, Jimmy's note on the habitat)

- **A curved outline extruded straight up is still a box.** Add variation in height, not only in plan: a lean that changes with the angle (some stretches overhang), a floor with several levels, and space underneath. One lean function drove the rock, the rim and the glass tilt.
- **Space underneath is a room.** Raising a plateau 16 ft made a cavern worth a gallery. Put a glass wall at the plateau edge and the cavern looks into the deep basin.
- **Bridges go above the water; tunnels through it.** The bridge deck must be above the surface, and a tunnel through shallow water has to leave room above and below for the animals. Test both.
- **Prove the old increments did not change.** Hash the output of V01 to V04 before the change and compare after. A later version changes parts by `if (v >= N)`; it never edits the old path.
- **A test found what the render hid.** The first swimmer test failed on a school whose members crossed the plateau's vertical edge, because only the school's centre path had been checked. Check the spread of a group, not just its centre.
- **Make a cutaway for review.** Opaque rock hides the structure. A scene that leaves the front half out shows the levels and the cavern; keep it as a separate scene, not a change to the model.
- **Big scenes slow everything.** Every scene is in one bundle (now about 20 MB); renders time out. Time to split the bundle or load on demand.

- A sketch stroke often does not join at its ends. Measure the gap and the turn at the seam before using it as a closed path; a closed spline wraps the seam but keeps the corner. Smooth the points round the loop (Gaussian, a few points) and check the heading across the seam against the rest of the curve.
- A motion engine can read its rest heading from a coarser set of points than the stroke it came from. Turn the final points by the heading the engine reads from them, not the heading of the dense curve.
- The cloud's tag filter should not depend on the database's case-sensitive `contains`. Match tags in code when the user asks for case-insensitive tags.
- Visibility controls live in the model as `show:<label>` tags on group objects, not in the viewer. The viewer only reads them, so a saved model works the same in any viewer.

## Shaders, zoom-linked time, framing, 1958 start (round 10)
- Boxes of latitude and longitude make slabs; ellipses with soft edges and noise coasts look like land. Measure the covered share (the boxes covered 55% of the sphere; real land is about 29%) before judging a map by eye.
- A header change to an old scene changes its history file but not its geometry. Framing and the new materials were added to all planet views; geometry is unchanged. Note this if a version's history is compared later.
- A shader can only read what the header gives it: pass lists of numbers, not arrays of objects.
- Tracker steps must follow the camera, not only the animation: check the drum with the camera zoomed in and out, and check the playback speed by counting seconds of timeline per real second.
- Comets: take the mean anomaly from the perihelion time; from a longitude it is wrong for a body far from circular.

## Earth dot map, V21 (2026-11-02)

- **Use real data for the outline, and check it on known points.** Ellipses were a guess; the outline came from Natural Earth via npm, sampled at cell centres. Test a dozen known land and sea points before building on the mask.
- **Expect coastal points to fall a cell off.** At 5 degrees, a coastal city can land in the sea cell (Sydney, Tokyo). Say so in the review, rather than tuning the mask by hand.
- **An empty land list is not an ocean.** The shader's land noise still makes continents when no ellipses are given. A `no_land` flag turns the land off in the shader, so the dots carry all the land.
- **Keep a new material out of the shared list.** Adding the V21 sea to the shared material list changed the history of 25 older scenes, although their geometry was the same. Put it in the version's own header, and check `git status` after the build.
- **Rebuild dates after a revert.** A build that changed older files stamps new "updated" dates; restore the dates file from git and rebuild, so only the new scene's entry is added.
- **Antarctica needs a rule, not a polygon.** The outline did not fill the last rows over the pole; forcing latitudes below -80 to land (and to ice) was simpler and checked.
- **Azimuth sweeps beat the target aim.** `--target` did not aim at the land; a sweep of azimuths at the default framing showed the continents.

- A sheet cannot be cut, so holes in fabric are discs laid on the surface. Say so in the notes, not as holes.
- Keep bends as keyed angles that start at 0, shifted by the first key. A sine with a phase offset breaks the rest pose at the start of the loop.
- A "mean" check is needed when a motion's keys are offset: compare each key with the mean, not with the start.

## Earth V22: satellites, storms and rockets to scale (2026-11-02)

- **Pick the scale first, then state it.** One inch is about 670 km (Earth's radius is 9.5 in). Write the real size next to the model size for each part, so the exaggeration is visible.
- **Keep the real order of heights.** LEO < navigation < geostationary < the Moon, even when each is stretched. Orbit radii are set from that list.
- **The minimum-size rule is the honest check on tiny parts.** Satellites and rockets at real size would be invisible, and at 0.1 in they break the 0.25 in rule. The fix is an exaggeration, not a way round the rule: 262 warnings went to zero by raising the parts to 0.25 in.
- **An orbit line is a tube in a box.** The tube can be thin, but its bounding box must meet the minimum. Check the box, not the tube.
- **Turn a ring, not the satellite.** A group of satellites that turns about the ring's normal stays on its orbit, and its faded line stays still. Geostationary satellites turn once per Earth turn, so they stay over one spot.
- **A material name can collide with a built-in one.** The solar orbit lines already use `orbit`; the V22 line is `orbit22`, so older headers are not touched.
- **Check the key filters.** A test for "no V22 keys" matched `land-22`; match the V22 prefixes instead.
- **A merge can conflict after a merge is opened.** `main` moved while PR #65 was open: the conflicts were two additions in the notes and the viewer list, plus the generated bundle. Keep both sides, and rebuild the generated file rather than merge it by hand.
- **Look at the picture before the text.** The storm looked like a dome (2.6 in across), not the 1.3 in the header said. Measure the render, then correct the words.

## Earth V23: launches, deployment, mountain ranges (2026-11-02)

- **A closed loop cannot show a one-way event.** A satellite that is released and stays in orbit has no way back to its start, so the loop has to hide it (it drops into the planet and is hoisted back). Say so in the description, and ask Jimmy when the story can't close.
- **Rocket paths should follow the ground normal.** The old launches moved along an axis, which misses the real sites. A path of points along the normal keeps the rocket on its line on any site.
- **A profile is the fastest way to stage a launch.** Holding on the pad, climbing, and returning are one profile over the loop; the length of each leg comes from the polyline between marks.
- **Check the splash target against the land mask.** Both sea targets were tested before use.
- **Remove what the regex does not match.** A regex for the satellite bodies missed the new ones; checking the keys by name is simpler.
- **A stash can conflict with a moved main.** Resolve the generated bundle by rebuilding, and keep both sides of the scene list.


## Cornice, V01 to V04 (2026-11-03)

- **Look at a 3-D model from several sides.** The default camera looks down and hid the walls and the projection. A few orbit angles showed the sweep and the room layout at once.
- **Check the PR number before subscribing.** Subscribed to #82 when the new PR was #84, then had to undo it. Take the number from the create result.
- **Version guards keep old increments reproducible.** Blocks that a later increment replaces are `v >= N && v < M`, not deleted. Only the description of V02 changed, and it was reworded on purpose.
- **Sweep without a sweep object.** The engine has none. Straight pieces are single boxes; arc pieces are short boxes rotated about Z so their local x runs along the inward normal. `rotateVector` applies X, then Y, then Z, so a plan angle belongs in `rotation_z`.
- **Half scale is one number.** Change the scale constant and derive every height from it (profile height, envelope, zBase), and the walls stay put.

## Solar System V08 (2026-11-04)

- Published orbit elements for the dwarf planets are scattered: the search gave a, e and period, but not mean anomaly, inclination or node. Mark each value's source, and use a labelled placeholder rather than guessing a starting place.
- The build's rules check on the full bundle takes several minutes. Run `node tools/build_samples.js` in the background and wait on its process, not by polling.
- The render tool finds a scene through its project row in the library, which shows only the latest version label. Pass the project name ("Solar System"), not the full version name.
