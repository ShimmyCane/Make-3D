// Cornice profile in two rooms: a museum (24 ft wall, 14 ft picture) and a small home (9 ft wall), side by side.
// Source: Quick Detail "Profile for Cornice" (sketch_details 5b87bdcb-9cac-452b-b70d-1fb0e0031e9f, tags make3d),
// 3"=1'-0". Read 2026-11-03. Seven strokes: three closed outlines (the big "package" 8'-1", steps 1'-8 9/16"
// and 1'-4 5/16"), three freehand curves and a line. The curves and line are not modelled (see below).
//
// Sizes in inches, Z up, ground z = 0. Walls are 6 in thick. The two rooms share one wall (x = 0 to 6).
//   Museum: x -360 to 0 (30 ft), y -120 to 120 (20 ft), walls to 288 in (24 ft). Picture on the far wall.
//   Home:   x 6 to 180, y -120 to 120, walls to 108 in (9 ft).
// Each room has one person. They stand back to back across the shared wall, each facing away from it.
//
// Scale (estimate): one sketch unit = S inches. S is set by the labelled 8'-1" outline: 97 in over its
// 25.59-unit height. The sketch's other labels (for example 11 1/4" for the "tall thin step") would give a
// different scale (about 4 in per unit), so this is an estimate. Confirm with Jimmy.
//
// How the profile becomes solid: the schema has boxes, cylinders, spheres, cones and skeleton meshes, but no
// extruded outline. Each closed outline is cut into horizontal slices, one sketch unit tall. Each slice is a
// box as wide as the outline is at that height (its leftmost and rightmost points). Concave notches are
// filled in. The profile is extruded along each wall. Freehand curves and the line are not included.
//
// Increments (defsFor(v)):
//   V01 blockout: rooms, people, picture, lamps, and the cornice as one box (its bounding box). v < 2.
//   V02 profile:  the traced profile on the back wall of each room, base down, projecting into the room. v === 2.
//   V03 cutaway:  the near side walls (y = +120) are cut away so the rooms can be seen inside. Each room
//                 has the cornice on three walls: the back wall (picture wall or far wall), the left side wall
//                 (y = -120) and the shared wall. The profile is flipped, shelf at the top of the wall, so it
//                 projects into the room and the thin fin hangs down the wall. v >= 3.

const WORLD_ID = 'default-world';
const S = 3.79;          // inches per sketch unit (estimate, see above)
const REF_X = 1.53;      // sketch x at the wall face (the thin fin sits on the wall)
const LEN = 240;         // cornice length along a 20 ft wall

// Outline slices from the sketch: [band, xmin, xmax], band = floor(y), in sketch units.
const PROFILE = { ymin: -13.5483, ymax: 12.0457, rows: [
  [-14, 7.25, 23.23], [-13, 0.30, 21.68], [-12, 0.52, 1.80], [-11, 0.57, 1.80], [-10, 0.68, 1.80],
  [-9, 0.73, 1.80], [-8, 0.78, 1.69], [-7, 0.89, 1.69], [-6, 1.05, 1.64], [-5, 1.27, 1.64],
  [-4, 1.59, 1.64], [-3, 1.59, 1.69], [-2, 1.53, 1.85], [-1, 1.53, 1.85], [0, 1.53, 1.85],
  [1, 1.85, 1.85], [2, 1.53, 1.85], [3, 1.53, 1.91], [4, 1.53, 1.91], [5, 1.53, 1.91],
  [6, 1.53, 1.91], [7, 1.64, 1.91], [8, 1.91, 1.91], [9, 1.75, 1.91], [10, 1.91, 1.91],
  [11, 1.91, 1.91], [12, 1.91, 1.91],
] };
// Step 1'-8 9/16": a block at the foot of the profile, out to x = 22.2.
const STEP_A = { ymin: -12.8079, ymax: -7.1592, rows: [
  [-13, 21.77, 22.21], [-12, 21.77, 22.13], [-11, 21.85, 22.01], [-10, 21.38, 22.01],
  [-9, 20.11, 21.69], [-8, 15.65, 20.03],
] };
// Step 1'-4 5/16": a smaller block above it, out to x = 16.3.
const STEP_B = { ymin: -7.7523, ymax: -2.0972, rows: [
  [-8, 13.18, 16.29], [-7, 12.31, 16.00], [-6, 11.88, 12.89], [-5, 11.69, 12.22],
  [-4, 11.69, 11.88], [-3, 11.69, 11.79],
] };
const PROFILE_H = (PROFILE.ymax - PROFILE.ymin) * S;   // 97 in
const ENVELOPE_W = (23.23 - REF_X) * S;                // 82 in out from the wall

