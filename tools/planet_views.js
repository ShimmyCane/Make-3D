// Planet views, V02 and V03 for the eight planets, and Earth V02 to V10. Versions are cumulative: each
// "if (v >= N)" block adds one layer. V01 of each planet stays in tools/solar_system.js (unchanged).
//
// Textures are simple, placed on the sphere by latitude and longitude (lat 0 = equator, lon 0 = +x):
// flat discs (cylinders turned to lie on the surface), small spheres half sunk into the surface, and cones
// for mountains. Sizes are rough and in inches, as the planets are. They are cosmetic, not survey data.
//
// Spins and moons: whole turns per loop (loop 240 s; Earth V10 is 480 s, twice as long, to fit more in).
// Back to the Solar System is a button in the page (header.links), not an object in 3-D space.

const M = require('../js/core/motion.js');
const SS = require('./solar_system.js');

const DEG = 180 / Math.PI;
const rad = (d) => d / DEG;
const rnd = (n) => Math.round(n * 1000) / 1000;
const f = (x) => x - Math.floor(x);

// new materials for the textures (the solar palette is kept)
const NEW = {
  venusb1: { color: '#f3e3b0', opacity: 1 }, venusb2: { color: '#e2c58a', opacity: 1 },
  cap: { color: '#fbfbff', opacity: 1 }, dark: { color: '#5b544d', opacity: 1 },
  grs: { color: '#c4543b', opacity: 1 }, ovalw: { color: '#fff7ee', opacity: 1 },
  hexblue: { color: '#2e4f8f', opacity: 1 }, ringdark: { color: '#5c5a5a', opacity: 0.7 },
  crater: { color: '#7d756c', opacity: 1 }, brightray: { color: '#f2f0ea', opacity: 1 },
  olympus: { color: '#b0664a', opacity: 1 }, dustv: { color: '#c7a77a', opacity: 0.3 },
  ice: { color: '#ffffff', opacity: 1 }, pluto_heart: { color: '#f4efe6', opacity: 1 },
  nitro: { color: '#fffdf7', opacity: 1 }, mtn: { color: '#8a8f6a', opacity: 1 },
  amalthea: { color: '#b89070', opacity: 1 }, himalia: { color: '#a09a92', opacity: 1 },
  thebe: { color: '#a58c75', opacity: 1 }, mimas: { color: '#e8e8e8', opacity: 1 },
  tethys: { color: '#dcdcdc', opacity: 1 }, dione: { color: '#d0d0d0', opacity: 1 },
  rhea: { color: '#c9c9c9', opacity: 1 }, iapetus: { color: '#b8a890', opacity: 1 },
  umbriel: { color: '#6d6d72', opacity: 1 }, titania: { color: '#bcbcc0', opacity: 1 },
  oberon: { color: '#a9a39d', opacity: 1 }, puck: { color: '#8f8f8f', opacity: 1 },
  proteus: { color: '#7d7d7d', opacity: 1 }, nereid: { color: '#9ea5b8', opacity: 1 },
  nix: { color: '#dedede', opacity: 1 }, hydra: { color: '#e6e6e6', opacity: 1 },
  land: { color: '#5f9e5a', opacity: 1 }, dsand: { color: '#d9b77a', opacity: 1 },
  cloud: { color: '#ffffff', opacity: 0.35 }, iss: { color: '#d9dde3', opacity: 1 },
  panel: { color: '#2f5f9e', opacity: 1 }, rocket: { color: '#f2f2f2', opacity: 1 },
  nose: { color: '#d6453d', opacity: 1 }, plume: { color: '#ffa640', opacity: 0.6 },
  pad: { color: '#8c8c8c', opacity: 1 }, storm: { color: '#ffffff', opacity: 0.8 },
  eye: { color: '#3c4a5a', opacity: 1 }, light: { color: '#ffe27a', opacity: 1 },
};
const MATERIALS = { ...SS.MATERIALS, ...NEW };
const WORLD_ID = SS.WORLD_ID;
const LOOP_S = 240;

