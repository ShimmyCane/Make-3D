// Hawk: the first model built from closed meshes on a skeleton line (loft) and double-sided thin surfaces (sheet).
// A red-tailed hawk in soaring pose, then a loop of circling, a stoop (dive) onto a mouse in the grass, and a climb out.
// Sizes in inches, Z up, ground z = 0. At rest the hawk faces +X, wings level, its centre at HAWK0.
//
// Basis (estimate from published figures, see 04 AI/Make 3D/research/hawk.md): red-tailed hawk, length 17.7 to 25.6 in,
// wingspan 44.9 to 52.4 in. This model: about 22.5 in long, 50 in across the wings.
//
// One code path builds every version: defsFor(v). Version N adds a block with "if (v >= N)".
//   V01 blockout: body, tail and two wings as closed meshes, each on a straight skeleton line.
//   V02 wings: the wing skeleton gets shoulder, elbow, wrist and tip; wing and body profiles are refined.
//   V03 head and feet: beak, eyes, legs and feet, each riding a joint of the body skeleton.
//   V04 meadow: ground, grass blades and leaves (double-sided sheets), a pennant flag, a mouse.
//   V05 finish: cream breast, eye ridges, smaller eyes set lower (V03 eyes bulged above the head).
//   V07 physics flight: a much larger meadow with a bluff and a thermal, faster flight from gravity, drag and flap thrust (tools/hawk_flight.js).
//   V06 motion: the loop (separate motion.json): circle, stoop, pull out, climb. Wings flap, fold and flare on bends.

const M = require('../js/core/motion.js');
const MESH = require('../js/core/mesh.js');
const FL = require('./hawk_flight.js');

const WORLD_ID = 'default-world';
const HAWK0 = [0, 0, 66];           // the hawk's reference point at rest, and the start of the flight path
const SC = 0.6;                     // flight path scale, from the waypoint table below

const MATERIALS = {
  feather: { color: '#c9a37e', opacity: 1 },   // warm tan
  wing: { color: '#bb9570', opacity: 1 },
  tail: { color: '#e09a74', opacity: 1 },      // rusty red-tail, softened
  breast: { color: '#f6e9d3', opacity: 1 },    // cream
  beak: { color: '#e7d79a', opacity: 1 },
  leg: { color: '#f2d27a', opacity: 1 },
  ink: { color: '#2d2a26', opacity: 1 },
  brow: { color: '#8d6a4e', opacity: 1 },
  meadow: { color: '#cfe6b8', opacity: 1 },    // pastel green ground
  grass1: { color: '#a9d49a', opacity: 1 },
  grass2: { color: '#8cc48c', opacity: 1 },
  leaf: { color: '#7fc4a0', opacity: 1 },
  post: { color: '#d9b99b', opacity: 1 },
  flag: { color: '#f4a38c', opacity: 1 },      // coral
  mouse: { color: '#d3c5b4', opacity: 1 },
  ear: { color: '#f4c7c0', opacity: 1 },
};

// materials added by V07 (the earlier versions keep exactly the list they had)
const MATERIALS7 = {
  patch: { color: '#efdcb4', opacity: 1 },
  rock: { color: '#cfc7bd', opacity: 1 },
  wind: { color: '#bfe0f2', opacity: 0.4 },
  airband: { color: '#ffe3a0', opacity: 0.32 },
  mound: { color: '#d9c4a0', opacity: 1 },
  hole: { color: '#4a3f36', opacity: 1 },
};

const round = (x) => Math.round(x * 100) / 100;
const r5 = (x) => Math.round(x * 1e5) / 1e5;
const at = (p, o = HAWK0) => [round(p[0] + o[0]), round(p[1] + o[1]), round(p[2] + o[2])];   // hawk-local -> model

// seeded random, so the meadow is the same every build
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const seeded = (n) => { let q = n; return () => { q = (q * 16807) % 2147483647; return q / 2147483647; }; };