// Room geometry (absolute)
const MUSEUM = { wallX: -360, dir: 1, top: 288, zBase: 288 - PROFILE_H };   // wall face at x = -360
const HOME = { wallX: 180, dir: -1, top: 108, zBase: 108 - PROFILE_H };     // wall face at x = 180

const MATERIALS = {
  wall: { color: '#f4efe4', opacity: 1 },
  floor: { color: '#c9b89a', opacity: 1 },
  cornice: { color: '#f0d9a8', opacity: 1 },
  step: { color: '#e8c27a', opacity: 1 },
  envelope: { color: '#f0d9a8', opacity: 0.35 },
  frame: { color: '#7a5a3a', opacity: 1 },
  canvas: { color: '#9fc5e8', opacity: 1 },
  lamp: { color: '#fff2a8', opacity: 1 },
  shirt: { color: '#7fb3d5', opacity: 1 },
  pants: { color: '#3c4a5c', opacity: 1 },
  skin: { color: '#e8b894', opacity: 1 },
  ink: { color: '#2d2a26', opacity: 1 },
};

// One person, 6 ft tall, facing +X (facing = 1) or -X (facing = -1). Parts are absolute positions.
function person(tag, label, xc, facing) {
  const e = xc + facing * 5.2; // eyes on the front of the head
  return [
    [tag, { name: `${label} person`, type: 'group', dimensions: [], position: [0, 0, 0] }],
    [`${tag}-legL`, { name: 'Left leg', type: 'box', dimensions: [4, 5, 30], position: [xc, -3.5, 15], material: 'pants', parent: tag }],
    [`${tag}-legR`, { name: 'Right leg', type: 'box', dimensions: [4, 5, 30], position: [xc, 3.5, 15], material: 'pants', parent: tag }],
    [`${tag}-torso`, { name: 'Torso', type: 'box', dimensions: [8, 16, 26], position: [xc, 0, 43], material: 'shirt', parent: tag }],
    [`${tag}-armL`, { name: 'Left arm', type: 'box', dimensions: [3, 3, 24], position: [xc, -9.5, 42], material: 'shirt', parent: tag }],
    [`${tag}-armR`, { name: 'Right arm', type: 'box', dimensions: [3, 3, 24], position: [xc, 9.5, 42], material: 'shirt', parent: tag }],
    [`${tag}-neck`, { name: 'Neck', type: 'cylinder', dimensions: [2, 5], position: [xc, 0, 58.5], material: 'skin', parent: tag }],
    [`${tag}-head`, { name: 'Head', type: 'sphere', dimensions: [5.5], position: [xc, 0, 66.5], material: 'skin', parent: tag }],
    [`${tag}-eyeL`, { name: 'Left eye', type: 'sphere', dimensions: [1], position: [e, -2, 67.5], material: 'ink', parent: tag }],
    [`${tag}-eyeR`, { name: 'Right eye', type: 'sphere', dimensions: [1], position: [e, 2, 67.5], material: 'ink', parent: tag }],
  ];
}

