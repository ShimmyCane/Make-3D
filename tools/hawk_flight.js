// Hawk V07: physical flight over a larger meadow. Used by tools/hawk.js.
//
// One lap of the loop, in the order the hawk flies it (the loop starts on the straight glide, wings level, so the first
// frame is the rest pose):
//   glide    leaves the thermal heading east, wings spread, losing height slowly (drag, gravity)
//   stoop    wings tucked, falls onto the mouse; speed comes from the height lost
//   pull     flares and skims low: wings open, tail down, feet out; the drag of the open wings slows it
//   climb    flaps hard. The thrust is solved so the hawk reaches the bluff at soaring speed (the lap closes)
//   ridge    wind hits the bluff and is pushed up; the hawk rides that rising air along the face without flapping
//   thermal  circles 2.5 turns in a rising column of warm air, climbing with no flapping, then glides away again
//
// Speed: d(v^2/2)/ds = -g sin(slope) - k v^2 + thrust, along the path, with k the drag per inch (wings spread, tucked or
// flared), thrust only when flapping, and the rising air holding the soaring speed. The world is scaled down (about a tenth
// of real size), so g is 150 in/s^2 here, not 386; bank angle uses the same g (a coordinated turn).

const M = require('../js/core/motion.js');

const round = (x) => Math.round(x * 100) / 100;
const r5 = (x) => Math.round(x * 1e5) / 1e5;

const G_EFF = 150;                       // in/s^2, gravity of the scaled world
const V_T = 130;                         // in/s, soaring speed in rising air (about 38 degrees of bank at the thermal's radius)
const K_GLIDE = 0.00147;                 // drag per inch, wings spread (gives a steady glide of about 1 in 5 at 150 in/s)
const K_TUCK = K_GLIDE / 2;              // wings folded
const K_FLARE = K_GLIDE * 5;             // wings and tail opened wide: the air brake
const THERMAL = { c: [-170, 70], r: 140, turns: 2.5, z0: 180, z1: 300 };
const FLAP_HZ = 2.4;
const HOLE_DX = 52;                      // the burrow is this far west of the mouse                     // wing beats per second when climbing

const helix = (phi) => {                 // clockwise from the south point; heading west at phi = 0, east at phi = pi
  const f = phi / (THERMAL.turns * 2 * Math.PI);
  return [THERMAL.c[0] - THERMAL.r * Math.sin(phi), THERMAL.c[1] - THERMAL.r * Math.cos(phi), THERMAL.z0 + (THERMAL.z1 - THERMAL.z0) * f];
};

// ---- centripetal Catmull-Rom between controls, so the glide and the dive do not overshoot
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
function crPoint(P0, P1, P2, P3, u) {
  const t0 = 0, t1 = t0 + Math.sqrt(dist(P0, P1)), t2 = t1 + Math.sqrt(dist(P1, P2)), t3 = t2 + Math.sqrt(dist(P2, P3));
  const t = t1 + (t2 - t1) * u;
  const lerp = (A, B, ta, tb) => A.map((v, i) => ((tb - t) / (tb - ta)) * v + ((t - ta) / (tb - ta)) * B[i]);
  const A1 = lerp(P0, P1, t0, t1), A2 = lerp(P1, P2, t1, t2), A3 = lerp(P2, P3, t2, t3);
  const B1 = lerp(A1, A2, t0, t2), B2 = lerp(A2, A3, t1, t3);
  return lerp(B1, B2, t1, t2);
}

