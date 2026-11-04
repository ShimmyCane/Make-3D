# Make 3D — Convo v0.2

**Project:** Make 3D
**Round:** 2. Jimmy's answers to `convo v0.1.md`, recorded here. v0.1 is kept unchanged.
**Key:** ✅ answered · 🔁 answered, marked future · 🚩 open, Claude's recommendation below · ❓ new question for Jimmy

Keep real project names, clients and addresses out of this file (public repo).

## A. Who and where

1. ✅ **Who it's for:** myself and my family. Models use the architecture database's table of components (see section H).
2. ✅ **Devices:** iPad and iPhone. Touch first.
   - *Recommendation:* the viewer is touch-first from v0.2: one-finger orbit, two-finger pan and pinch zoom, and a bottom bar of large buttons (48–68 px, per the iPad rule). Desktop works with the same controls.
3. ✅ **Test models.** Three were named. Only the first is in the MVP.
   - **MVP test model 1: garden planter.** A cute planter with snap peas and lettuce sprouts. Sunny, mature plants and a surrounding scene.
   - 🔁 **Future 2: outdoor table.** A 3 ft × 7 ft top on a yellow metal frame, with a branching, reaching bonsai-style tree and an umbrella with three canopies (one centre, two sides) for broad shade.
   - 🔁 **Future 3: kitchen.** A walk-in kitchen. Entering from the left: fridge, counter, stove. In front, a corner counter with a large triple sink and two faucets. On the right, a gap for a dishwasher, then a run of drawers and doors. Upper cabinets with a sliding acrylic display for cups over the sink.
   - ✅ **Jimmy:** the "meats" note is withdrawn; the planter has no third plant for now. Table size 3 ft × 7 ft stands as written.

## B. The model file

4. ✅ **Up axis:** files are Z-up. A **setting** switches the viewer to Y-up for models made that way.
5. ✅ **Position.** `position` is the centre of the object's **bounding box**, and the object's origin is that centre (not the base). Also:
   - ✅ **Ground plane:** a toggle shows a ground plane, with a vertical slider to move it up and down. It is opaque, double-sided and green, and it clips the model so the object appears to sit on it. It is large but finite.
   - *Recommendation:* the ground is a viewer aid, not part of the model. It is never stored in `model.json`.
   - 🔁 **Jimmy (Q-B): use a weighted bounding box.**
     - Use the **major bounding box**: the box around the bulk of the elements. If most of the elements are far smaller than the full box, the calculation is refined with a weighting. If not, the major box is used.
     - Big features such as a spire or a wing still count in the overall extent, but the origin stays with the majority of the objects.
     - *Claude's reading, to check in v0.3:* "70% significantly different" is the trigger. The threshold for "significantly different" is not yet defined. See v0.3 Q1–Q2.
6. ✅🔁 **Rotation:** about the **Y axis only** for now. Other axes are future.
7. ✅ **IDs:** a permanent `uuid` plus a readable `name` you can rename, and a **`description`** (free text). For example, "sits on the floor", "special table, floats 5 ft in the air".
8. ✅ **Parent:** yes, in v0.1 (a simple `parent` field, shown as a tree).
9. 🔁 **Materials and textures:** future. Later there will be a toggle to turn textures on or off.
   - ✅ **Rule for the file format:** the model never contains images, image mapping or baked textures. Materials stay as named references.

## C. History

10. 🚩 **Source of truth.** Jimmy asked for a recommendation.
    - **Recommendation: `history.json` is the truth.** It is an ordered list of operations, and `model.json` is the replayed result, kept for speed. Any mismatch is a visible error, and the viewer can step back to any version.
    - *Why:* it matches your "record changes, don't overwrite" rule, and the viewer's scrub-back needs it anyway. Cost: replay on load (small for these models).
    - *Reconsider if:* models grow large enough that replay is slow. Then `model.json` could become the truth with history as an audit log.
    - ✅ **Jimmy: "Ok".** Accepted as recommended.
11. 🔁 **Author and note per operation:** future. The **model description** is written up front in the side bar's info panel (name, description, author, date).

## D. World and rules

