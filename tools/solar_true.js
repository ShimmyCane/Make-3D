// Solar System V06: true orbits. Sources: 04 AI/Make 3D/research/solar-system-true.md (JPL approximate positions).
//
// What is true here:
//   - each orbit's shape (eccentricity), tilt (inclination), and where it crosses the plane (node, perihelion)
//   - each planet's place on its orbit on the start date (2026-11-02), from its mean longitude at J2000
//   - the direction and the speed of each orbit and spin (a negative spin turns the other way: Venus, Uranus, Pluto)
//   - the asteroid belt: each rock has its own orbit, from a fixed pattern (not real asteroid positions)
// What is scaled:
//   - distances: each orbit is scaled by K / sqrt(a), so the inner planets are not crowded and Pluto still fits.
//     The shape is kept exactly; only the size changes. Planet sizes are kept rough, as in V01 to V05.
//   - time: the animation is ONE lap of Pluto (90,560 days) in 240 s. It does not loop: it plays once and holds.
//     Faster bodies lap many times, and their positions simply follow their true orbits.
//   - spins are whole turns per the one lap, so Jupiter's spin can look like flicker at this pace.
// Units: inches, Z up. The ecliptic (Earth's orbit plane) is the z = 0 plane.
//
// The motion file (make3d.motion/0.1) uses kind "orbit" (js/core/motion.js orbitPosition) with loop: false.
// Build: node tools/build_samples.js.

const M = require('../js/core/motion.js');
const SS = require('./solar_system.js');
const PV = require('./planet_views.js');

const WORLD_ID = 'solar-system-world';
const K = 120;                       // model inches for sqrt(AU): a_model = K * sqrt(a_AU)
const LOOP_S = 240;                  // one Pluto lap, seconds
const SPAN_DAYS = 90560;             // Pluto's orbital period (the slowest body), days
const START_V06 = '2026-11-02';      // V06: the date the planets are placed on (00:00 UTC)
const START_V07 = '1958-01-31';      // V07: Explorer 1, the first US satellite launch (NASA)
const J2000_MS = Date.UTC(2000, 0, 1, 12);
const DAY_MS = 86400000;
const DEG = 180 / Math.PI;
const rnd = (n) => Math.round(n * 1000) / 1000;

// JPL approximate Keplerian elements, J2000 (Standish). a AU, e, inc/node/peri in degrees, L mean longitude
// in degrees, period in days, rot = sidereal spin in days (negative = retrograde). Approximate to about a degree.
const ELEMENTS = {
  mercury: { a: 0.38710, e: 0.20563, inc: 7.005, node: 48.331, peri: 29.124, L: 252.251, period: 87.969, rot: 58.646 },
  venus: { a: 0.72333, e: 0.00677, inc: 3.395, node: 76.680, peri: 54.884, L: 181.979, period: 224.701, rot: -243.025 },
  earth: { a: 1.00000, e: 0.01671, inc: 0.00005, node: 348.739, peri: 114.208, L: 100.464, period: 365.256, rot: 0.99727 },
  mars: { a: 1.52371, e: 0.09340, inc: 1.850, node: 49.558, peri: 286.502, L: 355.453, period: 686.980, rot: 1.02596 },
  jupiter: { a: 5.20288, e: 0.04839, inc: 1.303, node: 100.464, peri: 273.867, L: 34.404, period: 4332.59, rot: 0.41354 },
  saturn: { a: 9.53667, e: 0.05386, inc: 2.485, node: 113.666, peri: 339.392, L: 49.944, period: 10759.22, rot: 0.44401 },
  uranus: { a: 19.18916, e: 0.04726, inc: 0.773, node: 74.006, peri: 96.998, L: 313.232, period: 30688.5, rot: -0.71833 },
  neptune: { a: 30.06992, e: 0.00859, inc: 1.770, node: 131.784, peri: 276.336, L: 304.880, period: 60182, rot: 0.67125 },
  pluto: { a: 39.48211, e: 0.24883, inc: 17.142, node: 110.303, peri: 113.834, L: 238.929, period: 90560, rot: -6.387 },
};
const SUN_ROT = 25.38;               // days, the Sun's equator

