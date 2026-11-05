// Galaxy Sun V05 to V10: the Sun and planets drifting through the galaxy, with their trails as helices.
// One scale for the whole scene: 1 AU = 120 in (the same scale as Solar System V06). The galactic arms are gone:
// they were drawn at a different scale (galaxy scale) and could not be seen next to the planets.
//
// What is true here:
//   - the planets' orbits: shape, tilt to the galactic plane, place on the start date, direction (as in V01 to V04)
//   - Halley's Comet: its orbit (shape, tilt, time of perihelion 1986-02-09), from the solar scene
//   - the Sun's drift: its speed through the galaxy, 230 km/s (about 48.5 AU per year), in the direction it moves
//     (about 30 degrees from the north ecliptic pole, so about 60 degrees out of the planets' plane)
//   - over 200 years the Sun's path bends by less than 1 degree, so it is drawn as a straight line
// What is stylised:
//   - the Sun is drawn at 40 in radius, far bigger than its true size next to the orbits
//   - the planet spins turn about the galactic up axis, not each planet's own tilted pole (spin axes are x, y or z only)
//   - the Sun's up-and-down motion through the galactic plane is not drawn (it is about 21 pc above the plane)
//   - trail beads are drawn larger than their true size, so they can be seen at the default view
// Versions:
//   V05  true speed, Earth Mars Jupiter Saturn. Trails start with their eye shut.
//   V06  helix speed, same planets. Trails start shut.
//   V07  helix speed, same planets. Trails start shut (eye toggle).
//   V08  true speed, same planets. Trails start shut.
//   V09  helix speed, all eight planets and Halley's Comet. Trails start open (on).
//   V10  true speed, all eight planets and Halley's Comet. Trails start open (on).
// The trails are one group, "Planet trails" (with Halley's trail in it). The galactic plane (a flat disc through
// the Sun) is another group. Each starts as its model says (hidden_at_start), and the eye toggles it.
// Time: 200 years plays in 200 s and then holds (the orbit motion needs loop: false).
// Units: inches, Z up. The galactic plane is z = 0; the Sun starts at the origin.
// Build: node tools/build_samples.js.

const M = require('../js/core/motion.js');
const SS = require('./solar_system.js');
const ST = require('./solar_true.js');
const G = require('./galaxy_sun.js');

const WORLD_ID = 'galaxy-helix-world';   // bounds about +/- 250,000 in across (trails reach about 30 years back)
const START = G.START;
const SPAN_YEARS = 200, LOOP_S = 200, SPAN_DAYS = SPAN_YEARS * 365.25;
const K = G.K;                           // 120 in per AU
const SUN_ROT = 25.38;
const AU_KM = 1.495978707e8, KM_PER_YR = 230 * 365.25 * 86400;   // 230 km/s for one year
const D_TRUE = (KM_PER_YR / AU_KM) * K;  // inches per year at the true speed (about 5,820)
const D_HELIX = 4 * 2 * K;               // 960 in per year: four Earth orbit diameters per year
const R_BIG = 1e10;                      // the drift: a circle this big is a straight line over 200 years
const TRAIL_N = 144;                     // beads per trail, over one orbit
const PICK = ['earth', 'mars', 'jupiter', 'saturn'];
const ALL8 = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const TAIL_SIZE_V05 = { earth: 2.2, mars: 1.8, jupiter: 3.2, saturn: 2.8 };
// Larger beads (V09, V10): a bead is 2.5 to 5 in across, so a trail shows at the default view.
const TAIL_SIZE_BIG = { mercury: 2, venus: 2.5, earth: 3, mars: 2.8, jupiter: 5, saturn: 4.5, uranus: 3.5, neptune: 3.5, halley: 3 };
const TAIL_COLOR = { earth: '#3d7fd1', mars: '#c1440e', jupiter: '#d9a066', saturn: '#e8d9a8', mercury: '#9c9c9c',
  venus: '#e8c07a', uranus: '#8fd3e0', neptune: '#4f73d8', halley: '#e9efe9' };
const rnd = (n) => Math.round(n * 1000) / 1000;
const rnd3 = (c) => [rnd(c[0]), rnd(c[1]), rnd(c[2])];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mod360 = (d) => ((d % 360) + 360) % 360;

