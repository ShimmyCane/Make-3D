// Robot cape: built from the Quick Detail "Robot Cape" (sketch_details id f3e32d04-d6d3-4fd9-8553-0a38736c1939,
// tags make3d). Used by Robot loop V05 (tools/robot_loop.js).
//
// What the sketch says (from its notes): the cape has a closed outline, a yellow border round it, brown tassels
// at the bottom, round holes in the middle (circles), and it should move like fabric.
//
// How it is built:
//   - The outline becomes a double-sided sheet ("cape") on a 7-joint skeleton that runs down the robot's back
//     from the shoulders. The skeleton follows the outline's centre; the rings give its half width.
//   - The sketch is drawn with y pointing down, so sketch y maps to height. The cape is sized to the robot:
//     22 in from shoulder to near the ground, with the drawing's proportions. The drawn 7'-10" does not fit a
//     3 ft robot, so the drawn size is not used.
//   - The border is a row of small beads on the outline. The tassels are short brown cylinders at the bottom.
//   - The holes cannot be cut in a sheet, so each circle is a coloured disc on the back of the cape.
//   - Motion: a wave runs down the cape (flutter, one bend per joint), and the lower cape sways sideways when
//     the robot turns. The size of both follows how sharply the walk turns (its heading rate), so tight turns
//     make the cape flow more. Every bend is 0 at the start, so the first frame is the rest pose.
//
// Sketch points are [x, y] in sketch units. The outline and border are every fifth point of the stroke; the
// tassels are their two end points; the holes are every fifth point of each circle.

const M = require('../js/core/motion.js');

// ---- sketch data (Quick Detail "Robot Cape")
const OUTLINE = [[-5.50,14.01],[-5.50,10.51],[-4.72,5.58],[-3.66,-0.13],[-2.60,-4.88],[-1.87,-8.33],[-1.77,-9.62],[-1.50,-10.82],[-1.13,-11.88],[-1.08,-10.82],[-1.08,-9.48],[-1.08,-8.42],[-1.08,-7.83],[-1.04,-7.18],[-0.90,-6.17],[-0.58,-5.29],[-0.07,-4.37],[0.58,-3.59],[1.96,-3.03],[3.48,-2.99],[4.81,-3.77],[6.43,-6.26],[7.30,-8.42],[7.72,-10.04],[7.99,-11.33],[8.18,-12.43],[8.22,-13.12],[8.36,-12.94],[8.45,-11.05],[8.45,-8.65],[8.45,-5.89],[8.50,-3.08],[8.64,-0.32],[8.64,2.22],[8.68,4.80],[8.73,7.61],[8.73,10.42],[8.73,12.44],[8.82,14.38],[8.91,15.30],[8.55,15.62],[6.52,15.62],[3.99,15.21],[1.68,14.56],[-0.21,14.33],[-2.10,14.19],[-4.08,14.06],[-5.27,13.87]];
const BORDER = [[-0.99,-7.23],[-1.13,-5.43],[-1.54,-3.22],[-2.00,-1.24],[-2.51,0.70],[-3.02,2.82],[-3.48,4.84],[-3.98,6.78],[-4.45,8.76],[-4.86,10.51],[-5.14,11.89],[-5.18,12.67],[-4.91,13.32],[-3.11,13.32],[-0.94,13.41],[1.22,13.60],[2.93,13.83],[3.89,14.10],[4.68,14.24],[5.55,14.29],[6.43,14.33],[7.30,14.38],[8.36,14.47],[8.64,14.15],[8.82,12.40],[8.87,10.79],[8.87,8.57],[8.87,5.86],[8.87,3.28],[9.01,1.02],[9.01,-1.05],[8.96,-2.90],[8.91,-4.60],[8.91,-6.26],[8.68,-7.78],[8.59,-9.02],[8.50,-10.04],[8.32,-10.41],[7.90,-9.07],[7.12,-7.36],[6.47,-5.52],[5.41,-3.91],[4.26,-2.67],[3.02,-2.11],[1.22,-1.93],[-0.21,-2.25],[-0.94,-3.91],[-1.31,-5.20]];
// tassels: [top, bottom] end points of each freehand stroke
const TASSELS = [[[-4.91, 13.73], [-5.50, 20.14]], [[-2.14, 13.69], [-1.64, 20.51]], [[0.44, 14.33], [1.31, 20.55]],
  [[3.16, 14.01], [4.45, 20.46]], [[5.60, 15.02], [7.44, 20.69]], [[8.09, 15.07], [10.02, 19.81]]];
