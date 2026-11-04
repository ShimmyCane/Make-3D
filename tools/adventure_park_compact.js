// Adventure Coaster Park, compact, curved and animated: increments V11 to V15, built on the same park as adventure_park.js.
// V11 compacts the footprint to about half the V10 area (about 300 by 250 ft instead of 600 by 400 ft). Rides keep
// their capacity. Track is curved: a smooth spline runs through each plan point. Thunder Trail's lift is 60 ft (a test
// model, and more fun). Speeds come from physics: the chain pulls at a set speed up the lift, gravity sets the speed
// down the drops, and rolling resistance and drag take energy away (see the physics block). Then each ride is animated:
//   V12 Pip's cars and Thunder Trail's cars run their tracks.
//   V13 the teacups spin; Bumble River boats drift; Splash Falls boats ride the lift and drop into the pool.
//   V14 the Sky Wheel turns (new, a show ride, not counted in capacity); flags wave; balloons bob.
//   V15 the plaza fountain plays in a wave. Every ride now moves.
// Sizes are planning estimates. Feet in, inches out. Z up, ground z = 0. Position = centre of each box.
// Motion is a separate file per version (make3d.motion/0.1). One loop = one real lap of Thunder Trail.
//
// One code path per version: defsFor(v). Version N adds a block with "if (v >= N)". Older versions stay reproducible.

const M = require('../js/core/motion.js');

const WORLD_ID = 'adventure-park-world';
const F = 12;                    // inches per foot
const PPH = 1000;                // capacity, persons an hour; the Sky Wheel is a show ride and is not counted
const rnd = (n) => Math.round(n * 1000) / 1000;
const DEG = 180 / Math.PI;

const MATERIALS = {
  path: { color: '#f4e7cf', opacity: 1 },
  stone: { color: '#e7e2d6', opacity: 1 },
  track: { color: '#f29a7e', opacity: 1 },
  steel: { color: '#b9c0ca', opacity: 1 },
  car: { color: '#ffc09a', opacity: 1 },
  cup: { color: '#f7d1e0', opacity: 1 },
  water: { color: '#a6e3d7', opacity: 0.9 },
  boat: { color: '#9cc8f0', opacity: 1 },
  wood: { color: '#e2b98f', opacity: 1 },
  roof: { color: '#f7a8a0', opacity: 1 },
  cream: { color: '#fff8e7', opacity: 1 },
  fence: { color: '#fffdf6', opacity: 1 },
  red: { color: '#f08080', opacity: 1 },
  green: { color: '#9ed39a', opacity: 1 },
  leaf: { color: '#8fcf8a', opacity: 1 },
  trunk: { color: '#b98a63', opacity: 1 },
  lamp: { color: '#fff1a8', opacity: 1 },
  flower: { color: '#f6a6c1', opacity: 1 },
  flag: { color: '#ffd36e', opacity: 1 },
  lavender: { color: '#c7b2ea', opacity: 1 },
  mint: { color: '#9fd8c0', opacity: 1 },
  sky: { color: '#bfe3f7', opacity: 0.85 },
  skin: { color: '#ffd9b8', opacity: 1 },
};

// ---------- plan (feet). Thunder Trail is the V10 coaster scaled into the compact plan.
const TH_SRC = [
  [120, 60, 4], [140, 60, 30], [158, 60, 60], [180, 60, 8], [200, 50, 22], [230, 40, 6], [250, 60, 40],
  [265, 100, 52], [250, 140, 20], [215, 150, 12], [190, 130, 30], [170, 110, 18], [150, 100, 10], [130, 95, 5], [120, 80, 4],
];
const TH_K = 0.55;               // plan scale
const TH = TH_SRC.map((p) => [70 + (p[0] - 192) * TH_K, 62 + (p[1] - 95) * TH_K, Math.max(2, p[2])]);

const PIP = { cx: -92, cy: -40, rx: 36, ry: 24 };
const PIP_CTRL = Array.from({ length: 12 }, (_, k) => {
  const t = (2 * Math.PI * k) / 12;
  return [PIP.cx + PIP.rx * Math.cos(t), PIP.cy + PIP.ry * Math.sin(t), 6 + 2 * Math.sin(2 * t)];
});
// Splash Falls: the boats' path up the lift, over the top, down into the pool, then back on the conveyor.
// Heights are the boat centre, 2 ft above the lift and drop boxes.
const SP_CTRL = [[-138, 100, 3], [-116, 100, 27], [-94, 100, 2.5], [-70, 100, 2.5]];

const TEA = { x: 74, y: -48 };
const BUMBLE = { x: -68, y: 58 };
const SPLASH = { x: -98, y: 100 };
const SKY = { x: 130, y: -30, z: 36, r: 26 };
const FOUNTAIN = { x: 0, y: 0 };