// ---------- surface helpers
// A point on a sphere of radius R at latitude/longitude, lifted by h. rot turns a cylinder's axis (z) to the normal.
function surf(c, R, lat, lon, h = 0) {
  const cl = Math.cos(rad(lat)), n = [cl * Math.cos(rad(lon)), cl * Math.sin(rad(lon)), Math.sin(rad(lat))];
  const r = R + h;
  return { p: [rnd(c[0] + n[0] * r), rnd(c[1] + n[1] * r), rnd(c[2] + n[2] * r)], n, rot: { rotation_y: rnd(90 - lat), rotation_z: rnd(lon) } };
}
// A flat disc lying on the surface (cylinder: radius, height).
function disc(key, name, c, R, lat, lon, radius, mat, parent, h = 0.2, desc = '') {
  const s = surf(c, R, lat, lon, h);
  return [key, { name, description: desc, type: 'cylinder', dimensions: [rnd(radius), 0.4], position: s.p, ...s.rot, material: mat, parent }];
}
// A small sphere on the surface, half sunk when h is negative (craters, rock, land cells).
function dot(key, name, c, R, lat, lon, r, mat, parent, h = 0, desc = '') {
  const s = surf(c, R, lat, lon, h);
  return [key, { name, description: desc, type: 'sphere', dimensions: [rnd(r)], position: s.p, material: mat, parent }];
}
// A cone on the surface, tip outward (mountain): base on the surface, height h.
function cone(key, name, c, R, lat, lon, radius, height, mat, parent, desc = '') {
  const s = surf(c, R, lat, lon, height / 2);
  return [key, { name, description: desc, type: 'cone', dimensions: [rnd(radius), rnd(height)], position: s.p, ...s.rot, material: mat, parent }];
}
// A cylinder whose axis is a fixed direction, placed at a point (used for flat rings at the planet centre).
function ring(key, name, c, radius, z, mat, parent) {
  return [key, { name, description: '', type: 'cylinder', dimensions: [rnd(radius), 0.3], position: [c[0], c[1], rnd(c[2] + z)], material: mat, parent }];
}

// ---------- moons (distance d from the centre in inches, radius r, cycles per loop, first version v)
const EXTRA = {
  jupiter: [
    { name: 'Amalthea', d: 26, r: 0.9, mat: 'amalthea', cycles: 15, v: 2 },
    { name: 'Himalia', d: 80, r: 1.2, mat: 'himalia', cycles: 2, v: 2 },
    { name: 'Thebe', d: 33, r: 0.7, mat: 'thebe', cycles: 11, v: 3 },
  ],
  saturn: [
    { name: 'Mimas', d: 25, r: 0.7, mat: 'mimas', cycles: 14, v: 2 },
    { name: 'Tethys', d: 40, r: 1.3, mat: 'tethys', cycles: 7, v: 2 },
    { name: 'Dione', d: 45, r: 1.5, mat: 'dione', cycles: 5, v: 2 },
    { name: 'Rhea', d: 62, r: 1.9, mat: 'rhea', cycles: 3, v: 2 },
    { name: 'Iapetus', d: 80, r: 2.2, mat: 'iapetus', cycles: 2, v: 3 },
  ],
  uranus: [
    { name: 'Umbriel', d: 38, r: 1.6, mat: 'umbriel', cycles: 4, v: 2 },
    { name: 'Titania', d: 42, r: 2.0, mat: 'titania', cycles: 3, v: 2 },
    { name: 'Oberon', d: 50, r: 1.9, mat: 'oberon', cycles: 2, v: 2 },
    { name: 'Puck', d: 58, r: 1.0, mat: 'puck', cycles: 1, v: 3 },
  ],
  neptune: [
    { name: 'Proteus', d: 22, r: 1.0, mat: 'proteus', cycles: 4, v: 2 },
    { name: 'Nereid', d: 62, r: 0.6, mat: 'nereid', cycles: 1, v: 3 },
  ],
  pluto: [
    { name: 'Nix', d: 16, r: 0.5, mat: 'nix', cycles: 3, v: 2 },
    { name: 'Hydra', d: 21, r: 0.4, mat: 'hydra', cycles: 2, v: 2 },
  ],
};

