# Model iteration: lessons for any 3-D model or scene

Written 2026-11-18 from the Make 3D x Construct camp-move diorama (rounds 1 to 6). Each lesson names the mistake that taught it. Apply these before every scene change; add to them after each round.

## Before you build

- **Check scale against real sizes first.** At 1 in = 2 ft, a 5 ft horse is 2.5 in at the shoulder. Our horses were 11 ft and our people 12 ft, and the viewer read the horses as bison. Write each object's real size in the brief, then halve it.
- **Decide the planes.** Foreground, midground, background. Give each its own detail budget before adding parts.
- **Keep filler out.** A new object needs a reason the scene needs it. "Density" means more real parts in the objects that already exist, unless the owner asks for new objects. Round 4 added grass, scrub, stones and a creek that nobody asked for, and had to be rolled back.

## Build each object from parts

- **A single block is not the object.** A lodge is a cover, four poles and a door. A horse is a barrel, a neck, a head, ears, a tail and four legs. A person is a torso, arms, hands, legs, feet and a head, in a pose.
- **Give the parts their real attitude.** Poles lean in to meet at the top; the neck tilts; the walking figure has one leg forward. A part that is only upright reads as a stick.
- **Rotate about the part's own centre**, and check that the rotation is carried through the build (the first build dropped `rotation_y` silently, so every tilted part stood upright).

## Check after every change

- **Run the tests, then the build, then the picture.** The tests pass with a blank viewer. The build can pass with a story that points at a missing object (the build caught it). The picture caught a bluff that hid the bones, and a skirt that hid the feet.
- **Render the whole scene and at least two close-ups** of each object type you changed. Start the close-up from a readable angle: a close-up from behind the scene showed the wrong thing twice.
- **Check overlaps.** A new part placed inside an old one is invisible from the default view. Our bones sat inside the bluff's base box; the bluff also overlapped the lodges, which was an error from an earlier round too.
- **Check that the story and the flags point at real things.** A link to a removed object should fail the build, not show up later in the page.
- **Check the full path of each field.** A field that the build does not copy (rotation) is lost without an error. Compare one object in the source file with the same object in the model file.

## Browser checks catch what unit tests miss

- **A view that renders only at load is blank after the first change.** The viewer drew once, before the model existed. Render after every model set.
- **A number input with `step="0.1"` blocks a value of 3.25 without a message.** Use `step="any"` for measured values.
- **A drawer whose children shrink overlaps itself and cannot scroll.** Keep the children at their own height and let the container scroll.
- **Run the browser test after any page change**, and count the console errors.

## Keep the iteration honest

- **Number the versions and say what changed.** Each round has a convo entry: what the owner said, what was built, what was not done, and the questions.
- **Write the decision down when you do not follow a request.** Round 6: faces were not added to figures of a real people, in a public draft. The reason and three options went into the convo, so the owner can choose.
- **Keep placeholders labelled and phase them out in order.** A placeholder has a low certainty and an open flag. Replace it only when the owner asks, and when the reason to show it is in place.
- **Regenerate line-number references** (the summary page) after the files change. Stale numbers are worse than none.

## Reference

- Scene craft (planes, depth cues, lighting, sources): `04 AI/scene_craft_lessons.md`.
- Make 3D general lessons: `04 AI/lessons.md`.
