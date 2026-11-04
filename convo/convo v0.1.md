# Make 3D — Convo v0.1

**Project:** Make 3D
**Round:** 1 of clarifying questions (started by `/start-project`)

Answer inline under each number. Leave one blank if you don't know yet. Where I've put **Proposed:**, a short "ok" is enough. Keep real project names, clients and addresses out of this file (public repo).

## What you said (summary)

- Build a little browser 3D engine first: orbit / pan / zoom, perspective and orthographic, wireframe / solid / textured, lights, scene hierarchy (select, hide, isolate), section planes, walk-through, PNG export. Rendered from JSON.
- Three.js + plain JS + JSON on GitHub Pages. No backend, no database, no subscription, no LLM.
- **The JSON is the model**, not a one-time description. New objects are appended with their own IDs; nothing is regenerated. Keep a separate change history so earlier versions can be rebuilt.
- **The world is a separate JSON** with units, axes, gravity and configurable rules. Outcomes: accept, accept with warnings, reject. Overlap is not automatically an error (Lego bricks interlock).
- **Drawings are another model input** later: `drawing.json` (meaning) + `drawing.png` (evidence) → a deterministic generator → `geometry.json`. Three views can be ambiguous; keep the uncertainty instead of inventing geometry.
- Four engines: input, geometry, rules, viewer.
- Roadmap v0.1 load + render → v0.2 viewer → v0.3 add/modify/delete → v0.4 save/reload → v0.5 rules → v0.6 append instructions + history → v0.7 import → v0.8 three-view drawings.
- Decide the JSON schema and the rules for adding to it before writing code.

## A. Who and where

1. **Who is it for?** You as an architect (walls, details, assemblies), the kids (Lego-style building), or both? This decides the look: your pastel iPad style, or a calmer desktop tool look like Shimmy Specs.

2. **Main device:** desktop with mouse and keyboard, iPad touch, or both equally? Walk mode and gizmos work very differently on touch.

3. **First test models:** which three should the MVP ship with? **Proposed:** a table (box + four legs, your example), a 2×4 brick, and a short wall with a window opening.

## B. The model file

4. **Up axis.** Rhino and Revit are Z-up; Three.js is Y-up. **Proposed:** the files are Z-up, right-handed, in mm (as in your world example); the viewer converts and the file never sees Three.js axes.

5. **Where is an object's position?** **Proposed:** `position` is the object's own origin; for a box that is the **centre of the bottom face** (so a box at z=0 sits on the ground), for a cylinder the centre of its base. Alternative: the geometric centre (Three.js default) or a min corner (like drawing a rectangle from a corner).

6. **Rotation.** **Proposed:** degrees, `[rx, ry, rz]` applied in Z-Y-X order about the object's origin. Fine, or do you only need rotation about Z for now?

7. **IDs.** Your example uses readable IDs (`base-001`). **Proposed:** every object has both: a permanent `uuid` that never changes and a readable `name` you can rename. References between objects use the uuid. Or do you prefer readable IDs only?

8. **Groups and assemblies.** Should v0.1 already allow a `parent` (e.g. four legs inside "table")? **Proposed:** yes, a simple `parent` field; the hierarchy panel shows the tree.

9. **Materials.** **Proposed:** a small named material list in the model (`oak`, `steel`, `brick-red`), each a colour + opacity; objects point to one. Real textures ("textured view") later. Does that cover your "textured" toggle for now?

## C. History

10. **Which is the source of truth?** **Proposed:** `history.json` (an ordered list of operations: add, modify, delete, each with time, author and note) is the truth; `model.json` is the result of replaying it, saved alongside for speed. The viewer can scrub back to any step. Or do you want `model.json` to be the truth and history just a log?

11. **Author and note per operation:** who writes them in the MVP? **Proposed:** a free-text `author` (you, "chat", "import") and an optional `note` ("added legs per sketch 3").

## D. World and rules

12. **First rules for v0.5:** your list is bounds, overlap, minimum dimension, missing geometry, invalid coordinates. Any others you want early (e.g. "must rest on something" using gravity, maximum dimension, allowed types)?

13. **Overlap check.** **Proposed:** first version uses bounding boxes (fast, exact for unrotated boxes, rough for rotated ones and cylinders); objects can mark each other as `allowed_overlap` (the Lego case). Exact solid checks wait for a CAD kernel. OK?

14. **One world per model, or shared worlds?** **Proposed:** a model names its world (`"world": "default-world"`), and several models can share one.

15. **What happens on reject?** **Proposed:** the operation is not applied, it is listed in the results panel with the reason, and the model stays as it was.

## E. Editing and storage

16. **How do you want to add and edit objects in v0.3?** (pick or rank)
    - a) A form: pick a type, type the numbers.
    - b) Drag handles in 3D (move / rotate / scale gizmo).
    - c) A JSON text box: paste an operation (for example from a chat with an LLM) and apply it.
    **Proposed:** a + c first, b later.

17. **Where do models live?** **Proposed:** sample models in a `models/` folder in the project (loaded by URL); your own work opened from and saved to files on your computer (download / upload); the last session autosaved in the browser. No Supabase. OK?

18. **Three.js hosting.** **Proposed:** keep a copy of Three.js inside the project folder (works offline, never breaks when a CDN changes) rather than loading it from the internet.

## F. Viewer details

19. **Walk mode:** **Proposed:** eye height 1600 mm, WASD + mouse look on desktop; on iPad a joystick on screen. Fine, or desktop only for now?

20. **Section planes:** one plane per axis with a slider, or a section box (six faces), or both? **Proposed:** a section box, because it does both jobs.

21. **Dimensions in the viewer:** do you want to click two points and read a distance in v0.2? (Useful for checking a model against a drawing.)

## G. Scope

22. **Where does the MVP stop?** **Proposed:** MVP = v0.1–v0.6 (render, viewer, edit, save, rules, history). v0.7 import and v0.8 drawings are the next phase.

23. **Drawing pipeline, looking ahead:** will the drawings be drawn in the app (a 2D editor), imported (DXF/SVG/PDF), or photos of hand sketches? This doesn't change the MVP, but it shapes how `drawing.json` is named now.

24. **Name:** "Make 3D" for the folder and page title, or something else?