// ---------- curves and physics (feet, seconds). Gravity and friction are real; the time scale is real time.
const G = 32.2;                  // gravity, ft/s^2
const ROLL = 0.015;              // rolling resistance and air drag, as a fraction of g (energy lost per foot)
const V_CHAIN = 6;               // chain lift speed, ft/s
const V_CONV = 4;                // conveyor return speed, ft/s
const V_MIN = 3;                 // the lowest speed on a hill, so a car never stalls
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// Closed Catmull-Rom spline through control points, about `spacing` ft between samples. No repeated end point.
function spline(ctrl, spacing) {
  const n = ctrl.length, out = [];
  for (let i = 0; i < n; i++) {
    const p0 = ctrl[(i - 1 + n) % n], p1 = ctrl[i], p2 = ctrl[(i + 1) % n], p3 = ctrl[(i + 2) % n];
    const k = Math.max(2, Math.ceil(dist(p1, p2) / spacing));
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      out.push([0, 1, 2].map((c) => 0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * t +
        (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
    }
  }
  return out;
}
// Arc length along a closed path: cumulative s at each point, and the total including the closing segment.
function arcLen(pts) {
  const s = [0];
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + dist(pts[i - 1], pts[i]));
  return { s, total: s[s.length - 1] + dist(pts[pts.length - 1], pts[0]) };
}
const nearest = (pts, p) => pts.reduce((best, q, i) => (dist(q, p) < dist(pts[best], p) ? i : best), 0);
// Speed at each point. Up to iTop the chain pulls at V_CHAIN. Past the top, energy gives
// v^2 = V_CHAIN^2 + 2g(zTop - z) - 2 * ROLL * g * distance. Past iRet (the return leg) the conveyor sets V_CONV.
function rideSpeeds(pts, iTop, iRet) {
  const { s } = arcLen(pts), zTop = pts[iTop][2], sTop = s[iTop];
  return pts.map((p, i) => {
    if (i <= iTop) return V_CHAIN;
    if (i > iRet) return V_CONV;
    const v2 = V_CHAIN * V_CHAIN + 2 * G * (zTop - p[2]) - 2 * ROLL * G * (s[i] - sTop);
    return Math.sqrt(Math.max(V_MIN * V_MIN, v2));
  });
}
// Time profile for a closed path: time per piece = length / average speed. Returns the loop time (s) and a profile
// [[t, s], ...] of loop fraction against path fraction, as the motion file needs.
function timeProfile(pts, v, N = 72) {
  const { s, total } = arcLen(pts);
  const px = [...pts, pts[0]], sx = [...s, total], vx = [...v, v[0]];
  const tau = [0];
  for (let i = 1; i < px.length; i++) tau.push(tau[i - 1] + (sx[i] - sx[i - 1]) / ((vx[i] + vx[i - 1]) / 2));
  const T = tau[tau.length - 1], profile = [];
  const step = (px.length - 1) / N;
  for (let k = 0; k <= N; k++) {
    const i = Math.min(px.length - 1, Math.round(k * step));
    profile.push([Math.round((tau[i] / T) * 1e5) / 1e5, Math.round((sx[i] / total) * 1e5) / 1e5]);
  }
  profile[0] = [0, 0]; profile[profile.length - 1] = [1, 1];
  return { T, profile, topSpeed: Math.max(...v) };
}

const PIP_D = spline(PIP_CTRL, 10);
const TH_D = spline(TH, 10);
const TH_PROF = timeProfile(TH_D, rideSpeeds(TH_D, nearest(TH_D, TH[2]), TH_D.length - 1));
// The flume path: an open Catmull-Rom spline up, over and down (ends doubled, so no overshoot), then a straight
// return along the pool. A closed spline would let the lift top pull the return below the water.
function splineOpen(ctrl, spacing) {
  const n = ctrl.length, out = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(n - 1, i + 2)];
    const k = Math.max(2, Math.ceil(dist(p1, p2) / spacing));
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      out.push([0, 1, 2].map((c) => 0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * t +
        (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
    }
  }
  return out;
}
const lineTo = (a, b, spacing) => {
  const k = Math.max(2, Math.ceil(dist(a, b) / spacing)), out = [];
  for (let j = 0; j < k; j++) out.push([0, 1, 2].map((c) => a[c] + ((b[c] - a[c]) * j) / k));
  return out;
};
const SP_UP = splineOpen(SP_CTRL.slice(0, 4), 10);
const SP_D = [...SP_UP, ...lineTo(SP_CTRL[3], SP_CTRL[0], 10)];
const SP_PROF = timeProfile(SP_D, rideSpeeds(SP_D, nearest(SP_D, SP_CTRL[1]), SP_UP.length - 1));
const LOOP_S = Math.round(TH_PROF.T);   // the loop is the people's loop (about 18 s), set by the coaster's real lap
// The rides run for RIDE_FRAC of the loop and wait at the station for the rest. The physics shape is kept; the
// whole ride runs 1 / RIDE_FRAC times faster than real time (an animation exaggeration, as agreed).
const RIDE_FRAC = 0.8;
const ride = (profile) => [...profile.map(([t, sf]) => [Math.round(t * RIDE_FRAC * 1e5) / 1e5, sf]), [1, 1]];
const TH_PROFILE = ride(TH_PROF.profile);
const SP_PROFILE = ride(SP_PROF.profile);
const PIP_PROF = ride([[0, 0], [1, 1]]);   // Pip: a steady speed, one lap then the station

// Where something sits at loop fraction `phase`: the point on its path (feet) and the heading (radians, about Z).
const at = (pts, profile, phase) => M.pathAt(pts, M.warpTime(profile, phase));
// Point, yaw and pitch (radians) of a path at a phase: what a car or boat needs to sit on a slope.
const orient = (pts, profile, phase) => {
  const w = M.warpTime(profile, phase);
  const { point } = M.pathAt(pts, w);
  const [dx, dy, dz] = M.tangentAt(pts, w);
  return { point, yaw: Math.atan2(dy, dx), pitch: Math.atan2(dz, Math.hypot(dx, dy)) };
};
const GATE_LOOP = [[-6, -132, 0], [-6, -104, 0], [6, -104, 0], [6, -132, 0]];   // visitors in and out of the gate
const RING = Array.from({ length: 12 }, (_, k) => {                                // visitors round the plaza
  const t = (2 * Math.PI * k) / 12;
  return [14 * Math.cos(t), 14 * Math.sin(t), 0];
});
const BIRD_LOOP = Array.from({ length: 12 }, (_, k) => {                           // birds, high over the park
  const t = (2 * Math.PI * k) / 12;
  return [100 * Math.cos(t), 75 * Math.sin(t), 85 + 10 * Math.sin(3 * t)];
});

function defsFor(v) {
  const defs = [];
  const add = (key, def) => defs.push([key, def]);
  const inch = (arr) => arr.map((x) => rnd(x * F));

  const box = (key, name, description, size, at, o = {}) =>
    add(key, { name, description, type: 'box', dimensions: inch(size), position: inch(at), ...o });
  const cyl = (key, name, description, r, h, at, o = {}) =>
    add(key, { name, description, type: 'cylinder', dimensions: inch([r, h]), position: inch(at), ...o });
  const sph = (key, name, description, r, at, o = {}) =>
    add(key, { name, description, type: 'sphere', dimensions: inch([r]), position: inch(at), ...o });
  const cone = (key, name, description, r, h, at, o = {}) =>
    add(key, { name, description, type: 'cone', dimensions: inch([r, h]), position: inch(at), ...o });
  // A thin cylinder from a to b (feet): tilt about X, then turn about Y. See adventure_park.js.
  const rod = (key, name, a, b, r, o = {}) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const len = Math.hypot(dx, dy, dz);
    const rx = rnd(-Math.asin(dy / len) * DEG), ry = rnd(Math.atan2(dx, dz) * DEG);
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    add(key, { name, description: '', type: 'cylinder', dimensions: inch([r, len]), position: inch(mid),
      ...(rx ? { rotation_x: rx } : {}), rotation_y: ry, ...o });
  };
  // Curved rails along dense points pts (feet, from spline()): two rails 2 ft apart, each a short straight piece,
  // so the curve reads smooth. A support every 5th point above 2 ft, with its base kept at or above z = 0.
  const track = (prefix, pts, parent) => {
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const dx = b[0] - a[0], dy = b[1] - a[1], hl = Math.hypot(dx, dy) || 1;
      const px = (-dy / hl), py = (dx / hl);
      rod(`${prefix}-railL-${i}`, `${prefix} rail left ${i + 1}`, [a[0] + px, a[1] + py, a[2]], [b[0] + px, b[1] + py, b[2]], 0.2, { parent, material: 'track' });
      rod(`${prefix}-railR-${i}`, `${prefix} rail right ${i + 1}`, [a[0] - px, a[1] - py, a[2]], [b[0] - px, b[1] - py, b[2]], 0.2, { parent, material: 'track' });
      if (i % 5 === 0 && a[2] > 2) {
        const hIn = rnd(a[2] * F), zIn = Math.ceil((hIn / 2) * 1000) / 1000;
        cyl(`${prefix}-post-${i}`, `${prefix} support ${i + 1}`, 'steel support', 0.5, hIn / F, [a[0], a[1], zIn / F], { parent, material: 'steel' });
      }
    }
  };
  // A car on the track: centre at p (car centre, 2 ft above the rail), turned by heading (radians about Z).
  // A car on the track: lifted 2 ft above the rail, turned and pitched to the slope (yaw about Z, pitch about Y).
  const carOn = (key, name, pts, profile, phase, parent) => {
    const r = orient(pts.map((p) => [p[0], p[1], p[2] + 2]), profile, phase);
    box(key, name, 'a seat car, five seats', [6, 3, 2.5], r.point, { parent, material: 'car', rotation_z: rnd(r.yaw * DEG), rotation_y: rnd(-r.pitch * DEG) });
  };
  // A visitor: a body and a head, as two parts of the same group.
  const person = (key, x, y, shirt, parent) => {
    cyl(`${key}-body`, 'Visitor', 'a visitor', 0.9, 3.5, [x, y, 2.25], { parent, material: shirt });
    sph(`${key}-head`, 'Visitor head', '', 0.8, [x, y, 4.9], { parent, material: 'skin' });
  };
  const fence = (prefix, x0, y0, x1, y1, parent, h = 3) => {
    box(`${prefix}-n`, `${prefix} fence north`, 'queue or safety rail', [x1 - x0, 0.5, h], [(x0 + x1) / 2, y1, h / 2], { parent, material: 'fence' });
    box(`${prefix}-s`, `${prefix} fence south`, '', [x1 - x0, 0.5, h], [(x0 + x1) / 2, y0, h / 2], { parent, material: 'fence' });
    box(`${prefix}-w`, `${prefix} fence west`, '', [0.5, y1 - y0, h], [x0, (y0 + y1) / 2, h / 2], { parent, material: 'fence' });
    box(`${prefix}-e`, `${prefix} fence east`, '', [0.5, y1 - y0, h], [x1, (y0 + y1) / 2, h / 2], { parent, material: 'fence' });
  };
  const tree = (key, x, y) => {
    cyl(`${key}-trunk`, 'Tree trunk', '', 0.6, 8, [x, y, 4], { parent: 'scenery', material: 'trunk' });
    sph(`${key}-leaves`, 'Tree crown', 'round crown', 6, [x, y, 12], { parent: 'scenery', material: 'leaf' });
  };

  // ---- groups (parents first)
  const groups = [
    ['gate', 'Entrance', 'the park gate and its sign'],
    ['paths', 'Paths', 'walkways and the plaza'],
    ['pip', "Pip's Little Loop", 'kiddie coaster: curved oval track, station, two cars'],
    ['bumble', 'Bumble River', 'a gentle boat ride on a short river'],
    ['teacups', 'Teacup Twirl', 'turntable and canopy'],
    ['tea-cups', 'Teacups', 'four cups that spin on the turntable'],
    ['thunder', 'Thunder Trail', 'the adventure family coaster, 60 ft lift'],
    ['splash', 'Splash Falls', 'log flume with a lift and a splash drop'],
    ['skywheel', 'Sky Wheel', 'show ride: tower and A-frame'],
    ['sky-wheel', 'Sky Wheel wheel', 'the turning wheel with bubble cars'],
    ['safety', 'Safety', 'fences, signs, walkways and stop buttons'],
    ['scenery', 'Scenery', 'trees, benches, lamps and flower beds'],
    ['fountain', 'Plaza fountain', 'a basin and eight jets that play in a wave'],
    ['finish', 'Finishing', 'flags, the park sign and balloons'],
  ];
  for (const [k, n, d] of groups) add(k, { name: n, description: d, type: 'group', dimensions: [], position: [0, 0, 0] });

  // ================= V11 compact footprint (about 300 by 250 ft), curved track, 60 ft lift. No motion yet.
  cyl('gate-post-l', 'Gate post left', 'entrance post', 1, 16, [-10, -118, 8], { parent: 'gate', material: 'wood' });
  cyl('gate-post-r', 'Gate post right', 'entrance post', 1, 16, [10, -118, 8], { parent: 'gate', material: 'wood' });
  box('gate-beam', 'Gate beam', 'arch over the path', [24, 2, 2], [0, -118, 16], { parent: 'gate', material: 'wood' });
  box('path-main', 'Main path', 'from the gate to the plaza', [8, 96, 0.3], [0, -70, 0.15], { parent: 'paths', material: 'path' });
  cyl('plaza', 'Plaza', 'round meeting place, 52 ft across', 26, 0.3, [0, 0, 0.15], { parent: 'paths', material: 'path' });
  box('path-west', 'West path', 'to Pip and Bumble River', [120, 8, 0.3], [-86, 0, 0.15], { parent: 'paths', material: 'path' });
  box('path-east', 'East path', 'to the teacups and Thunder Trail', [120, 8, 0.3], [86, 0, 0.15], { parent: 'paths', material: 'path' });

  // Pip's Little Loop: a curved oval. The cars start at phase 0 and half way round.
  track('pip', PIP_D, 'pip');
  [[0, 'pip-car-1', 'Pip car 1'], [0.5, 'pip-car-2', 'Pip car 2']].forEach(([ph, key, name]) =>
    carOn(key, name, PIP_D, PIP_PROF, ph, 'pip'));
  box('pip-station', 'Pip station', 'low station beside the oval', [16, 10, 10], [PIP.cx, PIP.cy - 34, 5], { parent: 'pip', material: 'cream' });
  box('pip-roof', 'Pip station roof', 'coral roof', [18, 12, 1], [PIP.cx, PIP.cy - 34, 10.5], { parent: 'pip', material: 'roof' });

  // Bumble River
  box('bumble-water', 'Bumble River water', 'mint water, 1.5 ft deep', [76, 22, 1.5], [BUMBLE.x, BUMBLE.y, 0.75], { parent: 'bumble', material: 'water' });
  box('bumble-station', 'Bumble station', 'boarding house on the bank', [12, 8, 9], [BUMBLE.x, BUMBLE.y - 20, 4.5], { parent: 'bumble', material: 'cream' });

  // Teacup Twirl: static parts (the cups come with their spin group in V13)
  cyl('tea-platform', 'Teacup platform', 'turntable, 1 ft high', 20, 1, [TEA.x, TEA.y, 0.5], { parent: 'teacups', material: 'stone' });
  cyl('tea-pole', 'Teacup centre pole', 'the spindle the cups turn on', 0.5, 8, [TEA.x, TEA.y, 4], { parent: 'teacups', material: 'steel' });
  cone('tea-roof', 'Teacup roof', 'coral canopy', 14, 5, [TEA.x, TEA.y, 10], { parent: 'teacups', material: 'roof' });

  // Thunder Trail: a curved coaster with a 60 ft lift. Cars start at phase 0 and half way round the lap (in time).
  track('thunder', TH_D, 'thunder');
  [[0, 'thunder-car-1', 'Thunder car 1'], [0.5, 'thunder-car-2', 'Thunder car 2']].forEach(([ph, key, name]) =>
    carOn(key, name, TH_D, TH_PROFILE, ph, 'thunder'));
  box('thunder-station', 'Thunder station', 'boarding hall', [20, 12, 10], [14, 36, 5], { parent: 'thunder', material: 'cream' });
  box('thunder-motor', 'Lift motor house', 'drives the chain lift', [7, 6, 7], [60, 22, 3.5], { parent: 'thunder', material: 'wood' });

  // Splash Falls: channel, lift and drop boxes at the north-west. The boats ride the path above them (V13).
  box('splash-water', 'Splash pool', 'channel, 1.5 ft deep', [68, 12, 1.5], [SPLASH.x, SPLASH.y, 0.75], { parent: 'splash', material: 'water' });
  const liftLen = Math.hypot(24, 24), pitch = 45;
  box('splash-lift', 'Flume lift', 'the slope up, 45 degrees', [liftLen, 8, 2], [SPLASH.x - 30, SPLASH.y, 13], { parent: 'splash', material: 'wood', rotation_y: -pitch });
  box('splash-drop', 'Flume drop', 'the drop into the pool, 45 degrees', [liftLen, 8, 2], [SPLASH.x - 6, SPLASH.y, 13], { parent: 'splash', material: 'wood', rotation_y: pitch });
  box('splash-station', 'Flume station', 'boarding house', [24, 12, 10], [SPLASH.x, SPLASH.y + 16, 5], { parent: 'splash', material: 'cream' });

  // Safety, compact
  fence('pip-queue', PIP.cx - 22, PIP.cy - 50, PIP.cx + 22, PIP.cy - 42, 'safety');
  fence('tea-queue', TEA.x - 24, TEA.y - 24, TEA.x + 24, TEA.y + 24, 'safety');
  cyl('pip-sign-post', 'Height sign post', 'stands at the Pip queue', 0.4, 9, [PIP.cx - 40, PIP.cy - 30, 4.5], { parent: 'safety', material: 'steel' });
  box('pip-sign', 'Height sign: 36 in', 'riders under 36 in ride with an adult', [1, 6, 3], [PIP.cx - 40, PIP.cy - 30, 7.5], { parent: 'safety', material: 'cream' });
  box('walkway', 'Emergency walkway', 'a clear route along the south edge', [300, 8, 0.3], [0, -128, 0.15], { parent: 'safety', material: 'path' });

  // Scenery, compact
  [[-130, -110], [-140, 10], [-60, -100], [-20, 96], [30, 110], [140, 100], [-30, -60]].forEach(([x, y], i) => tree(`tree-${i + 1}`, x, y));
  [[-22, 20], [22, 20]].forEach(([x, y], i) => box(`bench-${i + 1}`, `Bench ${i + 1}`, 'wooden bench by the plaza', [6, 2, 2], [x, y, 1], { parent: 'scenery', material: 'wood' }));

  // ================= V13 Teacup Twirl spins; Bumble boats drift; Splash boats ride the flume path.
  if (v >= 13) {
    const cupRing = [0, 90, 180, 270].map((deg) => {
      const t = (deg * Math.PI) / 180;
      return [TEA.x + 12 * Math.cos(t), TEA.y + 12 * Math.sin(t), 2.5];
    });
    cupRing.forEach((p, i) => cyl(`tea-cup-${i + 1}`, `Teacup ${i + 1}`, 'a cup for two riders', 3.2, 3, p, { parent: 'tea-cups', material: 'cup' }));
    [-82, -68, -54].forEach((x, i) => box(`bumble-boat-${i + 1}`, `Bumble boat ${i + 1}`, 'floats on the river, four seats', [6, 4, 2], [x, BUMBLE.y, 2.5], { parent: 'bumble', material: 'boat' }));
    [0, 0.33, 0.66].forEach((ph, i) => {
      const r = orient(SP_D, SP_PROFILE, ph);
      box(`splash-boat-${i + 1}`, `Log boat ${i + 1}`, 'rides the lift, drops into the pool; two seats', [6, 4, 2], r.point,
        { parent: 'splash', material: 'wood', rotation_z: rnd(r.yaw * DEG), rotation_y: rnd(-r.pitch * DEG) });
    });
  }

  // ================= V14 the Sky Wheel turns; flags wave; balloons bob.
  if (v >= 14) {
    cyl('sky-tower', 'Sky Wheel tower', 'the post under the hub', 1.2, SKY.z, [SKY.x, SKY.y, SKY.z / 2], { parent: 'skywheel', material: 'steel' });
    rod('sky-frame-l', 'Sky Wheel leg left', [SKY.x - 8, SKY.y, 1.2], [SKY.x, SKY.y, SKY.z], 0.6, { parent: 'skywheel', material: 'steel' });
    rod('sky-frame-r', 'Sky Wheel leg right', [SKY.x + 8, SKY.y, 1.2], [SKY.x, SKY.y, SKY.z], 0.6, { parent: 'skywheel', material: 'steel' });
    // Turning parts spin about the hub on the y axis (the wheel faces along y).
    const N = 12;
    const rimPts = Array.from({ length: N }, (_, k) => {
      const t = (2 * Math.PI * k) / N;
      return [SKY.x + SKY.r * Math.cos(t), SKY.y, SKY.z + SKY.r * Math.sin(t)];
    });
    rimPts.forEach((p, i) => {
      rod(`sky-rim-${i + 1}`, `Sky Wheel rim ${i + 1}`, p, rimPts[(i + 1) % N], 0.4, { parent: 'sky-wheel', material: 'track' });
      rod(`sky-spoke-${i + 1}`, `Sky Wheel spoke ${i + 1}`, [SKY.x, SKY.y, SKY.z], p, 0.25, { parent: 'sky-wheel', material: 'steel' });
      sph(`sky-car-${i + 1}`, `Bubble car ${i + 1}`, 'a bubble car, two seats', 2.5, p, { parent: 'sky-wheel', material: 'lavender' });
    });
    cyl('sky-hub', 'Sky Wheel hub', 'the axle at the centre', 1.5, 2, [SKY.x, SKY.y, SKY.z], { parent: 'sky-wheel', material: 'steel', rotation_x: 90 });
    // Flags hang off poles by the gate and wave about each pole.
    [-18, 18].forEach((x, i) => {
      cyl(`flagpole-${i + 1}`, `Flag pole ${i + 1}`, 'pole by the gate', 0.3, 26, [x, -126, 13], { parent: 'finish', material: 'steel' });
      box(`flag-${i + 1}`, `Flag ${i + 1}`, 'pastel flag on the pole', [6, 0.3, 3], [x + 3, -126, 24], { parent: 'finish', material: 'flag' });
    });
    [[-24, 14], [26, 18], [0, -34]].forEach(([x, y], i) => {
      cyl(`balloon-stick-${i + 1}`, `Balloon stick ${i + 1}`, '', 0.2, 10, [x, y, 5], { parent: 'finish', material: 'steel' });
      sph(`balloon-${i + 1}`, `Balloon ${i + 1}`, 'party balloon', 1.5, [x, y, 11], { parent: 'finish', material: ['lavender', 'mint', 'roof'][i] });
    });
  }

  // ================= V15 plaza fountain plays in a wave. Every ride now moves.
  if (v >= 15) {
    cyl('fountain-basin', 'Fountain basin', 'round basin, 1.5 ft deep', 10, 1.5, [FOUNTAIN.x, FOUNTAIN.y, 0.75], { parent: 'fountain', material: 'water' });
    for (let k = 0; k < 8; k++) {
      const t = (2 * Math.PI * k) / 8;
      sph(`jet-${k + 1}`, `Fountain jet ${k + 1}`, 'a water jet that rises and falls', 1.2,
        [FOUNTAIN.x + 6 * Math.cos(t), FOUNTAIN.y + 6 * Math.sin(t), 3], { parent: 'fountain', material: 'sky' });
    }
  }

  // ================= V16 life in the park: visitors in and out of the gate and round the plaza, vendor stalls,
  // birds on a loop high over the park, and free balloons. Visitors walk about 4.5 ft/s, so their loop is the whole loop.
  if (v >= 16) {
    add('crowd', { name: 'Visitors', description: 'people walking in and out, and round the plaza', type: 'group', dimensions: [], position: [0, 0, 0] });
    add('birds', { name: 'Birds', description: 'small birds on a loop high over the park', type: 'group', dimensions: [], position: [0, 0, 0] });
    add('vendors', { name: 'Vendors', description: 'food and souvenir stalls by the plaza', type: 'group', dimensions: [], position: [0, 0, 0] });
    add('floating', { name: 'Free balloons', description: 'balloons drifting over the plaza', type: 'group', dimensions: [], position: [0, 0, 0] });
    const walkers = [
      { key: 'walker-gate-1', loop: GATE_LOOP, phase: 0, shirt: 'lavender' },
      { key: 'walker-gate-2', loop: GATE_LOOP, phase: 0.5, shirt: 'mint' },
      ...[0, 0.25, 0.5, 0.75].map((ph, i) => ({ key: `walker-ring-${i + 1}`, loop: RING, phase: ph, shirt: ['roof', 'flag', 'car', 'lavender'][i] })),
    ];
    walkers.forEach((w) => {
      const r = M.pathAt(w.loop, w.phase).point;
      add(w.key, { name: 'Visitor walking', description: 'walks the loop', type: 'group', dimensions: [], position: [0, 0, 0], parent: 'crowd' });
      person(`${w.key}-p`, r[0], r[1], w.shirt, w.key);
    });
    // Vendor stalls: a counter, a striped awning and a keeper behind it
    [[-36, -24, 'roof'], [-36, 28, 'mint'], [34, 30, 'lavender'], [34, -22, 'flag']].forEach(([x, y, m], i) => {
      box(`stall-${i + 1}-counter`, `Stall ${i + 1} counter`, 'food or souvenirs', [8, 5, 3], [x, y, 1.5], { parent: 'vendors', material: 'cream' });
      box(`stall-${i + 1}-awning`, `Stall ${i + 1} awning`, 'striped awning', [10, 7, 0.6], [x, y, 4.5], { parent: 'vendors', material: m });
      person(`stall-${i + 1}-keeper`, x + 6, y, m, 'vendors');
    });
    // Birds: a body and two wings, flying the loop. A bob on top of the flight gives the wing beat.
    [0, 0.2, 0.45, 0.7, 0.9].forEach((ph, i) => {
      const key = `bird-${i + 1}`, r = orient(BIRD_LOOP, null, ph);
      add(key, { name: `Bird ${i + 1}`, description: 'flies the loop over the park', type: 'group', dimensions: [], position: [0, 0, 0], parent: 'birds' });
      box(`${key}-body`, `Bird ${i + 1} body`, '', [1.5, 0.4, 0.4], r.point, { parent: key, material: 'cream', rotation_z: rnd(r.yaw * DEG), rotation_y: rnd(-r.pitch * DEG) });
      const lx = -Math.sin(r.yaw) * 1.6, ly = Math.cos(r.yaw) * 1.6;
      [1, -1].forEach((sg, j) => box(`${key}-wing-${j + 1}`, `Bird ${i + 1} wing`, '', [0.8, 2.6, 0.12],
        [r.point[0] + sg * lx, r.point[1] + sg * ly, r.point[2]], { parent: key, material: 'lavender', rotation_z: rnd(r.yaw * DEG), rotation_y: rnd(-r.pitch * DEG) }));
    });
    // Free balloons, drifting
    [[-20, 60, 34, 'lavender'], [44, 12, 40, 'mint'], [-52, -4, 30, 'roof']].forEach(([x, y, z, m], i) =>
      sph(`free-balloon-${i + 1}`, `Free balloon ${i + 1}`, 'a party balloon drifting', 1.6, [x, y, z], { parent: 'floating', material: m }));
  }

  return defs;
}