let cache = null;
function flight() {
  if (cache) return cache;
  const dphi = (2 * Math.PI) / 24, end = THERMAL.turns * 2 * Math.PI;
  const ctrl = [
    ['N0', helix(end)], ['g1', [-30, 215, 292]], ['g2', [110, 200, 276]], ['g3', [230, 150, 256]], ['g4', [285, 70, 234]],
    ['d1', [272, -8, 165]], ['d2', [242, -48, 92]], ['d3', [212, -70, 44]], ['d4', [180, -82, 15]],
    ['k1', [146, -92, 11]], ['k2', [112, -98, 15]], ['k3', [74, -106, 52]], ['k4', [12, -112, 92]],
    ['k5', [-55, -100, 122]], ['k6', [-115, -88, 152]], ['S', helix(0)],
  ];
  const chain = [helix(end - 2 * dphi * 1.5), helix(end - dphi * 1.5), ...ctrl.map((c) => c[1]), helix(dphi * 1.5), helix(dphi * 3)];
  const dense = [], idx = {};
  for (let i = 0; i < ctrl.length - 1; i++) {
    const [P0, P1, P2, P3] = [chain[i + 1], chain[i + 2], chain[i + 3], chain[i + 4]];   // two context points come before the first control
    idx[ctrl[i][0]] = dense.length;
    const per = Math.max(2, Math.ceil(dist(P1, P2) / 18));
    for (let k = 0; k < per; k++) dense.push(crPoint(P0, P1, P2, P3, k / per));
  }
  idx.S = dense.length;
  for (let k = 0; k < end / dphi; k++) dense.push(helix(k * dphi));      // the thermal: k = 0 is S, the last is just before N0
  const pts = dense.map((p) => p.map(round));
  // the lap starts 60 in into the glide, where the path is straight, so the first frame can be the rest pose
  let acc = 0, j = 0;
  for (let i = 1; i < pts.length; i++) { acc += dist(pts[i], pts[i - 1]); if (acc >= 60) { j = i; break; } }
  const n = pts.length, rot = pts.slice(j).concat(pts.slice(0, j));
  const ix = Object.fromEntries(Object.entries(idx).map(([k, v]) => [k, (v - j + n) % n]));
  const hawk0 = rot[0];
  // the mouse sits under the lowest point of the skim
  let low = rot[0];
  for (let i = ix.d3; i <= ix.k2; i++) if (rot[i][2] < low[2]) low = rot[i];
  const mouse = [low[0], low[1], 0];
  const phys = physics(rot, ix);
  cache = { pts: rot, idx: ix, hawk0, mouse, phys };
  return cache;
}

// ---- the speed profile from gravity, drag and thrust
function physics(pts, ix) {
  const N = 1800, total = M.pathLength(pts), marks = M.pathMarks(pts), ds = total / N;
  const z = [], u = [];
  for (let i = 0; i <= N; i++) { u.push(i / N); z.push(M.pathAt(pts, i / N).point[2]); }
  // section of each interval, from the waypoint marks
  const secs = [['stoop', marks[ix.g4]], ['pull', marks[ix.d3]], ['climb', marks[ix.k2]], ['ridge', marks[ix.k4]], ['thermal', marks[ix.S]], ['glide', marks[ix.N0]]];
  const secOf = (x) => { let name = 'glide'; for (const [nm, m] of secs) if (x >= m) name = nm; return name; };
  const drag = { glide: K_GLIDE, stoop: K_TUCK, pull: K_FLARE, climb: K_GLIDE, ridge: 0, thermal: 0 };
  const wT = (V_T * V_T) / 2, wMin = (30 * 30) / 2;
  const run = (thrust) => {
    const w = [wT];
    let atRidge = null;
    for (let i = 0; i < N; i++) {
      const name = secOf((i + 0.5) / N), slope = (z[i + 1] - z[i]) / ds;
      if (name === 'ridge' || name === 'thermal') { if (atRidge === null && name === 'ridge') atRidge = w[i]; w.push(wT); continue; }
      const a = name === 'climb' ? thrust : 0;
      w.push(Math.max(wMin, w[i] + ds * (-G_EFF * slope - 2 * drag[name] * w[i] + a)));
    }
    return { w, atRidge: atRidge === null ? w[N] : atRidge };
  };
  // thrust that brings the hawk to the bluff at soaring speed: bisection (more thrust, more speed)
  let lo = 0, hi = 4000, thrust = 0;
  if (run(0).atRidge < wT) {
    for (let k = 0; k < 60; k++) { thrust = (lo + hi) / 2; if (run(thrust).atRidge < wT) lo = thrust; else hi = thrust; }
  }
  const { w } = run(thrust);
  const v = w.map((x) => Math.sqrt(2 * x));
  const tau = [0];
  for (let i = 1; i <= N; i++) tau.push(tau[i - 1] + ds / ((v[i - 1] + v[i]) / 2));
  const T = tau[N];
  const profile = [];
  for (let i = 0; i <= N; i += 3) profile.push([r5(tau[i] / T), r5(i / N)]);
  if (profile[profile.length - 1][0] !== 1) profile.push([1, 1]);
  profile[0] = [0, 0];
  const tOf = (i) => {                    // loop-time fraction at which waypoint i is reached
    const s = marks[i];
    let k = 1; while (k < profile.length - 1 && profile[k][1] < s) k++;
    const [t0, s0] = profile[k - 1], [t1, s1] = profile[k];
    return r5(t0 + (t1 - t0) * ((s - s0) / (s1 - s0 || 1)));
  };
  return { T, total, profile, tOf, v, z, u, thrust, idx_d4: ix.d4, vMax: Math.max(...v), secs, marks };
}