// ---------- textures per planet, by version
function textures(key, v, c, R, body) {
  const d = [];
  const P = (name, desc = '') => ({ name, desc });
  if (key === 'mercury') {
    const craters = [[20, 30, 1.1], [-15, 80, 0.9], [35, -60, 1.3], [-40, -20, 1.0], [5, 150, 0.8], [-5, -120, 1.2], [50, 110, 0.9], [-30, 170, 1.0], [10, -150, 1.1], [-55, 60, 0.9], [25, -10, 0.8], [-20, -90, 1.0], [60, -30, 0.7], [-45, 130, 0.9]];
    craters.forEach(([la, lo, r], i) => d.push(dot(`crater-${i}`, 'Crater', c, R, la, lo, r, 'crater', body, -0.4, 'a dark crater')));
    if (v >= 3) {
      [[15, 40], [-25, -70], [40, -140]].forEach(([la, lo], i) => d.push(dot(`ray-${i}`, 'Bright ray crater', c, R, la, lo, 1.0, 'brightray', body, 0.1)));
      [[-10, 10, 0.9], [30, 170, 0.8], [-60, -40, 1.0], [45, 60, 0.7], [-35, 100, 0.9], [15, -20, 0.8]].forEach(([la, lo, r], i) => d.push(dot(`crater3-${i}`, 'Crater', c, R, la, lo, r, 'crater', body, -0.4)));
    }
  }
  if (key === 'venus' && v >= 3) {
    d.push(disc('vortex-n', 'North polar vortex', c, R, 75, 0, 4, 'venusb2', body, 0.2));
    d.push(disc('vortex-s', 'South polar vortex', c, R, -72, 120, 4, 'venusb2', body, 0.2));
  }
  if (key === 'mars') {
    d.push(disc('cap-n', 'North polar cap', c, R, 90, 0, 3.2, 'cap', body, 0.2));
    d.push(disc('cap-s', 'South polar cap', c, R, -90, 0, 3.0, 'cap', body, 0.2));
    d.push(disc('dark', 'Dark region', c, R, -12, 35, 5, 'dark', body, 0.1));
    d.push(cone('olympus', 'Olympus Mons', c, R, 18, -130, 2.4, 3.2, 'olympus', body, 'a tall volcano'));
    if (v >= 3) {
      [[-5, -60], [20, 80], [-25, 150], [8, 0], [-15, -170]].forEach(([la, lo], i) => d.push(dot(`dust-${i}`, 'Dust cloud', c, R, la, lo, 3, 'dustv', body, 2)));
    }
  }
  if (key === 'jupiter') {
    d.push(disc('grs', 'Great Red Spot', c, R, -22, 20, 4.2, 'grs', body, 0.3, 'a storm bigger than Earth'));
    d.push(disc('oval-1', 'White oval', c, R, -40, 80, 1.6, 'ovalw', body, 0.3));
    if (v >= 3) {
      d.push(disc('oval-2', 'White oval', c, R, -40, -40, 1.3, 'ovalw', body, 0.3));
      d.push(disc('oval-3', 'White oval', c, R, -32, 140, 1.2, 'ovalw', body, 0.3));
      d.push(disc('grs-2', 'Small red spot', c, R, 12, -110, 1.1, 'grs', body, 0.3));
    }
  }
  if (key === 'saturn') {
    d.push(disc('hex', 'North hexagon', c, R, 84, 0, 4, 'hexblue', body, 0.3, 'a six-sided storm at the pole'));
    if (v >= 3) d.push(ring('cassini', 'Cassini gap', c, 1.85 * R, 0.9, 'ringdark', body));
  }
  if (key === 'uranus') {
    d.push(ring('ring-u1', 'Thin ring', c, 1.7 * R, 0.3, 'ringdark', body));
    d.push(ring('ring-u2', 'Thin ring', c, 1.9 * R, -0.3, 'ringdark', body));
    d.push(disc('cap-u', 'Polar cap', c, R, 88, 0, 4, 'ice', body, 0.3));
    if (v >= 3) d.push(dot('spot-u', 'Bright spot', c, R, 40, 60, 1.0, 'ice', body, 0.3));
  }
  if (key === 'neptune') {
    d.push(disc('gds', 'Great Dark Spot', c, R, -22, -60, 3.6, 'hexblue', body, 0.3, 'a dark storm'));
    [[-30, -50], [-15, -40], [-35, -70], [-20, -80]].forEach(([la, lo], i) => d.push(dot(`streak-${i}`, 'White cloud', c, R, la, lo, 1.0, 'ice', body, 0.3)));
    if (v >= 3) {
      [[10, 30], [25, 120], [-5, 160], [40, -20]].forEach(([la, lo], i) => d.push(dot(`cloud3-${i}`, 'White cloud', c, R, la, lo, 0.9, 'ice', body, 0.3)));
      d.push(disc('neptune-b', 'Dark patch', c, R, 35, 90, 2.5, 'neptuneb', body, 0.3));
    }
  }
  if (key === 'pluto') {
    d.push(disc('heart', 'Heart-shaped plain', c, R, 20, 180, 2.2, 'pluto_heart', body, 0.15, 'a bright plain of ice'));
    if (v >= 3) {
      d.push(disc('nitro', 'Nitrogen cap', c, R, 80, 0, 2.0, 'nitro', body, 0.15));
      [[-20, 60], [10, -100], [-35, -150], [-10, 20]].forEach(([la, lo], i) => d.push(dot(`mtn-${i}`, 'Mountain', c, R, la, lo, 0.45, 'mtn', body, 0.2)));
    }
  }
  return d;
}