// The drift: a circle of radius R_BIG, retrograde (inc 180), so the Sun moves along -y (clockwise seen from the
// galactic north pole, as in V01 to V04). Its speed is D inches per year.
function driftOrbit(D) {
  return { a: R_BIG, e: 0, inc_deg: 180, node_deg: 0, peri_deg: 0, M0_deg: 0,
    period_days: rnd(2 * Math.PI * R_BIG / D * 365.25), span_days: SPAN_DAYS };
}
// Where the Sun is, relative to its start, after loop fraction u (negative u is the past).
const sunDelta = (drift, u) => sub3(M.orbitPosition(drift, u), M.orbitPosition(drift, 0));

// Halley's Comet, in the galactic frame: the same tilt as the planets, its own period and time of perihelion.
const HALLEY = ST.COMETS.halley;
const dayNum = (iso) => (Date.parse(iso + 'T00:00:00Z') - Date.UTC(2000, 0, 1, 12)) / 86400000;
function cometOrbitLag(Lyr) {
  const P = Math.pow(HALLEY.a, 1.5) * 365.25;            // period, days
  const t = G.tiltedElements({ a: HALLEY.a, e: HALLEY.e, inc: HALLEY.inc, node: HALLEY.node, peri: HALLEY.peri });
  const M0 = mod360(360 * (dayNum(START) - dayNum(HALLEY.Tp)) / P - 360 * Lyr * 365.25 / P);
  return { a: rnd(K * Math.sqrt(HALLEY.a)), e: HALLEY.e, inc_deg: rnd(t.inc), node_deg: rnd(t.node), peri_deg: rnd(t.peri),
    M0_deg: rnd(M0), period_days: rnd(P), span_days: SPAN_DAYS };
}