// ---- the meadow, bluff and rising air of V07 (same part keys as V04 where they exist)
function meadow7(add, mesh, rnd) {
  const F = flight(), TC = THERMAL.c;
  const grass = [];
  add('meadow-group', { name: 'Meadow', description: 'ground, grass, leaves, flag post, mouse, bluff and rising air', type: 'group', dimensions: [], position: [0, 0, 0] });
  add('meadow', { name: 'Meadow ground', type: 'cylinder', dimensions: [360, 1], position: [0, 10, 0.5], material: 'meadow', parent: 'meadow-group' });
  add('warm-patch', { name: 'Warm bare ground', description: 'sun-warmed ground under the thermal', type: 'cylinder', dimensions: [95, 0.5], position: [TC[0], TC[1], 1.25], material: 'patch', parent: 'meadow-group' });
  const tufts = [];
  for (let i = 0; i < 14; i++) tufts.push([F.mouse[0] + (rnd() - 0.5) * 90, F.mouse[1] + (rnd() - 0.5) * 60, 5]);
  for (let i = 0; i < 46; i++) {
    const a = rnd() * 6.283, r = 40 + rnd() * 290;
    const x = r * Math.cos(a), y = 10 + r * 0.95 * Math.sin(a);
    if (y < -140 || Math.hypot(x - TC[0], y - TC[1]) < 95) { i--; continue; }     // not on the bluff or the warm patch
    tufts.push([x, y, 4]);
  }
  tufts.forEach(([cx, cy, blades], ti) => {
    for (let b = 0; b < blades; b++) {
      const a = rnd() * 6.283, h = 8 + rnd() * 7, lean = 2 + rnd() * 3.5, ox = (rnd() - 0.5) * 4, oy = (rnd() - 0.5) * 4;
      const x = cx + ox, y = cy + oy, c = Math.cos(a), s = Math.sin(a);
      const key = `grass-${ti}-${b}`;
      grass.push(key);
      mesh(key, 'sheet', `Grass ${ti + 1}.${b + 1}`, { joints: [[x, y, 0.6], [x + c * lean * 0.3, y + s * lean * 0.3, 0.6 + h * 0.55], [x + c * lean, y + s * lean, 0.6 + h]],
        facing: [-s, c, 0], samples: 7, sides: 3, cup: 0.25, rings: [[0, 0.55], [0.55, 0.42], [1, 0.04]] },
        { description: 'a thin blade; double sided', material: (ti + b) % 2 ? 'grass1' : 'grass2', parent: 'meadow-group' });
    }
  });
  const PL = [60, -30];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 6.283 + 0.3, c = Math.cos(a), s = Math.sin(a), len = 15 + (i % 3) * 2.5;
    mesh(`leaf-${i}`, 'sheet', `Leaf ${i + 1}`, { joints: [[PL[0], PL[1], 0.6], [PL[0] + c * len * 0.45, PL[1] + s * len * 0.45, 0.6 + len * 0.42], [PL[0] + c * len, PL[1] + s * len, 0.6 + len * 0.5]],
      facing: [-s, c, 0], samples: 8, sides: 5, cup: 0.35, rings: [[0, 0.5], [0.3, 3.3], [0.65, 3.6], [1, 0.25]] },
      { description: 'a wide leaf, cupped; double sided', material: 'leaf', parent: 'meadow-group' });
  }
  // flag post: the wind comes from the south (it is what the bluff lifts), so the pennant streams north
  const FP = [100, -60];
  add('post', { name: 'Flag post', type: 'cylinder', dimensions: [1.1, 60], position: [FP[0], FP[1], 30.6], material: 'post', parent: 'meadow-group' });
  mesh('flag', 'sheet', 'Pennant flag', { joints: [[FP[0], FP[1] + 1, 54], [FP[0], FP[1] + 13, 53.2], [FP[0], FP[1] + 25, 52.2], [FP[0], FP[1] + 37, 51]],
    facing: [0, 0, 1], samples: 14, sides: 5, rings: [[0, 6], [0.5, 4.4], [1, 0.25]] },
    { description: 'a thin pennant, streaming north in the wind; double sided; flutters', material: 'flag', parent: 'meadow-group' });
  const m = F.mouse;
  // the burrow: a dark hole in a low rim, due west of the mouse (the way it faces)
  add('hole-rim', { name: 'Burrow rim', type: 'cylinder', dimensions: [8.5, 0.6], position: [m[0] - HOLE_DX, m[1], 1.3], material: 'mound', parent: 'meadow-group' });
  add('hole', { name: 'Burrow hole', description: 'the mouse bolts for this', type: 'cylinder', dimensions: [5, 0.3], position: [m[0] - HOLE_DX, m[1], 1.55], material: 'hole', parent: 'meadow-group' });
  add('mouse-rig', { name: 'Mouse', description: 'the mouse and its tail and ears; the group runs to the hole', type: 'group', dimensions: [], position: [m[0], m[1], 0], parent: 'meadow-group' });
  mesh('mouse', 'loft', 'Mouse body', { joints: [[m[0] - 5, m[1], 1.6], [m[0] - 2, m[1], 1.9], [m[0] + 2, m[1], 1.7], [m[0] + 4.5, m[1], 1.4]], facing: [0, 1, 0], samples: 12, sides: 10,
    rings: [[0, 0.3, 0.3], [0.2, 0.9, 0.85], [0.55, 1.35, 1.25], [0.85, 1.0, 0.95], [1, 0.3, 0.3]] },
    { description: 'closed mesh, nose toward -x', material: 'mouse', parent: 'mouse-rig' });
  mesh('mouse-tail', 'loft', 'Mouse tail', { joints: [[m[0] + 4.2, m[1], 1.3], [m[0] + 7.5, m[1] + 1.2, 1.1], [m[0] + 10, m[1] + 0.2, 1.4], [m[0] + 12.5, m[1] + 1.6, 1.9]], facing: [0, 0, 1], samples: 10, sides: 6,
    rings: [[0, 0.3, 0.3], [0.5, 0.18, 0.18], [1, 0.05, 0.05]] }, { description: 'a thin closed tube on a skeleton line; twitches', material: 'mouse', parent: 'mouse-rig' });
  for (const [side, sg] of [['l', 1], ['r', -1]]) {
    mesh(`mouse-ear-${side}`, 'sheet', `Mouse ${side === 'l' ? 'left' : 'right'} ear`, { joints: [[m[0] - 3.2, m[1] + 0.8 * sg, 2.6], [m[0] - 3.4, m[1] + 1.4 * sg, 3.7]],
      facing: [1, 0, 0], samples: 5, sides: 5, cup: 0.4, rings: [[0, 0.3], [0.5, 0.65], [1, 0.1]] }, { description: 'a thin round ear; double sided', material: 'ear', parent: 'mouse-rig' });
  }
  // the bluff: three rock masses, closed meshes, along the south edge. Wind from the south is pushed up its face.
  const rock = (key, name, xs, y, hz, w, h) => mesh(key, 'loft', name, {
    joints: xs.map((x, i) => [x, y + (i % 2) * 3, hz + (i % 2)]), facing: [0, 1, 0], samples: 16, sides: 14,
    rings: [[0, w * 0.35, h * 0.4], [0.2, w * 0.9, h * 0.9], [0.5, w, h], [0.8, w * 0.85, h * 0.8], [1, w * 0.3, h * 0.4]] },
    { description: 'rock: a closed mesh', material: 'rock', parent: 'meadow-group' });
  rock('rock-a', 'Bluff rock A', [-120, -10, 90], -188, 34.5, 48, 33);
  rock('rock-b', 'Bluff rock B', [70, 140, 215], -184, 27.5, 44, 26);
  rock('rock-c', 'Bluff rock C', [-200, -150, -100], -180, 21.5, 36, 20);
  // wind up the face: thin translucent ribbons that follow the air over the crest
  const ribbons = [];
  for (let i = 0; i < 9; i++) {
    const x = -140 + i * 42, key = `wind-${i}`;
    ribbons.push(key);
    mesh(key, 'sheet', `Updraft ribbon ${i + 1}`, { joints: [[x, -290, 4], [x, -255, 14], [x, -226, 60], [x, -190, 84], [x, -140, 108], [x, -100, 128]],
      facing: [1, 0, 0], samples: 20, sides: 3, rings: [[0, 0.5], [0.3, 6], [0.7, 6], [1, 0.5]] },
      { description: 'wind pushed up the face of the bluff (translucent)', material: 'wind', parent: 'meadow-group' });
  }
  // the thermal: translucent bands that spiral up from the warm ground. The whole group turns slowly.
  add('thermal', { name: 'Rising air (thermal)', description: 'warm air rising over the bare ground; the hawk circles in it', type: 'group', dimensions: [], position: [TC[0], TC[1], 0], parent: 'meadow-group' });
  for (let j = 0; j < 8; j++) {
    const r = 45 + j * 12, a0 = (j / 8) * 6.283, z0 = 6 + j * 30, joints = [];
    for (let k = 0; k <= 14; k++) {
      const a = a0 + k * 0.38;
      joints.push([TC[0] + r * Math.cos(a), TC[1] + r * Math.sin(a), z0 + k * 9.5]);
    }
    mesh(`air-${j}`, 'sheet', `Rising air band ${j + 1}`, { joints, facing: [0, 0, 1], samples: 28, sides: 3, rings: [[0, 0.5], [0.5, 4.5], [1, 0.5]] },
      { description: 'a band of rising warm air (translucent)', material: 'airband', parent: 'thermal' });
  }
  return { grass, ribbons };
}

