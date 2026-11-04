# Make 3D — Convo v0.6

**Project:** Make 3D
**Round:** 6. Answers on the 3-D export (E1–E2 from convo v0.4). Earlier rounds are kept unchanged.

## Decisions (from Jimmy)

1. **Format: IFC.** Fine with IFC as the export format for Revit.
2. **Units: not a concern.** The export must come into Revit at the right real-world scale. How the file stores units is left to the exporter (it converts from inches once, in one place).
3. **Up is up.** No need to think about the axes. The exported file must stand upright in Revit. (Z-up is the IFC and Revit convention, so the export keeps Z up. The viewer's Y-up toggle stays a viewer-only setting.)
4. **Revit use: import as a family for design.** The object should arrive in Revit as a placeable family or element for design. It does not need to be editable, resizable or parametric yet.
5. **Future.** Editable, resizable and parametric families go on the to-do list for later.

## Notes for the build (not questions)

- Revit's IFC import creates placeable elements, not native `.rfa` family files. If Jimmy later needs a true `.rfa` family with parameters, that is a separate step (Dynamo or the Revit API). Logged as a future item.
- Exporter: `js/core/export_ifc.js`, a pure function next to `io.js`, with a test in `tests/`.

## Open (one question)

A. **Is a placeable IFC element enough for "family for design" in Revit, or do you need a `.rfa` family file now?** Proposed: IFC now; `.rfa` later.
