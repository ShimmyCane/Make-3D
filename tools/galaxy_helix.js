// Galaxy Sun V05 and V06: the Sun and four planets drifting through the galaxy, with their trails as helices.
// One scale for the whole scene: 1 AU = 120 in (the same scale as Solar System V06). The galactic arms are gone:
// they were drawn at a different scale (galaxy scale) and could not be seen next to the planets.
//
// What is true here:
//   - the planets' orbits: shape, tilt to the galactic plane, place on the start date, direction (as in V01 to V04)
//   - the Sun's drift: its speed through the galaxy, 230 km/s (about 48.5 AU per year), in the direction it moves
//     (about 30 degrees from the north ecliptic pole, so about 60 degrees out of the planets' plane)
//   - over 200 years the Sun's path bends by less than 1 degree, so it is drawn as a straight line
// What is stylised:
//   - the Sun is drawn at 40 in radius, far bigger than its true size next to the orbits
//   - the planet spins turn about the galactic up axis, not each planet's own tilted pole (spin axes are x, y or z only)
//   - the Sun's up-and-down motion through the galactic plane is not drawn (it is about 21 pc above the plane)
// Two versions differ only in the Sun's drift speed:
//   V05  true speed: 5,820 in per year (48.5 AU per year). A planet's loop is small next to its drift, so its trail is
//        a row of loops, far apart.
//   V06  helix speed: 960 in per year, so one year moves the Sun four orbit diameters (Earth: 240 in across).
//        The trail reads as a helix.
// The trails are one group, "Planet trails", that starts hidden. The galactic plane (a flat disc through the Sun)
// is another group, "Galactic plane", that starts hidden.
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
const TRAIL_N = 144;                     // beads per trail, over one orbit of the planet
const TAIL_SIZE = { earth: 2.2, mars: 1.8, jupiter: 3.2, saturn: 2.8 };
const PICK = ['earth', 'mars', 'jupiter', 'saturn'];
const rnd = (n) => Math.round(n * 1000) / 1000;
const rnd3 = (c) => [rnd(c[0]), rnd(c[1]), rnd(c[2])];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

// The drift: a circle of radius R_BIG, retrograde (inc 180), so the Sun moves along -y (clockwise seen from the
// galactic north pole, as in V01 to V04). Its speed is D inches per year.
function driftOrbit(D) {
  return { a: R_BIG, e: 0, inc_deg: 180, node_deg: 0, peri_deg: 0, M0_deg: 0,
    period_days: rnd(2 * Math.PI * R_BIG / D * 365.25), span_days: SPAN_DAYS };
}
// Where the Sun is, relative to its start, after loop fraction u (negative u is the past).
const sunDelta = (drift, u) => sub3(M.orbitPosition(drift, u), M.orbitPosition(drift, 0));

