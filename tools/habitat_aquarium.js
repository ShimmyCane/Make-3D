// Coastal Habitat Aquarium: the same idea as the Grand Ocean Aquarium, rebuilt as a habitat instead of a glass box.
// Jimmy's note: the first tank was "Disneyfied", about the experience of standing in it, not a volume where plants and
// animals live. This one is the other way round. The tank is an organic, modelled place: a curved, lobed outline,
// a wall of sculpted rockwork with caves and ledges, a sloping seabed with dunes, a tide shelf, a kelp forest, a
// rocky reef and sand flats. Guests look in through a curved front window and a curved tunnel; the rock hides the rest.
//
// Four increments, each a visible step:
//   H01 outline   curved, lobed tank shell: facet glass, rim, sand floor, curved tunnel
//   H02 rockwork  sculpted rock cliffs, ledges, caves, rolling seabed, tide shelf, window mullions
//   H03 habitat   kelp forest, reef, eelgrass, sea fans, anemones, light shafts from the surface
//   H04 populated all the marine assets from the Grand Ocean Aquarium (species table, fish builder, schools,
//                 jellies, diver, critters) swimming inside the new volume, plus the front gallery and tunnel guests
//   H05 not an extrusion   leaning walls, a three-level floor (deep basin, terrace, shelf plateau), a cavern under the shelf
//   H06 bridges, tunnels   deck ring, arched skybridge, Kelp Walk, a tunnel through the plateau water, a stair tube
//   H07 repopulated        plateau residents, terrace kelp and coral, guests on the bridges
//
// Feet in the code, inches stored. Z up, ground z = 0. Position = centre of each box. Species and sizes are the ones
// in tools/aquarium.js (sources: 04 AI/Make 3D/research/aquarium.md). Every random choice is seeded by the key, so
// adding objects in a later increment never moves the earlier ones. One defsFor(v); old versions stay reproducible.

const M = require('../js/core/motion.js');
const { SP, MATERIALS: BASE_MATERIALS } = require('./aquarium.js');

const WORLD_ID = 'aquarium-world';
const F = 12;
const LOOP_S = 60;
const COUNTS = [250, 600, 900, 1700, 1750, 2000, 2200];
const rnd = (n) => Math.round(n * 1000) / 1000;
const DEG = 180 / Math.PI;
const PI = Math.PI;

