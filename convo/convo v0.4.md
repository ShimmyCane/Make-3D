# Make 3D — Convo v0.4

**Project:** Make 3D
**Round:** 4. Jimmy's notes after opening the MVP on iPad. Designs only, nothing built yet. `convo v0.3.md` is still open.

Keep real project names, clients and addresses out of this file (public repo).

## What you said

- Keep: the title, the three panels (model, objects, view), add-or-paste, the library, the settings button. Three scenes are fine.
- Done in this round: paste is now the left tab and the default. The step counter (`v26 / 27`) is gone; the model check is what is useful. The settings button is one gear, not a circle with a gear inside.
- Future: tag scenes the way Quick Detail details are tagged.
- Use: a quick image of a scene as a background to sketch over in Quick Detail. Export into a 3D format you can bring into Revit or other 3D software as a family or block. Annotate and send to someone as a concept, a grasp of an idea in 3D.
- Annotation, the way Sketchfab does it: pick a point on an object, a dot appears there, and a text label with an arrow floats in space. The text stays legible as the scene rotates.
- Panels can be minimised (model, objects).
- The save should be automatic, to the cloud, so the file is always there. Undo lasts only for the session. Delete an annotation as you delete an object.
- Part annotations, too.
- Groups: drag objects into groups. Keep it as an option, even if it can break things.
- Visibility for presenting: turning a group off hides its contents. An image export leaves hidden things out. A 3D export keeps them but flags them as hidden, or leaves them out. You haven't decided which.

## Questions

**Annotations**

A1. **Anchor.** Click a surface and the anchor snaps to the first surface the camera sees (recommended), with the option to pick a different face? Or the centre of the nearest object?

A2. **Label placement.** Drag the label out to a distance, then the label stays screen-facing (always readable) and the leader line runs back to the anchor. Is that what you picture? (Recommended.)

A3. **Text legibility.** Labels get a paper-coloured backing and a fixed screen size, so they stay readable when the model is far away. Agree?

A4. **Kinds of annotation.** Free-floating (a note in space), attached to an object (follows it when it moves), or both?

A5. **Undo.** Session only. Does it cover annotation edits only, or also model edits? (Recommended: annotation edits only, since model edits already have history.)

A6. **Autosave.** Each annotation saves to the cloud on its own, so you never press save. Offline edits wait and send when you're back online. Agree?

**Groups and visibility**

G1. **Moving into groups.** Dragging an object onto a group sets its parent in history, so the move is recorded and can be undone like any other change. Agree? Are groups allowed inside groups?

G2. **Hidden groups.** Hiding a group hides everything inside it. Recommended: a hidden flag, not deletion, so you can show it again.

G3. **Image export.** Excludes anything hidden. Agree?

G4. **3-D export.** Hidden items: (a) included, marked hidden; (b) left out. Recommended: (a), so the file keeps the whole model and whoever opens it can see what was hidden.

**Export targets**

E1. **Which software is the first target?** Revit, SketchUp, or a general format that most tools open (glTF / OBJ)?

E2. **Revit specifics.** Revit doesn't import a plain 3D mesh as a family. Families are built inside Revit, so the realistic route is a DWG or DXF import, or an FBX or OBJ file that you then model over. Is that enough, or do you want the family built properly with real parameters later?

E3. **Background image for Quick Detail.** A PNG of one view, at the paper size and scale you set? With or without the grid and ground?

**Sharing**

S1. **Presenting.** Do you want a link to a read-only view of a scene (like a Sketchfab page) later? Or only files?

S2. **Tags on scenes** (future, as you said). What would the tags do: filter the library only, or also control which scenes appear in the Quick Detail background list?