// Horizontal slices of one outline, as boxes, on one wall.
//   wall: { axis: 'x' (wall runs along y, at x = pos) or 'y' (wall runs along x, at y = pos),
//           pos, dir (+1 or -1: the room side), along (centre of the cornice along the wall), len (its length),
//           zBase (height of the profile's bottom), flip (true: shelf up) }
//   prefix: key prefix; label: the name shown; group: parent group id.
// Each slice is one sketch unit tall (or what the outline takes up at its ends). Slices narrower than 1.2 in
// are widened to 1.2 in (the minimum-dimension rule).
function slices(shape, prefix, label, mat, wall, group) {
  const out = [];
  shape.rows.forEach(([b, xmin, xmax]) => {
    const lo = Math.max(b, shape.ymin), hi = Math.min(b + 1, shape.ymax);
    const h = (hi - lo) * S;
    if (h < 1) return; // too thin to model; the outline's top sliver
    const yc = (lo + hi) / 2;
    const zc = wall.flip ? (PROFILE.ymax - yc) * S : (yc - PROFILE.ymin) * S; // height above the profile's bottom
    const u0 = Math.max(0, (xmin - REF_X) * S);      // distance out from the wall
    const u1 = Math.max((xmax - REF_X) * S, u0 + 1.2);
    const uc = (u0 + u1) / 2, w = u1 - u0;
    const z = wall.zBase + zc;
    const pos = wall.axis === 'x'
      ? [wall.pos + wall.dir * uc, wall.along, z]
      : [wall.along, wall.pos + wall.dir * uc, z];
    const dims = wall.axis === 'x' ? [w, wall.len, h] : [wall.len, w, h];
    out.push([`${prefix}-${b}`, { name: `${label} slice ${b}`, type: 'box', dimensions: dims, position: pos, material: mat, parent: group }]);
  });
  return out;
}

// Adds one wall's cornice (profile plus two steps) as a group of slices.
function cornice(add, key, label, wall) {
  const gid = `${key}-cornice`;
  add(gid, { name: `${label} cornice`, description: 'the traced profile, with its two steps', type: 'group', dimensions: [], position: [0, 0, 0] });
  for (const [k, o] of [
    ...slices(PROFILE, key, 'Profile', 'cornice', wall, gid),
    ...slices(STEP_A, `${key}-a`, 'Step', 'step', wall, gid),
    ...slices(STEP_B, `${key}-b`, 'Step', 'step', wall, gid),
  ]) add(k, o);
}

// ---- V04: a sweep. The profile is swept along the path of the room's three walls, with arcs at both corners.
// Half scale: the same outline at S / 2 (about 48 in tall instead of 97).
const S_HALF = S / 2;
const PROFILE_H_HALF = (PROFILE.ymax - PROFILE.ymin) * S_HALF;   // about 48.5 in
const ARC_R = 24;        // inside corner radius of the sweep path (inches, centre line on the wall faces)
const ARC_SEGS = 6;      // straight pieces per arc

// The sweep path, in plan (x, y), on the wall faces. Each straight is { a, b, n } with n the inward normal.
// Each arc is { c, r, a0, a1 } in degrees, with n = -(cos, sin) pointing into the room.
function museumPath() {
  const R = ARC_R;
  return [
    { kind: 'line', a: [0, 120], b: [0, -120 + R], n: [-1, 0] },              // shared wall, x = 0
    { kind: 'arc', c: [-R, -120 + R], r: R, a0: 0, a1: -90 },                // corner, shared/left
    { kind: 'line', a: [-R, -120], b: [-360 + R, -120], n: [0, 1] },         // left wall, y = -120
    { kind: 'arc', c: [-360 + R, -120 + R], r: R, a0: -90, a1: -180 },       // corner, left/back
    { kind: 'line', a: [-360, -120 + R], b: [-360, 120], n: [1, 0] },        // back wall, x = -360
  ];
}
function homePath() {
  const R = ARC_R;
  return [
    { kind: 'line', a: [6, 120], b: [6, -120 + R], n: [1, 0] },              // shared wall, x = 6
    { kind: 'arc', c: [6 + R, -120 + R], r: R, a0: 180, a1: 270 },           // corner, shared/left
    { kind: 'line', a: [6 + R, -120], b: [180 - R, -120], n: [0, 1] },       // left wall, y = -120
    { kind: 'arc', c: [180 - R, -120 + R], r: R, a0: -90, a1: 0 },           // corner, left/far
    { kind: 'line', a: [180, -120 + R], b: [180, 120], n: [-1, 0] },         // far wall, x = 180
  ];
}