function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rngFor(key) {
  let a = hash(key);
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const MATERIALS = {
  ...BASE_MATERIALS,
  rockA: { color: '#bdb5a8', opacity: 1 },
  rockB: { color: '#cfc3b2', opacity: 1 },
  rockC: { color: '#a9a398', opacity: 1 },
  rockWarm: { color: '#d3b9a0', opacity: 1 },
  rockSolid: { color: '#b4ab9d', opacity: 1 },
  cave: { color: '#6f7a85', opacity: 0.8 },
  sandA: { color: '#f2e4c4', opacity: 1 },
  sandB: { color: '#ead8b0', opacity: 1 },
  wet: { color: '#c9dcc4', opacity: 1 },
  pool: { color: '#9fdcd8', opacity: 0.45 },
  frame: { color: '#d9d2c3', opacity: 1 },
  bladder: { color: '#d8c670', opacity: 1 },
  kelp3: { color: '#8fae5f', opacity: 1 },
  floorWalk: { color: '#e9e4d8', opacity: 1 },
};

// ---------- the tank plan (feet): a lobed outline, elongated east to west
const AX = 52, AY = 32;
const Rf = (th) => 1 + 0.10 * Math.cos(2 * th + 0.7) + 0.07 * Math.sin(3 * th + 0.4);
const outline = (th, k = 1) => [AX * k * Rf(th) * Math.cos(th), AY * k * Rf(th) * Math.sin(th)];
const depthFt = (x, y) => {
  const nx = x / AX, ny = y / AY, rho = Math.hypot(nx, ny), phi = Math.atan2(ny, nx);
  return (Rf(phi) - rho) * AY;                 // about how far from the wall (feet); negative = outside
};
// the window arc along the front (south): glass, no rockwork
const FRONT = [-2.35, -0.8];
const inFront = (th) => { const t = Math.atan2(Math.sin(th), Math.cos(th)); return t > FRONT[0] && t < FRONT[1]; };
// the curved tunnel: an S through the tank from the west portal to the east portal
const ty = (x) => 10 * Math.sin((x * PI) / 58);
const tdy = (x) => 10 * Math.cos((x * PI) / 58) * (PI / 58);
const tunnelDist = (x, y) => (Math.abs(x) <= 58 ? Math.abs(y - ty(x)) / Math.hypot(1, tdy(x)) : Math.hypot(Math.abs(x) - 58, y));

// ---------- V05: the tank is not an extrusion. Walls lean, the floor has three levels, and there is room underneath.
// Shelf: a raised plateau in the north-west, 12 ft of water over it and a cavern gallery beneath it.
// Terrace: a solid rock-and-sand step in the south-east at 8 ft. Deep basin: everywhere else, floor at 0.
const SHELF = { cx: -24, cy: 18, rx: 17, ry: 10, z: 16 };
const TERR = { cx: 24, cy: -16, rx: 13, ry: 8, z: 8 };
const eOf = (o, x, y) => Math.hypot((x - o.cx) / o.rx, (y - o.cy) / o.ry);
const lean = (th) => 0.10 * Math.sin(2 * th + 1.1);             // + leans out at the top, - overhangs inward
const wallK = (th, z) => 1 + lean(th) * (z - 14) / 14;
const depthFtZ = (x, y, z) => {
  const nx = x / AX, ny = y / AY, rho = Math.hypot(nx, ny), phi = Math.atan2(ny, nx);
  return (Rf(phi) * wallK(phi, z) - rho) * AY;
};
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const terraceZ = (x, y) => TERR.z * clamp01((1.3 - eOf(TERR, x, y)) / 0.5);
const shelfZ = (x, y) => (eOf(SHELF, x, y) <= 1 ? SHELF.z : 0);
const terrainZ = (x, y) => Math.max(terraceZ(x, y), shelfZ(x, y));
// the plateau tunnel and its box (feet), used by the swim-loop check
const PTUN = { x0: -40, x1: -8, y: 18, zc: 19.6, r: 3.2 };


// where a straight line leaves the deck ring (used by the bridges)
const edgeYv = (x, sgn) => { let y = 0; while (y < 60 && Math.hypot(x / AX, y / AY) <= 1.1 * Rf(Math.atan2(y / AY, x / AX))) y += 0.25; return sgn * y; };
const edgeXv = (y, sgn) => { let x = 0; while (x < 80 && Math.hypot(x / AX, y / AY) <= 1.1 * Rf(Math.atan2(y / AY, x / AX))) x += 0.25; return sgn * x; };

// ---------- loops for swimmers (feet): rejection-sampled so every point stays in the water
function loopPts(key, cx, cy, rx, ry, z0, za, dir = 1) {
  const r = rngFor(key + '/loop');
  const th0 = r() * PI * 2, ph = r() * PI * 2, e = 0.09, n = 12, pts = [];
  for (let i = 0; i < n; i++) {
    const th = th0 + dir * (PI * 2 * i) / n, k = 1 + e * Math.sin(3 * th + ph);
    pts.push([rnd(cx + rx * k * Math.cos(th)), rnd(cy + ry * k * Math.sin(th)), rnd(z0 + za * Math.sin(2 * th + ph))]);
  }
  return pts;
}
function validLoop(pts, L, zone, zlo, v5) {
  for (let i = 0; i < 48; i++) {
    const p = M.pathAt(pts, i / 48).point;
    const need = zone === 'front' || zone === 'plateau' ? L / 2 + 3 : L / 2 + 6.5;
    if ((v5 ? depthFtZ(p[0], p[1], p[2]) : depthFt(p[0], p[1])) < need) return false;
    if (zlo < 13 && tunnelDist(p[0], p[1]) < 7.6 + L / 2) return false;
    if (v5) {
      if (p[2] < terrainZ(p[0], p[1]) + 1.6 + L * 0.12 && p[2] < 28) return false;                     // above the floor, the terrace and the plateau
      if (eOf(TERR, p[0], p[1]) < 1.3 && p[2] < TERR.z + 1.6 + L * 0.12) return false;
      if (p[2] < SHELF.z + 1.2 && eOf(SHELF, p[0], p[1]) < 1 + (L / 2 + 1.8) / 13) return false;      // keep off the shelf's vertical edge
      const m = L * 0.5 + 1.2;                                                                          // the plateau tunnel
      if (p[0] > PTUN.x0 - m && p[0] < PTUN.x1 + m && Math.abs(p[1] - PTUN.y) < PTUN.r + m && p[2] > 14.5 && p[2] < PTUN.zc + PTUN.r + m) return false;
    }
  }
  return true;
}
function swimLoop(key, zone, L, v5 = false) {
  for (let a = 0; a < 3000; a++) {
    const r = rngFor(`${key}/${zone}/${a}`), u = (lo, hi) => lo + (hi - lo) * r();
    let z0, za, cx = u(-16, 16), cy = u(-9, 9), rx = u(12, 36), ry = u(5, 15);
    if (zone === 'high') { z0 = u(17, 21); za = 3; }
    else if (zone === 'mid') { z0 = u(15, 16.5); za = 1.5; }
    else if (zone === 'low') { z0 = 5; za = 1.2; cx = u(-38, 38); cy = u(-26, 26); ry = u(2.5, 6); rx = u(5, 14); }
    else if (zone === 'plateau') { z0 = u(18.5, 25); za = 1.4; cx = u(-38, -10); cy = u(5, 27); rx = u(4, 12); ry = u(1.5, 5); }
    else { z0 = u(9, 20); za = 2.5; cy = u(-16, -8); ry = u(3, 6); rx = u(18, 34); }       // front
    const pts = loopPts(`${key}#${a}`, cx, cy, rx, ry, z0, za, r() < 0.5 ? 1 : -1);
    if (validLoop(pts, L, zone, z0 - za - 0.8, v5)) return pts;
  }
  throw new Error(`no loop for ${key} in zone ${zone}`);
}

function defsFor(v) {
  const defs = [];
  const motions = [];
  const add = (key, def) => defs.push([key, def]);
  const inch = (arr) => arr.map((x) => rnd(x * F));
  const inchPts = (pts) => pts.map((p) => p.map((x) => rnd(x * F)));
  const box = (key, name, desc, size, at, o = {}) => add(key, { name, description: desc, type: 'box', dimensions: inch(size), position: inch(at), ...o });
  const cyl = (key, name, desc, r, h, at, o = {}) => add(key, { name, description: desc, type: 'cylinder', dimensions: inch([r, h]), position: inch(at), ...o });
  const sph = (key, name, desc, r, at, o = {}) => add(key, { name, description: desc, type: 'sphere', dimensions: inch([r]), position: inch(at), ...o });
  const cone = (key, name, desc, r, h, at, o = {}) => add(key, { name, description: desc, type: 'cone', dimensions: inch([r, h]), position: inch(at), ...o });
  const group = (key, name, desc, at = [0, 0, 0], o = {}) => add(key, { name, description: desc, type: 'group', dimensions: [], position: inch(at), ...o });
  const thin = (x) => Math.max(x, 0.03);
  const motion = (m) => motions.push(m);
  // a cylinder from a to b (feet), like the adventure park's rod: tilt about X, then turn about Y
  const rod = (key, name, desc, a, b, r, o = {}) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz);
    const rx = rnd(-Math.asin(dy / len) * DEG), ry = rnd(Math.atan2(dx, dz) * DEG);
    add(key, { name, description: desc, type: 'cylinder', dimensions: inch([r, len]), position: inch([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]),
      ...(rx ? { rotation_x: rx } : {}), rotation_y: ry, ...o });
  };
  const seg = (a, b) => ({ cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, len: Math.hypot(b[0] - a[0], b[1] - a[1]), h: rnd(Math.atan2(b[1] - a[1], b[0] - a[0]) * DEG) });

  // =====================================================================================================
  // H01 outline: a curved, lobed tank. Facet glass, rim, sand floor discs, a curved tunnel. (No rockwork yet.)
  // =====================================================================================================
  group('tank', 'Habitat tank', 'the exhibit: a curved, lobed tank 110 ft long and about 65 ft across at most, 28 ft of water. Two storeys tall');
  const N = 40;
  const ring = Array.from({ length: N + 1 }, (_, i) => outline((i / N) * PI * 2));
  for (let i = 0; i < N; i++) {
    const s = seg(ring[i], ring[i + 1]), th = ((i + 0.5) / N) * PI * 2;
    // from V05 the front window leans out at the top (7 degrees) and the rim follows the leaning wall
    box(`glass-${i + 1}`, `Tank glass ${i + 1}`, 'thick acrylic wall of the tank (see-through)', [s.len + 0.15, 0.6, 27], [s.cx, s.cy, 14.5], { parent: 'tank', material: 'glass', rotation_z: s.h, ...(v >= 5 && inFront(th) ? { rotation_x: 7 } : {}) });
    if (v >= 5) {
      const a = outline((i / N) * PI * 2, 1 + lean((i / N) * PI * 2)), b = outline(((i + 1) / N) * PI * 2, 1 + lean(((i + 1) / N) * PI * 2)), rs = seg(a, b);
      box(`rim-${i + 1}`, `Pool rim ${i + 1}`, 'concrete edge round the top of the pool; it swings in and out as the wall leans', [rs.len + 0.4, 2, 1.5], [rs.cx, rs.cy, 28.25], { parent: 'tank', material: 'concrete', rotation_z: rs.h });
    } else box(`rim-${i + 1}`, `Pool rim ${i + 1}`, 'concrete edge round the top of the pool', [s.len + 0.4, 2, 1.5], [s.cx, s.cy, 28.25], { parent: 'tank', material: 'concrete', rotation_z: s.h });
  }
  // floor: hexagonal grid of sand discs inside the outline
  const floorCells = [];
  for (let gy = -34; gy <= 34; gy += 8.7) {
    const row = Math.round(gy / 8.7);
    for (let gx = -56; gx <= 56; gx += 10) {
      const x = gx + (row % 2 ? 5 : 0), y = gy;
      if (depthFt(x, y) > 6.9) floorCells.push([x, y]);
    }
  }
  const seabedTop = (x, y) => {                          // H02: the seabed rolls and climbs toward the rock wall
    if (v < 2) return 1.0;
    const rho = Math.hypot(x / AX, y / AY), phi = Math.atan2(y / AY, x / AX);
    const climb = 6.5 * Math.pow(Math.max(0, rho / Rf(phi) - 0.4) / 0.6, 1.8);
    const dune = 0.7 + 0.6 * Math.sin(x / 6 + y / 11) + 0.4 * Math.sin(x / 3.4 - y / 5);
    const away = Math.min(1, Math.max(0, (tunnelDist(x, y) - 7) / 6));    // flat under the tunnel
    const base = 1.0 + (climb + dune) * away + (1 - away) * 0.0;
    return v >= 5 ? Math.max(base, terrainZ(x, y) + (terrainZ(x, y) > 0 ? 0.3 : 0)) : base;
  };
  group('seabed', 'Seabed', 'sand: a flat base of discs, and from H02 rolling mounds on top that climb toward the rock wall');
  const onTerrain = (x, y) => v >= 5 && (eOf(SHELF, x, y) < 1.15 || eOf(TERR, x, y) < 1.35);
  floorCells.forEach(([x, y], i) => {
    if (onTerrain(x, y)) return;
    cyl(`sand-${i + 1}`, `Sand ${i + 1}`, 'sand on the tank floor', 6.4, 1, [x, y, 0.52], { parent: 'seabed', material: (i + (i >> 3)) % 3 ? 'sandA' : 'sandB' });
  });
  for (let i = 0; i < 56; i++) {                          // a ring of smaller discs that fills the gap at the wall
    const th = (i / 56) * PI * 2, [x, y] = outline(th, 0.945);
    if (onTerrain(x, y)) continue;
    cyl(`sand-edge-${i + 1}`, `Sand edge ${i + 1}`, 'sand along the foot of the wall', 4.6, 1, [x, y, 0.52], { parent: 'seabed', material: i % 3 ? 'sandB' : 'sandA' });
  }
  if (v >= 2) {
    // mounds: spheres that rest on the floor, as tall as the seabed climbs (none where it is low or under the tunnel)
    let mi = 0;
    for (let gy = -36; gy <= 36; gy += 5.6) {
      const row = Math.round(gy / 5.6);
      for (let gx = -58; gx <= 58; gx += 6.4) {
        const x = gx + (row % 2 ? 3.2 : 0), y = gy;
        if (depthFt(x, y) < 1 || tunnelDist(x, y) < 6.2 || onTerrain(x, y)) continue;
        const top = seabedTop(x, y);
        if (top < 2.4) continue;
        const rr = top / 2;
        sph(`mound-${++mi}`, `Sand mound ${mi}`, 'a rolling dune of sand', rr, [x, y, rr + 0.02], { parent: 'seabed', material: mi % 3 ? 'sandA' : 'sandB' });
      }
    }
  }
  group('water', 'Water', 'the water surface, in patches (see-through)');
  [-40, -28, -16, -4, 8, 20, 32, 44].forEach((gx, gi) => [-22, -11, 0, 11, 22].forEach((gy, gj) => {
    const x = gx + (gj % 2 ? 6 : 0);
    if (depthFt(x, gy) > 9.5) cyl(`surface-${gi}-${gj}`, `Water surface ${gi + 1}.${gj + 1}`, 'the top of the pool', 8.2, 0.2, [x, gy, 28], { parent: 'water', material: 'surface' });
  }));

  // the curved tunnel: 29 cylinder pieces along an S, a walkway under them, portals and two small entry buildings
  group('tunnel', 'Curved tunnel', 'a 120 ft clear acrylic tunnel that curves through the tank like a stream bed. Guests walk under the fish. 10 ft across');
  const tp = Array.from({ length: 30 }, (_, i) => { const x = -58 + i * 4; return [x, ty(x), 6]; });
  for (let i = 0; i < 29; i++) {
    const s = seg(tp[i], tp[i + 1]);
    cyl(`tunnel-${i + 1}`, `Tunnel section ${i + 1}`, 'clear acrylic tunnel section, round, 10 ft across', 5.2, s.len + 0.5, [s.cx, s.cy, 6], { parent: 'tunnel', material: 'acrylic', rotation_y: 90, rotation_z: s.h });
  }
  for (let i = 0; i < 29; i += 2) {
    const a = tp[i], b = tp[Math.min(i + 2, 29)], s = seg(a, b);
    box(`walk-${i / 2 + 1}`, `Tunnel walkway ${i / 2 + 1}`, 'the floor guests walk on', [s.len + 0.3, 6, 0.4], [s.cx, s.cy, 1.2], { parent: 'tunnel', material: 'floorWalk', rotation_z: s.h });
  }
  [[-1, 'west', 'entrance'], [1, 'east', 'exit']].forEach(([sgn, side, label]) => {
    cyl(`stub-${side}`, `Tunnel ${label} stub`, 'the straight end of the tunnel outside the tank', 5.2, 12, [sgn * 64, 0, 6], { parent: 'tunnel', material: 'acrylic', rotation_y: 90 });
    box(`portal-${side}`, `Tunnel ${label} portal`, 'steel frame where the tunnel leaves the tank', [3, 12, 12], [sgn * 58, 0, 6.5], { parent: 'tunnel', material: 'steel' });
    group(`hall-${side}`, sgn < 0 ? 'Entry lobby' : 'Exit hall', sgn < 0 ? 'where guests enter, at the west end' : 'the east end of the tunnel: gift shop and exit');
    box(`hall-${side}-floor`, `${sgn < 0 ? 'Lobby' : 'Exit hall'} floor`, '', [18, 26, 0.5], [sgn * 74, 0, 0.25], { parent: `hall-${side}`, material: 'concrete' });
    box(`hall-${side}-wall-a`, `${sgn < 0 ? 'Lobby' : 'Exit hall'} wall A`, '', [18, 0.6, 12], [sgn * 74, 13, 6.25], { parent: `hall-${side}`, material: 'wall' });
    box(`hall-${side}-wall-b`, `${sgn < 0 ? 'Lobby' : 'Exit hall'} wall B`, '', [18, 0.6, 12], [sgn * 74, -13, 6.25], { parent: `hall-${side}`, material: 'wall' });
    box(`hall-${side}-wall-c`, `${sgn < 0 ? 'Lobby' : 'Exit hall'} end wall`, '', [0.6, 26, 12], [sgn * 83, 0, 6.25], { parent: `hall-${side}`, material: 'wall' });
    box(`hall-${side}-roof`, `${sgn < 0 ? 'Lobby' : 'Exit hall'} roof`, 'see-through so you can look in', [19, 27, 0.6], [sgn * 74, 0, 12.5], { parent: `hall-${side}`, material: 'roof' });
  });

  // =====================================================================================================
  // H02 rockwork: sculpted rock cliffs round the walls, ledges, caves, window mullions, a tide shelf
  // =====================================================================================================
  if (v >= 2) {
    group('rockwork', 'Rockwork', 'sculpted rock cliffs that hide the walls: boulders, ledges and spires, in four tiers up to the surface');
    const STEP = (PI * 2) / 72;
    const stations = [];
    for (let i = 0; i < 72; i++) { const th = i * STEP; if (!inFront(th)) stations.push([i, th]); }
    const rockMats = ['rockA', 'rockB', 'rockC', 'rockWarm'];
    const kz = (th, k, z) => (v >= 5 ? k * wallK(th, z) : k);                     // from V05 the wall leans: the cliff follows it
    stations.forEach(([i, th]) => {
      const r = rngFor(`rock${i}`), pickM = () => rockMats[Math.floor(r() * 4)];
      const jit = () => (r() - 0.5) * 2.4;
      const tier = (n, k, zc, rad) => {
        const [x, y] = outline(th + (r() - 0.5) * STEP * 0.6, kz(th, k, zc));
        sph(`rock-${i}-${n}`, `Rock ${i}.${n}`, 'a boulder in the sculpted rock wall, with cracks where small fish hide', rad, [x + jit() * 0.4, y + jit() * 0.4, zc], { parent: 'rockwork', material: pickM() });
      };
      { const rad = 4.2 + r() * 1.6; tier(1, 0.925, rad - 0.6, rad); }
      tier(2, 0.945, 9 + r() * 1.5, 4 + r() * 1.5);
      tier(3, 0.955, 15 + r() * 1.5, 3.8 + r() * 1.3);
      tier(4, 0.965, 21 + r() * 1.5, 3.6 + r() * 1.2);
    });
    // ledges: flat slabs sticking out of the cliff, every third station
    stations.filter(([i]) => i % 3 === 1).forEach(([i, th]) => {
      const r = rngFor(`ledge${i}`), zc0 = 9 + r() * 9, [x, y] = outline(th, kz(th, 0.9, zc0)), zc = zc0, h = rnd(Math.atan2(Math.sin(th) * AX, Math.cos(th) * AY) * DEG);
      box(`ledge-${i}`, `Rock ledge ${i}`, 'a flat shelf of rock where fish rest and kelp grows', [5 + r() * 2, 3, 0.9], [x, y, zc], { parent: 'rockwork', material: rockMats[i % 4], rotation_z: rnd(h) });
    });
    // spires on the cliff top
    for (let i = 0; i < 24; i++) {
      const th = i * (PI * 2 / 24) + 0.05, r = rngFor(`spire${i}`);
      if (inFront(th)) continue;
      const [x, y] = outline(th, kz(th, 0.985, 27));
      cone(`spire-${i}`, `Rock spire ${i}`, 'a rock point at the top of the cliff', 1.4 + r() * 0.8, 4 + r() * 3, [x, y, 25.5 + r() * 1.5], { parent: 'rockwork', material: rockMats[i % 4] });
    }
    // three caves: two boulders and a cap, a dark mouth
    [[v >= 5 ? 3.55 : 2.4, 0.78, 'Hide cave'], [0.35, 0.8, 'Shark cave'], [4.9, 0.8, 'Eel cave']].forEach(([th, k, nm], i) => {
      const [x, y] = outline(th, k);
      const dx = Math.cos(th), dy = Math.sin(th);                       // out toward the wall
      sph(`cave-${i + 1}-a`, `${nm} left`, 'a boulder at the side of the cave mouth', 3.2, [x - dy * 4.2, y + dx * 4.2, 3.2], { parent: 'rockwork', material: 'rockC' });
      sph(`cave-${i + 1}-b`, `${nm} right`, 'a boulder at the side of the cave mouth', 3.0, [x + dy * 4.2, y - dx * 4.2, 3.0], { parent: 'rockwork', material: 'rockA' });
      box(`cave-${i + 1}-cap`, `${nm} roof`, 'a slab of rock over the cave mouth', [7.5, 3, 1.2], [x, y, 6.6], { parent: 'rockwork', material: 'rockB', rotation_z: rnd(Math.atan2(dx, -dy) * DEG - 90 + 90) });
      sph(`cave-${i + 1}-dark`, `${nm} mouth`, 'the dark mouth of the cave where animals shelter', 2.0, [x + dx * 1.6, y + dy * 1.6, 2.4], { parent: 'rockwork', material: 'cave' });
      cone(`cave-${i + 1}-stal`, `${nm} spire`, 'a rock point beside the cave', 0.9, 5, [x + dx * 3, y + dy * 3, 8], { parent: 'rockwork', material: 'rockWarm' });
    });
    // window: mullions between the front glass panels (the curved front window)
    group('window', 'Front window', 'the big curved front window: guests look in from the gallery outside. No rock here, so you see the habitat edge on');
    for (let i = 0; i < N; i += 1) {
      const th = (i / N) * PI * 2;
      if (!inFront(th)) continue;
      const [x, y] = outline(th, 1.0);
      box(`mullion-${i + 1}`, `Window frame ${i + 1}`, 'a slim steel frame between glass panels', [0.9, 0.9, 28], [x, y, 14.2], { parent: 'window', material: 'frame' });
    }
    // portholes through the rock for the small ones: low round windows
    [[2.1, 'north'], [0.1, 'east'], [3.6, 'west']].forEach(([th, nm], i) => {
      const [x, y] = outline(th, 1.05);
      cyl(`porthole-${i + 1}`, `Low round window (${nm})`, 'a round window at kid height; press your nose to it and watch the fish', 1.2, 0.6, [x, y, 2.5], { parent: 'window', material: 'acrylic', rotation_x: 90, rotation_z: rnd(th * DEG - 90) });
    });
    // tide shelf along the north wall: stacked terraces and a shallow pool (replaced by the real shelf in V05)
    if (v < 5) {
    group('tide', 'Tide shelf', 'a rocky shelf in the shallows where the water rises and falls, with a tide pool on top');
    [[-22, 25], [-12, 27], [-2, 28], [8, 27.5], [18, 26]].forEach(([x, y], i) => {
      cyl(`tide-${i + 1}-a`, `Tide terrace ${i + 1}`, 'a low rock terrace in the shallows', 4.8, 1.4, [x, y, 14.6], { parent: 'tide', material: ['rockA', 'rockB', 'rockWarm', 'rockC', 'rockA'][i] });
      cyl(`tide-${i + 1}-b`, `Tide terrace ${i + 1} top`, 'the second step of the terrace', 3.2, 1.2, [x, y + 0.5, 16], { parent: 'tide', material: 'rockWarm' });
      cyl(`tide-${i + 1}-pool`, `Tide pool ${i + 1}`, 'a little pool of water held in the rock', 2.0, 0.4, [x, y + 0.5, 16.7], { parent: 'tide', material: 'pool' });
    });
    }
  }

  // =====================================================================================================
  // H03 habitat: the kelp forest, reef, eelgrass, sea fans, anemones, and shafts of light from the surface
  // =====================================================================================================
  // place something inside the tank: seeded rejection, in the given arc of angles and depth range, away from the tunnel
  function spot(key, opt) {
    for (let a = 0; a < 500; a++) {
      const r = rngFor(`${key}@${a}`), th = opt.th0 + (opt.th1 - opt.th0) * r(), k = opt.k0 + (opt.k1 - opt.k0) * r();
      const [x, y] = outline(th, k);
      if (v >= 5 && !opt.onTerrain && (eOf(SHELF, x, y) < 1.3 || eOf(TERR, x, y) < 1.45)) continue;   // solid ground from V05
      if (opt.noTunnel && tunnelDist(x, y) < opt.noTunnel) continue;
      if (opt.ok && !opt.ok(x, y, th)) continue;
      return [x, y, th];
    }
    throw new Error('no spot for ' + key);
  }
  function kelp(key, x, y, H, opt = {}) {
    const r = rngFor(key + '/kelp'), z0 = seabedTop(x, y);
    group(key, 'Giant kelp', 'a brown-green seaweed that can grow up to 2 ft a day and forms underwater forests. Gas-filled bladders hold the blades up toward the light', [x, y, z0]);
    // the stipe leans and curves: four rods, each turning a little
    let px = x, py = y, pz = z0, ang = r() * PI * 2;
    const lean = 0.5 + r() * 0.8, pieces = 4, pts = [[px, py, pz]];
    for (let i = 0; i < pieces; i++) {
      ang += (r() - 0.5) * 1.1;
      const nx = px + Math.cos(ang) * lean * (1 + i * 0.4), ny = py + Math.sin(ang) * lean * (1 + i * 0.4), nz = pz + H / pieces;
      rod(`${key}-stipe${i + 1}`, 'Kelp stem', 'the long stem (stipe)', [px, py, pz], [nx, ny, nz], 0.13 - i * 0.012, { parent: key, material: i % 2 ? 'stem' : 'kelp3' });
      pts.push([nx, ny, nz]); px = nx; py = ny; pz = nz;
    }
    for (let i = 0; i < 3; i++) {
      const p = pts[1 + i], rr = r();
      box(`${key}-blade${i + 1}`, 'Kelp blade', 'a long leaf-like blade that sways in the surge', [0.15, thin(0.8), 1.7], [p[0] + 0.3, p[1], p[2] + 0.4], { parent: key, material: i % 2 ? 'kelp' : 'kelp2', rotation_z: rnd(rr * 180) });
    }
    const top = pts[pieces];
    sph(`${key}-bladder`, 'Kelp float', 'a gas-filled bladder that floats the blades', 0.28, [top[0], top[1], top[2] + 0.4], { parent: key, material: 'bladder' });
    if (opt.sway !== false) {
      const rr = rngFor(key + '/sway');
      motion({ id: `${key}-sway-x`, target: key, kind: 'swing', axis: 'x', pivot: inch([x, y, z0]), from: -3.5, to: 3.5, cycles: 2 + Math.floor(rr() * 3), phase: rr() < 0.5 ? 0 : 0.5 });
      motion({ id: `${key}-sway-y`, target: key, kind: 'swing', axis: 'y', pivot: inch([x, y, z0]), from: -3.5, to: 3.5, cycles: 2 + Math.floor(rr() * 3), phase: rr() < 0.5 ? 0 : 0.5 });
    }
  }
  if (v >= 3) {
    // kelp forest: the north and west lobes, 24 strands
    for (let i = 0; i < 24; i++) {
      const [x, y] = spot(`kelpf${i}`, { th0: 0.4, th1: 3.5, k0: 0.3, k1: 0.72, noTunnel: 9.5 });
      kelp(`kelp-${i + 1}`, x, y, 16 + rngFor(`kelph${i}`)() * 9);
    }
    // eelgrass meadows on the sand flats in the south
    group('meadow', 'Eelgrass meadows', 'grassy underwater meadows on the sand flats; baby fish hide in them');
    for (let i = 0; i < 6; i++) {
      const [x, y] = spot(`grass${i}`, { th0: PI + 0.2, th1: PI * 2 - 0.2, k0: 0.3, k1: 0.7, noTunnel: 8.5 });
      const r = rngFor(`grassb${i}`), z0 = seabedTop(x, y);
      group(`grass-${i + 1}`, 'Eelgrass', 'a patch of eelgrass, a flowering plant that grows in sand and sways in the current', [x, y, z0], { parent: 'meadow' });
      for (let b = 0; b < 5; b++) box(`grass-${i + 1}-${b + 1}`, 'Eelgrass blade', 'a long thin blade', [0.12, 0.05, 3 + r() * 1.5], [x + (r() - 0.5) * 2.6, y + (r() - 0.5) * 2.2, z0 + 1.9], { parent: `grass-${i + 1}`, material: 'grass' });
      const rr = rngFor(`grassb${i}/sway`);
      motion({ id: `grass-${i + 1}-sway`, target: `grass-${i + 1}`, kind: 'swing', axis: 'x', pivot: inch([x, y, z0]), from: -5, to: 5, cycles: 3 + Math.floor(rr() * 3), phase: rr() < 0.5 ? 0 : 0.5 });
    }
    // reef: corals, sea fans and anemones along the rock foot
    group('reef', 'Rocky reef', 'coral heads, sea fans and anemones growing on the rocks at the foot of the cliff');
    for (let i = 0; i < 26; i++) {
      const [x, y] = spot(`coral${i}`, { th0: 0, th1: PI * 2, k0: 0.8, k1: 0.9, ok: (px, py, th) => !inFront(th) });
      const r = rngFor(`coralz${i}`), z0 = seabedTop(x, y), m = ['coralY', 'coralP', 'coral', 'fan'][i % 4];
      if (i % 4 === 3) box(`fan-${i + 1}`, `Sea fan ${i + 1}`, 'a soft sea fan that waves in the current', [thin(0.15), 1.6, 1.8], [x, y, z0 + 1.2], { parent: 'reef', material: m, rotation_z: rnd(r() * 180) });
      else sph(`coral-${i + 1}`, `Coral head ${i + 1}`, 'a hard coral colony built by thousands of tiny animals', 0.7 + r() * 0.8, [x, y, z0 + 0.7], { parent: 'reef', material: m });
    }
    for (let i = 0; i < 6; i++) {
      const [x, y] = spot(`anem${i}`, { th0: 0, th1: PI * 2, k0: 0.74, k1: 0.84, ok: (px, py, th) => !inFront(th) && tunnelDist(px, py) > 9 });
      cone(`anemone-${i + 1}`, `Sea anemone ${i + 1}`, 'a soft animal with stinging tentacles; clownfish live safely inside', 0.9, 1.1, [x, y, seabedTop(x, y) + 0.7], { parent: 'reef', material: 'anemone', rotation_x: 180 });
    }
    // shafts of light from the surface, slanting down through the water
    group('light', 'Light shafts', 'soft shafts of daylight slanting down from the surface');
    [[-34, 4], [-20, -4], [-6, 10], [8, -8], [22, 6], [36, -2]].forEach(([x, y], i) =>
      box(`shaft-${i + 1}`, `Light shaft ${i + 1}`, 'a shaft of sunlight in the water', [2.6, 0.4, 26], [x, y, 15], { parent: 'light', material: 'beam', rotation_x: i % 2 ? 9 : -9 }));
  }

  // =====================================================================================================
  // H04 populated: every marine asset from the Grand Ocean Aquarium, now swimming in the habitat
  // =====================================================================================================
  // fish builder (same shapes as tools/aquarium.js), facing heading h degrees, centre `at` feet
  function fish(key, spId, at, h, o = {}) {
    const s = SP[spId], L = o.L || s.L, hr = (h * PI) / 180, c = Math.cos(hr), sn = Math.sin(hr);
    const P = (lx, ly, lz) => [rnd(at[0] + lx * c - ly * sn), rnd(at[1] + lx * sn + ly * c), rnd(at[2] + lz)];
    const nm = o.name || s.name, parent = o.parent || key;
    const part = (suffix, label, type, dims, loc, mat, rot = {}) => {
      const def = { name: `${nm} ${label}`, description: label === 'body' || !o.noGroup ? (o.desc || s.desc) : `${label} of the ${nm.toLowerCase()}`,
        type, dimensions: inch(dims), position: inch(P(...loc)), parent, material: mat, rotation_z: rnd(h + (rot.z || 0)) };
      if (rot.y) def.rotation_y = rot.y;
      add(`${key}-${suffix}`, def);
    };
    if (!o.noGroup) group(key, `${nm}${o.tag ? ' ' + o.tag : ''}`, s.desc, at);
    const fat = s.fat || 1, eyes = (x, w, zz, rr) => [1, -1].forEach((e, i) => part(`eye${i + 1}`, 'eye', 'sphere', [thin(rr)], [x, e * w, zz], 'ink'));
    let tailRoot;
    if (s.kind === 'fish' || s.kind === 'tiny') {
      part('body', 'body', 'box', [0.6 * L, thin(0.13 * L * fat), thin(0.3 * L * fat)], [0.05 * L, 0, 0], s.mat);
      tailRoot = -0.25 * L;
      part('tail', 'tail', 'box', [0.2 * L, thin(0.04 * L), thin(0.3 * L)], [-0.36 * L, 0, 0], s.mat);
      if (s.kind === 'fish') { part('fin', 'back fin', 'box', [0.25 * L, thin(0.03 * L), thin(0.12 * L)], [0.05 * L, 0, 0.2 * L * fat], s.mat); eyes(0.28 * L, 0.065 * L * fat, 0.05 * L, 0.035 * L); }
    } else if (s.kind === 'shark' || s.kind === 'ham') {
      part('body', 'body', 'cylinder', [0.07 * L, 0.75 * L], [-0.05 * L, 0, 0], s.mat, { y: 90 });
      tailRoot = -0.42 * L;
      part('tail', 'tail', 'box', [0.12 * L, thin(0.03 * L), 0.25 * L], [-0.49 * L, 0, 0.04 * L], s.mat);
      if (s.kind === 'shark') part('snout', 'snout', 'cone', [0.07 * L, 0.2 * L], [0.425 * L, 0, 0], s.mat, { y: 90 });
      else part('head', 'hammer head', 'box', [0.1 * L, 0.26 * L, thin(0.03 * L)], [0.36 * L, 0, 0], s.mat);
      part('dorsal', 'dorsal fin', 'cone', [0.06 * L, 0.14 * L], [0, 0, 0.14 * L], s.mat);
      [1, -1].forEach((e, i) => part(`pec${i + 1}`, 'side fin', 'box', [0.12 * L, 0.15 * L, thin(0.02 * L)], [0.12 * L, e * 0.12 * L, -0.04 * L], s.mat, { z: -e * 20 }));
      eyes(0.33 * L, 0.05 * L, 0.05 * L, 0.015 * L);
    } else if (s.kind === 'ray') {
      part('body', 'wings', 'box', [0.55 * L, 0.55 * L, thin(0.04 * L)], [0, 0, 0], s.mat, { z: 45 });
      tailRoot = -0.28 * L;
      part('tail', 'tail', 'cylinder', [thin(0.012 * L), 0.7 * L], [-0.62 * L, 0, 0], s.mat, { y: 90 });
      part('hump', 'head', 'sphere', [0.07 * L], [0.12 * L, 0, 0.03 * L], s.mat);
      eyes(0.17 * L, 0.05 * L, 0.06 * L, 0.018 * L);
    } else if (s.kind === 'turtle') {
      part('body', 'shell', 'box', [0.5 * L, 0.42 * L, 0.14 * L], [0, 0, 0], s.mat);
      tailRoot = -0.2 * L;
      part('head', 'head', 'sphere', [0.07 * L], [0.34 * L, 0, 0.02 * L], 'turtleSkin');
      [[0.12, 1], [0.12, -1], [-0.14, 1], [-0.14, -1]].forEach(([fx, e], i) => part(`flipper${i + 1}`, 'flipper', 'box', [0.2 * L, 0.07 * L, thin(0.02 * L)], [fx * L, e * 0.28 * L, -0.03 * L], 'turtleSkin', { z: -e * (fx > 0 ? 35 : -35) }));
      part('tail', 'tail', 'box', [0.1 * L, thin(0.03 * L), thin(0.03 * L)], [-0.28 * L, 0, 0], 'turtleSkin');
      eyes(0.4 * L, 0.04 * L, 0.05 * L, 0.015 * L);
    } else if (s.kind === 'eel') {
      part('body', 'body', 'cylinder', [0.04 * L, 0.7 * L], [0, 0, 0], s.mat, { y: 90 });
      tailRoot = -0.2 * L;
      part('tail', 'tail', 'cylinder', [0.025 * L, 0.3 * L], [-0.45 * L, 0, 0], s.mat, { y: 90 });
      part('head', 'head', 'sphere', [0.06 * L], [0.37 * L, 0, 0], s.mat);
      eyes(0.4 * L, 0.04 * L, 0.02 * L, 0.012 * L);
    }
    return { tailRoot: tailRoot === undefined ? null : P(tailRoot, 0, 0), s };
  }
  function hero(key, spId, zone, o = {}) {
    const s = SP[spId], r = rngFor(key + '/hero'), pts = o.pts || swimLoop(key, zone, s.L, v >= 5);
    const h = rnd(M.pathAt(inchPts(pts), 0).heading * DEG), at = pts[0];
    const f = fish(key, spId, at, h, o);
    const speed = o.speed || Math.min(4, Math.max(1.5, 0.4 * s.L));
    motion({ id: `${key}-swim`, target: key, kind: 'path', points: inchPts(pts), face: 'tangent', rest_heading_deg: h, pivot: inch(at),
      cycles: Math.max(1, Math.round((speed * LOOP_S) / M.pathLength(pts))), phase: 0 });
    if (f.tailRoot && s.kind !== 'ray' && s.kind !== 'turtle') {
      motion({ id: `${key}-tail`, target: `${key}-tail`, kind: 'swing', axis: 'z', pivot: inch(f.tailRoot), from: -16, to: 16, cycles: Math.round(10 + 20 * r()) * 2, phase: r() < 0.5 ? 0 : 0.5 });
    }
  }
  function school(key, spId, n, zone, spread, o = {}) {
    const s = SP[spId], r = rngFor(key + '/school'), pts = swimLoop(key, zone, s.L + 3, v >= 5);
    const h = rnd(M.pathAt(inchPts(pts), 0).heading * DEG), at = pts[0];
    group(key, o.title || `School of ${s.name.toLowerCase()}s`, s.desc, at);
    for (let i = 0; i < n; i++) {
      const p = [at[0] + (r() - 0.5) * spread[0], at[1] + (r() - 0.5) * spread[1], at[2] + (r() - 0.5) * spread[2]];
      fish(`${key}-${i + 1}`, spId, p, rnd(h + (r() - 0.5) * 24), { noGroup: true, parent: key, name: s.name + ' ' + (i + 1) });
    }
    const speed = o.speed || 2;
    motion({ id: `${key}-swim`, target: key, kind: 'path', points: inchPts(pts), face: 'tangent', rest_heading_deg: h, pivot: inch(at), cycles: Math.max(1, Math.round((speed * LOOP_S) / M.pathLength(pts))), phase: 0 });
  }
  const person = (key, x, y, z, mat, parent, hh = 0) => {
    box(`${key}-body`, 'Guest', 'a visitor, 5 ft tall (estimate)', [1.2, 0.8, 3], [x, y, z + 1.5], { parent, material: mat, rotation_z: hh });
    sph(`${key}-head`, 'Guest head', '', 0.45, [x, y, z + 3.5], { parent, material: 'skin' });
  };

  if (v >= 4) {
    // big animals, in the zones they like (loops are tested against the walls and the tunnel)
    [['sandtiger-1', 'sandtiger', 'high'], ['sandtiger-2', 'sandtiger', 'mid'], ['sandtiger-3', 'sandtiger', 'high'], ['sandtiger-4', 'sandtiger', 'mid'], ['sandtiger-5', 'sandtiger', 'high'],
      ['zebra-1', 'zebra', 'low'], ['zebra-2', 'zebra', 'low'], ['zebra-3', 'zebra', 'low'], ['leopard-1', 'leopard', 'low'], ['leopard-2', 'leopard', 'low'],
      ['bonnet-1', 'bonnet', 'mid'], ['bonnet-2', 'bonnet', 'low'], ['bonnet-3', 'bonnet', 'mid'], ['bonnet-4', 'bonnet', 'high'],
      ['blacktip-1', 'blacktip', 'mid'], ['blacktip-2', 'blacktip', 'high'], ['blacktip-3', 'blacktip', 'mid'],
      ['seabass-1', 'seabass', 'front'], ['seabass-2', 'seabass', 'mid'], ['seabass-3', 'seabass', 'high'], ['seabass-4', 'seabass', 'front'],
      ['yellowtail-1', 'yellowtail', 'high'], ['yellowtail-2', 'yellowtail', 'high'], ['yellowtail-3', 'yellowtail', 'mid'],
      ['barracuda-1', 'barracuda', 'mid'], ['barracuda-2', 'barracuda', 'high'], ['sheephead-1', 'sheephead', 'low'], ['sheephead-2', 'sheephead', 'low'],
      ['garibaldi-1', 'garibaldi', 'front'], ['garibaldi-2', 'garibaldi', 'low'], ['garibaldi-3', 'garibaldi', 'front'], ['garibaldi-4', 'garibaldi', 'low'],
      ['batray-1', 'batray', 'low'], ['batray-2', 'batray', 'low'], ['batray-3', 'batray', 'low'], ['eagleray-1', 'eagleray', 'high'],
      ['turtle-1', 'turtle', 'front'], ['turtle-2', 'turtle', 'high']]
      .forEach(([k, id, z]) => hero(k, id, z, { tag: k.split('-')[1] }));
    // moray eel weaving at the mouth of the eel cave
    const [ex, ey] = outline(4.9, 0.8), edx = Math.cos(4.9), edy = Math.sin(4.9);
    hero('moray-1', 'moray', 'low', { tag: '1', pts: [[ex + edx * 4.2, ey + edy * 4.2, 2.6], [ex + edx * 4.6, ey + edy * 3.6, 2.7], [ex + edx * 4.8, ey + edy * 4.3, 2.8]], speed: 0.2 });
    // schools
    school('anchovy-school', 'anchovy', 24, 'high', [4, 2.5, 2.5], { speed: 3 });
    school('anchovy-school-2', 'anchovy', 18, 'front', [4, 2, 2.5], { speed: 3, title: 'Second school of anchovies' });
    school('sardine-school', 'sardine', 24, 'high', [5, 3, 3], { speed: 3.2 });
    school('sardine-school-2', 'sardine', 16, 'mid', [4, 3, 2.5], { speed: 2.6, title: 'Second school of sardines' });
    school('blacksmith-school', 'blacksmith', 14, 'mid', [3.5, 2.5, 2], { speed: 1.6 });
    school('blacksmith-school-2', 'blacksmith', 8, 'low', [3, 2, 2], { speed: 1.6, title: 'Second school of blacksmith' });
    school('opaleye-school', 'opaleye', 10, 'low', [3, 2, 2], { speed: 1.4 });
    school('bluetang-school', 'bluetang', 14, 'low', [3.5, 2.5, 2], { speed: 1.5 });
    school('yellowtang-school', 'yellowtang', 14, 'low', [3.5, 2.5, 2], { speed: 1.5 });
    school('sergeant-school', 'sergeant', 10, 'front', [3, 1.5, 2], { speed: 1.4 });
    school('idol-school', 'idol', 9, 'front', [3, 1.5, 2], { speed: 1.3 });
    // clownfish in the first two anemones
    [1, 2].forEach((n) => {
      const a = defs.find((d) => d[0] === `anemone-${n}`)[1].position.map((x) => x / F);
      hero(`clown-${n}`, 'clown', 'low', { tag: String(n), speed: 0.5, pts: [[a[0] - 1.2, a[1], a[2] + 1.9], [a[0], a[1] - 1.2, a[2] + 2.2], [a[0] + 1.2, a[1], a[2] + 1.9], [a[0], a[1] + 1.2, a[2] + 2.2]] });
    });
    // moon jellies drift and pulse
    for (let i = 0; i < 8; i++) {
      const [x, y] = spot(`jelly${i}`, { th0: 0, th1: PI * 2, k0: 0.35, k1: 0.6, ok: (px, py) => depthFt(px, py) > 12 });
      const r = rngFor(`jellyz${i}`), z = 14 + r() * 8, key = `jelly-${i + 1}`;
      group(key, `Moon jelly ${i + 1}`, 'A see-through jellyfish with no brain and no heart. It pulses its bell to drift and catches tiny food on its sticky skin.', [x, y, z]);
      sph(`${key}-bell`, `Moon jelly ${i + 1} bell`, 'the pulsing bell of the jellyfish', 0.9, [x, y, z], { parent: key, material: 'jelly' });
      for (let t = 0; t < 3; t++) cyl(`${key}-arm${t + 1}`, `Moon jelly ${i + 1} tentacle`, 'a short trailing tentacle', 0.05, 1.8, [x + (t - 1) * 0.35, y, z - 1.5], { parent: key, material: 'jelly' });
      const pts = loopPts(key, x, y, 2 + r() * 1.5, 1.5 + r() * 1.5, z, 0.8);
      motion({ id: `${key}-drift`, target: key, kind: 'path', points: inchPts(pts), face: 'tangent', rest_heading_deg: rnd(M.pathAt(inchPts(pts), 0).heading * DEG), cycles: 1, phase: 0, pivot: inch(pts[0]) });
      motion({ id: `${key}-pulse`, target: `${key}-bell`, kind: 'bob', axis: 'z', amount: 0.25 * F, cycles: 6 + (i % 3), phase: 0 });
    }
    // a diver feeding the fish
    const dpts = swimLoop('diver', 'mid', 5, v >= 5), dh = rnd(M.pathAt(inchPts(dpts), 0).heading * DEG), [dx, dy, dz] = dpts[0];
    group('diver', 'Diver', 'A staff diver who feeds the fish and cleans the glass. Divers talk to guests through a speaker in the mask.', [dx, dy, dz]);
    const dc = Math.cos((dh * PI) / 180), ds = Math.sin((dh * PI) / 180), DP = (lx, ly, lz) => [dx + lx * dc - ly * ds, dy + lx * ds + ly * dc, dz + lz];
    box('diver-body', 'Diver body', 'a staff diver in a wet suit', [2.6, 1, 1], DP(0, 0, 0), { parent: 'diver', material: 'suit', rotation_z: dh });
    sph('diver-head', 'Diver head', 'with a mask', 0.45, DP(1.6, 0, 0.15), { parent: 'diver', material: 'skin' });
    cyl('diver-tank', 'Air tank', 'air for about an hour', 0.3, 1.8, DP(-0.2, 0, 0.8), { parent: 'diver', material: 'tankgas', rotation_y: 90, rotation_z: dh });
    box('diver-fins', 'Diver fins', '', [1.2, 0.8, 0.1], DP(-1.9, 0, 0), { parent: 'diver', material: 'ink', rotation_z: dh });
    for (let b = 0; b < 3; b++) sph(`diver-bubble-${b + 1}`, 'Diver bubble', 'bubbles from the regulator', 0.2, DP(1.4 + b * 0.25, 0.4 + b * 0.2, 0.7 + b * 0.6), { parent: 'diver', material: 'bubble' });
    motion({ id: 'diver-swim', target: 'diver', kind: 'path', points: inchPts(dpts), face: 'tangent', rest_heading_deg: dh, pivot: inch([dx, dy, dz]), cycles: 1, phase: 0 });
    // seabed critters and bubble vents
    group('critters', 'Seabed critters', 'urchins, sea stars and abalone on the sand and the rocks');
    for (let i = 0; i < 24; i++) {
      const [x, y] = spot(`crit${i}`, { th0: 0, th1: PI * 2, k0: 0.3, k1: 0.85, noTunnel: 7 }), z0 = seabedTop(x, y), r = rngFor(`critz${i}`);
      if (i % 3 === 0) sph(`urchin-${i + 1}`, `Purple sea urchin ${i + 1}`, 'a spiny ball that grazes kelp. Sheephead fish can crack it open.', 0.3, [x, y, z0 + 0.3], { parent: 'critters', material: 'urchin' });
      else if (i % 3 === 1) box(`star-${i + 1}`, `Bat star ${i + 1}`, 'a sea star that can have five or more arms. Not a fish at all.', [0.7, 0.7, 0.12], [x, y, z0 + 0.08], { parent: 'critters', material: 'star', rotation_z: rnd(r() * 90) });
      else sph(`abalone-${i + 1}`, `Abalone ${i + 1}`, 'a sea snail with a shiny shell, once nearly fished out in California', 0.35, [x, y, z0 + 0.2], { parent: 'critters', material: 'rock2' });
    }
    group('bubbles', 'Bubble vents', 'air vents that push oxygen into the water');
    [[-12, -14], [10, 16], [34, 10]].forEach(([x, y], i) => {
      const z0 = seabedTop(x, y);
      cyl(`vent-${i + 1}`, `Air vent ${i + 1}`, 'sends a stream of bubbles up', 0.5, 0.3, [x, y, z0 + 0.15], { parent: 'bubbles', material: 'steel' });
      for (let b = 0; b < 5; b++) sph(`bubble-${i + 1}-${b + 1}`, 'Bubble', 'an air bubble rising', 0.18 + b * 0.04, [x + (b % 2 ? 0.3 : -0.3), y, z0 + 2 + b * 2.4], { parent: 'bubbles', material: 'bubble' });
    });
    // the curved front gallery outside the window: floor, rail, benches, guests; two guests walk the tunnel
    group('gallery', 'Front gallery', 'a curved walkway outside the front window, with benches. The best place to sit and watch the whole habitat');
    const g0 = FRONT[0] + 0.05, g1 = FRONT[1] - 0.05, GN = 14;
    for (let i = 0; i < GN; i++) {
      const a = g0 + (g1 - g0) * (i / GN), b = g0 + (g1 - g0) * ((i + 1) / GN);
      const pa = outline(a, 1.18), pb = outline(b, 1.18), s = seg(pa, pb), mid = (a + b) / 2, [mx, my] = outline(mid, 1.18);
      box(`gal-floor-${i + 1}`, `Gallery floor ${i + 1}`, 'the walkway in front of the window', [s.len + 0.4, 9, 0.5], [s.cx, s.cy, 0.25], { parent: 'gallery', material: 'floorWalk', rotation_z: s.h });
      const [rx, ry] = outline(mid, 1.07);
      box(`gal-rail-${i + 1}`, `Gallery rail ${i + 1}`, 'a rail to lean on at the glass', [s.len + 0.2, 0.3, 0.3], [rx, ry, 3.2], { parent: 'gallery', material: 'steel', rotation_z: s.h });
      if (i % 3 === 1) box(`gal-bench-${i + 1}`, `Gallery bench ${i + 1}`, 'a bench facing the glass', [7, 2, 1.4], [mx, my, 1.2], { parent: 'gallery', material: 'bench', rotation_z: s.h });
    }
    for (let i = 0; i < 16; i++) {
      const r = rngFor(`gg${i}`), th = g0 + (g1 - g0) * ((i + 0.5) / 16), [x, y] = outline(th, 1.1 + r() * 0.04);
      person(`gallery-guest-${i + 1}`, x, y, 0.5, ['shirtA', 'shirtB', 'shirtC'][i % 3], 'gallery');
    }
    [['walker-1', 'shirtA', -52], ['walker-2', 'shirtB', -40]].forEach(([k, mat, x0], j) => {
      const off = j ? -1.6 : 1.6, line = (x) => [x, ty(x) + off, 1.4], pts = [line(x0), line(-20), line(10), line(46), [52, ty(46), 1.4], [46, ty(46) - off, 1.4], [10, ty(10) - off, 1.4], [-20, ty(-20) - off, 1.4], [-52, ty(-52), 1.4]];
      const wh = rnd(M.pathAt(inchPts(pts), 0).heading * DEG);
      group(k, 'Tunnel guest', 'a visitor walking through the tunnel', pts[0], { parent: 'gallery' });
      person(k, pts[0][0], pts[0][1], 1.4, mat, k, wh);
      motion({ id: `${k}-walk`, target: k, kind: 'path', face: 'tangent', rest_heading_deg: wh, cycles: 1, phase: 0, points: inchPts(pts), pivot: inch(pts[0]) });
    });
  }


  // =====================================================================================================
  // H05 not an extrusion: leaning walls, a three-level floor, and room underneath. The shelf in the north-west is a
  // raised plateau (12 ft of water over it) with a cavern gallery beneath, looking into the deep basin through glass.
  // The terrace in the south-east is a solid step at 8 ft. Everything else is the deep basin.
  // =====================================================================================================
  if (v >= 5) {
    // terrace: columns whose heights follow a smooth step, opaque rock and sand
    group('terrace', 'Terrace', 'a solid rock-and-sand step in the south-east, 8 ft high, between the deep basin and the front window');
    let ti = 0;
    for (let gy = -30; gy <= 0; gy += 5.4) {
      const row = Math.round(gy / 5.4);
      for (let gx = 6; gx <= 44; gx += 6) {
        const x = gx + (row % 2 ? 3 : 0), y = gy, h = terraceZ(x, y);
        if (h < 1 || depthFt(x, y) < 0.5) continue;
        cyl(`terrace-${++ti}`, `Terrace rock ${ti}`, 'part of the 8 ft terrace', 4.0, h, [x, y, h / 2 + 0.02], { parent: 'terrace', material: ti % 3 ? 'rockB' : 'sandB' });
      }
    }
    // shelf: a plateau slab with a sand top, held up by the cavern's walls and four pillars
    group('shelf', 'Shelf plateau', 'a raised plateau in the north-west. 12 ft of water over it, and a cavern gallery underneath');
    let si = 0;
    for (let gy = SHELF.cy - SHELF.ry; gy <= SHELF.cy + SHELF.ry + 0.1; gy += 5.2) {
      const row = Math.round(gy / 5.2);
      for (let gx = SHELF.cx - SHELF.rx; gx <= SHELF.cx + SHELF.rx + 0.1; gx += 6) {
        const x = gx + (row % 2 ? 3 : 0), y = gy;
        if (eOf(SHELF, x, y) > 1.04 || depthFt(x, y) < 0.3) continue;
        cyl(`slab-${++si}`, `Shelf slab ${si}`, 'the plateau: sand on top, rock below, with the cavern under it', 4.3, 1.9, [x, y, SHELF.z - 0.95], { parent: 'shelf', material: si % 2 ? 'sandA' : 'sandB' });
      }
    }
    // the cavern: floor, a glass window wall along the plateau edge, a few pillars, benches, lamps, a sign, guests
    group('cavern', 'Cavern gallery', 'a quiet room under the shelf, 15 ft high. A long glass wall looks out into the deep basin, so you sit beneath the plateau and watch the fish');
    let ci = 0;
    for (let gy = SHELF.cy - SHELF.ry + 1; gy <= SHELF.cy + SHELF.ry; gy += 6.6) {
      for (let gx = SHELF.cx - SHELF.rx + 2; gx <= SHELF.cx + SHELF.rx; gx += 6.6) {
        if (eOf(SHELF, gx, gy) > 0.94 || depthFt(gx, gy) < 0.8) continue;
        cyl(`cavern-floor-${++ci}`, `Cavern floor ${ci}`, 'the floor of the cavern gallery', 3.9, 0.5, [gx, gy, 0.27], { parent: 'cavern', material: 'floorWalk' });
      }
    }
    const win = [];
    for (let i = 0; i < 30; i++) {
      const t = (i / 30) * PI * 2, t2 = ((i + 1) / 30) * PI * 2;
      const a = [SHELF.cx + SHELF.rx * Math.cos(t), SHELF.cy + SHELF.ry * Math.sin(t)], b = [SHELF.cx + SHELF.rx * Math.cos(t2), SHELF.cy + SHELF.ry * Math.sin(t2)];
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (depthFt(mid[0], mid[1]) < 3.2) continue;                  // only where deep water is outside
      win.push([a, b]);
    }
    win.forEach(([a, b], i) => {
      const sg = seg(a, b);
      box(`cavern-glass-${i + 1}`, `Cavern window ${i + 1}`, 'a glass panel looking from the cavern into the deep basin', [sg.len + 0.1, 0.5, 15.3], [sg.cx, sg.cy, 8.2], { parent: 'cavern', material: 'glass', rotation_z: sg.h });
      box(`cavern-sill-${i + 1}`, `Cavern sill ${i + 1}`, 'a low sill under the window', [sg.len + 0.2, 1.0, 0.7], [sg.cx, sg.cy, 0.85], { parent: 'cavern', material: 'frame', rotation_z: sg.h });
    });
    [[-35, 14], [-28, 24], [-14, 22], [-18, 12]].forEach(([x, y], i) => cyl(`pillar-${i + 1}`, `Cavern pillar ${i + 1}`, 'holds up the shelf', 0.8, 15, [x, y, 7.6], { parent: 'cavern', material: 'concrete' }));
    win.filter((_, i) => i % 3 === 1).forEach(([a, b], i) => {
      const sg = seg(a, b), dx = SHELF.cx - sg.cx, dy = SHELF.cy - sg.cy, d = Math.hypot(dx, dy);
      box(`cavern-bench-${i + 1}`, `Cavern bench ${i + 1}`, 'a bench facing the window', [5.5, 1.8, 1.4], [sg.cx + (dx / d) * 3, sg.cy + (dy / d) * 3, 1.2], { parent: 'cavern', material: 'bench', rotation_z: sg.h });
    });
    for (let i = 0; i < 7; i++) sph(`cavern-lamp-${i + 1}`, `Cavern lamp ${i + 1}`, 'a soft lamp under the shelf', 0.5, [SHELF.cx - 12 + i * 4, SHELF.cy + (i % 2 ? 3 : -3), 14.2], { parent: 'cavern', material: 'lamp' });
    box('cavern-sign', 'Cavern sign', 'Cavern Gallery: you are under the plateau. Look up to see the fish swimming over your head', [6, 0.3, 2], [SHELF.cx, SHELF.cy + 8, 10], { parent: 'cavern', material: 'sign' });
    for (let i = 0; i < 6; i++) {
      const r = rngFor(`cg${i}`), w = win[(i * 2 + 1) % win.length], sg = seg(w[0], w[1]), dx = SHELF.cx - sg.cx, dy = SHELF.cy - sg.cy, d = Math.hypot(dx, dy);
      person(`cavern-guest-${i + 1}`, sg.cx + (dx / d) * (1.8 + r()), sg.cy + (dy / d) * (1.8 + r()), 0.5, ['shirtA', 'shirtB', 'shirtC'][i % 3], 'cavern');
    }
  }

  // =====================================================================================================
  // H06 bridges and tunnels: a deck round the top, a skybridge arching over the deep basin, a long walk over the
  // plateau, a tunnel through the plateau water, and a stair tube up through the shelf from the cavern.
  // =====================================================================================================
  const deckZ = 28.4;
  const yN7 = edgeYv(8, 1) - 2.2, yS7 = edgeYv(8, -1) + 2.2;
  const archZ = (s) => deckZ + 0.1 + 4.5 * Math.sin(PI * s);
  if (v >= 6) {
    group('deck', 'Deck ring', 'a walkway round the whole pool at the top, with a rail. Bridges start from here');
    for (let i = 0; i < N; i++) {
      const th = (i / N) * PI * 2, th2 = ((i + 1) / N) * PI * 2, a = outline(th, 1.1 * (1 + 0)), b = outline(th2, 1.1), sg = seg(a, b);
      box(`deck-${i + 1}`, `Deck ${i + 1}`, 'the walkway round the pool', [sg.len + 0.5, 5, 0.6], [sg.cx, sg.cy, deckZ - 0.3], { parent: 'deck', material: 'deck', rotation_z: sg.h });
      const ra = outline(th, 1.165), rb = outline(th2, 1.165), rs = seg(ra, rb);
      box(`deck-rail-${i + 1}`, `Deck rail ${i + 1}`, 'a handrail on the outside of the deck', [rs.len + 0.2, 0.25, 0.25], [rs.cx, rs.cy, deckZ + 3.2], { parent: 'deck', material: 'steel', rotation_z: rs.h });
      if (i % 2 === 0) cyl(`deck-post-${i + 1}`, `Deck rail post ${i + 1}`, '', 0.12, 3.4, [ra[0], ra[1], deckZ + 1.4], { parent: 'deck', material: 'steel' });
    }
    // find where a line at x (or y) leaves the deck ring
    const edgeX = edgeXv;
    // skybridge A: along x = 8, north to south, an arch 4.5 ft high over the deep basin
    group('skybridge', 'Skybridge', 'an arched footbridge over the deep basin, 56 ft long. You walk above the water, with the fish below your feet');
    const yN = yN7, yS = yS7, NA = 14;
    for (let i = 0; i < NA; i++) {
      const s0 = i / NA, s1 = (i + 1) / NA, y0 = yS + (yN - yS) * s0, y1 = yS + (yN - yS) * s1, z0 = archZ(s0), z1 = archZ(s1), len = Math.hypot(y1 - y0, z1 - z0), tilt = rnd(Math.atan2(z1 - z0, y1 - y0) * DEG);
      box(`bridge-a-${i + 1}`, `Skybridge deck ${i + 1}`, 'a plank of the arched skybridge', [4, len + 0.25, 0.5], [8, (y0 + y1) / 2, (z0 + z1) / 2], { parent: 'skybridge', material: 'deck', rotation_x: tilt });
      [-1.9, 1.9].forEach((sx, k) => box(`bridge-a-rail-${i + 1}-${k + 1}`, `Skybridge rail ${i + 1}${k ? 'b' : 'a'}`, 'a handrail', [0.22, len + 0.2, 0.22], [8 + sx, (y0 + y1) / 2, (z0 + z1) / 2 + 3.2], { parent: 'skybridge', material: 'steel', rotation_x: tilt }));
      if (i % 2 === 0) [-1.9, 1.9].forEach((sx, k) => cyl(`bridge-a-post-${i + 1}-${k + 1}`, `Skybridge rail post ${i + 1}${k ? 'b' : 'a'}`, '', 0.1, 3.2, [8 + sx, (y0 + y1) / 2, (z0 + z1) / 2 + 1.6], { parent: 'skybridge', material: 'steel' }));
    }
    // kelp walk B: from the west deck along y = 18 up to the skybridge, over the plateau
    group('kelpwalk', 'Kelp Walk', 'a long timber walkway from the west deck, out over the plateau and the kelp forest, to the skybridge');
    const xW = edgeX(18, -1) + 2.2, xE = 8 - 2.2, NB = 12, sbZ = archZ((18 - yS) / (yN - yS));
    for (let i = 0; i < NB; i++) {
      const x0 = xW + (xE - xW) * (i / NB), x1 = xW + (xE - xW) * ((i + 1) / NB), z0 = deckZ + 0.1 + (sbZ - deckZ - 0.1) * (i / NB) ** 2, z1 = deckZ + 0.1 + (sbZ - deckZ - 0.1) * ((i + 1) / NB) ** 2;
      const len = Math.hypot(x1 - x0, z1 - z0), tilt = rnd(-Math.atan2(z1 - z0, x1 - x0) * DEG);
      box(`bridge-b-${i + 1}`, `Kelp Walk plank ${i + 1}`, 'a plank of the Kelp Walk', [len + 0.25, 3.2, 0.45], [(x0 + x1) / 2, 18, (z0 + z1) / 2], { parent: 'kelpwalk', material: 'deck', rotation_y: tilt });
      [-1.5, 1.5].forEach((sy, k) => box(`bridge-b-rail-${i + 1}-${k + 1}`, `Kelp Walk rail ${i + 1}${k ? 'b' : 'a'}`, 'a handrail', [len + 0.2, 0.2, 0.2], [(x0 + x1) / 2, 18 + sy, (z0 + z1) / 2 + 3.1], { parent: 'kelpwalk', material: 'steel', rotation_y: tilt }));
    }
    // two walkers cross the skybridge and come back
    [['bridge-walker-1', 'shirtB', 7.1], ['bridge-walker-2', 'shirtC', 8.9]].forEach(([k, mat, lx], j) => {
      const lane = (s) => [lx, yS + (yN - yS) * s, archZ(s) + 0.3], order = j ? [1, 0.67, 0.33, 0, 0.33, 0.67].map((s) => s) : [0, 0.33, 0.67, 1, 0.67, 0.33];
      const pts = order.map((s, q) => { const p = lane(s); return q >= order.length / 2 ? [p[0] + (lx < 8 ? 1.8 : -1.8), p[1], p[2]] : p; });
      const wh = rnd(M.pathAt(inchPts(pts), 0).heading * DEG);
      group(k, 'Bridge guest', 'a visitor walking over the skybridge', pts[0], { parent: 'skybridge' });
      person(k, pts[0][0], pts[0][1], pts[0][2], mat, k, wh);
      motion({ id: `${k}-walk`, target: k, kind: 'path', face: 'tangent', rest_heading_deg: wh, cycles: 1, phase: 0, points: inchPts(pts), pivot: inch(pts[0]) });
    });
    // tunnel through the plateau water: a short acrylic tunnel just above the slab, and a stair tube up from the cavern
    group('plateau-tunnel', 'Plateau tunnel', 'a 32 ft clear tunnel through the water over the shelf. Walk through the plateau at fish height. The stair tube from the cavern comes up in the middle');
    cyl('ptunnel-tube', 'Plateau tunnel tube', 'clear acrylic, 6.4 ft across', PTUN.r, PTUN.x1 - PTUN.x0, [(PTUN.x0 + PTUN.x1) / 2, PTUN.y, PTUN.zc], { parent: 'plateau-tunnel', material: 'acrylic', rotation_y: 90 });
    box('ptunnel-floor', 'Plateau tunnel walkway', 'the floor you walk on', [PTUN.x1 - PTUN.x0, 4, 0.4], [(PTUN.x0 + PTUN.x1) / 2, PTUN.y, PTUN.zc - PTUN.r + 0.4], { parent: 'plateau-tunnel', material: 'floorWalk' });
    [[PTUN.x0, 'west'], [PTUN.x1, 'east']].forEach(([x, nm]) => box(`ptunnel-portal-${nm}`, `Plateau tunnel ${nm} portal`, 'steel frame at the end of the tunnel', [1.2, 8, 7.6], [x, PTUN.y, PTUN.zc], { parent: 'plateau-tunnel', material: 'steel' }));
    cyl('stair-tube', 'Stair tube', 'a clear tube with a spiral stair that climbs from the cavern up through the shelf into the plateau tunnel', 2.6, 16.4, [SHELF.cx, SHELF.cy, 8.7], { parent: 'plateau-tunnel', material: 'acrylic' });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI * 2 * 1.5;
      box(`stair-tube-step-${i + 1}`, `Stair tube step ${i + 1}`, 'a step of the spiral stair', [1.8, 0.9, 0.3], [SHELF.cx + 1.5 * Math.cos(a), SHELF.cy + 1.5 * Math.sin(a), 1.3 + i * 1.3], { parent: 'plateau-tunnel', material: 'steel', rotation_z: rnd(a * DEG) });
    }
    cyl('cavern-door', 'Cavern stairs', 'stairs down to the cavern from the front gallery (a ramp is beside them)', 1.2, 0.3, [SHELF.cx - 1, SHELF.cy - 1, 0.3], { parent: 'plateau-tunnel', material: 'mint' });
  }

  // =====================================================================================================
  // H07 repopulated: the plateau gets its own residents, the terrace gets kelp and coral, the bridges get guests
  // =====================================================================================================
  if (v >= 7) {
    [['batray-4', 'batray', 'plateau'], ['turtle-3', 'turtle', 'plateau'], ['garibaldi-5', 'garibaldi', 'plateau'], ['garibaldi-6', 'garibaldi', 'plateau'], ['sheephead-3', 'sheephead', 'plateau'],
      ['leopard-3', 'leopard', 'plateau'], ['batray-5', 'batray', 'plateau']].forEach(([k, id, z]) => hero(k, id, z, { tag: k.split('-')[1] }));
    school('plateau-sardines', 'sardine', 18, 'plateau', [3.5, 2.5, 2], { speed: 2.2, title: 'School of sardines over the plateau' });
    school('plateau-blacksmith', 'blacksmith', 12, 'plateau', [3, 2, 1.6], { speed: 1.6, title: 'School of blacksmith over the plateau' });
    // kelp on the terrace and plants on the plateau
    for (let i = 0; i < 6; i++) {
      const [x, y] = spot(`tkelp${i}`, { th0: -1.3, th1: -0.1, k0: 0.45, k1: 0.9, onTerrain: true, ok: (px, py) => eOf(TERR, px, py) < 0.85 });
      kelp(`kelp-t${i + 1}`, x, y, 12 + rngFor(`tkh${i}`)() * 5);
    }
    for (let i = 0; i < 10; i++) {
      const [x, y] = spot(`tcoral${i}`, { th0: -1.4, th1: -0.05, k0: 0.4, k1: 0.9, onTerrain: true, ok: (px, py) => eOf(TERR, px, py) < 0.95 });
      const r = rngFor(`tcz${i}`), z0 = seabedTop(x, y);
      sph(`tcoral-${i + 1}`, `Terrace coral ${i + 1}`, 'a hard coral colony on the sunlit terrace', 0.6 + r() * 0.7, [x, y, z0 + 0.5], { parent: 'reef', material: ['coralY', 'coralP', 'coral'][i % 3] });
    }
    group('plateau-life', 'Plateau residents', 'urchins, sea stars and kelp on the sand of the shelf plateau');
    for (let i = 0; i < 14; i++) {
      const r = rngFor(`pl${i}`), x = SHELF.cx + (r() - 0.5) * 2 * SHELF.rx * 0.8, y = SHELF.cy + (r() - 0.5) * 2 * SHELF.ry * 0.8;
      if (eOf(SHELF, x, y) > 0.85 || depthFt(x, y) < 3 || (x > PTUN.x0 - 1 && x < PTUN.x1 + 1 && Math.abs(y - PTUN.y) < 4.6)) { continue; }
      if (i % 3 === 0) sph(`pl-urchin-${i + 1}`, `Purple sea urchin on the plateau ${i + 1}`, 'a spiny ball that grazes kelp', 0.3, [x, y, SHELF.z + 0.3], { parent: 'plateau-life', material: 'urchin' });
      else if (i % 3 === 1) box(`pl-star-${i + 1}`, `Bat star on the plateau ${i + 1}`, 'a sea star, not a fish at all', [0.7, 0.7, 0.12], [x, y, SHELF.z + 0.08], { parent: 'plateau-life', material: 'star', rotation_z: rnd(r() * 90) });
      else cone(`pl-anemone-${i + 1}`, `Sea anemone on the plateau ${i + 1}`, 'a soft animal with stinging tentacles', 0.8, 1, [x, y, SHELF.z + 0.55], { parent: 'plateau-life', material: 'anemone', rotation_x: 180 });
    }
    // two guests on the Kelp Walk, two more on the deck
    [['walk-guest-1', 'shirtA', -44], ['walk-guest-2', 'shirtB', -26]].forEach(([k, mat, x0], j) => {
      const z = (x) => deckZ + 0.1 + (archZ((18 - (edgeYv(8, -1) + 2.2)) / ((edgeYv(8, 1) - 2.2) - (edgeYv(8, -1) + 2.2))) - deckZ - 0.1) * ((x - (edgeXv(18, -1) + 2.2)) / ((8 - 2.2) - (edgeXv(18, -1) + 2.2))) ** 2 + 0.25;
      const xs = j ? [-26, -14, -4, -14] : [-44, -34, -26, -34];
      const pts = xs.map((x, q) => [x, 18 + (q === 3 ? -0.9 : 0.9), z(x)]);
      const wh = rnd(M.pathAt(inchPts(pts), 0).heading * DEG);
      group(k, 'Kelp Walk guest', 'a visitor walking the Kelp Walk', pts[0], { parent: 'kelpwalk' });
      person(k, pts[0][0], pts[0][1], pts[0][2], mat, k, wh);
      motion({ id: `${k}-walk`, target: k, kind: 'path', face: 'tangent', rest_heading_deg: wh, cycles: 1, phase: 0, points: inchPts(pts), pivot: inch(pts[0]) });
    });
  }

  return { defs, motions };
}