function helixScene(o) {
  const drift = driftOrbit(o.D);
  const defs = [], motions = [];
  defs.push(['sun-frame', { name: 'Sun frame', description: 'the Sun, and everything that moves with it (the drift)', type: 'group', dimensions: [], position: [0, 0, 0] }]);
  motions.push({ id: 'sun-drift', target: 'sun-frame', kind: 'orbit', ...drift });
  defs.push(['sun', { name: 'Sun', description: 'the star (stylised size)', type: 'sphere', dimensions: [40], position: [0, 0, 0], material: 'sun', parent: 'sun-frame' }]);
  defs.push(['corona', { name: 'Sun glow', description: 'a faint glow round the Sun (taps pass through it)', type: 'sphere', dimensions: [48], position: [0, 0, 0], material: 'corona', parent: 'sun-frame' }]);
  motions.push({ id: 'sun-spin', target: 'sun', kind: 'spin', axis: 'z', pivot: [0, 0, 0], cycles: rnd(SPAN_DAYS / SUN_ROT) });

  // Planets: their orbits and spins, under the Sun frame. The orbit gives each planet's place round the Sun.
  for (const key of PICK) {
    const el = ST.ELEMENTS[key], p = SS.PLANETS[key];
    const c = rnd3(G.restPos(el));
    defs.push([`orbit-${key}`, { name: `${p.name} orbit`, description: 'the true orbit round the Sun, in the galactic frame (no line drawn)', type: 'group', dimensions: [], position: [0, 0, 0], parent: 'sun-frame' }]);
    defs.push(...SS.bodyDefs(key, p, c, `orbit-${key}`, 5, {}));
    motions.push({ id: `${key}-orbit`, target: `orbit-${key}`, kind: 'orbit', ...G.orbitOf(el) });
    motions.push({ id: `${key}-spin`, target: `body-${key}`, kind: 'spin', axis: p.spinAxis || 'z', pivot: c, cycles: rnd(SPAN_DAYS / el.rot) });
  }

  // Trails: TRAIL_N beads spread over one orbit. Bead k sits where the planet was k/TRAIL_N of its orbit back in time:
  // the Sun's drift at that earlier time plus the planet's place round the Sun then. The bead moves with the planet's
  // orbit shifted back in time, so one object carries each bead.
  defs.push(['trails', { name: 'Planet trails', description: 'where each planet was over one orbit (hidden at start)', type: 'group', dimensions: [], position: [0, 0, 0], parent: 'sun-frame', tags: ['show:Planet trails', 'start:hidden'] }]);
  for (const key of PICK) {
    const el = ST.ELEMENTS[key], p = SS.PLANETS[key];
    const P = el.period / 365.25;          // the orbit, in years
    for (let k = 1; k <= TRAIL_N; k++) {
      const Lyr = (k * P) / TRAIL_N;
      const lag = G.lagPlanetOrbit(el, Lyr);
      const rest = add3(sunDelta(drift, -Lyr / SPAN_YEARS), M.orbitPosition(lag, 0));
      const id = `trail-${key}-${k}`;
      const size = rnd(TAIL_SIZE[key] * (1 - 0.6 * (k - 1) / TRAIL_N));
      defs.push([id, { name: `${p.name} trail ${k}`, description: `where ${p.name} was ${rnd(Lyr)} years earlier`, type: 'sphere', dimensions: [size],
        position: rnd3(rest), material: `tail-${key}`, parent: 'trails' }]);
      motions.push({ id: `${id}-orbit`, target: id, kind: 'orbit', ...lag });
    }
  }

  // The galactic plane through the Sun: a flat, faint disc, hidden at start.
  defs.push(['plane', { name: 'Galactic plane', description: 'the galactic plane through the Sun (a local reference; hidden at start)', type: 'group', dimensions: [], position: [0, 0, 0], parent: 'sun-frame', tags: ['show:Galactic plane', 'start:hidden'] }]);
  defs.push(['plane-disc', { name: 'Galactic plane disc', description: '', type: 'cylinder', dimensions: [2500, 2], position: [0, 0, 0], material: 'disc', parent: 'plane' }]);

  return {
    id: o.id,
    builtin: true,
    project: 'Galaxy Sun',
    header: {
      model_id: o.id, name: o.name, description: o.description, units: 'in', up: 'z', world: WORLD_ID,
      materials: { ...SS.MATERIALS, sun: { color: '#ffd23f', opacity: 1 }, corona: { color: '#ffb347', opacity: 0.2 },
        disc: { color: '#5a6fa8', opacity: 0.12 },
        'tail-earth': { color: '#3d7fd1', opacity: 0.35 }, 'tail-mars': { color: '#c1440e', opacity: 0.35 },
        'tail-jupiter': { color: '#d9a066', opacity: 0.35 }, 'tail-saturn': { color: '#e8d9a8', opacity: 0.35 } },
    },
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

const SCENE_V05 = helixScene({
  id: 'galaxy-sun-v05', name: 'Galaxy Sun V05', D: D_TRUE,
  description: `Galaxy Sun, increment 5: one scale (1 AU = 120 in). The Sun drifts at its true speed, 230 km/s (about 5,800 in per year), and the four planets go round it on their true orbits. Each planet's trail (hidden at start) is a row of loops, because the drift is much faster than a planet's loop. The galactic arms are removed.`,
  motionName: 'Sun drifts at true speed, 200 years', motionDescription: `The Sun drifts at 230 km/s (${Math.round(D_TRUE)} in per year on this scale). 200 years plays in ${LOOP_S} s, then holds.`,
});
const SCENE_V06 = helixScene({
  id: 'galaxy-sun-v06', name: 'Galaxy Sun V06', D: D_HELIX,
  description: `Galaxy Sun, increment 6: the drift sped up so each planet's trail reads as a helix (one year moves the Sun four orbit diameters). Same scale as V05 (1 AU = 120 in). Trails start hidden. Not the true speed: at true speed the trail is a row of loops (V05).`,
  motionName: 'Sun drifts at helix speed, 200 years', motionDescription: `The Sun drifts ${D_HELIX} in per year on this scale, about ${Math.round(D_TRUE / D_HELIX)} times slower than the true speed. 200 years plays in ${LOOP_S} s, then holds.`,
});

module.exports = { GALAXY_HELIX_V05: SCENE_V05, GALAXY_HELIX_V06: SCENE_V06, D_TRUE, D_HELIX, TRAIL_N };