// ---- the flight path (waypoints from the planning sketch, scaled by SC)
// 0 level start  1-6 circle round the meadow  7-9 stoop  10-11 pull out  12 skim over the mouse  13-15 climb back to 0
const PATH_RAW = [
  [0, 0, 110], [60, 5, 120], [115, 45, 134], [110, 115, 146], [45, 150, 152], [-35, 135, 150], [-110, 95, 140],
  [-165, 40, 128], [-178, -5, 98], [-180, -25, 50], [-172, -34, 26], [-150, -36, 19], [-115, -33, 21],
  [-80, -26, 45], [-45, -14, 78], [-18, -4, 100],
];
const PATH = PATH_RAW.map((p) => [round(p[0] * SC), round(p[1] * SC), round(p[2] * SC)]);
const MOUSE = [-80, -21.5, 0];      // where the hawk skims (about waypoint 12)

// Speed from height: v^2 = V0^2 + 2 G (zTop - z). A function of height only, so the lap closes. Stylised, not real time.
const V0 = 15, GFALL = 10;
function timing() {
  const N = 240, zs = [];
  for (let i = 0; i <= N; i++) zs.push(M.pathAt(PATH, i / N).point[2]);
  const zTop = Math.max(...zs), total = M.pathLength(PATH);
  const tau = [0];
  for (let i = 1; i <= N; i++) {
    const v = (z) => Math.sqrt(V0 * V0 + 2 * GFALL * (zTop - z));
    const vm = (v(zs[i - 1]) + v(zs[i])) / 2;
    tau.push(tau[i - 1] + (total / N) / vm);
  }
  const T = tau[N];
  const profile = tau.map((t, i) => [r5(t / T), r5(i / N)]);
  profile[0] = [0, 0]; profile[N] = [1, 1];
  const marks = M.pathMarks(PATH);
  // loop-time fraction at which waypoint i is reached
  const tOf = (i) => {
    const s = marks[i];
    let k = 1; while (k < N && profile[k][1] < s) k++;
    const [t0, s0] = profile[k - 1], [t1, s1] = profile[k];
    return r5(t0 + (t1 - t0) * ((s - s0) / (s1 - s0 || 1)));
  };
  return { T, profile, tOf, zTop, vMax: Math.sqrt(V0 * V0 + 2 * GFALL * (zTop - Math.min(...zs))) };
}

// ---- shapes
function skin(key, type, name, shape, extra = {}) {
  const box = MESH.meshBox(shape, type);
  const size = [0, 1, 2].map((i) => Math.max(0.01, round(box.max[i] - box.min[i])));
  const centre = [0, 1, 2].map((i) => round((box.max[i] + box.min[i]) / 2));
  return [key, { name, type, dimensions: size, position: centre, shape, ...extra }];
}
const shape = (o) => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'number' ? round(v) : v)));

