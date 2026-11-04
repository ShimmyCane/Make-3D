// Adventure Coaster Park: a family theme park with one adventure roller coaster, built in ten increments (V01 to V10).
// Every size is a planning estimate, not a survey. Sizes are written in feet here (how a designer reads a plan) and
// converted to inches (x12) at the end. Units stored: inches. Z up, the ground is z = 0. Position = centre of each box.
//
// Capacity = seats per dispatch x 3600 / dispatch interval (seconds), in persons per hour (pph).
// Sources and figures: 04 AI/Make 3D/research/adventure_park.md.
//
// One code path builds every version: defsFor(v). Version N adds a block with "if (v >= N)". Older versions stay
// reproducible: change them by adding blocks, not by deleting.
//
// Capacity ladder (pph):
//   V01 250   Pip's Little Loop (kiddie coaster, 10 seats, 144 s)
//   V02 350   + Bumble River boats (4 seats, 144 s = 100)
//   V03 450   + Teacup Twirl (8 seats, 288 s = 100)
//   V04 450   safety: queue fences, height sign, emergency walkway (no new capacity)
//   V05 850   + Thunder Trail family coaster (10 seats, 90 s = 400)
//   V06 850   safety: lift-hill guard, station canopy (no new capacity)
//   V07 1000  + Splash Falls log flume (6 seats, 144 s = 150)
//   V08 1000  fineness: trees, benches, lamps, flower beds
//   V09 1000  safety check: second height sign, first-aid hut, exit signs, stop buttons, staff fence
//   V10 1000  finish: entrance flags, park sign, balloons

const WORLD_ID = 'adventure-park-world';
const F = 12;                       // inches per foot
const PPH = [250, 350, 450, 450, 850, 850, 1000, 1000, 1000, 1000];
const rnd = (n) => Math.round(n * 1000) / 1000;
const DEG = 180 / Math.PI;

const PARK_MATERIALS = {
  path: { color: '#f4e7cf', opacity: 1 },
  stone: { color: '#e7e2d6', opacity: 1 },
  track: { color: '#f29a7e', opacity: 1 },   // coral rails
  steel: { color: '#b9c0ca', opacity: 1 },   // pastel steel supports
  car: { color: '#ffc09a', opacity: 1 },     // peach cars
  cup: { color: '#f7d1e0', opacity: 1 },     // pink teacups
  water: { color: '#a6e3d7', opacity: 0.9 }, // mint water
  boat: { color: '#9cc8f0', opacity: 1 },    // sky-blue boats
  wood: { color: '#e2b98f', opacity: 1 },
  roof: { color: '#f7a8a0', opacity: 1 },    // coral roofs
  roofMint: { color: '#9fd8c0', opacity: 1 },
  cream: { color: '#fff8e7', opacity: 1 },   // station walls and signs
  fence: { color: '#fffdf6', opacity: 1 },
  red: { color: '#f08080', opacity: 1 },
  green: { color: '#9ed39a', opacity: 1 },
  leaf: { color: '#8fcf8a', opacity: 1 },
  trunk: { color: '#b98a63', opacity: 1 },
  lamp: { color: '#fff1a8', opacity: 1 },
  flower: { color: '#f6a6c1', opacity: 1 },
  flag: { color: '#ffd36e', opacity: 1 },
  lavender: { color: '#c7b2ea', opacity: 1 },
  sun: { color: '#ffe27a', opacity: 1 },
};