12. ✅ **Rules for v0.5:** no extra rules for now. Start with the five: bounds, overlap, minimum dimension, missing geometry, invalid coordinates.
13. ✅ **Overlap is a world rule, off by default.**
    - By default, overlap is **allowed**. Quick, rough modelling needs it. Physics-based work needs a check.
    - The world file has an overlap rule that Jimmy can turn on. When it's on, a **model check** raises a flag. It is not run on every edit.
    - *Recommendation:* in the world file, `overlap` takes `"mode": "allow" | "flag"`. The default is `"allow"`.
    - **Method:** bounding boxes first, as proposed.
14. 🔁 **Worlds and blocks:** several models can link to each other through **blocks** (future). Each model names its world.
15. ✅ **On reject:** the operation is not applied, and the editor stays open so Jimmy can fix it. The rejected objects are listed with reasons, and there are two extra actions:
    - **Delete** one or more of the offending objects, then re-apply, so Jimmy can see the overall result (a minor element may be the cause).
    - **Preview anyway:** show the result without saving it. *(Recommendation; not stated by Jimmy, so please confirm.)*

## E. Editing and storage

16. ✅ **Editing:** a and c for v0.3 (a form, and paste a JSON operation). b (drag handles) is future.
    - Repairs are done by **deleting** the element and adding it again, not by small edits.
    - 🔁 **Future:** rebuild a component separately (for example a piece of scientific gear), then **import it as a block**.
    - ✅ **Jimmy: "A and C".** Confirmed for v0.3.
17. ✅ **Storage:** local and cloud. The cloud copy goes in the **architecture database** (Supabase). This replaces "no Supabase" in the earlier draft.
    - *Recommendation:* tables prefixed `m3d_`, registered in `table_index`, with row-level security on, following the Shimmy Specs pattern. The cloud copy comes in v0.4, not in the first build.
18. ✅ **Three.js:** a local copy in the project folder.

## F. Viewer details

19. 🔁 **Walk mode:** future.
20. 🔁 **Section planes:** future.
21. 🔁 **Measure:** future.
22. ✅ **MVP = v0.1–v0.6.** Within the viewer, only **rotating (orbit) and zoom** are needed for the MVP. Everything else in §F is future.
    - Also in the MVP: the Y-up toggle (Q4) and the ground plane (Q5), since you asked for them.

## G. Scope and name

23. ✅ **Drawings are drawn in the app.** No DXF, PDF or SVG import. The process is tuned for hand drawing, and for LLM-generated JSON.
    - Note: Quick Detail is already a 2D sketching app in this nursery with a sheet, pen strokes, dimensions and hatches, and its own cloud copy. The Make 3D drawing step can reuse its patterns (see §I).
24. ✅ **Name:** Make 3D.

## H. Look and feel (new)

- Visual reference: **Quick Detail**. Its paper and ink look is the basis for Make 3D's style.
  - Palette: paper `#fbf6ea`, panel `#fffdf8`, ink `#2d2a26`, muted `#6f685f`, with pastel accents mint `#d9f1ea`, sage `#dfeadf`, sky `#dbe7f6`, peach `#fde3cf`, butter `#fff1b8`.
  - Lines: 2.5 px solid ink borders. Side bar and panels as in Quick Detail's CSS.
- ✅ **Jimmy: "Accept and further adapt as needed".** Adopt the Quick Detail look, with the iPad rules from `ipad_website.md` (gear in the lower right, big buttons). Fonts are not yet checked. Quick Detail's viewer uses the system font.
- ✅ **Jimmy: "Ok"** to the Quick Detail look (not the family look).

## I. Reuse from Quick Detail (for Claude, not a question)

- Single source of truth for drawing: one list of primitives in real units, from which every output is made (its lesson 12).
- Record relationships when they're created, not guessed later (its lesson 13).
- Keep the pure logic in plain JavaScript that runs in Node, with tests in `tests/`, as Quick Detail does.
- Its `docs/code-map` pattern is worth copying once the code exists.
- Quick Detail's cloud copy is a precedent for the `m3d_` tables (§E, Q17).

## J. Units display

- ✅ **Jimmy: "Please use imperial dimensions".** Read as: the files store inches, and the display is feet and inches. Confirm the storage choice in v0.3 Q3.