function sceneFor(v) {
  const pad = String(v).padStart(2, '0');
  const id = `habitat-aquarium-v${pad}`;
  const built = defsFor(v);
  const scene = {
    id,
    builtin: true,
    project: 'Coastal Habitat Aquarium',
    header: {
      model_id: id,
      name: `Coastal Habitat Aquarium V${pad}`,
      description: `Coastal Habitat Aquarium, increment ${v} of 7 (about ${COUNTS[v - 1]} objects). An organic, modelled habitat tank: curved outline and leaning walls, sculpted rockwork, a three-level floor with a cavern under the shelf, bridges over and tunnels through, kelp forest and reef. Tap an animal to read about it. Sizes are estimates, in inches.`,
      units: 'in', up: 'z', world: WORLD_ID,
      materials: MATERIALS,
    },
    defs: built.defs,
  };
  if (built.motions.length) {
    scene.motion = (uuid) => ({
      schema: M.MOTION_SCHEMA,
      model_id: id,
      name: 'Swim and sway',
      description: 'Kelp and eelgrass sway; animals swim closed loops; jellies pulse. Every motion repeats a whole number of times per 60 s loop, so it never jumps.',
      units: 'in', up: 'z',
      loop_s: LOOP_S,
      autoplay: { plays: 2 },
      motions: defsFor(v).motions.map((m) => ({ ...m, target: uuid(m.target) })),
    });
  }
  return scene;
}

