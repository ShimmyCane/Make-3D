# Make 3D — Convo v0.7

**Project:** Make 3D
**Round:** 7. Animation: adding motion to scenes that are static now. Earlier rounds are kept unchanged.

## Background

The viewer already redraws every frame (`requestAnimationFrame` in `js/viewer/viewer.js`), but nothing moves between frames. Animation needs three things the viewer doesn't have yet:

1. A **clock** (play, pause, scrub, reset).
2. A **description of motion** as data, so the viewer only reads it and never changes the model.
3. **Groups and pivots in the scene.** Groups are not scene nodes today (every part is loose), and parts only rotate about their own centres. A leg swings from the hip, and a banana must travel with the hand.

## Decisions (from Jimmy)

1. **First test scene: a robot holding a banana, walking along a curved path.**
2. **Motion is a separate file** (`motion.json`), next to `model.json`, `history.json` and `world.json`.
3. **Autoplay twice, then pause.** When a scene opens, the animation plays two times by itself, then stops and waits for ▶.
4. **Interaction is future.** Once an animation plays, you can tap something to start another motion. Example: tap the door, the door opens, then a cuckoo bird comes out. Not built now, but the motion format leaves room for it (`start` and `then`, below).

## What this means for the build (notes, not questions)

- **Motion is a fourth file.** Model = what exists, rules = what is allowed, history = how it was made, **motion = how it moves**. It refers to parts by `uuid`, so it survives edits to the model. If a target is deleted, the motion check warns; nothing is deleted automatically.
- **Bundles** (save, load, cloud) carry `motion` as an optional fourth part. Scenes without it still load.
- **Robot walk = several motions on groups:**
  - `path`: the whole robot follows a curve on the ground and turns to face the way it is going.
  - `swing`: left and right legs from the hips, half a step apart; arms from the shoulders, opposite to the legs.
  - `bob`: the body rises a little on each step.
  - The banana is a child of the hand group, so it travels with the hand without a motion of its own.
- **Step timing follows the walking speed** (one stride length per leg cycle), so the feet don't slide.
- **IFC export and renders** use the resting pose unless a time is given.

## Open questions

A. **Path shape.** Proposed: an S-curve about 12 ft long on the ground. At the end of each play the robot jumps back to the start. Alternative: a closed loop (an oval or a figure eight), so it walks round and round with no jump. Which one?

   **Jimmy:** Animations should always be loops. The path should be organic, with some turns, but still close on itself.

B. **Robot look.** Proposed: a toy robot about 3 ft tall, made of boxes and cylinders: box head with round eyes and an antenna, box body, cylinder arms and legs, box feet. The banana is a curved row of short tilted cylinders, yellow with a brown tip. Colours from the pastel palette. OK?

   **Jimmy:** OK.

C. **Length of one play.** Proposed: about 8 seconds from start to end of the path. Then a pause of about 1 second, the second play, and stop.

   **Jimmy:** Adjust the length as necessary, but the animation should always be a full loop.

D. **Controls.** Proposed: ▶/⏸ and ⟲ (back to start), plus a time slider, in a small bar under the scene. Speed (½×, 1×, 2×) and "autoplay on open" go in ⚙️. OK?

   **Jimmy:** OK.

## Also asked (Jimmy, same review)

E. **Two-finger pinch to zoom in and out on the 3-D canvas.**

## Built from these answers

- **Every animation is a loop.** The motion file has one `loop_s`; each motion repeats a whole number of times per loop (`cycles`), so the last frame flows into the first. The check rejects a motion that would not close.
- **Path:** a winding closed loop of ten points through stepping stones, about 33 ft round, smoothed into a curve. The robot walks it at a steady speed and turns to face the way it goes.
- **Length:** 18 seconds a lap (18 strides of about 22 in). The steps are timed to the walk, the feet turn back at the ankle to stay flat, and the robot dips while its legs are spread, so a foot stays on the ground.
- **Autoplay:** plays the loop twice, then pauses at the start pose. ▶ then plays on until paused.
- **Pinch:** two fingers apart zoom in, together zoom out. One finger still orbits, a tap still selects, and the page itself no longer zooms when you pinch the canvas.

## Later in round 7 (Jimmy)

F. **"I don't see the robot on the website."** The live site is published from `main`, and this work is still on the pull request branch, so it appears once the pull request is merged. In the Library it was also last of 42 scenes.

G. **Projects with lots of increments should fold up**, so the list is easy to sort and scroll.

H. **For now, sort by latest created**, so a project jumps to the top when one of its increments changes.

Built: the Library shows one row per project, most recently changed first. The row opens the newest version; a count button (for example "21 ▾") unfolds the older versions, newest first. The ⚙️ Sample list is grouped the same way. Dates live in `models/scene_dates.json`: a new scene takes its dates from git, and the build sets "updated" to now whenever a scene's history or motion changes.
