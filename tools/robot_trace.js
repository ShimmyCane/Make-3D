// Robot trace: the robot drawn from the strokes of Quick Detail "Robot Sketch 2" (tools/robot_sketch2_strokes.js),
// so its parts follow the drawing rather than a generic robot. Used by Robot loop V11 (tools/robot_loop.js).
//
// Mapping, for every part: the drawing's x runs across the robot (mirrored, so the drawing's left is the
// robot's right), the drawing's y runs up (its bottom is the ground, z 0), and the robot faces +X, the way it
// walks. The drawing is flat, so all parts sit at depth 0 except where a part must stand out (eyes, chest panel,
// mouth). Scale: 6.5 in per sketch unit, so the drawing's height (about 42 in) is the robot's height.
//
// Which strokes are which (the stroke numbers are the order in the sketch, see tools/robot_sketch2_strokes.js):
//   body 10 (closed round shape), head 0 (closed round shape), eyes 1 and 2, mouth 3, chest panel 27 (red arc)
//   five arms from the body: hinged left arm 14 (hand 22), down-left arm 15 (hand 23), right arm 19 (hand 21),
//     top-left arm 4 (hand 5), top arm 6 (hand 7)
//   two legs: left 16 (foot 24), right long leg 17 (to the bottom)
//   antenna 11 (up from the top of the body), ears 45 and 47 (the spiky fans on the head), crest 48 (spikes on top)
//   tail 44 (the long curl up and out to the right)
//
// Limbs are closed lofts (tubes) along their stroke; the hands and feet ride the end of their limb (attach).
// Motion: the walk on the V06 path (Robot Path 2), the legs and arms swing from their roots, the body bounces.

const RB = require('./robot_banana.js');
const SK = require('./robot_sketch2_strokes.js').STROKES;
const M = require('../js/core/motion.js');

const K = 6.5;                 // inches per sketch unit
const CX = -0.63;              // the body's centre in sketch x (its middle, the robot's centre line)
const BOT = 2.42;              // the lowest point of the drawing (the ground)
// Nothing goes below the ground: the lowest point is lifted to z 1 (the feet's tubes have a radius of about 1 in).
const T = (sx, sy, depth = 0) => [round(depth), round(-(sx - CX) * K), round(Math.max(1, (BOT - sy) * K))];
const round = (x) => Math.round(x * 100) / 100;
const centre = (name) => { const P = SK[name]; return [P.reduce((s, p) => s + p[0], 0) / P.length, P.reduce((s, p) => s + p[1], 0) / P.length]; };
const span = (name) => { const P = SK[name]; const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]); return Math.max(max(xs) - min(xs), max(ys) - min(ys)); };
const min = (a) => Math.min(...a), max = (a) => Math.max(...a);

// The stroke as joints in model space, facing the drawing (depth from the drawing's centre, a little bulge for limbs).
const joints = (name, depth = 0) => SK[name].map((p) => T(p[0], p[1], depth));

// Bounding box of joints (plus a margin), for the loft's dimensions and position (as in the cape).
function boxOf(js, margin) {
  const lo = [0, 1, 2].map((k) => min(js.map((p) => p[k])) - margin), hi = [0, 1, 2].map((k) => max(js.map((p) => p[k])) + margin);
  lo[2] = Math.max(0.5, lo[2]);   // the box stays above the ground (half an inch, so rounding never dips under it)
  return { dimensions: [0, 1, 2].map((k) => round(hi[k] - lo[k])), position: [0, 1, 2].map((k) => round((lo[k] + hi[k]) / 2)) };
}

// The traced limbs and their shape: name, drawing stroke, the hand or foot at its end, the tube radius (in).
const LIMBS = [
  { key: 'arm-hinge', stroke: 'arm-hinge', end: { key: 'hand-hinge', stroke: 'hand-hinge', kind: 'hand' }, r: [1.2, 0.8] },
  { key: 'arm-down', stroke: 'arm-down', end: { key: 'hand-down', stroke: 'hand-down', kind: 'hand' }, r: [1.2, 0.8] },
  { key: 'arm-right', stroke: 'arm-right', end: { key: 'hand-right', stroke: 'hand-right', kind: 'hand' }, r: [1.2, 0.8] },
  { key: 'arm-top-left', stroke: 'arm-top-left', end: { key: 'hand-top-left', stroke: 'hand-top-left', kind: 'hand' }, r: [1.0, 0.7] },
  { key: 'arm-top', stroke: 'arm-top', end: { key: 'hand-top', stroke: 'hand-top', kind: 'hand' }, r: [1.0, 0.7] },
  { key: 'leg-left', stroke: 'leg-left', end: { key: 'foot-left', stroke: 'foot-left', kind: 'foot' }, r: [1.3, 0.9] },
  { key: 'leg-right', stroke: 'leg-right', end: null, r: [1.3, 0.9] },
];