// Venus gets striped clouds from V02 (bodyDefs draws bands when the planet has them).
const VENUS_BANDS = ['venusb1', 'venusb2', 'venusb1', 'venusb2', 'venusb1', 'venusb2', 'venusb1', 'venusb2'];

// ---------- a planet view (not Earth), version v = 2 or 3
function planetDefs(key, v) {
  const p0 = SS.PLANETS[key];
  const p = key === 'venus' && v >= 2 ? { ...p0, bands: VENUS_BANDS } : p0;
  const c = [0, 0, 0];
  const body = `body-${key}`;
  const defs = SS.bodyDefs(key, p, c, null, 5);   // ball, bands, rings, atmosphere (no link: the view is a leaf)
  defs.push(...textures(key, v, c, p.R, body));
  const moons = [...(SS.MOONS[key] || []), ...((EXTRA[key] || []).filter((m) => m.v <= v))];
  for (const m of moons) {
    const mk = m.name.toLowerCase();
    defs.push([`arm-${mk}`, { name: `${m.name} orbit`, description: 'turns the moon round the planet', type: 'group', dimensions: [], position: c }]);
    defs.push([`moon-${mk}`, { name: m.name, description: `a moon of ${p0.name}`, type: 'sphere', dimensions: [rnd(m.r)], position: [m.d, 0, 0], material: m.mat, parent: `arm-${mk}` }]);
  }
  return { defs, moons, p };
}

function planetScene(key, v) {
  const p0 = SS.PLANETS[key];
  const id = `planet-${key}-v0${v}`;
  const { defs, moons, p } = planetDefs(key, v);
  return {
    id,
    builtin: true,
    project: `${p0.name} (planet view)`,
    header: {
      model_id: id,
      name: `${p0.name} (planet view) V0${v}`,
      description: `${p0.name} on its own, increment ${v}: ${p0.desc}. Textures are placed by latitude and longitude; sizes are rough. Spins${moons.length ? ', with its moons going round' : ''}. Use the button to go back to the Solar System.`,
      units: 'in', up: 'z', world: WORLD_ID,
      materials: MATERIALS,
      view: { fill: 0.75, radius: p.R },
      links: [{ label: 'Back to the Solar System', target: 'solar-system-v06', transition: 'fade' }],
    },
    defs,
    motion: (uuid) => {
      const c = [0, 0, 0];
      const list = [{ id: `${key}-spin`, target: `body-${key}`, kind: 'spin', axis: p.spinAxis || 'z', pivot: c, cycles: p0.spin }];
      moons.forEach((m) => list.push({ id: `${m.name.toLowerCase()}-orbit`, target: `arm-${m.name.toLowerCase()}`, kind: 'spin', axis: 'z', pivot: c, cycles: m.cycles }));
      return {
        schema: M.MOTION_SCHEMA, model_id: id, name: 'Spin and moons',
        description: `${p0.name} spins and its moons go round it. One ${LOOP_S} s loop; each motion is a whole number of turns, so it never jumps.`,
        units: 'in', up: 'z', loop_s: LOOP_S, autoplay: { plays: 2 },
        motions: list.map((m) => ({ ...m, target: uuid(m.target) })),
      };
    },
  };
}

