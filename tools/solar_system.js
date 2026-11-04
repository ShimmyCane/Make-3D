// Solar System, and one view per planet. Sources and estimates: 04 AI/Make 3D/research/solar-system.md.
//
// NOT TO SCALE. Real sizes and distances differ by more than 10,000 times, so the model compresses them:
// planets are bigger than they should be next to the Sun, and orbits are closer in. The order of the planets,
// the gas giants being the biggest, Saturn's rings, and the spin and orbit order are kept.
// Units: inches, Z up. The orbits lie flat in the z = 0 plane (space has no ground, so the ground is off).
//
// Solar System, five increments (each one adds blocks with "if (v >= N)" in defsFor(v)):
//   V01  Sun, nine planets on their orbit lines (one-pixel rings of short boxes)
//   V02  asteroid belt (about 160 rocks between Mars and Jupiter)
//   V03  bands on the gas giants, Saturn's rings
//   V04  motion: every planet orbits the Sun, spins, and the belt turns (one 240 s loop)
//   V05  atmospheres and the Sun's glow
// Planets carry a link tag (link:planet-<name>:zoom), so tapping one opens its own view with a zoom.
//
// Planet views (planet-<name>, one increment each): the planet alone, with its bands or rings, moons (where it
// has them), atmosphere, a spin and moon motion, and a marker tagged link:solar-system-v05:fade to fly back.
//
// One code path builds every version: defsFor(v). Older versions stay reproducible: change them by adding
// blocks, never by deleting. Motion is a separate function (scene.motion(uuid)), never part of the model.

const M = require('../js/core/motion.js');

const WORLD_ID = 'solar-system-world';
const LOOP_S = 240;                 // one loop, seconds. Every motion is a whole number of cycles in it.
const DEG = 180 / Math.PI;
const rnd = (n) => Math.round(n * 1000) / 1000;