function defsFor(v) {
  const defs = [];
  const add = (key, def) => defs.push([key, def]);
  const inch = (arr) => arr.map((x) => rnd(x * F));

  // Feet in, inches out. Each takes a key, a readable name, a description, the size and the centre.
  const box = (key, name, description, size, at, o = {}) =>
    add(key, { name, description, type: 'box', dimensions: inch(size), position: inch(at), ...o });
  const cyl = (key, name, description, r, h, at, o = {}) =>
    add(key, { name, description, type: 'cylinder', dimensions: inch([r, h]), position: inch(at), ...o });
  const sph = (key, name, description, r, at, o = {}) =>
    add(key, { name, description, type: 'sphere', dimensions: inch([r]), position: inch(at), ...o });
  const cone = (key, name, description, r, h, at, o = {}) =>
    add(key, { name, description, type: 'cone', dimensions: inch([r, h]), position: inch(at), ...o });

  // A thin cylinder from point a to point b (feet). Z is the cylinder's axis: tilt about X, then turn about Y.
  //   rotation_x = -asin(dy / len), rotation_y = atan2(dx, dz). Checked in the tests and the render.
  const rod = (key, name, a, b, r, o = {}) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const len = Math.hypot(dx, dy, dz);
    const rx = rnd(-Math.asin(dy / len) * DEG);
    const ry = rnd(Math.atan2(dx, dz) * DEG);
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    add(key, { name, description: '', type: 'cylinder', dimensions: inch([r, len]), position: inch(mid),
      ...(rx ? { rotation_x: rx } : {}), rotation_y: ry, ...o });
  };

  // Rails and supports for a track through points pts ([x, y, z] in feet). Two rails, 2 ft gauge.
  const track = (prefix, pts, closed, parent) => {
    const n = pts.length, segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const dx = b[0] - a[0], dy = b[1] - a[1], hl = Math.hypot(dx, dy);
      const px = (-dy / hl) * 1, py = (dx / hl) * 1;   // half the 2 ft gauge, sideways
      rod(`${prefix}-railL-${i}`, `${prefix} rail left ${i + 1}`, [a[0] + px, a[1] + py, a[2]], [b[0] + px, b[1] + py, b[2]], 0.2, { parent, material: 'track' });
      rod(`${prefix}-railR-${i}`, `${prefix} rail right ${i + 1}`, [a[0] - px, a[1] - py, a[2]], [b[0] - px, b[1] - py, b[2]], 0.2, { parent, material: 'track' });
    }
    pts.forEach((p, i) => {
      if (p[2] <= 2) return;
      // Round the height first, then put the centre at or above half of it, so the base never dips below z = 0.
      const hIn = rnd(p[2] * F), zIn = Math.ceil((hIn / 2) * 1000) / 1000;
      cyl(`${prefix}-post-${i}`, `${prefix} support ${i + 1}`, 'steel support from the ground to the rail', 0.5, hIn / F,
        [p[0], p[1], zIn / F], { parent, material: 'steel' });
    });
  };

  // A car on the track at point i, turned to face the next point (rotation_z, about the vertical axis).
  const car = (key, name, pts, i, parent, material = 'car') => {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const heading = rnd(Math.atan2(b[1] - a[1], b[0] - a[0]) * DEG);
    box(key, name, 'a seat car; 5 seats', [6, 3, 2.5], [a[0], a[1], a[2] + 2], { parent, material, rotation_z: heading });
  };

  // A rectangular fence of rails, edges (x0,y0) to (x1,y1), height h.
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

  // ---- groups (parents first, so every member can name its parent)
  const groups = [
    ['gate', 'Entrance', 'the park gate and its sign'],
    ['paths', 'Paths', 'walkways and the plaza'],
    ['pip', "Pip's Little Loop", 'kiddie coaster: oval track, station, two cars'],
    ['bumble', 'Bumble River', 'a gentle boat ride on a short river'],
    ['teacups', 'Teacup Twirl', 'spinning cups on a turntable'],
    ['thunder', 'Thunder Trail', 'the adventure family coaster'],
    ['splash', 'Splash Falls', 'log flume with a lift and a splash drop'],
    ['safety', 'Safety', 'fences, signs, walkways and stop buttons'],
    ['scenery', 'Scenery', 'trees, benches, lamps and flower beds'],
    ['finish', 'Finishing', 'flags, the park sign and balloons'],
  ];
  for (const [k, n, d] of groups) add(k, { name: n, description: d, type: 'group', dimensions: [], position: [0, 0, 0] });

  // ================= V01 blockout: gate, paths, plaza, Pip's Little Loop (250 pph)
  // Gate: two posts and a beam over the path, at the south end of the park.
  cyl('gate-post-l', 'Gate post left', 'entrance post', 1, 16, [-14, -180, 8], { parent: 'gate', material: 'wood' });
  cyl('gate-post-r', 'Gate post right', 'entrance post', 1, 16, [14, -180, 8], { parent: 'gate', material: 'wood' });
  box('gate-beam', 'Gate beam', 'arch over the path, 17 ft up', [30, 2, 2], [0, -180, 16], { parent: 'gate', material: 'wood' });

  // Paths: the main path north from the gate, a plaza, and east and west walks.
  box('path-main', 'Main path', 'from the gate to the plaza', [8, 200, 0.3], [0, -80, 0.15], { parent: 'paths', material: 'path' });
  cyl('plaza', 'Plaza', 'round meeting place, 80 ft across', 40, 0.3, [0, 0, 0.15], { parent: 'paths', material: 'path' });
  box('path-west', 'West path', 'to Pip\'s Little Loop', [260, 8, 0.3], [-130, 0, 0.15], { parent: 'paths', material: 'path' });
  box('path-east', 'East path', 'to the coaster and the flume', [240, 8, 0.3], [120, 0, 0.15], { parent: 'paths', material: 'path' });

  // Pip's Little Loop: an oval kiddie coaster, 12 points, height 5 to 9 ft.
  const PIP = { cx: -150, cy: -60, rx: 50, ry: 30 };
  const pipPts = Array.from({ length: 12 }, (_, k) => {
    const t = (2 * Math.PI * k) / 12;
    return [PIP.cx + PIP.rx * Math.cos(t), PIP.cy + PIP.ry * Math.sin(t), 7 + 2 * Math.sin(2 * t)];
  });
  track('pip', pipPts, true, 'pip');
  car('pip-car-1', 'Pip car 1', pipPts, 0, 'pip');
  car('pip-car-2', 'Pip car 2', pipPts, 6, 'pip');
  box('pip-station', 'Pip station', 'low station building beside the oval', [24, 12, 12], [-150, -106, 6], { parent: 'pip', material: 'cream' });
  box('pip-roof', 'Pip station roof', 'coral roof', [28, 16, 1], [-150, -106, 12.5], { parent: 'pip', material: 'roof' });

  // ================= V02 Bumble River: boats on a short river (+100 pph, 350 total)
  if (v >= 2) {
  box('bumble-water', 'Bumble River water', 'mint water, 1.5 ft deep', [110, 36, 1.5], [-40, 130, 0.75], { parent: 'bumble', material: 'water' });
  [-80, -60, -40, -20].forEach((x, i) =>
    box(`bumble-boat-${i + 1}`, `Bumble boat ${i + 1}`, 'floats on the river; 4 seats', [6, 4, 2], [x, 130, 2.5], { parent: 'bumble', material: 'boat' }));
  box('bumble-station', 'Bumble station', 'boarding house at the river\'s edge', [16, 12, 10], [-40, 100, 5], { parent: 'bumble', material: 'cream' });
  box('path-bumble', 'Bumble path', 'from the plaza to the river', [8, 50, 0.3], [-40, 70, 0.15], { parent: 'paths', material: 'path' });

  }
  // ================= V03 Teacup Twirl: four teacups on a turntable (+100 pph, 450 total)
  if (v >= 3) {
  const TEA = { x: 60, y: -60 };
  cyl('tea-platform', 'Teacup platform', 'turntable, 1 ft high', 30, 1, [TEA.x, TEA.y, 0.5], { parent: 'teacups', material: 'stone' });
  cyl('tea-pole', 'Teacup centre pole', 'the spindle the cups turn on', 0.8, 12, [TEA.x, TEA.y, 7], { parent: 'teacups', material: 'steel' });
  cone('tea-roof', 'Teacup roof', 'coral canopy over the cups', 22, 6, [TEA.x, TEA.y, 16], { parent: 'teacups', material: 'roof' });
  [0, 90, 180, 270].forEach((deg, i) => {
    const t = (deg * Math.PI) / 180;
    cyl(`tea-cup-${i + 1}`, `Teacup ${i + 1}`, 'a cup for two riders', 4, 3, [TEA.x + 18 * Math.cos(t), TEA.y + 18 * Math.sin(t), 2.5],
      { parent: 'teacups', material: 'cup' });
  });

  }
  // ================= V04 safety: queue fences, a height sign, an emergency walkway (450 pph, no new capacity)
  if (v >= 4) {
  fence('pip-queue', -185, -132, -115, -118, 'safety');
  fence('tea-queue', 24, -96, 96, -24, 'safety');
  cyl('pip-sign-post', 'Height sign post', 'stands at the Pip queue entrance', 0.4, 9, [-190, -100, 4.5], { parent: 'safety', material: 'steel' });
  box('pip-sign', 'Height sign: 36 in', 'riders under 36 in ride with an adult', [1, 6, 3], [-190, -100, 7.5], { parent: 'safety', material: 'cream' });
  box('walkway', 'Emergency walkway', 'a clear route along the south edge, for staff and emergency vehicles', [560, 8, 0.3], [0, -196, 0.15], { parent: 'safety', material: 'path' });

  }
  // ================= V05 Thunder Trail: adventure family coaster (+400 pph, 850 total)
  if (v >= 5) {
  // 15 points in feet. A lift hill to 60 ft, a drop, two hills, a bend back to the station. Closed loop.
  const TH = [
    [120, 60, 4], [140, 60, 30], [158, 60, 60], [180, 60, 8], [200, 50, 22], [230, 40, 6], [250, 60, 40],
    [265, 100, 52], [250, 140, 20], [215, 150, 12], [190, 130, 30], [170, 110, 18], [150, 100, 10], [130, 95, 5], [120, 80, 4],
  ];
  track('thunder', TH, true, 'thunder');
  car('thunder-car-1', 'Thunder car 1', TH, 12, 'thunder', 'car');
  car('thunder-car-2', 'Thunder car 2', TH, 13, 'thunder', 'car');
  box('thunder-station', 'Thunder station', 'boarding hall, 14 ft high', [36, 20, 14], [110, 36, 7], { parent: 'thunder', material: 'cream' });
  box('thunder-motor', 'Lift motor house', 'drives the chain lift at the first hill', [12, 10, 10], [150, 75, 5], { parent: 'thunder', material: 'wood' });

  }
  // ================= V06 safety on the coaster: lift-hill guard, station canopy (850 pph, no new capacity)
  if (v >= 6) {
    box('lift-guard', 'Lift-hill guard', 'low rail beside the lift hill, 4 ft high', [40, 0.5, 4], [150, 50, 2], { parent: 'safety', material: 'fence' });
    box('thunder-canopy', 'Station canopy', 'shade and rain cover over the queue', [46, 28, 1], [110, 36, 16.5], { parent: 'thunder', material: 'roof' });
    [[88, 22], [132, 22], [88, 50], [132, 50]].forEach(([x, y], i) =>
      cyl(`canopy-post-${i + 1}`, `Canopy post ${i + 1}`, 'holds the canopy', 0.5, 16, [x, y, 8], { parent: 'thunder', material: 'steel' }));
  }

  // ================= V07 Splash Falls: log flume with a lift and a drop into the pool (+150 pph, 1000 total)
  if (v >= 7) {
  const water = { x: 245, y: -120 };
  box('splash-water', 'Splash pool', 'channel, 1.5 ft deep', [110, 24, 1.5], [water.x, water.y, 0.75], { parent: 'splash', material: 'water' });
  box('splash-rail-n', 'Channel rail north', 'low rail along the channel', [110, 0.6, 3], [water.x, water.y - 12, 3], { parent: 'splash', material: 'fence' });
  box('splash-rail-s', 'Channel rail south', '', [110, 0.6, 3], [water.x, water.y + 12, 3], { parent: 'splash', material: 'fence' });
  // Lift: 30 ft across, 28 ft up. Pitch = atan(28 / 30). Drop: 25 ft across, 27.5 ft down.
  const liftLen = Math.hypot(30, 28), liftPitch = Math.atan2(28, 30) * DEG;
  box('splash-lift', 'Flume lift', 'the slope up to the top', [liftLen, 14, 2], [175, water.y, 15], { parent: 'splash', material: 'wood', rotation_y: rnd(-liftPitch) });
  const dropLen = Math.hypot(25, 27.5), dropPitch = Math.atan2(27.5, 25) * DEG;
  box('splash-drop', 'Flume drop', 'the steep drop into the pool', [dropLen, 14, 2], [202.5, water.y, 15.25], { parent: 'splash', material: 'wood', rotation_y: rnd(dropPitch) });
  [220, 240, 260].forEach((x, i) =>
    box(`splash-boat-${i + 1}`, `Log boat ${i + 1}`, 'floats in the pool; 2 seats', [6, 4, 2], [x, water.y, 2.5], { parent: 'splash', material: 'wood' }));
  box('splash-station', 'Flume station', 'boarding house on the bank', [40, 20, 12], [240, -150, 6], { parent: 'splash', material: 'cream' });
  box('splash-roof', 'Flume station roof', '', [44, 24, 1], [240, -150, 12.5], { parent: 'splash', material: 'roof' });

  }
  // ================= V08 fineness: trees, benches, lamps, flower beds (1000 pph, no new capacity)
  if (v >= 8) {
    [[-270, -150], [-250, -40], [-285, 90], [-230, 170], [-60, -150], [20, -160], [-120, -180], [30, 160], [-90, 160]]
      .forEach(([x, y], i) => tree(`tree-${i + 1}`, x, y));
    [[-25, 25], [25, 25]].forEach(([x, y], i) =>
      box(`bench-${i + 1}`, `Bench ${i + 1}`, 'wooden bench by the plaza', [6, 2, 2], [x, y, 1], { parent: 'scenery', material: 'wood' }));
    [[-6, -150], [6, -150], [-6, -110], [6, -110], [-6, -40], [6, -40]].forEach(([x, y], i) => {
      cyl(`lamp-post-${i + 1}`, `Lamp post ${i + 1}`, 'path lamp', 0.3, 12, [x, y, 6], { parent: 'scenery', material: 'steel' });
      sph(`lamp-glow-${i + 1}`, `Lamp ${i + 1}`, 'warm glow at the top', 1, [x, y, 12.5], { parent: 'scenery', material: 'lamp' });
    });
    [[-50, -40], [-50, 40], [40, 50]].forEach(([x, y], i) =>
      cyl(`bed-${i + 1}`, `Flower bed ${i + 1}`, 'round bed of flowers', 5, 0.8, [x, y, 0.4], { parent: 'scenery', material: 'flower' }));
  }

  // ================= V09 safety check: second sign, first-aid hut, exit signs, stop buttons, staff fence (1000 pph)
  if (v >= 9) {
    cyl('thunder-sign-post', 'Thunder height sign post', 'at the Thunder queue', 0.4, 9, [100, 56, 4.5], { parent: 'safety', material: 'steel' });
    box('thunder-sign', 'Height sign: 48 in', 'riders under 48 in ride with an adult', [1, 6, 3], [100, 56, 7.5], { parent: 'safety', material: 'cream' });
    box('firstaid', 'First-aid hut', 'staffed first-aid room, next to the plaza', [14, 10, 9], [-60, 20, 4.5], { parent: 'safety', material: 'cream' });
    box('firstaid-roof', 'First-aid roof', '', [16, 12, 1], [-60, 20, 9.5], { parent: 'safety', material: 'roof' });
    [-16, 16].forEach((x, i) => {
      cyl(`exit-post-${i + 1}`, `Exit sign post ${i + 1}`, '', 0.3, 8, [x, -196, 4], { parent: 'safety', material: 'steel' });
      box(`exit-sign-${i + 1}`, `Exit sign ${i + 1}`, 'green exit sign', [4, 0.5, 2], [x, -196, 7], { parent: 'safety', material: 'green' });
    });
    box('stop-thunder', 'Stop button: Thunder', 'red button for staff at the station', [1, 1, 1], [88, 30, 7], { parent: 'safety', material: 'red' });
    box('stop-splash', 'Stop button: Splash', 'red button for staff at the flume station', [1, 1, 1], [240, -138, 8], { parent: 'safety', material: 'red' });
    fence('staff', 138, 66, 162, 84, 'safety');
  }

  // ================= V10 finish: entrance flags, the park sign, balloons (1000 pph)
  if (v >= 10) {
    box('park-sign', 'Park sign', 'the park name on the gate', [60, 1, 8], [0, -180, 21.5], { parent: 'finish', material: 'cream' });
    [-26, 26].forEach((x, i) => {
      cyl(`flagpole-${i + 1}`, `Flag pole ${i + 1}`, 'pole by the gate', 0.3, 30, [x, -186, 15], { parent: 'finish', material: 'steel' });
      box(`flag-${i + 1}`, `Flag ${i + 1}`, 'pastel flag', [6, 0.3, 3], [x + (x < 0 ? 3 : -3), -186, 28], { parent: 'finish', material: 'flag' });
    });
    [[-30, 30, 'lavender'], [-38, -30, 'roof'], [40, 20, 'roofMint']].forEach(([x, y, m], i) => {
      cyl(`balloon-stick-${i + 1}`, `Balloon stick ${i + 1}`, '', 0.2, 10, [x, y, 5], { parent: 'finish', material: 'steel' });
      sph(`balloon-${i + 1}`, `Balloon ${i + 1}`, 'party balloon', 1.5, [x, y, 11], { parent: 'finish', material: m });
    });
  }

  return defs;
}

function sceneFor(v) {
  const pad = String(v).padStart(2, '0');
  const id = `adventure-park-v${pad}`;
  return {
    id,
    builtin: true,
    header: {
      model_id: id,
      name: `Adventure park V${pad}`,
      description: `Adventure Coaster Park, increment ${v} of 10. Capacity ${PPH[v - 1]} persons per hour. Estimated from published figures, in inches.`,
      units: 'in', up: 'z', world: WORLD_ID,
      materials: PARK_MATERIALS,
    },
    defs: defsFor(v),
  };
}

const ADVENTURE_PARK = Array.from({ length: 10 }, (_, i) => sceneFor(i + 1));

module.exports = { ADVENTURE_PARK, WORLD_ID, PPH, defsFor, sceneFor };