// The loft's rings: a tube that tapers from r[0] at the body to r[1] at the hand.
const rings = (r) => [[0, r[0], r[0]], [0.5, (r[0] + r[1]) / 2, (r[0] + r[1]) / 2], [1, r[1], r[1]]];

function traceDefs(add) {
  // the robot group and the upper body (the body, head and limbs ride the upper body)
  add('upper', { name: 'Upper body', description: 'the drawing\'s round body, head and arms', type: 'group', dimensions: [], position: [0, 0, 24], parent: 'robot' });

  // body: the drawing's closed round shape (10). A sphere on the drawing's centre.
  const [bx, by] = centre('body');
  add('torso', { name: 'Body', description: 'round body, traced from the drawing', type: 'sphere', dimensions: [round(span('body') * K / 2)],
    position: T(bx, by), material: 'body', parent: 'upper' });
  // chest panel: the red arc (27) on the body's front, with its dot (28)
  const [chx, chy] = centre('chest');
  add('panel', { name: 'Chest panel', description: 'the red "super computer" arc, a disc on the front', type: 'cylinder', dimensions: [round(span('chest') * K / 2), 0.4],
    position: T(chx, chy, 4.4), rotation_y: 90, material: 'joint', parent: 'upper' });
  const [dx, dy] = centre('chest-dot');
  add('chest-dot', { name: 'Chest light', type: 'sphere', dimensions: [0.8], position: T(dx, dy, 4.6), material: 'accent', parent: 'upper' });

  // head: the drawing's closed round shape (0), on the drawing's left (the robot's right edge is its centre line)
  const [hx, hy] = centre('head');
  add('head', { name: 'Head', description: 'round head, traced from the drawing (set to the side, as drawn)', type: 'sphere', dimensions: [round(span('head') * K / 2)],
    position: T(hx, hy, 0.6), material: 'head', parent: 'upper' });
  for (const [key, name, label] of [['eye-a', 'Left eye', 'eye-a'], ['eye-b', 'Right eye', 'eye-b']]) {
    const [ex, ey] = centre(label);
    add(key, { name, description: 'a curl in the drawing, a dot here', type: 'sphere', dimensions: [0.9], position: T(ex, ey, 4.4), material: 'ink', parent: 'upper' });
  }
  const [mx, my] = centre('mouth');
  add('mouth', { name: 'Mouth', type: 'box', dimensions: [0.4, round(span('mouth') * K), 0.6], position: T(mx, my, 4.2), material: 'accent', parent: 'upper' });

  // ears: the two spiky fans on the head (45 and 47), flat sheets on the head's side
  for (const [key, label, side] of [['ear-a', 'ear-fan-a', 'Left'], ['ear-b', 'ear-fan-b', 'Right']]) {
    const js = joints(label, 0.2);
    add(key, { name: `${side} ear`, description: 'a spiky fan, traced from the drawing', type: 'sheet', ...boxOf(js, 0.6),
      material: 'accent', parent: 'upper', shape: { joints: js, facing: [1, 0, 0], samples: 12, rings: js.map((_, i) => [round(i / (js.length - 1)), 0.9]) } });
  }
  // crest: the spiky stroke on top of the head (48), a thin sheet
  { const js = joints('crest', 0.3);
    add('crest', { name: 'Crest', description: 'spikes on top of the head, traced from the drawing', type: 'sheet', ...boxOf(js, 0.4),
      material: 'accent', parent: 'upper', shape: { joints: js, facing: [1, 0, 0], samples: 12, rings: js.map((_, i) => [round(i / (js.length - 1)), 0.35]) } }); }

  // antenna: the straight line up from the body (11), a tube with a ball on top (it rides the top joint)
  { const js = joints('antenna', 0);
    add('antenna', { name: 'Antenna', description: 'the long line up from the body, traced', type: 'loft', ...boxOf(js, 0.4), material: 'ink', parent: 'upper',
      shape: { joints: js, facing: [0, 1, 0], samples: 6, sides: 8, rings: [[0, 0.3, 0.3], [1, 0.25, 0.25]] } });
    const top = js[js.length - 1];
    add('antenna-ball', { name: 'Antenna ball', type: 'sphere', dimensions: [0.9], position: top, material: 'accent', parent: 'upper',
      attach: { to: 'antenna', joint: js.length - 1 } }); }

  // tail: the long curl (44), a tube from the body's back that tapers to a point; it runs out and up
  { const js = joints('tail', -0.3);
    add('tail', { name: 'Tail', description: 'the very long tail, traced from the drawing\'s curl', type: 'loft', ...boxOf(js, 1), material: 'body', parent: 'upper',
      shape: { joints: js, facing: [0, 1, 0], samples: 16, sides: 8, rings: [[0, 1.1, 1.1], [0.5, 0.7, 0.7], [1, 0.25, 0.25]] } }); }

  // limbs: five arms and two legs, each a closed tube along its stroke. Hands and feet ride the limb's end.
  for (const L of LIMBS) {
    const js = joints(L.stroke, 0.2);
    add(L.key, { name: L.key.replace(/-/g, ' '), description: 'traced from the drawing; bends at its root and joints', type: 'loft', ...boxOf(js, 1.2),
      material: 'joint', parent: 'upper', shape: { joints: js, facing: [1, 0, 0], samples: 12, sides: 8, rings: rings(L.r) } });
    if (L.end) {
      const [ex, ey] = centre(L.end.stroke);
      const pos = T(ex, ey, 0.2);
      if (L.end.kind === 'hand') {
        add(L.end.key, { name: 'Hand', description: 'a claw at the end of the arm', type: 'sphere', dimensions: [1.6], position: pos, material: 'accent', parent: 'upper',
          attach: { to: L.key, joint: js.length - 1 } });
      } else {
        add(L.end.key, { name: 'Foot', description: 'at the end of the leg', type: 'box', dimensions: [4, 2.6, 1.2], position: pos, material: 'accent', parent: 'upper',
          attach: { to: L.key, joint: js.length - 1 } });
      }
    }
  }
  // right leg's foot: the long leg ends at the bottom of the drawing
  { const js = joints('leg-right', 0.2); const end = js[js.length - 1];
    add('foot-right', { name: 'Right foot', type: 'box', dimensions: [4, 2.6, 1.2], position: [end[0], end[1], 0.6], material: 'accent', parent: 'upper',
      attach: { to: 'leg-right', joint: js.length - 1 } }); }
}