// ---------- Earth V02 to V10
const LAND = [[15, 70, -165, -55], [-55, 12, -80, -35], [36, 70, -10, 40], [-34, 36, -17, 50], [5, 75, 40, 180],
  [-39, -11, 113, 153], [60, 83, -55, -20], [-90, -70, -180, 180], [-10, 20, 95, 140]];
const DESERT = [[16, 30, -10, 35], [-30, -20, 125, 140]];
const CITY = [[42, 56, -5, 30], [30, 45, -115, -75]];
const inBox = (la, lo, b) => la >= b[0] && la <= b[1] && lo >= b[2] && lo <= b[3];
const inAny = (la, lo, boxes) => boxes.some((b) => inBox(la, lo, b));
// a coarse grid: 10 degree cells (lat -85..85, lon -175..175)
function cells() {
  const out = [];
  for (let la = -85; la <= 85; la += 10) for (let lo = -175; lo <= 175; lo += 10) out.push([la, lo]);
  return out;
}

function earthEarlierDefs(v) {
  const p = SS.PLANETS.earth, c = [0, 0, 0], R = p.R, body = 'body-earth';
  const defs = SS.bodyDefs('earth', p, c, null, 5);   // ocean ball and atmosphere
  const moonCycles = v >= 10 ? 16 : 8;
  defs.push(['arm-moon', { name: 'Moon orbit', description: 'the Moon goes round the Earth', type: 'group', dimensions: [], position: c }]);
  defs.push(['moon', { name: 'Moon', description: 'our Moon, 2.7 in radius here (not to scale)', type: 'sphere', dimensions: [2.7], position: [30, 0, 0], material: 'moon', parent: 'arm-moon' }]);
  if (v >= 2) {
    let i = 0;
    for (const [la, lo] of cells()) {
      if (!inAny(la, lo, LAND)) continue;
      const desert = v >= 3 && inAny(la, lo, DESERT);
      defs.push(dot(`land-${i++}`, desert ? 'Desert' : 'Land', c, R, la, lo, 1.25, desert ? 'dsand' : 'land', body, -0.2));
    }
  }
  if (v >= 3) {
    defs.push(disc('ice-n', 'North ice cap', c, R, 88, 0, 6, 'ice', body, 0.4));
    defs.push(disc('ice-s', 'South ice cap', c, R, -88, 0, 6, 'ice', body, 0.4));
  }
  if (v >= 4) {
    defs.push(['clouds', { name: 'Cloud layer', description: 'drifts faster than the ground', type: 'group', dimensions: [], position: c }]);
    for (let i = 0; i < 26; i++) {
      const la = -70 + 140 * f(i * 0.618), lo = 360 * f(i * 0.414) - 180, r = 1.6 + 2.0 * f(i * 0.27);
      defs.push(dot(`cloud-${i}`, 'Cloud', c, R, la, lo, r, 'cloud', 'clouds', 1.2));
    }
  }
  if (v >= 5) {
    defs.push(['iss', { name: 'Space station group', description: 'a large satellite in a low orbit', type: 'group', dimensions: [], position: c }]);
    defs.push(['iss-core', { name: 'Station core', description: 'the big satellite (not to scale)', type: 'box', dimensions: [2.6, 0.9, 0.9], position: [R + 8, 0, 0], material: 'iss', parent: 'iss' }]);
    defs.push(['iss-panel', { name: 'Station panels', description: '', type: 'box', dimensions: [0.25, 6.4, 1.6], position: [R + 8, 0, 0], material: 'panel', parent: 'iss' }]);
  }
  if (v >= 6) defs.push(...rocket('rocket-1', 'Launch 1', c, R, 0, 0, 'pad-1', 'x'));
  if (v >= 7) defs.push(...storm('storm-1', 'Storm', c, R, 20, 150));
  if (v >= 8) {
    defs.push(['polar', { name: 'Polar satellite group', description: 'a large satellite on a polar orbit', type: 'group', dimensions: [], position: c }]);
    defs.push(['polar-core', { name: 'Polar satellite', description: 'a large satellite over the poles', type: 'box', dimensions: [2.2, 2.2, 2.2], position: [0, R + 12, 0], material: 'iss', parent: 'polar' }]);
    defs.push(['polar-panel', { name: 'Polar satellite panels', description: '', type: 'box', dimensions: [0.25, 9, 2.4], position: [0, R + 12, 0], material: 'panel', parent: 'polar' }]);
  }
  if (v >= 9) {
    let i = 0;
    for (const [la, lo] of cells()) {
      if (!inAny(la, lo, CITY) || !inAny(la, lo, LAND)) continue;
      if (i++ % 2) continue;
      defs.push(dot(`city-${i}`, 'City lights', c, R, la, lo, 0.5, 'light', body, 0.3));
    }
  }
  if (v >= 10) {
    defs.push(...rocket('rocket-2', 'Launch 2', c, R, 0, 90, 'pad-2', 'y'));
    defs.push(...storm('storm-2', 'Storm 2', c, R, -30, -120));
  }
  return { defs, moonCycles };
}