function defsFor(v) {
  const H0 = v >= 7 ? FL.flight().hawk0 : HAWK0;
  const at = (p, o = H0) => [round(p[0] + o[0]), round(p[1] + o[1]), round(p[2] + o[2])];
  const d = [];
  const add = (k, def) => d.push([k, def]);
  const mesh = (key, type, name, sh, extra) => d.push(skin(key, type, name, shape(sh), extra));

  add('hawk', { name: 'Hawk', description: 'red-tailed hawk; the group that flies the loop', type: 'group', dimensions: [], position: H0 });

  // ---- V01 blockout: closed meshes on straight skeleton lines
  const J = (...p) => p.map((q) => at(q));
  if (v < 2) {
    mesh('body', 'loft', 'Body', { joints: J([-7, 0, 0.2], [0, 0, 0.7], [6.9, 0, 2.4]), facing: [0, 1, 0], samples: 8, sides: 10,
      rings: [[0, 0.7, 0.7], [0.4, 3.1, 2.9], [0.8, 1.9, 1.9], [1, 0.6, 0.7]] },
      { description: 'one closed mesh: rump, belly, chest, neck and head, along a skeleton line from tail to head', material: 'feather', parent: 'hawk' });
  }
  if (v >= 2) {
    mesh('body', 'loft', 'Body', { joints: J([-7, 0, 0.2], [-2, 0, 0.4], [2.5, 0, 0.9], [5.2, 0, 1.8], [6.9, 0, 2.4]), facing: [0, 1, 0], samples: 18, sides: 14,
      rings: [[0, 0.7, 0.7], [0.12, 2.2, 2.1], [0.38, 3.2, 3.0], [0.62, 3.0, 2.8], [0.78, 1.8, 1.9], [0.88, 1.7, 1.8], [0.97, 1.2, 1.3], [1, 0.6, 0.7]] },
      { description: 'one closed mesh: rump, belly, chest, neck and head. Joints: 0 rump, 1 belly, 2 chest, 3 neck, 4 head', material: 'feather', parent: 'hawk' });
  }
  if (v < 2) {
    mesh('tail', 'loft', 'Tail', { joints: J([-6, 0, 0.1], [-14.2, 0, -0.3]), facing: [0, 1, 0], samples: 6, sides: 8,
      rings: [[0, 1.6, 0.5], [1, 3.4, 0.25]] }, { description: 'flat closed fan', material: 'tail', parent: 'hawk' });
  } else {
    mesh('tail', 'loft', 'Tail', { joints: J([-6, 0, 0.1], [-10, 0, 0], [-14.2, 0, -0.3]), facing: [0, 1, 0], samples: 10, sides: 10,
      rings: [[0, 1.6, 0.5], [0.5, 3.0, 0.35], [0.9, 3.5, 0.22], [1, 2.7, 0.12]] },
      { description: 'flat closed fan on the rump joint of the body', material: 'tail', parent: 'hawk', attach: { to: 'body', joint: 0 } });
  }
  for (const [side, sg] of [['l', 1], ['r', -1]]) {
    const S = side === 'l' ? 'Left' : 'Right';
    if (v < 2) {
      mesh(`wing-${side}`, 'loft', `${S} wing`, { joints: J([0.5, 2.6 * sg, 1.2], [-1.2, 24.5 * sg, 0.6]), facing: [1, 0, 0], samples: 8, sides: 8,
        rings: [[0, 4.2, 1.1], [0.5, 5.0, 0.8], [1, 0.5, 0.1]] }, { description: 'closed airfoil on a straight line', material: 'wing', parent: 'hawk' });
    } else {
      mesh(`wing-${side}`, 'loft', `${S} wing`, { joints: J([0.5, 2.6 * sg, 1.2], [-0.3, 10.5 * sg, 2.0], [2.0, 17.5 * sg, 1.6], [-1.5, 24.5 * sg, 0.6]), facing: [1, 0, 0], samples: 16, sides: 12,
        rings: [[0, 4.2, 1.1], [0.2, 5.0, 1.0], [0.45, 5.2, 0.8], [0.7, 4.2, 0.5], [0.9, 2.4, 0.25], [1, 0.4, 0.1]] },
        { description: 'closed airfoil on a skeleton line. Joints: 0 shoulder, 1 elbow, 2 wrist, 3 tip', material: 'wing', parent: 'hawk' });
    }
  }

  // ---- V03 head and feet: parts that ride a joint of the body skeleton
  if (v >= 3) {
    mesh('beak', 'loft', 'Beak', { joints: J([7.6, 0, 2.3], [8.9, 0, 1.8], [9.9, 0, 0.9]), facing: [0, 1, 0], samples: 8, sides: 8,
      rings: [[0, 1.0, 0.9], [0.5, 0.75, 0.8], [0.85, 0.35, 0.45], [1, 0.05, 0.08]] },
      { description: 'hooked, rides the head joint', material: 'beak', parent: 'hawk', attach: { to: 'body', joint: 4 } });
    for (const [side, sg] of [['l', 1], ['r', -1]]) {
      const S = side === 'l' ? 'Left' : 'Right';
      add(`eye-${side}`, { name: `${S} eye`, type: 'sphere', dimensions: [v >= 5 ? 0.42 : 0.55], position: at(v >= 5 ? [7.2, 1.28 * sg, 2.7] : [7.3, 1.3 * sg, 2.9]), material: 'ink', parent: 'hawk', attach: { to: 'body', joint: 4 } });
      // leg: hip, knee, ankle, toe. Tucked under the belly at rest. Rides the belly joint; its own bends swing it down.
      mesh(`leg-${side}`, 'loft', `${S} leg and foot`, { joints: J([-0.5, 1.6 * sg, -1.8], [1.0, 1.6 * sg, -3.4], [-0.2, 1.6 * sg, -5.0], [1.3, 1.7 * sg, -6.4]), facing: [0, 1, 0], samples: 12, sides: 8,
        rings: [[0, 1.0, 1.0], [0.3, 0.75, 0.8], [0.6, 0.5, 0.5], [0.85, 0.9, 0.4], [1, 0.12, 0.2]] },
        { description: 'closed mesh. Joints: 0 hip, 1 knee, 2 ankle, 3 talon tip', material: 'leg', parent: 'hawk', attach: { to: 'body', joint: 1 } });
    }
  }

  // ---- V04 meadow: ground, grass and leaves (double-sided sheets), a pennant flag, a mouse
  let meadowParts = null;
  if (v >= 7) meadowParts = FL.meadow7(add, mesh, seeded(11));   // its own stream, so it is the same on every call
  if (v >= 4 && v < 7) {
    add('meadow-group', { name: 'Meadow', description: 'ground, grass, leaves, flag post and mouse', type: 'group', dimensions: [], position: [0, 0, 0] });
    add('meadow', { name: 'Meadow ground', type: 'cylinder', dimensions: [120, 1], position: [-15, 35, 0.5], material: 'meadow', parent: 'meadow-group' });
    // grass tufts: five blades each, leaning every way, two greens
    const tufts = [];
    for (let i = 0; i < 12; i++) tufts.push([MOUSE[0] + (rnd() - 0.5) * 70, MOUSE[1] + (rnd() - 0.5) * 36]);          // round the mouse
    for (let i = 0; i < 12; i++) { const a = rnd() * 6.283, r = 25 + rnd() * 90; tufts.push([-15 + r * Math.cos(a), 35 + r * 0.85 * Math.sin(a)]); }
    tufts.forEach(([cx, cy], ti) => {
      for (let b = 0; b < 5; b++) {
        const a = rnd() * 6.283, h = 5 + rnd() * 4.5, lean = 1.2 + rnd() * 2.2, ox = (rnd() - 0.5) * 2.4, oy = (rnd() - 0.5) * 2.4;
        const x = cx + ox, y = cy + oy, c = Math.cos(a), s = Math.sin(a);
        mesh(`grass-${ti}-${b}`, 'sheet', `Grass ${ti + 1}.${b + 1}`, { joints: [[x, y, 0.6], [x + c * lean * 0.3, y + s * lean * 0.3, 0.6 + h * 0.55], [x + c * lean, y + s * lean, 0.6 + h]],
          facing: [-s, c, 0], samples: 7, sides: 3, cup: 0.25, rings: [[0, 0.36], [0.55, 0.28], [1, 0.03]] },
          { description: 'a thin blade; double sided', material: (ti + b) % 2 ? 'grass1' : 'grass2', parent: 'meadow-group' });
      }
    });
    // a low leafy plant: six wide leaves curling out from one point
    const PL = [34, -34];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 6.283 + 0.3, c = Math.cos(a), s = Math.sin(a), len = 9 + (i % 3) * 1.6;
      mesh(`leaf-${i}`, 'sheet', `Leaf ${i + 1}`, { joints: [[PL[0], PL[1], 0.6], [PL[0] + c * len * 0.45, PL[1] + s * len * 0.45, 0.6 + len * 0.42], [PL[0] + c * len, PL[1] + s * len, 0.6 + len * 0.5]],
        facing: [-s, c, 0], samples: 8, sides: 5, cup: 0.35, rings: [[0, 0.3], [0.3, 2.0], [0.65, 2.2], [1, 0.15]] },
        { description: 'a wide leaf, cupped; double sided', material: 'leaf', parent: 'meadow-group' });
    }
    // flag post and pennant
    const FP = [22, -46];
    add('post', { name: 'Flag post', type: 'cylinder', dimensions: [0.7, 36], position: [FP[0], FP[1], 18.6], material: 'post', parent: 'meadow-group' });
    mesh('flag', 'sheet', 'Pennant flag', { joints: [[FP[0] + 0.7, FP[1], 33], [FP[0] + 7.7, FP[1], 32.6], [FP[0] + 14.7, FP[1], 32], [FP[0] + 21.7, FP[1], 31.4]],
      facing: [0, 0, 1], samples: 14, sides: 5, rings: [[0, 3.6], [0.5, 2.6], [1, 0.15]] },
      { description: 'a thin pennant; double sided; flutters on the loop', material: 'flag', parent: 'meadow-group' });
    // mouse: closed body, closed thin tail, two sheet ears
    mesh('mouse', 'loft', 'Mouse', { joints: [[MOUSE[0] - 5, MOUSE[1], 1.6], [MOUSE[0] - 2, MOUSE[1], 1.9], [MOUSE[0] + 2, MOUSE[1], 1.7], [MOUSE[0] + 4.5, MOUSE[1], 1.4]], facing: [0, 1, 0], samples: 12, sides: 10,
      rings: [[0, 0.3, 0.3], [0.2, 0.9, 0.85], [0.55, 1.35, 1.25], [0.85, 1.0, 0.95], [1, 0.3, 0.3]] },
      { description: 'closed mesh, nose toward -x', material: 'mouse', parent: 'meadow-group' });
    mesh('mouse-tail', 'loft', 'Mouse tail', { joints: [[MOUSE[0] + 4.2, MOUSE[1], 1.3], [MOUSE[0] + 7.5, MOUSE[1] + 1.2, 1.1], [MOUSE[0] + 10, MOUSE[1] + 0.2, 1.4], [MOUSE[0] + 12.5, MOUSE[1] + 1.6, 1.9]], facing: [0, 0, 1], samples: 10, sides: 6,
      rings: [[0, 0.3, 0.3], [0.5, 0.18, 0.18], [1, 0.05, 0.05]] }, { description: 'a thin closed tube on a skeleton line; twitches on the loop', material: 'mouse', parent: 'meadow-group' });
    for (const [side, sg] of [['l', 1], ['r', -1]]) {
      mesh(`mouse-ear-${side}`, 'sheet', `Mouse ${side === 'l' ? 'left' : 'right'} ear`, { joints: [[MOUSE[0] - 3.2, MOUSE[1] + 0.8 * sg, 2.6], [MOUSE[0] - 3.4, MOUSE[1] + 1.4 * sg, 3.7]],
        facing: [1, 0, 0], samples: 5, sides: 5, cup: 0.4, rings: [[0, 0.3], [0.5, 0.65], [1, 0.1]] }, { description: 'a thin round ear; double sided', material: 'ear', parent: 'meadow-group' });
    }
  }

  // ---- V05 finish
  if (v >= 5) {
    mesh('breast', 'loft', 'Cream breast', { joints: J([-1.5, 0, -0.5], [2, 0, -0.4], [4.8, 0, 0.5]), facing: [0, 1, 0], samples: 10, sides: 12,
      rings: [[0, 0.6, 0.6], [0.3, 2.3, 2.4], [0.7, 2.4, 2.3], [1, 0.9, 1.0]] },
      { description: 'pale chest and belly: a second closed mesh, mostly inside the body', material: 'breast', parent: 'hawk', attach: { to: 'body', joint: 1 } });
    for (const [side, sg] of [['l', 1], ['r', -1]]) {
      mesh(`brow-${side}`, 'loft', `${side === 'l' ? 'Left' : 'Right'} eye ridge`, { joints: J([6.5, 1.25 * sg, 3.55], [7.4, 1.4 * sg, 3.45], [8.2, 1.1 * sg, 3.0]), facing: [0, 1, 0], samples: 6, sides: 6,
        rings: [[0, 0.1, 0.22], [0.5, 0.2, 0.3], [1, 0.05, 0.1]] }, { description: 'the brow ridge that gives a hawk its stern look', material: 'brow', parent: 'hawk', attach: { to: 'body', joint: 4 } });
    }
  }
  d.meadowParts = meadowParts;
  return d;
}