// ---------- seeded random (per key, so adding objects never shuffles old ones)
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rngFor(key) {
  let a = hash(key);
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------- materials (colours are stylised; the Sun and planets are not real photographs)
const MATERIALS = {
  sun: { color: '#ffd23f', opacity: 1 },
  corona: { color: '#ffb347', opacity: 0.2 },
  orbit: { color: '#8a86a3', opacity: 1 },
  mercury: { color: '#b8b0a4', opacity: 1 },
  venus: { color: '#f0d9a0', opacity: 1 },
  earth: { color: '#4f8fd6', opacity: 1 },
  mars: { color: '#d9714a', opacity: 1 },
  jup1: { color: '#e8c49a', opacity: 1 },
  jup2: { color: '#b87c55', opacity: 1 },
  jup3: { color: '#f2e6d0', opacity: 1 },
  sat: { color: '#ecd8a0', opacity: 1 },
  satb: { color: '#d9b97c', opacity: 1 },
  ring: { color: '#e6d7b0', opacity: 0.8 },
  ring2: { color: '#b59f7a', opacity: 0.8 },
  uranus: { color: '#a9e6f0', opacity: 1 },
  uranusb: { color: '#8fd4e6', opacity: 1 },
  neptune: { color: '#4f73e0', opacity: 1 },
  neptuneb: { color: '#3b5fc2', opacity: 1 },
  pluto: { color: '#c9b49a', opacity: 1 },
  charon: { color: '#8f8a85', opacity: 1 },
  moon: { color: '#bdbdbd', opacity: 1 },
  phobos: { color: '#8c7f74', opacity: 1 },
  io: { color: '#f6e28a', opacity: 1 },
  europa: { color: '#e9dfcf', opacity: 1 },
  ganymede: { color: '#a79b8b', opacity: 1 },
  callisto: { color: '#7e7467', opacity: 1 },
  titan: { color: '#e9b872', opacity: 1 },
  enceladus: { color: '#f4f8ff', opacity: 1 },
  miranda: { color: '#b4b4b4', opacity: 1 },
  ariel: { color: '#c9c9c9', opacity: 1 },
  triton: { color: '#e0d6c8', opacity: 1 },
  rock: { color: '#9a9188', opacity: 1 },
  rock2: { color: '#b3a99c', opacity: 1 },
  air: { color: '#9fd8ff', opacity: 0.2 },
  venusair: { color: '#ffe9a8', opacity: 0.25 },
  marker: { color: '#ff8fa3', opacity: 1 },
};

// ---------- the planets. r = orbit radius (in), R = body radius (in), orbit/spin = whole cycles per 240 s loop.
// Stylised speeds keep the real order: Mercury fastest, Pluto slowest. Pluto's orbit is drawn flat.
const PLANETS = {
  mercury: { name: 'Mercury', r: 90, R: 6, mat: 'mercury', orbit: 24, spin: 6,
    desc: 'the smallest planet and the closest to the Sun; a year is 88 Earth days' },
  venus: { name: 'Venus', r: 120, R: 9, mat: 'venus', atmo: 'venusair', orbit: 16, spin: 2,
    desc: 'hot and cloudy; it spins the other way, which this model cannot show yet' },
  earth: { name: 'Earth', r: 150, R: 9.5, mat: 'earth', atmo: 'air', orbit: 12, spin: 8,
    desc: 'our home, with one Moon' },
  mars: { name: 'Mars', r: 190, R: 7, mat: 'mars', atmo: 'air', orbit: 8, spin: 8,
    desc: 'the red planet, with two small moons' },
  jupiter: { name: 'Jupiter', r: 360, R: 22, mat: 'jup1', bands: ['jup1', 'jup2', 'jup3', 'jup2', 'jup1', 'jup2', 'jup3', 'jup1'], atmo: 'air', orbit: 4, spin: 12,
    desc: 'the biggest planet; a gas giant with stripes of clouds' },
  saturn: { name: 'Saturn', r: 450, R: 19, mat: 'sat', bands: ['sat', 'satb', 'sat', 'satb', 'sat', 'satb', 'sat', 'satb'], rings: true, atmo: 'air', orbit: 3, spin: 11,
    desc: 'a gas giant with big, flat rings' },
  uranus: { name: 'Uranus', r: 530, R: 14, mat: 'uranus', atmo: 'air', orbit: 2, spin: 6, spinAxis: 'x',
    desc: 'an ice giant that rolls on its side; this model spins it about the sideways axis' },
  neptune: { name: 'Neptune', r: 600, R: 13.5, mat: 'neptune', bands: ['neptune', 'neptuneb', 'neptune', 'neptuneb', 'neptune', 'neptuneb'], atmo: 'air', orbit: 1, spin: 8,
    desc: 'the windiest planet; an ice giant, deep blue' },
  pluto: { name: 'Pluto', r: 690, R: 3.5, mat: 'pluto', orbit: 1, spin: 2,
    desc: 'a small icy dwarf planet at the edge of the Sun\'s family, with the moon Charon' },
};
const ORDER = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

// Moons for the planet views: distance from the planet centre (in), radius (in), material, cycles per loop.
const MOONS = {
  earth: [{ name: 'Moon', d: 30, r: 2.7, mat: 'moon', cycles: 4 }],
  mars: [{ name: 'Phobos', d: 14, r: 1.2, mat: 'phobos', cycles: 12 }, { name: 'Deimos', d: 20, r: 0.8, mat: 'phobos', cycles: 6 }],
  jupiter: [
    { name: 'Io', d: 36, r: 2.6, mat: 'io', cycles: 9 }, { name: 'Europa', d: 44, r: 2.2, mat: 'europa', cycles: 6 },
    { name: 'Ganymede', d: 56, r: 3.6, mat: 'ganymede', cycles: 4 }, { name: 'Callisto', d: 70, r: 3.3, mat: 'callisto', cycles: 3 },
  ],
  saturn: [{ name: 'Enceladus', d: 30, r: 0.9, mat: 'enceladus', cycles: 10 }, { name: 'Titan', d: 52, r: 3.4, mat: 'titan', cycles: 4 }],
  uranus: [{ name: 'Miranda', d: 26, r: 1.2, mat: 'miranda', cycles: 5 }, { name: 'Ariel', d: 34, r: 1.8, mat: 'ariel', cycles: 3 }],
  neptune: [{ name: 'Triton', d: 30, r: 2.6, mat: 'triton', cycles: 2 }],
  pluto: [{ name: 'Charon', d: 10, r: 1.8, mat: 'charon', cycles: 2 }],
};

// ---------- shared pieces
// A planet body: a group that spins, the round ball, and any bands, rings or atmosphere.
// c = centre [x, y, z]; parent = key of the group it sits in (or null); opts.link = tag target, or null.
function bodyDefs(key, p, c, parent, v, opts = {}) {
  const out = [];
  const body = `body-${key}`;
  out.push([body, { name: `${p.name} body`, description: 'spins on its own axis', type: 'group', dimensions: [], position: c, parent }]);
  const tags = opts.link ? [`link:${opts.link}`] : undefined;
  out.push([`ball-${key}`, { name: p.name, description: p.desc, type: 'sphere', dimensions: [p.R], position: c, material: p.mat, parent: body, ...(tags ? { tags } : {}) }]);
  if (p.bands && v >= 3) {
    const n = p.bands.length, step = (1.75 * p.R) / n;
    p.bands.forEach((mat, i) => {
      const zc = -0.875 * p.R + step * (i + 0.5);
      const rad = Math.sqrt(p.R * p.R - zc * zc) * 1.03;
      out.push([`band-${key}-${i + 1}`, { name: `${p.name} band ${i + 1}`, description: 'a stripe of cloud', type: 'cylinder', dimensions: [rnd(rad), rnd(step * 1.02)], position: [c[0], c[1], rnd(c[2] + zc)], material: mat, parent: body }]);
    });
  }
  if (p.rings && v >= 3) {
    out.push([`ring-a-${key}`, { name: `${p.name} rings, outer`, description: 'a flat disc of ice', type: 'cylinder', dimensions: [rnd(2.1 * p.R), 0.4], position: c, material: 'ring', parent: body }]);
    out.push([`ring-b-${key}`, { name: `${p.name} rings, inner`, description: 'a darker band inside the rings', type: 'cylinder', dimensions: [rnd(1.6 * p.R), 0.4], position: [c[0], c[1], rnd(c[2] + 0.6)], material: 'ring2', parent: body }]);
  }
  if (p.atmo && v >= 5) {
    out.push([`air-${key}`, { name: `${p.name} atmosphere`, description: 'a thin see-through haze (taps pass through it)', type: 'sphere', dimensions: [rnd(p.R * 1.12)], position: c, material: p.atmo, parent: body }]);
  }
  return out;
}

// One orbit line: a ring of short boxes, each about one pixel thick in the default view.
function orbitLine(key, p) {
  const N = 60, out = [];
  const chord = (2 * Math.PI * p.r) / N;
  out.push([`orbit-line-${key}`, { name: `${p.name} orbit line`, description: 'the path the planet follows', type: 'group', dimensions: [], position: [0, 0, 0] }]);
  for (let i = 0; i < N; i++) {
    const th = (2 * Math.PI * i) / N;
    out.push([`line-${key}-${i}`, { name: `${p.name} orbit line ${i + 1}`, description: '', type: 'box', dimensions: [rnd(chord * 1.12), 0.9, 0.9],
      position: [rnd(p.r * Math.cos(th)), rnd(p.r * Math.sin(th)), 0], rotation_z: rnd(th * DEG + 90), material: 'orbit', parent: `orbit-line-${key}` }]);
  }
  return out;
}

// ---------- Solar System
function solarDefs(v) {
  const defs = [];
  defs.push(['sun', { name: 'Sun', description: 'the star at the centre; 40 in radius here, far too small compared with the planets\' orbits, which are not to scale', type: 'sphere', dimensions: [40], position: [0, 0, 0], material: 'sun' }]);
  if (v >= 5) defs.push(['corona', { name: 'Sun glow', description: 'a faint glow round the Sun (taps pass through it)', type: 'sphere', dimensions: [48], position: [0, 0, 0], material: 'corona' }]);
  for (const key of ORDER) {
    const p = PLANETS[key];
    defs.push(...orbitLine(key, p));
    defs.push([`orbit-${key}`, { name: `${p.name} orbit`, description: 'turns the planet round the Sun', type: 'group', dimensions: [], position: [0, 0, 0] }]);
    // Tapping the ball opens the planet's own view (a zoom). Atmosphere and bands are not the tap target.
    defs.push(...bodyDefs(key, p, [p.r, 0, 0], `orbit-${key}`, v, { link: `planet-${key}:zoom` }));
  }
  if (v >= 2) {
    const rng = rngFor('belt');
    defs.push(['belt', { name: 'Asteroid belt', description: 'rocks between Mars and Jupiter; they turn with the belt', type: 'group', dimensions: [], position: [0, 0, 0] }]);
    for (let i = 0; i < 160; i++) {
      const th = rng() * 2 * Math.PI, r = 240 + rng() * 50, z = (rng() - 0.5) * 6, s = 0.8 + rng() * 1.6;
      defs.push([`rock-${i}`, { name: `Asteroid ${i + 1}`, description: '', type: 'sphere', dimensions: [rnd(s)], position: [rnd(r * Math.cos(th)), rnd(r * Math.sin(th)), rnd(z)],
        material: i % 3 === 0 ? 'rock2' : 'rock', parent: 'belt' }]);
    }
  }
  return defs;
}

function solarMotion(uuid, v) {
  const list = [];
  for (const key of ORDER) {
    const p = PLANETS[key];
    list.push({ id: `${key}-orbit`, target: `orbit-${key}`, kind: 'spin', axis: 'z', pivot: [0, 0, 0], cycles: p.orbit });
    list.push({ id: `${key}-spin`, target: `body-${key}`, kind: 'spin', axis: p.spinAxis || 'z', pivot: [p.r, 0, 0], cycles: p.spin });
  }
  list.push({ id: 'belt-turn', target: 'belt', kind: 'spin', axis: 'z', pivot: [0, 0, 0], cycles: 6 });
  return {
    schema: M.MOTION_SCHEMA,
    model_id: uuid.model,
    name: 'Orbits and spins',
    description: 'Every planet goes round the Sun and spins on its own axis, and the belt turns. One 240 s loop; each speed is a whole number of turns, in the same order as the real periods (stylised).',
    units: 'in', up: 'z',
    loop_s: LOOP_S,
    autoplay: { plays: 2 },
    motions: list.map((m) => ({ ...m, target: uuid.id(m.target) })),
  };
}

function sceneSolar(v) {
  const id = `solar-system-v0${v}`;
  const scene = {
    id,
    builtin: true,
    project: 'Solar System',
    header: {
      model_id: id,
      name: `Solar System V0${v}`,
      description: `Solar System, increment ${v} of 5. The Sun and nine planets on their orbits, not to scale. Tap a planet to open its own view. Sizes and distances are estimates in inches.`,
      units: 'in', up: 'z', world: WORLD_ID,
      materials: MATERIALS,
    },
    defs: solarDefs(v),
  };
  if (v >= 4) {
    scene.motion = (uuid) => solarMotion({ model: id, id: (k) => uuid(k) }, v);
  }
  return scene;
}

// ---------- Planet views (one increment each): the planet alone, with its moons and a way back.
function planetView(key) {
  const p = PLANETS[key];
  const id = `planet-${key}`;
  const defs = [];
  const c = [0, 0, 0];
  defs.push(...bodyDefs(key, p, c, null, 5));          // a full planet: bands, rings, atmosphere
  const moons = MOONS[key] || [];
  moons.forEach((m, i) => {
    const mk = m.name.toLowerCase();
    defs.push([`arm-${mk}`, { name: `${m.name} orbit`, description: 'turns the moon round the planet', type: 'group', dimensions: [], position: c }]);
    defs.push([`moon-${mk}`, { name: m.name, description: `a moon of ${p.name}`, type: 'sphere', dimensions: [rnd(m.r)], position: [m.d, 0, 0], material: m.mat, parent: `arm-${mk}` }]);
  });
  // The way back: a pink marker in front of the planet, tagged to fly back to the Solar System (a fade).
  defs.push(['home', { name: 'Back to the Solar System', description: 'tap to fly back to the Sun and all the planets', type: 'sphere', dimensions: [2.6],
    position: [rnd(-(p.R + 26)), 0, rnd(p.R * 0.9 + 4)], material: 'marker', tags: ['link:solar-system-v05:fade'] }]);
  const scene = {
    id,
    builtin: true,
    project: `${p.name} (planet view)`,
    header: {
      model_id: id,
      name: `${p.name} (planet view) V01`,
      description: `${p.name} on its own: ${p.desc}. Spins${moons.length ? ', with its moons going round' : ''}. Tap the pink marker to fly back to the Solar System. Sizes are estimates, in inches.`,
      units: 'in', up: 'z', world: WORLD_ID,
      materials: MATERIALS,
      view: { fill: 0.75, radius: p.R },
    },
    defs,
  };
  scene.motion = (uuid) => {
    const list = [{ id: `${key}-spin`, target: `body-${key}`, kind: 'spin', axis: p.spinAxis || 'z', pivot: c, cycles: p.spin }];
    moons.forEach((m) => list.push({ id: `${m.name.toLowerCase()}-orbit`, target: `arm-${m.name.toLowerCase()}`, kind: 'spin', axis: 'z', pivot: c, cycles: m.cycles }));
    return {
      schema: M.MOTION_SCHEMA,
      model_id: id,
      name: 'Spin and moons',
      description: `${p.name} spins and its moons go round it. One 240 s loop; each motion is a whole number of turns, so it never jumps.`,
      units: 'in', up: 'z',
      loop_s: LOOP_S,
      autoplay: { plays: 2 },
      motions: list.map((m) => ({ ...m, target: uuid(m.target) })),
    };
  };
  return scene;
}

const SOLAR_SYSTEM = [1, 2, 3, 4, 5].map(sceneSolar);
const PLANET_VIEWS = ORDER.map(planetView);

module.exports = { SOLAR_SYSTEM, PLANET_VIEWS, PLANETS, MOONS, ORDER, WORLD_ID, LOOP_S, MATERIALS, solarDefs, planetView, sceneSolar, bodyDefs, orbitLine };