function helixScene(o) {
  const planets = o.planets || PICK;
  const sizes = o.beadSize || TAIL_SIZE_V05;
  const beadOpacity = o.beadOpacity || 0.35;
  const drift = driftOrbit(o.D);
  const defs = [], motions = [];
  defs.push(['sun-frame', { name: 'Sun frame', description: 'the Sun, and everything that moves with it (the drift)', type: 'group', dimensions: [], position: [0, 0, 0] }]);
  motions.push({ id: 'sun-drift', target: 'sun-frame', kind: 'orbit', ...drift });
  defs.push(['sun', { name: 'Sun', description: 'the star (stylised size)', type: 'sphere', dimensions: [40], position: [0, 0, 0], material: 'sun', parent: 'sun-frame' }]);
  defs.push(['corona', { name: 'Sun glow', description: 'a faint glow round the Sun (taps pass through it)', type: 'sphere', dimensions: [48], position: [0, 0, 0], material: 'corona', parent: 'sun-frame' }]);
  motions.push({ id: 'sun-spin', target: 'sun', kind: 'spin', axis: 'z', pivot: [0, 0, 0], cycles: rnd(SPAN_DAYS / SUN_ROT) });

  // Planets: their orbits and spins, under the Sun frame. The orbit gives each planet's place round the Sun.
  for (const key of planets) {
    const el = ST.ELEMENTS[key], p = SS.PLANETS[key];
    const c = rnd3(G.restPos(el));
    defs.push([`orbit-${key}`, { name: `${p.name} orbit`, description: 'the true orbit round the Sun, in the galactic frame (no line drawn)', type: 'group', dimensions: [], position: [0, 0, 0], parent: 'sun-frame' }]);
    defs.push(...SS.bodyDefs(key, p, c, `orbit-${key}`, 5, {}));
    motions.push({ id: `${key}-orbit`, target: `orbit-${key}`, kind: 'orbit', ...G.orbitOf(el) });
    motions.push({ id: `${key}-spin`, target: `body-${key}`, kind: 'spin', axis: p.spinAxis || 'z', pivot: c, cycles: rnd(SPAN_DAYS / el.rot) });
  }

  // Halley's Comet: its orbit and its nucleus.
  if (o.comet) {
    const c = rnd3(M.orbitPosition(cometOrbitLag(0), 0));
    defs.push(['orbit-halley', { name: "Halley's Comet orbit", description: 'the true orbit round the Sun (returns about every 76 years)', type: 'group', dimensions: [], position: [0, 0, 0], parent: 'sun-frame' }]);
    defs.push(['halley', { name: "Halley's Comet", description: 'returns about every 76 years; last seen 1986 (nucleus, stylised size)', type: 'sphere', dimensions: [3.2], position: c, material: 'comet', parent: 'orbit-halley' }]);
    motions.push({ id: 'halley-orbit', target: 'orbit-halley', kind: 'orbit', ...cometOrbitLag(0) });
  }

  // Trails: TRAIL_N beads spread over one orbit. Bead k sits where the body was k/TRAIL_N of its orbit back in time:
  // the Sun's drift at that earlier time plus the body's place round the Sun then. The bead moves with the body's
  // orbit shifted back in time, so one object carries each bead.
  defs.push(['trails', { name: 'Planet trails', description: 'where each planet and Halley\'s Comet was over one orbit', type: 'group', dimensions: [], position: [0, 0, 0], parent: 'sun-frame',
    ...(o.trailsStartShut ? { hidden_at_start: true } : {}) }]);
  const bodies = [
    ...planets.map((key) => ({ key, name: SS.PLANETS[key].name, P: ST.ELEMENTS[key].period / 365.25,
      lag: (L) => G.lagPlanetOrbit(ST.ELEMENTS[key], L) })),
    ...(o.comet ? [{ key: 'halley', name: "Halley's Comet", P: Math.pow(HALLEY.a, 1.5), lag: (L) => cometOrbitLag(L) }] : []),
  ];
  for (const b of bodies) {
    for (let k = 1; k <= TRAIL_N; k++) {
      const Lyr = (k * b.P) / TRAIL_N;
      const lag = b.lag(Lyr);
      const rest = add3(sunDelta(drift, -Lyr / SPAN_YEARS), M.orbitPosition(lag, 0));
      const id = `trail-${b.key}-${k}`;
      const size = rnd(sizes[b.key] * (1 - 0.6 * (k - 1) / TRAIL_N));
      defs.push([id, { name: `${b.name} trail ${k}`, description: `where ${b.name} was ${rnd(Lyr)} years earlier`, type: 'sphere', dimensions: [size],
        position: rnd3(rest), material: `tail-${b.key}`, parent: 'trails' }]);
      motions.push({ id: `${id}-orbit`, target: id, kind: 'orbit', ...lag });
    }
  }

  // The galactic plane through the Sun: a flat, faint disc, hidden at start.
  defs.push(['plane', { name: 'Galactic plane', description: 'the galactic plane through the Sun (a local reference; eye shut at start)', type: 'group', dimensions: [], position: [0, 0, 0], parent: 'sun-frame', hidden_at_start: true }]);
  defs.push(['plane-disc', { name: 'Galactic plane disc', description: '', type: 'cylinder', dimensions: [2500, 2], position: [0, 0, 0], material: 'disc', parent: 'plane' }]);

  const materials = { ...SS.MATERIALS, sun: { color: '#ffd23f', opacity: 1 }, corona: { color: '#ffb347', opacity: 0.2 },
    disc: { color: '#5a6fa8', opacity: 0.12 } };
  for (const b of bodies) materials[`tail-${b.key}`] = { color: TAIL_COLOR[b.key], opacity: beadOpacity };
  if (o.comet) materials.comet = { color: '#e9efe9', opacity: 1 };

  return {
    id: o.id,
    builtin: true,
    project: 'Galaxy Sun',
    header: { model_id: o.id, name: o.name, description: o.description, units: 'in', up: 'z', world: WORLD_ID, materials },
    defs,
    motion: (uuid) => ({
      schema: M.MOTION_SCHEMA, model_id: o.id, name: o.motionName, description: o.motionDescription,
      units: 'in', up: 'z', loop_s: LOOP_S, loop: false,
      timeline: { start_date: START, span_days: SPAN_DAYS, note: `${SPAN_YEARS} years of the Sun's drift` },
      autoplay: { plays: 1 },
      motions: motions.map((m) => ({ ...m, target: uuid(m.target) })),
    }),
  };
}