// ---- the mouse bolts for its hole as the hawk flares in, drops out of sight, comes up again later and walks home
function mouseRun(F, P, uuid) {
  const [mx, my] = F.mouse, hx = mx - HOLE_DX;
  // straight, level and collinear around the start, so the heading there is exactly the way it faces (the rest pose)
  const pts = [
    [mx, my, 0], [mx - 13, my, 0], [mx - 26, my, 0], [hx + 5, my, 0], [hx - 1, my, -1.5], [hx - 4, my, -7], [hx - 7, my + 2, -7],
    [hx - 3, my + 9, -1], [hx + 10, my + 24, 0], [mx - 6, my + 36, 0], [mx + 22, my + 28, 0], [mx + 31, my + 12, 0], [mx + 22, my, 0], [mx + 11, my, 0],
  ];
  const marks = M.pathMarks(pts), T = P.T;
  const tb = P.tOf(P.idx_d4) * T;                                  // the bolt starts as the hawk flares in
  const at = (sec, i) => [r5(Math.min(sec, T) / T), r5(marks[i])];
  const profile = [[0, 0], at(tb, 0), at(tb + 0.35, 3), at(tb + 0.5, 5), at(tb + 0.6, 6), at(tb + 12, 6), at(tb + 12.8, 7), at(T - 1.2, 13), [1, 1]];
  return { id: 'mouse-bolt', target: uuid('mouse-rig'), kind: 'path', points: pts, profile, face: 'tangent', rest_heading_deg: 180, pivot: [mx, my, 0], cycles: 1 };
}