// Emits the sweep: each profile band, along each piece of the path. Straights are single boxes (no rotation).
// Arcs are split into ARC_SEGS pieces, each rotated about Z so its local x runs along the inward normal.
// attach: true for the main profile, so every slice starts at the wall face and the cornice is joined to it.
// (Without it the top shelf, sketch band -14, started 10.8 in out from the wall and looked as if it floated.)
function sweepSlices(shape, prefix, label, mat, path, zBase, group, attach = false) {
  const out = [];
  const bands = shape.rows.map(([b, xmin, xmax]) => {
    const lo = Math.max(b, shape.ymin), hi = Math.min(b + 1, shape.ymax);
    const h = (hi - lo) * S_HALF;
    if (h < 1) return null;
    const yc = (lo + hi) / 2;
    const zc = (PROFILE.ymax - yc) * S_HALF;                  // flipped: shelf at the top
    const u0 = attach ? 0 : Math.max(0, (xmin - REF_X) * S_HALF);
    const u1 = Math.max((xmax - REF_X) * S_HALF, u0 + 1.2);
    return { b, h, zc, u0, u1 };
  }).filter(Boolean);

  path.forEach((piece, pi) => {
    const pieces = [];
    if (piece.kind === 'line') {
      const { a, b, n } = piece;
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const alongX = Math.abs(b[0] - a[0]) > 0;
      bands.forEach((g) => {
        const uc = (g.u0 + g.u1) / 2, w = g.u1 - g.u0;
        const pos = [mid[0] + n[0] * uc, mid[1] + n[1] * uc, zBase + g.zc];
        pieces.push([`${prefix}-s${pi}-${g.b}`, { name: `${label} slice ${g.b}`, type: 'box',
          dimensions: alongX ? [L, w, g.h] : [w, L, g.h], position: pos, material: mat, parent: group }]);
      });
    } else {
      const { c, r, a0, a1 } = piece;
      for (let k = 0; k < ARC_SEGS; k++) {
        const t0 = a0 + ((a1 - a0) * k) / ARC_SEGS, t1 = a0 + ((a1 - a0) * (k + 1)) / ARC_SEGS;
        const tm = ((t0 + t1) / 2) * Math.PI / 180;
        const P = [c[0] + r * Math.cos(tm), c[1] + r * Math.sin(tm)];
        const N = [-Math.cos(tm), -Math.sin(tm)];                 // into the room
        const seg = r * Math.abs(t1 - t0) * Math.PI / 180 + 0.6;  // small overlap so the pieces meet
        const rz = Math.atan2(N[1], N[0]) * 180 / Math.PI;
        bands.forEach((g) => {
          const uc = (g.u0 + g.u1) / 2, w = g.u1 - g.u0;
          const pos = [P[0] + N[0] * uc, P[1] + N[1] * uc, zBase + g.zc];
          pieces.push([`${prefix}-s${pi}-${k}-${g.b}`, { name: `${label} arc slice ${g.b}`, type: 'box',
            dimensions: [w, seg, g.h], position: pos, rotation_z: rz, material: mat, parent: group }]);
        });
      }
    }
    out.push(...pieces);
  });
  return out;
}