const HABITAT = Array.from({ length: 7 }, (_, i) => sceneFor(i + 1));

// A cutaway of the final version for review: the front half of the rock wall, glass, rim and deck is left out, so the
// three floor levels, the cavern under the shelf, the bridges and the tunnels can be seen from the front.
const CUT = /^(rock-|ledge-|spire-|cave-|glass-|rim-|mullion-|deck-|deck-rail-|deck-post-|porthole-|sand-edge-|surface-|gal-|gallery-guest-)/;
function cutawayFor(v) {
  const base = sceneFor(v), id = `habitat-aquarium-v${String(v).padStart(2, '0')}-cutaway`;
  const defs = base.defs.filter(([k, d]) => !(CUT.test(k) && d.position[1] / F < -2));
  const scene = { ...base, id, project: 'Coastal Habitat Aquarium',
    header: { ...base.header, model_id: id, name: `Coastal Habitat Aquarium V${String(v).padStart(2, '0')} cutaway`, description: `Cutaway of increment ${v}: the front half of the rock wall, glass and deck is left out so the floor levels, the cavern, the bridges and the tunnels show. For review only.` }, defs };
  if (base.motion) scene.motion = (uuid) => ({ ...base.motion(uuid.bind ? ((k) => uuid(k)) : uuid), model_id: id, motions: base.motion(uuid).motions.filter((m) => defs.some(([k]) => uuid(k) === m.target)) });
  return scene;
}
HABITAT.push(cutawayFor(7));

module.exports = { SHELF, TERR, PTUN, eOf, terrainZ, depthFtZ, HABITAT, WORLD_ID, COUNTS, LOOP_S, MATERIALS, defsFor, sceneFor, depthFt, tunnelDist, ty, outline, Rf, AX, AY };