// holes: the circles, as sampled points; colour from the sketch
const HOLES = [
  { c: 'blue', pts: [[4.54, 5.95], [4.17, 7.52], [5.37, 8.39], [7.03, 7.56], [7.12, 5.90], [5.78, 5.58], [4.72, 5.90]] },
  { c: 'blue', pts: [[0.25, 7.28], [-0.53, 8.57], [-0.07, 10.00], [1.87, 10.33], [2.51, 8.48], [1.91, 7.19], [1.08, 7.05], [-0.07, 7.42]] },
  { c: 'blue', pts: [[5.32, 9.68], [4.49, 10.88], [4.49, 12.31], [5.92, 13.09], [7.39, 12.77], [8.04, 11.48], [8.04, 10.00], [6.56, 9.77], [5.41, 10.00]] },
  { c: 'blue', pts: [[-3.62, 9.45], [-4.63, 11.06], [-3.85, 12.49], [-2.14, 12.17], [-1.50, 10.28], [-2.51, 9.22], [-3.75, 9.22]] },
  { c: 'blue', pts: [[6.70, -3.77], [6.43, -2.53], [6.75, -1.84], [7.67, -1.84], [7.99, -2.76], [7.81, -3.50], [7.16, -3.59]] },
  { c: 'red', pts: [[-1.22, -0.92], [-2.14, 0.74], [-1.68, 1.99], [-0.58, 2.26], [0.44, 1.43], [0.81, -0.32], [0.25, -1.05], [-1.04, -1.15]] },
  { c: 'red', pts: [[4.22, -0.64], [3.16, 1.07], [3.29, 2.22], [4.77, 2.68], [6.24, 1.94], [6.70, 0.19], [6.24, -0.82], [5.18, -1.10], [4.45, -1.10]] },
  { c: 'red', pts: [[-1.04, 3.74], [-2.10, 4.61], [-2.51, 5.95], [-1.64, 6.78], [-0.39, 5.99], [-0.25, 4.70], [-1.17, 4.11]] },
  { c: 'red', pts: [[1.54, 2.63], [0.67, 4.34], [1.36, 5.40], [2.88, 4.89], [3.06, 3.46], [2.19, 2.68], [1.36, 2.59]] },
];

// ---- sketch to model
const Y_TOP = -13.31, Y_BOT = 15.62;     // the outline's vertical extent in sketch units
const X_MID = 1.69;                       // the outline's horizontal centre in sketch units
const CAPE_H = 22;                        // inches, shoulder to near the ground
const K = CAPE_H / (Y_BOT - Y_TOP);       // inches per sketch unit (proportions kept)
const Z_TOP = 26.5, Z_BOT = Z_TOP - CAPE_H;
const CAPE_X = -5;                        // the cape hangs behind the back (the torso's back is at x -4)
const CUP = -0.12;                        // the middle bulges backwards, away from the body
const N = 7;                              // joints down the cape
const RINGS = 9;                          // width samples down the cape
const KEYS = 96;                          // keys per loop (0.4 s each for a 38 s loop)

const zOf = (y) => Z_TOP - (y - Y_TOP) * K;
const yOf = (x) => (x - X_MID) * K;       // sketch x to model Y (across the robot)
const tOf = (y) => (y - Y_TOP) / (Y_BOT - Y_TOP); // 0 at the top, 1 at the bottom