function defsFor(v) {
  const d = [];
  const add = (k, o) => d.push([k, o]);

  // Rooms. From V03 the near side walls (y = +120) are cut away.
  add('ground', { name: 'Floor', description: 'both rooms', type: 'box', dimensions: [372, 252, 1], position: [-90, 0, -0.5], material: 'floor' });
  add('wall-museum-back', { name: 'Museum picture wall', type: 'box', dimensions: [6, 252, 288], position: [-363, 0, 144], material: 'wall' });
  add('wall-museum-left', { name: 'Museum side wall (left)', type: 'box', dimensions: [372, 6, 288], position: [-180, -123, 144], material: 'wall' });
  if (v < 3) add('wall-museum-right', { name: 'Museum side wall (right)', type: 'box', dimensions: [372, 6, 288], position: [-180, 123, 144], material: 'wall' });
  add('wall-shared', { name: 'Shared wall', description: 'between the two rooms', type: 'box', dimensions: [6, 252, 288], position: [3, 0, 144], material: 'wall' });
  add('wall-home-far', { name: 'Home far wall', type: 'box', dimensions: [6, 252, 108], position: [183, 0, 54], material: 'wall' });
  add('wall-home-left', { name: 'Home side wall (left)', type: 'box', dimensions: [174, 6, 108], position: [93, -123, 54], material: 'wall' });
  if (v < 3) add('wall-home-right', { name: 'Home side wall (right)', type: 'box', dimensions: [174, 6, 108], position: [93, 123, 54], material: 'wall' });

  // Picture: 14 ft tall, 10 ft wide, under the cornice
  add('frame', { name: 'Picture frame', description: '14 ft by 10 ft', type: 'box', dimensions: [2, 124, 172], position: [-359, 0, 96], material: 'frame' });
  add('canvas', { name: 'Picture', description: 'canvas', type: 'box', dimensions: [0.6, 112, 160], position: [-357.7, 0, 96], material: 'canvas' });

  // Lamps aimed at the picture: under the shelf from V04 (half-scale cornice), before that under the full cornice
  [-80, -40, 0, 40, 80].forEach((y, i) => add(`lamp-${i + 1}`, v >= 4
    ? { name: `Lamp ${i + 1}`, description: 'picture light, under the shelf', type: 'sphere', dimensions: [3], position: [-340, y, 280], material: 'lamp' }
    : { name: `Lamp ${i + 1}`, description: 'picture light', type: 'sphere', dimensions: [3], position: [-300, y, 186], material: 'lamp' }));

  // People, back to back across the shared wall
  d.push(...person('p-museum', 'Museum', -8, -1));
  d.push(...person('p-home', 'Home', 14, 1));

  // V01: blockout box for each cornice (v < 2)
  if (v < 2) {
    add('env-museum', { name: 'Museum cornice (blockout)', description: 'bounding box of the profile', type: 'box', dimensions: [ENVELOPE_W, LEN, PROFILE_H], position: [MUSEUM.wallX + ENVELOPE_W / 2, 0, MUSEUM.zBase + PROFILE_H / 2], material: 'envelope' });
    add('env-home', { name: 'Home cornice (blockout)', description: 'bounding box of the profile', type: 'box', dimensions: [ENVELOPE_W, LEN, PROFILE_H], position: [HOME.wallX - ENVELOPE_W / 2, 0, HOME.zBase + PROFILE_H / 2], material: 'envelope' });
  }

  // V02: the traced profile on the back wall of each room, base down (v === 2). Kept as it was.
  if (v === 2) {
    const back = (room) => ({ axis: 'x', pos: room.wallX, dir: room.dir, along: 0, len: LEN, zBase: room.zBase, flip: false });
    cornice(add, 'pm', 'Museum', back(MUSEUM));
    cornice(add, 'ph', 'Home', back(HOME));
  }

  // V03 (v >= 3 and < 4): cornice on three walls per room, flipped so the shelf projects into the room from the top.
  if (v >= 3 && v < 4) {
    const wallsOf = (zBase) => ({
      museum: [
        ['pm-back', 'Museum back', { axis: 'x', pos: -360, dir: 1, along: 0, len: 240 }],
        ['pm-left', 'Museum left', { axis: 'y', pos: -120, dir: 1, along: -180, len: 360 }],
        ['pm-shared', 'Museum shared', { axis: 'x', pos: 0, dir: -1, along: 0, len: 240 }],
      ],
      home: [
        ['ph-far', 'Home far', { axis: 'x', pos: 180, dir: -1, along: 0, len: 240 }],
        ['ph-left', 'Home left', { axis: 'y', pos: -120, dir: 1, along: 93, len: 174 }],
        ['ph-shared', 'Home shared', { axis: 'x', pos: 6, dir: 1, along: 0, len: 240 }],
      ],
    });
    const { museum, home } = wallsOf();
    for (const [key, label, w] of museum) cornice(add, key, label, { ...w, zBase: MUSEUM.zBase, flip: true });
    for (const [key, label, w] of home) cornice(add, key, label, { ...w, zBase: HOME.zBase, flip: true });
  }

  // V04 (v >= 4): half-scale cornice swept along each room's three walls, with arcs at the corners.
  // The walls run from the floor up to the top of the cornice, so there is no gap under it.
  if (v >= 4) {
    const ZB_M = MUSEUM.top - PROFILE_H_HALF;
    const ZB_H = HOME.top - PROFILE_H_HALF;
    const sweep = (key, label, path, zBase) => {
      const gid = `${key}-sweep`;
      add(gid, { name: `${label} cornice (sweep)`, description: 'the profile swept along the three walls, arcs at the corners', type: 'group', dimensions: [], position: [0, 0, 0] });
      for (const [k, o] of [
        ...sweepSlices(PROFILE, key, 'Profile', 'cornice', path, zBase, gid, true),
        ...sweepSlices(STEP_A, `${key}-a`, 'Step', 'step', path, zBase, gid),
        ...sweepSlices(STEP_B, `${key}-b`, 'Step', 'step', path, zBase, gid),
      ]) add(k, o);
    };
    sweep('mv4', 'Museum', museumPath(), ZB_M);
    sweep('hv4', 'Home', homePath(), ZB_H);
  }

  return d;
}