// sway whose angle is exactly 0 at the start of the loop, whatever the phase (so the first frame is the rest pose)
const sway = (amp, cycles, phase) => {
  const mid = -amp * Math.sin(2 * Math.PI * phase);
  const q = (x) => Math.round(x * 1e4) / 1e4;
  return { from: q(mid - amp), to: q(mid + amp), cycles, phase: q(phase) };
};

function motionFor(v, uuid) {
  const tm = timing();
  const t = (i) => tm.tOf(i);
  const motions = [];
  // The whole hawk flies the path. face "flight": nose along the path, leaning into turns and pulls.
  motions.push({ id: 'fly', target: uuid('hawk'), kind: 'path', points: PATH.map((p) => [...p]), profile: tm.profile, face: 'flight',
    bank_gain: 3, pivot: HAWK0, cycles: 1 });
  const FLAPS = 24;
  const flapEnv = [[0, 0], [t(11), 0], [t(12), 1], [t(14), 1], [t(15), 0.5]];
  const tuck = (peak) => [[0, 0], [t(7), 0], [t(8), peak * 0.6], [t(9), peak], [t(10), peak * 0.8], [t(11), 0]];
  for (const [side, sg] of [['l', 1], ['r', -1]]) {
    const w = uuid(`wing-${side}`);
    const sw = [0, 1, 2].map((j) => [[0, 25, 0], [1, 14, 0.08], [2, 18, 0.16]][j]);
    // flap: all three joints, each lagging the one before, so the wing bends like a whip. Only while climbing out.
    for (const [j, amp, ph] of sw) {
      const s = sway(amp * sg, FLAPS, ph);
      motions.push({ id: `flap-${side}-${j}`, target: w, kind: 'bend', joint: j, axis: 'x', ...s, envelope: flapEnv });
    }
    // fold for the stoop: sweep back at the shoulder, fold at elbow and wrist, then open for the pull out
    motions.push({ id: `sweep-${side}`, target: w, kind: 'bend', joint: 0, axis: 'z', keys: tuck(55 * sg) });
    motions.push({ id: `fold-${side}-1`, target: w, kind: 'bend', joint: 1, axis: 'z', keys: tuck(40 * sg) });
    motions.push({ id: `fold-${side}-2`, target: w, kind: 'bend', joint: 2, axis: 'z', keys: tuck(30 * sg) });
    // legs drop forward to take the mouse
    const lg = uuid(`leg-${side}`);
    const drop = (a) => [[0, 0], [t(10), 0], [t(11), a], [t(12), a], [t(13), 0]];
    motions.push({ id: `hip-${side}`, target: lg, kind: 'bend', joint: 0, axis: 'y', keys: drop(-35) });
    motions.push({ id: `knee-${side}`, target: lg, kind: 'bend', joint: 1, axis: 'y', keys: drop(22) });
  }
  // head looks down the stoop and at the mouse; tail drops as an air brake on the pull out
  motions.push({ id: 'head', target: uuid('body'), kind: 'bend', joint: 3, axis: 'y',
    keys: [[0, 0], [t(7), 0], [t(8), 12], [t(9), 20], [t(11), 28], [t(13), 5], [t(14), 0]] });
  motions.push({ id: 'tail-brake', target: uuid('tail'), kind: 'bend', joint: 0, axis: 'y',
    keys: [[0, 0], [t(9), 0], [t(10), 18], [t(12), 18], [t(13), 0]] });
  motions.push({ id: 'tail-rudder', target: uuid('tail'), kind: 'bend', joint: 1, axis: 'z', ...sway(5, 3, 0) });
  // the meadow
  const grass = [];
  for (const [key, def] of defsFor(v)) if (/^grass-/.test(key)) grass.push(key);
  grass.forEach((key, i) => {
    const amp = 3 + (i % 4) * 1.2;
    motions.push({ id: `sway-${key}`, target: uuid(key), kind: 'bend', joint: 0, axis: i % 2 ? 'x' : 'y', ...sway(i % 3 === 0 ? -amp : amp, 2 + (i % 3), (i % 5) / 5) });
  });
  for (let i = 0; i < 6; i++) motions.push({ id: `sway-leaf-${i}`, target: uuid(`leaf-${i}`), kind: 'bend', joint: 0, axis: i % 2 ? 'x' : 'y', ...sway(4, 2 + (i % 2), i / 7) });
  motions.push({ id: 'flag-1', target: uuid('flag'), kind: 'bend', joint: 1, axis: 'z', ...sway(16, 6, 0.1) });
  motions.push({ id: 'flag-2', target: uuid('flag'), kind: 'bend', joint: 2, axis: 'z', ...sway(20, 6, 0.22) });
  motions.push({ id: 'flag-0', target: uuid('flag'), kind: 'bend', joint: 0, axis: 'y', ...sway(4, 3, 0.05) });
  motions.push({ id: 'mouse-tail', target: uuid('mouse-tail'), kind: 'bend', joint: 1, axis: 'z', ...sway(14, 5, 0.15) });
  return {
    schema: M.MOTION_SCHEMA,
    model_id: `hawk-v0${v}`,
    name: 'Circle, stoop, pull out, climb',
    description: `One lap is ${round(tm.T)} s: the hawk circles the meadow, folds its wings and stoops onto the mouse, flares, skims the grass with its feet down and climbs back to where it started. Speed follows height (stylised): about ${round(tm.vMax)} in/s at the bottom.`,
    units: 'in', up: 'z',
    loop_s: round(tm.T),
    autoplay: { plays: 2 },
    motions,
  };
}

const NAMES = ['', 'blockout', 'wings', 'head and feet', 'meadow', 'finish', 'motion', 'physics flight'];
const HAWK = [1, 2, 3, 4, 5, 6, 7].map((v) => ({
  id: `hawk-v0${v}`,
  project: 'Hawk',
  header: {
    model_id: `hawk-v0${v}`,
    name: `Hawk V0${v}`,
    description: `Red-tailed hawk from closed skeleton meshes, V0${v}: ${NAMES[v]}. About 22.5 in long, 50 in wingspan (estimates).`,
    units: 'in', up: 'z', world: v >= 7 ? 'hawk-world' : WORLD_ID,
    ...(v >= 4 ? { view: { azimuth_deg: 20 } } : {}),
    materials: v >= 7 ? { ...MATERIALS, ...MATERIALS7 } : MATERIALS,
  },
  defs: defsFor(v),
  ...(v >= 7 ? { motion: (uuid) => FL.motionFlight(v, uuid, defsFor(v).meadowParts) } : v >= 6 ? { motion: (uuid) => motionFor(v, uuid) } : {}),
}));

module.exports = { HAWK, defsFor, motionFor, PATH, HAWK0, MOUSE, timing };