// Left and right edge of the outline at height y (from the nearest outline points).
function bandAt(y) {
  const near = OUTLINE.map((p) => [Math.abs(p[1] - y), p[0]]).sort((a, b) => a[0] - b[0]).slice(0, 8).map((q) => q[1]);
  return [Math.min(...near), Math.max(...near)];
}

// Skeleton joints (model coordinates) and the half width at each ring.
function skeleton() {
  const joints = [];
  for (let j = 0; j < N; j++) {
    const t = j / (N - 1), y = Y_TOP + t * (Y_BOT - Y_TOP);
    const [lo, hi] = bandAt(y);
    joints.push([CAPE_X, yOf((lo + hi) / 2), zOf(y)]);
  }
  const rings = [];
  for (let i = 0; i < RINGS; i++) {
    const t = i / (RINGS - 1), y = Y_TOP + t * (Y_BOT - Y_TOP);
    const [lo, hi] = bandAt(y);
    rings.push([round(t), round(Math.max(0.15, ((hi - lo) / 2) * K))]);
  }
  return { joints, rings };
}
const round = (x) => Math.round(x * 100) / 100;

// The joint nearest to a model point (by height), for attaching small parts.
function nearestJoint(joints, p) {
  let best = 0, bd = Infinity;
  joints.forEach((q, j) => { const d = Math.hypot(q[1] - p[1], q[2] - p[2]); if (d < bd) { bd = d; best = j; } });
  return best;
}

// Rest-pose box of the sheet (the scene tool writes it; rules and bounds use it).
function boxOf(sk) {
  const ys = sk.joints.map((j) => j[1]);
  const wmax = Math.max(...sk.rings.map((r) => r[1]));
  const ymin = Math.min(...ys) - wmax, ymax = Math.max(...ys) + wmax;
  return { dims: [round(Math.abs(CUP) * wmax + 0.2), round(ymax - ymin), round(Z_TOP - Z_BOT)],
    position: [CAPE_X, round((ymin + ymax) / 2), round((Z_TOP + Z_BOT) / 2)] };
}

// The cape's parts, added to a scene through add(key, def). Parents: a group 'cape-group' under 'upper'.
function capeDefs(add) {
  const sk = skeleton();
  const box = boxOf(sk);
  add('cape-group', { name: 'Cape', description: 'hangs from the shoulders; flows with the walk and in tight turns', type: 'group',
    dimensions: [], position: [CAPE_X, 0, Z_TOP], parent: 'upper', tags: ['show:cape'] });
  add('cape', { name: 'Cape cloth', description: 'double-sided sheet on a 7-joint skeleton; a wave runs down it', type: 'sheet',
    dimensions: box.dims, position: box.position, material: 'cape', parent: 'cape-group',
    shape: { joints: sk.joints, facing: [0, 1, 0], samples: N, sides: 9, rings: sk.rings, cup: CUP } });
  // border: beads on the outline, each riding its nearest joint
  BORDER.forEach((p, i) => {
    if (i % 2) return;
    const pos = [CAPE_X - 0.05, yOf(p[0]), zOf(p[1])];
    add(`trim-${i + 1}`, { name: `Border bead ${i + 1}`, type: 'sphere', dimensions: [0.32], position: pos, material: 'banana',
      parent: 'cape-group', attach: { to: 'cape', joint: nearestJoint(sk.joints, pos) } });
  });
  // tassels: short brown cylinders from the bottom edge, hanging
  TASSELS.forEach(([top, bot], i) => {
    const len = (bot[1] - top[1]) * K;
    const x = yOf((top[0] + bot[0]) / 2), zc = zOf((top[1] + bot[1]) / 2);
    const pos = [CAPE_X, x, zc];
    add(`tassel-${i + 1}`, { name: `Tassel ${i + 1}`, description: 'brown fringe at the bottom', type: 'cylinder', dimensions: [0.28, round(len)],
      position: pos, material: 'peel', parent: 'cape-group', attach: { to: 'cape', joint: nearestJoint(sk.joints, [0, x, zOf(top[1])]) } });
  });
  // holes: each circle as a disc on the back of the cape, in its sketch colour
  HOLES.forEach((h, i) => {
    const cx = h.pts.reduce((s, p) => s + p[0], 0) / h.pts.length, cy = h.pts.reduce((s, p) => s + p[1], 0) / h.pts.length;
    const r = h.pts.reduce((s, p) => s + Math.hypot(p[0] - cx, p[1] - cy), 0) / h.pts.length * K;
    const pos = [CAPE_X - 0.5, yOf(cx), zOf(cy)];
    add(`hole-${i + 1}`, { name: `Hole ${i + 1}`, description: `${h.c} circle in the sketch, a disc on the back`, type: 'cylinder',
      dimensions: [round(r), 0.25], position: pos, rotation_y: 90, material: h.c === 'red' ? 'accent' : 'head',
      parent: 'cape-group', attach: { to: 'cape', joint: nearestJoint(sk.joints, pos) } });
  });
}