// V11 defs: the walk's own parts (robot and stones), then the traced robot.
function defs(path) {
  const d = [];
  const add = (key, o) => d.push([key, o]);
  add('robot', { name: 'Robot', description: 'walks the path; traced from Quick Detail "Robot Sketch 2"', type: 'group', dimensions: [], position: [0, 0, 0] });
  traceDefs(add);
  // stepping stones along the path (as in V01)
  add('stones', { name: 'Stepping stones', description: 'the path the robot walks', type: 'group', dimensions: [], position: [0, 0, 0] });
  const pts = path.map((p) => [p[0], p[1], 0]);
  const count = Math.round(M.pathLength(pts) / 16);
  for (let i = 0; i < count; i++) {
    const { point } = M.pathAt(pts, i / count);
    add(`stone-${i + 1}`, { name: `Stone ${i + 1}`, type: 'cylinder', dimensions: [3.2 + (i % 3) * 0.4, 0.25],
      position: [round(point[0]), round(point[1]), 0.125], material: 'stone', parent: 'stones' });
  }
  return d;
}

// Motion: the walk (from V01's walk: the path, the body's bounce and sway), and each limb swings from its root.
function motionFor(uuid, path) {
  const base = RB.motionFor(uuid, path);
  const keep = base.motions.filter((m) => ['walk', 'dip', 'sway'].includes(m.id));
  const strides = Math.max(1, Math.round(M.pathLength(path.map((p) => [p[0], p[1], 0])) / RB.STRIDE));
  const extra = [];
  LIMBS.forEach((L, i) => {
    const isLeg = L.key.startsWith('leg');
    const ph = isLeg ? (L.key === 'leg-left' ? 0 : 0.5) : (i % 2 ? 0.5 : 0);
    extra.push({ id: `${L.key}-swing`, target: uuid(L.key), kind: 'bend', joint: 0, axis: 'y',
      from: isLeg ? -18 : -14, to: isLeg ? 18 : 14, cycles: strides, phase: ph });
  });
  return { ...base, description: 'Traced robot: walks the Robot Path 2 walk, the five arms and two legs swing from their roots.',
    motions: [...keep, ...extra] };
}

module.exports = { defs, motionFor, T, LIMBS };