const motionDesc = (D) => `The Sun drifts ${Math.round(D)} in per year on this scale (${(D / D_TRUE).toFixed(2)} times the true speed). 200 years plays in ${LOOP_S} s, then holds.`;

// V05 to V08 keep their exact output (rebuilt from the same options as before).
const SCENE_V05 = helixScene({ id: 'galaxy-sun-v05', name: 'Galaxy Sun V05', D: D_TRUE, trailsStartShut: true,
  description: `Galaxy Sun, increment 5: one scale (1 AU = 120 in). The Sun drifts at its true speed, 230 km/s (about 5,800 in per year), and the four planets go round it on their true orbits. Each planet's trail is a row of loops, because the drift is much faster than a planet's loop. The galactic arms are removed.`,
  motionName: 'Sun drifts at true speed, 200 years', motionDescription: motionDesc(D_TRUE) });
const SCENE_V06 = helixScene({ id: 'galaxy-sun-v06', name: 'Galaxy Sun V06', D: D_HELIX, trailsStartShut: true,
  description: `Galaxy Sun, increment 6: the drift sped up so each planet's trail reads as a helix (one year moves the Sun four orbit diameters). Same scale as V05 (1 AU = 120 in). Not the true speed: at true speed the trail is a row of loops (V05).`,
  motionName: 'Sun drifts at helix speed, 200 years', motionDescription: motionDesc(D_HELIX) });
const SCENE_V07 = helixScene({ id: 'galaxy-sun-v07', name: 'Galaxy Sun V07', D: D_HELIX, trailsStartShut: true,
  description: `Galaxy Sun, increment 7: as V06 (helix speed, 960 in per year, four Earth orbit diameters per year), with the trails and the galactic plane starting with their eyes shut. Open the eye on Planet trails to see the helices.`,
  motionName: 'Sun drifts at helix speed, 200 years', motionDescription: motionDesc(D_HELIX) });
const SCENE_V08 = helixScene({ id: 'galaxy-sun-v08', name: 'Galaxy Sun V08', D: D_TRUE, trailsStartShut: true,
  description: `Galaxy Sun, increment 8: as V05 (true speed, 230 km/s, about 5,820 in per year on the 1 AU = 120 in scale), with the trails and the galactic plane starting with their eyes shut.`,
  motionName: 'Sun drifts at true speed, 200 years', motionDescription: motionDesc(D_TRUE) });

// V09 and V10: all eight planets and Halley's Comet, trails open at the start, larger beads.
const SCENE_V09 = helixScene({ id: 'galaxy-sun-v09', name: 'Galaxy Sun V09', D: D_HELIX, planets: ALL8, comet: true,
  trailsStartShut: false, beadSize: TAIL_SIZE_BIG, beadOpacity: 0.39,
  description: `Galaxy Sun, increment 9: all eight planets and Halley's Comet, with their trails on from the start. The Sun drifts at helix speed (960 in per year, four Earth orbit diameters per year). Beads are drawn larger so the trails show at the default view. The galactic plane starts with its eye shut.`,
  motionName: 'Sun drifts at helix speed, 200 years', motionDescription: motionDesc(D_HELIX) });
const SCENE_V10 = helixScene({ id: 'galaxy-sun-v10', name: 'Galaxy Sun V10', D: D_TRUE, planets: ALL8, comet: true,
  trailsStartShut: false, beadSize: TAIL_SIZE_BIG, beadOpacity: 0.39,
  description: `Galaxy Sun, increment 10: all eight planets and Halley's Comet at the true drift speed (230 km/s, about 5,820 in per year on the 1 AU = 120 in scale), with their trails on from the start. Each trail is a row of loops, far apart. The galactic plane starts with its eye shut.`,
  motionName: 'Sun drifts at true speed, 200 years', motionDescription: motionDesc(D_TRUE) });

module.exports = { GALAXY_HELIX_V05: SCENE_V05, GALAXY_HELIX_V06: SCENE_V06, GALAXY_HELIX_V07: SCENE_V07, GALAXY_HELIX_V08: SCENE_V08,
  GALAXY_HELIX_V09: SCENE_V09, GALAXY_HELIX_V10: SCENE_V10, D_TRUE, D_HELIX, TRAIL_N };