// ---- motion: the wave and the sway, from the walk's turn rate
// path: the walk's points (3-D, closed). Returns the turn rate, smoothed and lagged, centred, scaled to +-1.
function turnSignal(path) {
  const H = [];
  for (let i = 0; i <= KEYS; i++) H.push(M.pathAt(path, (i % KEYS) / KEYS).heading);
  const w = [];
  for (let i = 0; i < KEYS; i++) {
    let d = H[i + 1] - H[i];
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    w.push(d * KEYS);
  }
  // smooth round the loop (Gaussian, sigma 1.5 samples), then lag one sample (about 0.4 s)
  const sm = w.map((_, i) => {
    let s = 0, sw = 0;
    for (let j = -4; j <= 4; j++) { const g = Math.exp(-(j * j) / (2 * 1.5 * 1.5)); s += g * w[(i + j + KEYS * 10) % KEYS]; sw += g; }
    return s / sw;
  });
  const lagged = sm.map((_, i) => sm[(i - 1 + KEYS) % KEYS]);
  const mean = lagged.reduce((a, b) => a + b, 0) / KEYS;
  const c = lagged.map((v) => v - mean);
  const peak = Math.max(...c.map(Math.abs)) || 1;
  return c.map((v) => v / peak);
}

const SWAY_DEG = 14;        // the lower cape swings this far sideways at the tightest turn
const FLUTTER_DEG = [2.5, 3.5]; // base and extra flutter per joint (the extra grows with the turn)
const WAVE_CYCLES = 3;      // waves round the loop
const WAVE_STEP = 0.9;      // radians of phase from one joint to the next (the wave runs down)

// The bends (kind "bend") for the cape, as keys on the cape's skeleton. Each key list starts at 0.
function capeMotions(uuid, path) {
  const s = turnSignal(path);
  const keysOf = (f) => {
    const raw = Array.from({ length: KEYS }, (_, i) => f(i));
    const base = raw[0];
    return raw.map((v, i) => [round(i / KEYS), round(v - base)]);
  };
  const out = [{ id: 'cape-sway', target: uuid, kind: 'bend', joint: 0, axis: 'x', keys: keysOf((i) => -SWAY_DEG * s[i]) }];
  for (let j = 1; j < N; j++) {
    out.push({ id: `cape-wave-${j}`, target: uuid, kind: 'bend', joint: j, axis: 'y',
      keys: keysOf((i) => (FLUTTER_DEG[0] + FLUTTER_DEG[1] * Math.abs(s[i])) *
        Math.sin((2 * Math.PI * WAVE_CYCLES * i) / KEYS - j * WAVE_STEP)) });
  }
  return out;
}

module.exports = { capeDefs, capeMotions, skeleton, turnSignal, CAPE_X, Z_TOP, Z_BOT, OUTLINE, BORDER, TASSELS, HOLES };