// ---- the motion file for V07
const sway = (amp, cycles, phase) => {
  const mid = -amp * Math.sin(2 * Math.PI * phase), q = (x) => Math.round(x * 1e4) / 1e4;
  return { from: q(mid - amp), to: q(mid + amp), cycles, phase: q(phase) };
};

function motionFlight(v, uuid, parts) {
  const F = flight(), P = F.phys, TC = THERMAL.c;
  const t = (label) => P.tOf(F.idx[label]);
  const motions = [];
  motions.push({ id: 'fly', target: uuid('hawk'), kind: 'path', points: F.pts.map((p) => [...p]), profile: P.profile, face: 'flight',
    gravity: G_EFF, bank_gain: 1, max_bank_deg: 55, half_span: 25, ground_z: 1, step: 0.0012, pivot: F.hawk0, cycles: 1 });
  const FLAPS = Math.round(FLAP_HZ * P.T);
  // flapping: only when climbing under its own power (and the skim exit); none in the stoop, the glide or in rising air
  const flapEnv = [[0, 0], [t('k2'), 0], [t('k3'), 1], [t('k4'), 0.8], [t('k5'), 0.25], [t('k6'), 0]];
  const tuck = (peak) => [[0, 0], [t('g4'), 0], [t('d1'), peak * 0.6], [t('d2'), peak], [t('d3'), peak * 0.8], [t('d4'), 0]];
  for (const [side, sg] of [['l', 1], ['r', -1]]) {
    const w = uuid(`wing-${side}`);
    for (const [j, amp, ph] of [[0, 36, 0], [1, 22, 0.08], [2, 28, 0.16]]) {
      motions.push({ id: `flap-${side}-${j}`, target: w, kind: 'bend', joint: j, axis: 'x', ...sway(amp * sg, FLAPS, ph), envelope: flapEnv });
    }
    motions.push({ id: `sweep-${side}`, target: w, kind: 'bend', joint: 0, axis: 'z', keys: tuck(55 * sg) });
    motions.push({ id: `fold-${side}-1`, target: w, kind: 'bend', joint: 1, axis: 'z', keys: tuck(40 * sg) });
    motions.push({ id: `fold-${side}-2`, target: w, kind: 'bend', joint: 2, axis: 'z', keys: tuck(30 * sg) });
    const lg = uuid(`leg-${side}`);
    const drop = (a) => [[0, 0], [t('d3'), 0], [t('d4'), a], [t('k1'), a], [t('k2'), 0]];
    motions.push({ id: `hip-${side}`, target: lg, kind: 'bend', joint: 0, axis: 'y', keys: drop(-35) });
    motions.push({ id: `knee-${side}`, target: lg, kind: 'bend', joint: 1, axis: 'y', keys: drop(22) });
  }
  motions.push({ id: 'head', target: uuid('body'), kind: 'bend', joint: 3, axis: 'y',
    keys: [[0, 0], [t('g4'), 0], [t('d1'), 14], [t('d2'), 22], [t('d4'), 30], [t('k2'), 8], [t('k3'), 0]] });
  motions.push({ id: 'tail-brake', target: uuid('tail'), kind: 'bend', joint: 0, axis: 'y',
    keys: [[0, 0], [t('d2'), 0], [t('d3'), 20], [t('k1'), 20], [t('k2'), 0]] });
  motions.push({ id: 'tail-rudder', target: uuid('tail'), kind: 'bend', joint: 1, axis: 'z', ...sway(5, 6, 0) });
  parts.grass.forEach((key, i) => {
    const amp = 3 + (i % 4) * 1.2;
    motions.push({ id: `sway-${key}`, target: uuid(key), kind: 'bend', joint: 0, axis: i % 2 ? 'x' : 'y', ...sway(i % 3 === 0 ? -amp : amp, 3 + (i % 4), (i % 5) / 5) });
  });
  for (let i = 0; i < 6; i++) motions.push({ id: `sway-leaf-${i}`, target: uuid(`leaf-${i}`), kind: 'bend', joint: 0, axis: i % 2 ? 'x' : 'y', ...sway(4, 3 + (i % 2), i / 7) });
  motions.push({ id: 'flag-1', target: uuid('flag'), kind: 'bend', joint: 1, axis: 'z', ...sway(16, 12, 0.1) });
  motions.push({ id: 'flag-2', target: uuid('flag'), kind: 'bend', joint: 2, axis: 'z', ...sway(20, 12, 0.22) });
  motions.push({ id: 'flag-0', target: uuid('flag'), kind: 'bend', joint: 0, axis: 'x', ...sway(4, 6, 0.05) });
  motions.push({ id: 'mouse-tail', target: uuid('mouse-tail'), kind: 'bend', joint: 1, axis: 'z', ...sway(14, 8, 0.15) });
  // the air: ribbons up the bluff ripple along their length; the thermal turns about its axis
  parts.ribbons.forEach((key, i) => {
    for (const [j, amp, ph] of [[1, 5, 0], [2, 7, 0.12], [3, 6, 0.24]]) {
      motions.push({ id: `${key}-${j}`, target: uuid(key), kind: 'bend', joint: j, axis: 'x', ...sway(amp, 8, (ph + i * 0.07) % 1) });
    }
  });
  motions.push(mouseRun(F, P, uuid));
  motions.push({ id: 'thermal-turn', target: uuid('thermal'), kind: 'spin', axis: 'z', pivot: [TC[0], TC[1], 0], cycles: 3 });
  return {
    schema: M.MOTION_SCHEMA,
    model_id: `hawk-v0${v}`,
    name: 'Soar, glide, stoop, flare, climb, ride the ridge',
    description: `One lap is ${round(P.T)} s. The hawk circles 2.5 turns up a thermal with no flapping, glides away, stoops onto the mouse (about ${Math.round(P.vMax)} in/s at the bottom), flares with its feet out, flaps hard (${FLAPS} beats a lap at ${FLAP_HZ} per second, only while climbing) and rides the bluff's updraft back into the thermal. Speed comes from gravity, drag and flap thrust along the path (g = ${G_EFF} in/s^2 in this scaled world).`,
    units: 'in', up: 'z',
    loop_s: round(P.T),
    autoplay: { plays: 2 },
    physics: { gravity_in_s2: G_EFF, soaring_speed_in_s: V_T, drag_per_in: { glide: K_GLIDE, tucked: K_TUCK, flared: K_FLARE },
      climb_thrust_in_s2: round(P.thrust), flaps_per_s: FLAP_HZ, thermal: THERMAL, path_length_in: round(P.total),
      sections: P.secs.map(([name, m]) => ({ name, path_fraction: r5(m) })) },
    motions,
  };
}

module.exports = { flight, meadow7, motionFlight, THERMAL, G_EFF, V_T, K_GLIDE, K_TUCK, K_FLARE, FLAP_HZ };