// V08: the other four IAU dwarf planets (Pluto is in ELEMENTS). Sources: a, e, period from the secondary
// tables in 04 AI/Make 3D/research/dwarf-planets.md (Britannica, UNLV table, worksheets); inc, node, peri and spin
// from memory of the JPL SBDB, NOT yet checked against it. L is a PLACEHOLDER: each body starts at perihelion on
// J2000 (L = node + peri). Its true place on 1958-01-31 is not yet set. Diameters: 939 km (Ceres), about 1,400 km
// (Haumea, one source), 1,430 km (Makemake), 2,326 km (Eris).
const DWARFS = {
  ceres: { a: 2.7675, e: 0.0758, inc: 10.59, node: 80.39, peri: 73.60, L: 153.99, period: 1680.5, rot: 0.3781 },
  haumea: { a: 43.11, e: 0.19, inc: 28.19, node: 122.17, peri: 239.04, L: 1.21, period: 103390, rot: 0.1628 },
  makemake: { a: 45.48, e: 0.159, inc: 28.96, node: 79.31, peri: 294.84, L: 14.15, period: 111824, rot: 0.951 },
  eris: { a: 67.84, e: 0.44, inc: 44.04, node: 35.95, peri: 151.64, L: 187.59, period: 204070, rot: 1.08 },
};
// Radii in inches, on Pluto's scale (Pluto's 1,188 km radius = 3.5 in, the same as the planets' rough scale).
const DWARF_PLANETS = {
  ceres: { name: 'Ceres', R: 1.4, mat: 'ceres', desc: 'the largest object in the asteroid belt; a dwarf planet, about 940 km across' },
  haumea: { name: 'Haumea', R: 2.1, mat: 'haumea', desc: 'a dwarf planet that spins fast and is stretched like a rugby ball; about 1,400 km long' },
  makemake: { name: 'Makemake', R: 2.1, mat: 'makemake', desc: 'a reddish icy dwarf planet in the Kuiper belt, about 1,430 km across' },
  eris: { name: 'Eris', R: 3.4, mat: 'eris', desc: 'the most distant known dwarf planet, about 2,330 km across; its orbit is tilted about 44 degrees' },
};
const DWARF_MATERIALS = {
  ceres: { color: '#b5aea3', opacity: 1 },
  haumea: { color: '#e6e0d4', opacity: 1 },
  makemake: { color: '#d6a77a', opacity: 1 },
  eris: { color: '#dcdde0', opacity: 1 },
};

const daysSinceJ2000 = (iso) => (Date.parse(iso + 'T00:00:00Z') - J2000_MS) / DAY_MS;

// Mean anomaly at the start: M = L - (node + peri) at J2000, advanced by the mean motion to the start date.
function startM0(el, start) {
  const M2000 = el.L - (el.node + el.peri);
  return (((M2000 + (360 * daysSinceJ2000(start)) / el.period) % 360) + 360) % 360;
}
// The motion-engine orbit for a body with these elements. a is in inches (scaled).
function orbitOf(el, start = START_V06) {
  return { a: rnd(K * Math.sqrt(el.a)), e: el.e, inc_deg: el.inc, node_deg: el.node, peri_deg: el.peri,
    M0_deg: rnd(startM0(el, start)), period_days: el.period, span_days: SPAN_DAYS };
}
// Where it is at the start (the rest pose), in inches. Same formula the viewer uses, so rest matches motion.
const restPos = (el, start = START_V06) => M.orbitPosition(orbitOf(el, start), 0);

// Comets: the mean anomaly comes from the time of perihelion (Tp), not from a longitude.
// Halley passes inside the drawn Sun at perihelion (its real perihelion is 0.59 AU); the Sun is stylised.
const COMETS = {
  halley: { name: "Halley's Comet", a: 17.834, e: 0.96714, inc: 162.26, node: 58.42, peri: 111.33, Tp: '1986-02-09', desc: 'returns about every 76 years; last seen 1986' },
  encke: { name: 'Encke', a: 2.2153, e: 0.84833, inc: 11.78, node: 334.57, peri: 186.54, Tp: '2023-10-21', desc: 'the shortest-period comet we know, about 3.3 years' },
  tempel1: { name: 'Tempel 1', a: 3.1, e: 0.5, inc: 10.5, node: 68.9, peri: 151.1, Tp: '2005-07-04', desc: 'visited by a NASA probe (Deep Impact) in 2005' },
};
const cometPeriod = (c) => Math.pow(c.a, 1.5) * 365.25;
function cometEl(c) { return { a: c.a, e: c.e, inc: c.inc, node: c.node, peri: c.peri, period: cometPeriod(c) }; }
function cometOrbit(c, start) {
  const P = cometPeriod(c);
  const M0 = (((360 * (daysSinceJ2000(start) - daysSinceJ2000(c.Tp))) / P) % 360 + 360) % 360;
  return { a: rnd(K * Math.sqrt(c.a)), e: c.e, inc_deg: c.inc, node_deg: c.node, peri_deg: c.peri,
    M0_deg: rnd(M0), period_days: rnd(P), span_days: SPAN_DAYS };
}