// A launch pad on the surface with a rocket on it. The rocket is a group; its motion is a bob along the
// normal (axis x or y here, because the sites sit on the equator).
function rocket(gkey, label, c, R, lat, lon, padKey, axis) {
  const out = [];
  out.push([gkey, { name: `${label} rocket`, description: 'a rocket that lifts off once per loop, then returns to the pad', type: 'group', dimensions: [], position: c, parent: 'body-earth' }]);
  out.push(disc(padKey, `${label} pad`, c, R, lat, lon, 3, 'pad', 'body-earth', 0.3));
  const s1 = surf(c, R, lat, lon, 4.6);
  out.push([`${gkey}-body`, { name: `${label} stage`, description: '', type: 'cylinder', dimensions: [0.7, 8], position: s1.p, ...s1.rot, material: 'rocket', parent: gkey }]);
  const s2 = surf(c, R, lat, lon, 9.7);
  out.push([`${gkey}-nose`, { name: `${label} nose cone`, description: '', type: 'cone', dimensions: [0.7, 2.2], position: s2.p, ...s2.rot, material: 'nose', parent: gkey }]);
  // plume: a cone flipped (rotation_x 180) so its tip points down, below the base
  const s3 = surf(c, R, lat, lon, 0.6 - 1.5);
  out.push([`${gkey}-plume`, { name: `${label} plume`, description: 'the exhaust', type: 'cone', dimensions: [1.4, 3], position: s3.p, rotation_x: 180, rotation_y: s3.rot.rotation_y, rotation_z: s3.rot.rotation_z, material: 'plume', parent: gkey }]);
  return out;
}

// A hurricane: three spiral arms of white spheres round a dark eye, laid on the surface.
function storm(key, label, c, R, lat, lon) {
  const out = [];
  const la = rad(lat), lo = rad(lon);
  const n = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
  const e1 = [-Math.sin(lo), Math.cos(lo), 0];
  const e2 = [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)];
  out.push([key, { name: `${label} group`, description: 'a hurricane seen from above', type: 'group', dimensions: [], position: c, parent: 'body-earth' }]);
  out.push([`${key}-eye`, { name: `${label} eye`, description: 'the calm centre', type: 'sphere', dimensions: [1.0], position: surf(c, R, lat, lon, 0.2).p, material: 'eye', parent: key }]);
  for (let a = 0; a < 3; a++) {
    for (let j = 0; j < 7; j++) {
      const rho = 1.6 + 1.4 * j, th = rad(a * 120 + j * 28);
      const x = rho * Math.cos(th), y = rho * Math.sin(th);
      let P = [0, 1, 2].map((k) => R * n[k] + x * e1[k] + y * e2[k]);
      const L = Math.hypot(...P);
      P = P.map((v) => rnd((v / L) * (R + 0.5)));
      out.push([`${key}-arm${a}-${j}`, { name: `${label} cloud ${a + 1}.${j + 1}`, description: '', type: 'sphere', dimensions: [rnd(0.7 + 0.1 * j)], position: P, material: 'storm', parent: key }]);
    }
  }
  return out;
}