const CORNICE_V01 = {
  id: 'cornice-v01',
  header: {
    model_id: 'cornice-v01',
    name: 'Cornice V01',
    description: 'Museum (24 ft wall, 14 ft picture under the cornice) and a 9 ft home, side by side, one person in each, back to back across the shared wall. V01: the cornice as one box.',
    units: 'in', up: 'z', world: WORLD_ID, materials: MATERIALS,
  },
  defs: defsFor(1),
};

const CORNICE_V02 = {
  id: 'cornice-v02',
  header: {
    model_id: 'cornice-v02',
    name: 'Cornice V02',
    description: 'Same two rooms. V02: the cornice from the traced profile (slices of its outline, with the two steps) on the back wall of each room.',
    units: 'in', up: 'z', world: WORLD_ID, materials: MATERIALS,
  },
  defs: defsFor(2),
};

const CORNICE_V03 = {
  id: 'cornice-v03',
  header: {
    model_id: 'cornice-v03',
    name: 'Cornice V03',
    description: 'Cutaway: the near side walls are removed. Cornice on three walls per room (back, left side, shared), flipped so the profile projects into each room from the top of the wall.',
    units: 'in', up: 'z', world: WORLD_ID, materials: MATERIALS,
  },
  defs: defsFor(3),
};

const CORNICE_V04 = {
  id: 'cornice-v04',
  header: {
    model_id: 'cornice-v04',
    name: 'Cornice V04',
    description: 'Half-scale cornice (about 48 in tall) swept along the three walls of each room, with arcs at the corners. Cutaway, profile flipped into the rooms.',
    units: 'in', up: 'z', world: WORLD_ID, materials: MATERIALS,
  },
  defs: defsFor(4),
};

module.exports = { CORNICE: [CORNICE_V01, CORNICE_V02, CORNICE_V03, CORNICE_V04], PROFILE_H, S };