// Points along the orbit, for the one-pixel orbit line: N points, evenly in eccentric anomaly.
function orbitRing(el, N = 72, o = orbitOf(el)) {
  const out = [];
  for (let k = 0; k < N; k++) {
    const E = (2 * Math.PI * k) / N;
    const xp = o.a * (Math.cos(E) - el.e), yp = o.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
    const O = el.node / DEG, w = el.peri / DEG, i = el.inc / DEG;
    const cO = Math.cos(O), sO = Math.sin(O), cw = Math.cos(w), sw = Math.sin(w), ci = Math.cos(i), si = Math.sin(i);
    out.push([
      (cO * cw - sO * sw * ci) * xp + (-cO * sw - sO * cw * ci) * yp,
      (sO * cw + cO * sw * ci) * xp + (-sO * sw + cO * cw * ci) * yp,
      (sw * si) * xp + (cw * si) * yp,
    ]);
  }
  return out;
}

// One-pixel orbit line: a box along each chord, turned to follow the orbit in 3D.
// Box rotation: rotation_z then rotation_y (x is the box's long side; the viewer composes Z*Y*X).
function orbitLineDefs(key, name, el, start = START_V06, N = 72) {
  const pts = orbitRing(el, N, orbitOf(el, start)), out = [];
  out.push([`orbit-line-${key}`, { name: `${name} orbit line`, description: 'the true path, drawn as one-pixel boxes', type: 'group', dimensions: [], position: [0, 0, 0] }]);
  for (let k = 0; k < N; k++) {
    const a = pts[k], b = pts[(k + 1) % N];
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const len = Math.hypot(...d), u = d.map((v) => v / len);
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const ry = Math.asin(-u[2]) * DEG, rz = Math.atan2(u[1], u[0]) * DEG;
    out.push([`line-${key}-${k}`, { name: `${name} orbit line ${k + 1}`, description: '', type: 'box', dimensions: [rnd(len * 1.12), 0.9, 0.9],
      position: [rnd(mid[0]), rnd(mid[1]), rnd(mid[2])], rotation_y: rnd(ry), rotation_z: rnd(rz), material: 'orbit', parent: `orbit-line-${key}` }]);
  }
  return out;
}

// Belt: 160 rocks, each on its own orbit from a fixed pattern (golden-ratio spread, so no randomness).
const BELT_N = 160;
function beltEl(i) {
  const f = (x) => x - Math.floor(x);
  return { a: 2.2 + 1.1 * f(i * 0.618034), e: 0.02 + 0.12 * f(i * 0.381966), inc: 0.5 + 9 * f(i * 0.137),
    node: f(i * 0.618034 + 0.31) * 360, peri: f(i * 0.754877) * 360, L: f(i * 0.2296) * 360, period: Math.pow(2.2 + 1.1 * f(i * 0.618034), 1.5) * 365.25 };
}