function earthScene(v) {
  const p0 = SS.PLANETS.earth;
  const id = `planet-earth-v${v < 10 ? '0' + v : v}`;
  const { defs, moonCycles } = earthEarlierDefs(v);
  const loop = v >= 10 ? 480 : 240;
  const k = v >= 10 ? 2 : 1;               // twice as much per loop in V10
  const spin = v >= 10 ? 32 : 16, clouds = v >= 10 ? 40 : 20, iss = v >= 10 ? 72 : 36, polar = v >= 10 ? 36 : 18;
  return {
    id,
    builtin: true,
    project: 'Earth (planet view)',
    header: {
      model_id: id,
      name: `Earth (planet view) V${v < 10 ? '0' + v : v}`,
      description: `Earth on its own, increment ${v} of 10: ${v >= 2 ? 'continents' : 'a plain ball'}${v >= 3 ? ', deserts and ice caps' : ''}${v >= 4 ? ', clouds' : ''}${v >= 5 ? ', a station' : ''}${v >= 6 ? ', a launch' : ''}${v >= 7 ? ', a storm' : ''}${v >= 8 ? ', a polar satellite' : ''}${v >= 9 ? ', city lights' : ''}${v >= 10 ? ', a second launch and storm; the loop is twice as long' : ''}. Sizes are rough and not to scale.`,
      units: 'in', up: 'z', world: WORLD_ID,
      materials: MATERIALS,
      view: { fill: 0.75, radius: p0.R },
      links: [{ label: 'Back to the Solar System', target: 'solar-system-v06', transition: 'fade' }],
    },
    defs,
    motion: (uuid) => {
      const c = [0, 0, 0];
      const list = [
        { id: 'earth-spin', target: 'body-earth', kind: 'spin', axis: 'z', pivot: c, cycles: spin },
        { id: 'moon-orbit', target: 'arm-moon', kind: 'spin', axis: 'z', pivot: c, cycles: moonCycles },
      ];
      if (v >= 4) list.push({ id: 'cloud-drift', target: 'clouds', kind: 'spin', axis: 'z', pivot: c, cycles: clouds });
      if (v >= 5) list.push({ id: 'iss-orbit', target: 'iss', kind: 'spin', axis: 'z', pivot: c, cycles: iss });
      if (v >= 6) list.push({ id: 'launch-1', target: 'rocket-1', kind: 'bob', axis: 'x', amount: 26, cycles: k, phase: 0 });
      if (v >= 7) list.push({ id: 'storm-1-turn', target: 'storm-1', kind: 'spin', axis: 'z', pivot: c, cycles: spin });
      if (v >= 8) list.push({ id: 'polar-orbit', target: 'polar', kind: 'spin', axis: 'x', pivot: c, cycles: polar });
      if (v >= 10) {
        list.push({ id: 'launch-2', target: 'rocket-2', kind: 'bob', axis: 'y', amount: 26, cycles: 2, phase: 0.5 });
        list.push({ id: 'storm-2-turn', target: 'storm-2', kind: 'spin', axis: 'z', pivot: c, cycles: spin });
      }
      return {
        schema: M.MOTION_SCHEMA, model_id: id, name: v >= 10 ? 'Spin, clouds, station, launches' : 'Spin, moon and more',
        description: `Earth spins; the Moon goes round. ${v >= 4 ? 'Clouds drift faster than the ground. ' : ''}${v >= 5 ? 'A station orbits low. ' : ''}${v >= 6 ? 'A rocket lifts off once per loop and returns to the pad. ' : ''}${v >= 10 ? 'The loop is ' + loop + ' s, twice the others, to fit more in. ' : ''}Every motion is a whole number of turns, so it never jumps.`,
        units: 'in', up: 'z', loop_s: loop, autoplay: { plays: 2 },
        motions: list.map((m) => ({ ...m, target: uuid(m.target) })),
      };
    },
  };
}

const PLANET_KEYS_V2V3 = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const PLANET_VIEWS_V2V3 = PLANET_KEYS_V2V3.flatMap((k) => [planetScene(k, 2), planetScene(k, 3)]);
const EARTH_VIEWS = [2, 3, 4, 5, 6, 7, 8, 9, 10].map(earthScene);

// the newest version of each planet view (the solar system links here)
function latestId(key) {
  return key === 'earth' ? 'planet-earth-v20' : `planet-${key}-v06`;
}

module.exports = { PLANET_VIEWS_V2V3, EARTH_VIEWS, MATERIALS, latestId, EXTRA, LOOP_S, surf, disc, dot, cone, ring, rocket, storm, textures, bodyDefs: SS.bodyDefs, cells, inAny, LAND, DESERT, CITY, WORLD_ID, planetDefs, earthEarlierDefs };