// ---------- motion (make3d.motion/0.1), one per version. uuid(key) turns a scene key into the object's uuid.
function motionFor(v, uuid) {
  const motions = [];
  const I = (ft) => ft * F;                         // feet -> inches
  const inchPts = (pts) => pts.map((p) => [I(p[0]), I(p[1]), I(p[2])]);
  // A car's path is its centre line: the rail path lifted 2 ft. Pivot = where the car sits at its phase.
  const carPath = (id, key, pts, profile, phase) => {
    const lifted = pts.map((p) => [p[0], p[1], p[2] + 2]);
    const r = orient(lifted, profile, phase);
    return { id, target: uuid(key), kind: 'path', points: inchPts(lifted), face: 'tangent3d',
      pivot: [I(r.point[0]), I(r.point[1]), I(r.point[2])], rest_yaw_deg: rnd(r.yaw * DEG), rest_pitch_deg: rnd(r.pitch * DEG),
      cycles: 1, phase, ...(profile ? { profile } : {}) };
  };
  if (v >= 12) {
    motions.push(carPath('pip-car-1-run', 'pip-car-1', PIP_D, PIP_PROF, 0));
    motions.push(carPath('pip-car-2-run', 'pip-car-2', PIP_D, PIP_PROF, 0.5));
    motions.push(carPath('thunder-car-1-run', 'thunder-car-1', TH_D, TH_PROFILE, 0));
    motions.push(carPath('thunder-car-2-run', 'thunder-car-2', TH_D, TH_PROFILE, 0.5));
  }
  if (v >= 13) {
    motions.push({ id: 'teacups-spin', target: uuid('tea-cups'), kind: 'spin', pivot: [I(TEA.x), I(TEA.y), 0], axis: 'z', cycles: 3 });
    [[-82, 0], [-68, 0.33], [-54, 0.66]].forEach(([x, ph], i) =>
      motions.push({ id: `bumble-boat-${i + 1}-drift`, target: uuid(`bumble-boat-${i + 1}`), kind: 'slide', axis: 'x', distance: I(16), cycles: 1, phase: ph }));
    [0, 0.33, 0.66].forEach((ph, i) => {
      const r = orient(SP_D, SP_PROFILE, ph);
      motions.push({ id: `splash-boat-${i + 1}-ride`, target: uuid(`splash-boat-${i + 1}`), kind: 'path',
        points: inchPts(SP_D), face: 'tangent3d', pivot: [I(r.point[0]), I(r.point[1]), I(r.point[2])],
        rest_yaw_deg: rnd(r.yaw * DEG), rest_pitch_deg: rnd(r.pitch * DEG), cycles: 1, phase: ph, profile: SP_PROFILE });
    });
  }
  if (v >= 14) {
    motions.push({ id: 'sky-wheel-turn', target: uuid('sky-wheel'), kind: 'spin', pivot: [I(SKY.x), I(SKY.y), I(SKY.z)], axis: 'y', cycles: 2 });
    [-18, 18].forEach((x, i) => {
      motions.push({ id: `flag-${i + 1}-wave`, target: uuid(`flag-${i + 1}`), kind: 'swing', pivot: [I(x), I(-126), I(13)], axis: 'z', from: -18, to: 18, cycles: 2, phase: i * 0.5 });
    });
    [0, 0.33, 0.66].forEach((ph, i) =>
      motions.push({ id: `balloon-${i + 1}-bob`, target: uuid(`balloon-${i + 1}`), kind: 'bob', axis: 'z', amount: I(2), cycles: 1, phase: ph }));
  }
  if (v >= 15) {
    for (let k = 0; k < 8; k++) {
      motions.push({ id: `jet-${k + 1}-wave`, target: uuid(`jet-${k + 1}`), kind: 'bob', axis: 'z', amount: I(3), cycles: 1, phase: k / 8 });
    }
  }
  if (v >= 16) {
    // Visitors walk their loop (2-D: they face the way they walk). Pivot = where they stand at their phase.
    const walk = (key, loop, phase) => {
      const r = M.pathAt(loop, phase).point;
      return { id: `${key}-walk`, target: uuid(key), kind: 'path', points: inchPts(loop), face: 'tangent',
        pivot: [I(r[0]), I(r[1]), 0], rest_heading_deg: 0, cycles: 1, phase };
    };
    motions.push(walk('walker-gate-1', GATE_LOOP, 0));
    motions.push(walk('walker-gate-2', GATE_LOOP, 0.5));
    [0, 0.25, 0.5, 0.75].forEach((ph, i) => motions.push(walk(`walker-ring-${i + 1}`, RING, ph)));
    // Birds fly the 3-D loop with yaw and pitch, and bob for the wing beat.
    [0, 0.2, 0.45, 0.7, 0.9].forEach((ph, i) => {
      const key = `bird-${i + 1}`, r = orient(BIRD_LOOP, null, ph);
      motions.push({ id: `${key}-fly`, target: uuid(key), kind: 'path', points: inchPts(BIRD_LOOP), face: 'tangent3d',
        pivot: [I(r.point[0]), I(r.point[1]), I(r.point[2])], rest_yaw_deg: rnd(r.yaw * DEG), rest_pitch_deg: rnd(r.pitch * DEG), cycles: 1, phase: ph });
      motions.push({ id: `${key}-beat`, target: uuid(key), kind: 'bob', axis: 'z', amount: I(1.5), cycles: 9, phase: ph });
    });
    // Free balloons drift up and down and sideways
    [[-20, 60, 34], [44, 12, 40], [-52, -4, 30]].forEach((_, i) => {
      motions.push({ id: `free-balloon-${i + 1}-bob`, target: uuid(`free-balloon-${i + 1}`), kind: 'bob', axis: 'z', amount: I(4), cycles: 1, phase: i * 0.3 });
      motions.push({ id: `free-balloon-${i + 1}-drift`, target: uuid(`free-balloon-${i + 1}`), kind: 'slide', axis: 'x', distance: I(8), cycles: 1, phase: i * 0.3 });
    });
  }
  return { schema: M.MOTION_SCHEMA, model_id: `adventure-park-v${String(v).padStart(2, '0')}`, loop_s: LOOP_S,
    autoplay: { plays: 2 }, motions };
}

function sceneFor(v) {
  const pad = String(v).padStart(2, '0');
  const id = `adventure-park-v${pad}`;
  const scene = {
    id,
    builtin: true,
    header: {
      model_id: id,
      name: `Adventure park V${pad}`,
      description: `Adventure Coaster Park, compact, curved and animated, increment ${v} of 16. Capacity ${PPH} persons per hour. Estimated from published figures, in inches.`,
      units: 'in', up: 'z', world: WORLD_ID,
      materials: MATERIALS,
    },
    defs: defsFor(v),
  };
  if (v >= 12) scene.motion = (uuid) => motionFor(v, uuid);
  return scene;
}

const ADVENTURE_PARK_COMPACT = [11, 12, 13, 14, 15, 16].map(sceneFor);

// Physics summary, for the brief and the review page.
const PHYSICS = {
  thunder: { lapS: LOOP_S, topMph: rnd(TH_PROF.topSpeed * 3600 / 5280), liftFt: 60 },
  splash: { topMph: rnd(SP_PROF.topSpeed * 3600 / 5280) },
};

module.exports = { ADVENTURE_PARK_COMPACT, sceneFor, defsFor, motionFor, PPH, LOOP_S, PHYSICS };