// Build a true-orbit scene. opts: { id, name, start, comets, link(key) -> model id, description }.
// Versions are kept reproducible: V06 has its own start, no comets and its own links, exactly as before.
function trueDefs(o) {
  const start = o.start, defs = [];
  defs.push(['sun', { name: 'Sun', description: 'the star at the centre (stylised size)', type: 'sphere', dimensions: [40], position: [0, 0, 0], material: 'sun' }]);
  defs.push(['corona', { name: 'Sun glow', description: 'a faint glow round the Sun (taps pass through it)', type: 'sphere', dimensions: [48], position: [0, 0, 0], material: 'corona' }]);
  for (const key of SS.ORDER) {
    const el = ELEMENTS[key], p = SS.PLANETS[key];
    const c = restPos(el, start);
    defs.push(...orbitLineDefs(key, p.name, el, start));
    defs.push([`orbit-${key}`, { name: `${p.name} orbit`, description: 'the true orbit: shape, tilt and place', type: 'group', dimensions: [], position: [0, 0, 0] }]);
    // Tapping the ball opens the planet's own view (zoom).
    defs.push(...SS.bodyDefs(key, p, c, `orbit-${key}`, 5, { link: `${o.link(key)}:zoom` }));
  }
  if (o.dwarfs) {
    for (const key of Object.keys(DWARF_PLANETS)) {
      const el = DWARFS[key], p = DWARF_PLANETS[key];
      const c = restPos(el, start);
      defs.push(...orbitLineDefs(key, p.name, el, start));
      defs.push([`orbit-${key}`, { name: `${p.name} orbit`, description: 'the true orbit (inclination and node from JPL, starting place not yet checked)', type: 'group', dimensions: [], position: [0, 0, 0] }]);
      defs.push(...SS.bodyDefs(key, p, c, `orbit-${key}`, 5, {}));
    }
  }
  if (o.comets) {
    for (const [key, cm] of Object.entries(COMETS)) {
      const el = cometEl(cm);
      defs.push(...orbitLineDefs(`c-${key}`, cm.name, el, start, 160));
      defs.push([`orbit-c-${key}`, { name: `${cm.name} orbit`, description: cm.desc, type: 'group', dimensions: [], position: [0, 0, 0] }]);
      const c = M.orbitPosition(cometOrbit(cm, start), 0);
      defs.push([`comet-${key}`, { name: cm.name, description: cm.desc, type: 'sphere', dimensions: [3.2], position: rnd3(c), material: 'comet', parent: `orbit-c-${key}` }]);
      defs.push([`coma-${key}`, { name: `${cm.name} coma`, description: 'the cloud of gas round the nucleus (taps pass through it)', type: 'sphere', dimensions: [7], position: rnd3(c), material: 'coma', parent: `orbit-c-${key}` }]);
    }
  }
  const rocks = [];
  for (let i = 0; i < BELT_N; i++) {
    const el = beltEl(i), c = restPos(el, start);
    rocks.push([`rock-${i}`, { name: `Asteroid ${i + 1}`, description: 'one rock on its own orbit (pattern, not a real asteroid)', type: 'sphere', dimensions: [rnd(0.8 + 1.6 * ((i * 0.37) % 1))],
      position: rnd3(c), material: i % 3 === 0 ? 'rock2' : 'rock' }]);
  }
  defs.push(['belt', { name: 'Asteroid belt', description: 'rocks between Mars and Jupiter, each on its own orbit', type: 'group', dimensions: [], position: [0, 0, 0] }]);
  for (const r of rocks) defs.push([r[0], { ...r[1], parent: 'belt' }]);
  return defs;
}
const rnd3 = (c) => [rnd(c[0]), rnd(c[1]), rnd(c[2])];

function trueMotion(o, uuid) {
  const start = o.start, list = [];
  for (const key of SS.ORDER) {
    const el = ELEMENTS[key], p = SS.PLANETS[key];
    list.push({ id: `${key}-orbit`, target: `orbit-${key}`, kind: 'orbit', ...orbitOf(el, start) });
    list.push({ id: `${key}-spin`, target: `body-${key}`, kind: 'spin', axis: p.spinAxis || 'z', pivot: restPos(el, start), cycles: rnd(SPAN_DAYS / el.rot) });
  }
  list.push({ id: 'sun-spin', target: 'sun', kind: 'spin', axis: 'z', pivot: [0, 0, 0], cycles: rnd(SPAN_DAYS / SUN_ROT) });
  if (o.dwarfs) {
    for (const key of Object.keys(DWARF_PLANETS)) {
      const el = DWARFS[key];
      list.push({ id: `${key}-orbit`, target: `orbit-${key}`, kind: 'orbit', ...orbitOf(el, start) });
      list.push({ id: `${key}-spin`, target: `body-${key}`, kind: 'spin', axis: 'z', pivot: restPos(el, start), cycles: rnd(SPAN_DAYS / el.rot) });
    }
  }
  if (o.comets) for (const key of Object.keys(COMETS)) list.push({ id: `comet-${key}-orbit`, target: `orbit-c-${key}`, kind: 'orbit', ...cometOrbit(COMETS[key], start) });
  for (let i = 0; i < BELT_N; i++) {
    const el = beltEl(i);
    list.push({ id: `rock-${i}-orbit`, target: `rock-${i}`, kind: 'orbit', ...orbitOf(el, start) });
  }
  return {
    schema: M.MOTION_SCHEMA,
    model_id: o.id,
    name: 'True orbits, one lap of Pluto',
    description: `Every orbit is true (shape, tilt and place on ${start}). The animation is one lap of Pluto (about 248 years) in ${LOOP_S} s. It plays once and holds; faster bodies lap many times, so their spins and orbits blur at this pace.`,
    units: 'in', up: 'z',
    loop_s: LOOP_S,
    loop: false,
    timeline: { start_date: start, span_days: SPAN_DAYS, note: 'one lap of Pluto around the Sun' },
    autoplay: { plays: 1 },
    motions: list.map((m) => ({ ...m, target: uuid(m.target) })),
  };
}

function sceneTrue(o) {
  return {
    id: o.id,
    builtin: true,
    project: 'Solar System',
    header: {
      model_id: o.id,
      name: o.name,
      description: o.description,
      units: 'in', up: 'z', world: WORLD_ID,
      materials: { ...(o.comets ? { ...SS.MATERIALS, ...COMET_MATERIALS } : SS.MATERIALS), ...(o.dwarfs ? DWARF_MATERIALS : {}) },
    },
    defs: trueDefs(o),
    motion: (uuid) => trueMotion(o, uuid),
  };
}

const COMET_MATERIALS = {
  comet: { color: '#e9efe9', opacity: 1 },
  coma: { color: '#dff6ff', opacity: 0.25 },
};

// V06: as before (2026 start, no comets, links to the V03 planet views and V10 Earth)
const SOLAR_TRUE = sceneTrue({
  id: 'solar-system-v06', name: 'Solar System V06', start: START_V06, comets: false,
  link: (k) => (k === 'earth' ? 'planet-earth-v10' : `planet-${k}-v03`),
  description: `Solar System, increment 6 of 6: true orbits. Shape, tilt and place are true for ${START_V06}; the planets are scaled by the square root of their distance and sized roughly. One lap of Pluto plays once. Tap a planet to open its own view.`,
});
// V07: starts at Explorer 1 (NASA's first satellite, 31 January 1958); adds comets; links to the newest views
const SOLAR_TRUE_V07 = sceneTrue({
  id: 'solar-system-v07', name: 'Solar System V07', start: START_V07, comets: true,
  link: (k) => PV.latestId(k),
  description: `Solar System, increment 7 of 7: the timeline starts on ${START_V07}, when Explorer 1, the first US satellite, launched. Halley's Comet, Encke and Tempel 1 added on their true orbits. One lap of Pluto plays once. Tap a planet to open its own view.`,
});
// V08: adds the other four dwarf planets (Ceres, Haumea, Makemake, Eris) to V07. Same start and comets.
// Eris laps less than once in the 240 s loop (its period is 204,070 days, Pluto's 90,560), so it does not
// finish a lap.
const SOLAR_TRUE_V08 = sceneTrue({
  id: 'solar-system-v08', name: 'Solar System V08', start: START_V07, comets: true, dwarfs: true,
  link: (k) => PV.latestId(k),
  description: `Solar System, increment 8 of 8: the other four dwarf planets, Ceres, Haumea, Makemake and Eris, with Pluto making five. Their orbits are drawn true; their starting places are not yet checked (placeholder). Eris laps less than once in the loop. Tap a planet to open its own view.`,
});
module.exports = { SOLAR_TRUE, SOLAR_TRUE_V07, SOLAR_TRUE_V08, DWARFS, DWARF_PLANETS, ELEMENTS, COMETS, START_V06, START_V07, SPAN_DAYS, LOOP_S, restPos, orbitOf, cometOrbit, beltEl, BELT_N };
