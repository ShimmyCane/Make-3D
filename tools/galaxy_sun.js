// Galaxy Sun V01: the Sun and four planets carried round the Milky Way's centre, 200 years in 200 s.
// Sources: planet elements from tools/solar_true.js (JPL approximate, J2000). Galactic numbers are approximate
// published values: the Sun about 8.2 kpc from the centre, about 21 pc above the galactic plane, orbit speed about
// 230 km/s (one lap about 230 million years), and the ecliptic tilted about 62.9 degrees to the galactic plane.
//
// What is true here:
//   - each planet's orbit (shape, place on the start date, direction) and its spin direction, as in Solar System V06
//   - the Sun's path is a circle round the galactic centre, in the galactic plane, at the true distance
//   - the planets' orbits are tilted 62.9 degrees to the galactic plane (each orbit is turned, see tiltedElements)
// What is scaled, sped up or left out:
//   - galaxy scale: 1 inch is about 2.7 parsecs (the Sun's real distance, 8,200 pc, is drawn as 3,000 inches).
//   - speed of the galactic sweep is NOT real. At the real pace the Sun moves about 0.05 parsec in 200 years, which
//     would not be visible. So the Sun sweeps GAL_SWEEP_DEG (30) degrees round the centre in the 200 years (one lap
//     in about 2,400 years). The planets keep their true pace.
//   - the solar system is drawn at the V06 scale (planets enlarged, the Sun stylised), so it is far larger than the
//     real system at galaxy scale. Zoom in on the Sun to see the planets.
//   - the Sun is drawn SUN_Z inches (about 21 pc) above the galactic plane, the real height.
//   - spiral arms: a drawn pattern (4 arms, pitch 14 degrees), held still. Real arms change shape over time.
//   - the Sun's up-and-down motion through the plane (60 to 70 million years) is not drawn.
//   - spins: each planet spins about the galactic up axis, not its own tilted pole (the spin motion turns about x, y
//     or z only). The orbits are tilted correctly; the spin axes are not.
//   - time: 200 years plays in 200 s (1 s per year). It plays once and holds, because the engine's orbit kind
//     needs loop: false (js/core/motion.js).
// No orbit paths are drawn. Units: inches, Z up. The galactic plane is z = 0; the galactic centre is the origin.
// The viewer ignores the position and rotation of groups at rest (only motion moves a group), so the Sun and the
// planets carry their galactic offset in their own positions, and the Sun's group moves by its orbit delta.
// Build: node tools/build_samples.js.

const M = require('../js/core/motion.js');
const SS = require('./solar_system.js');
const ST = require('./solar_true.js');

const WORLD_ID = 'galaxy-sun-world';   // bounds about +/- 6,000 in across and +/- 500 in up (see worlds/)
const START = '2026-11-05';            // today, 00:00 UTC; the planets start where they are on this date
const SPAN_YEARS = 200;                // the animation covers 200 years of time
const LOOP_S = 200;                    // seconds for that 200 years
const SPAN_DAYS = SPAN_YEARS * 365.25;
const K = 120;                         // planets: a_model = K * sqrt(AU), the same as Solar System V06
const GAL_R = 3000;                    // inches: the Sun's distance from the galactic centre (about 8.2 kpc)
const SUN_Z = 8;                       // inches: the Sun's height above the galactic plane (about 21 pc)
const S0 = [GAL_R, 0, SUN_Z];          // where the Sun sits at the start, relative to the galactic centre
const TILT_DEG = 62.9;                 // the ecliptic against the galactic plane
const GAL_SWEEP_DEG = 30;              // degrees the Sun sweeps round the centre in the 200 years
const GAL_LAP_YEARS = (SPAN_YEARS * 360) / GAL_SWEEP_DEG;   // one lap at this pace, about 2,400 years
const GAL_REAL_LAP_YEARS = 230e6;      // the real lap, about 230 million years
const SUN_ROT = 25.38;                 // days, the Sun's equator
const J2000_MS = Date.UTC(2000, 0, 1, 12);
const DAY_MS = 86400000;
const DEG = 180 / Math.PI;
const rnd = (n) => Math.round(n * 1000) / 1000;
const rnd3 = (c) => [rnd(c[0]), rnd(c[1]), rnd(c[2])];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// The planets chosen (a select few); elements from the true-orbit scene.
const PICK = ['earth', 'mars', 'jupiter', 'saturn'];

// ---- small 3x3 rotation helpers (right-handed; columns are the images of x, y, z)
const rotZ = (a) => [[Math.cos(a), -Math.sin(a), 0], [Math.sin(a), Math.cos(a), 0], [0, 0, 1]];
const rotX = (a) => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
const rotY = (a) => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];
const mm = (A, B) => A.map((row) => [0, 1, 2].map((j) => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j]));
const col = (A, j) => [A[0][j], A[1][j], A[2][j]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// The same orbit, turned by the ecliptic tilt. An orbit is R = Rz(node) Rx(inc) Rz(peri); the galactic-frame orbit is
// Ry(tilt) R. Its normal and perihelion give the new node, inclination and perihelion angle. Checked in the test.
function tiltedElements(el) {
  const R = mm(rotZ(el.node / DEG), mm(rotX(el.inc / DEG), rotZ(el.peri / DEG)));
  const Rn = mm(rotY(TILT_DEG / DEG), R);
  const n = col(Rn, 2), p = col(Rn, 0);
  const inc = Math.acos(Math.max(-1, Math.min(1, n[2])));
  const node = Math.atan2(n[0], -n[1]);
  const N = [Math.cos(node), Math.sin(node), 0];
  const peri = Math.atan2(dot(cross(N, p), n), dot(N, p));
  return { ...el, inc: inc * DEG, node: node * DEG, peri: peri * DEG };
}

const daysSinceJ2000 = (iso) => (Date.parse(iso + 'T00:00:00Z') - J2000_MS) / DAY_MS;
function startM0(el) {
  const M2000 = el.L - (el.node + el.peri);
  return (((M2000 + (360 * daysSinceJ2000(START)) / el.period) % 360) + 360) % 360;
}
// Orbit motion for one planet (tilted into the galactic frame), over the 200-year span.
function orbitOf(el) {
  const t = tiltedElements(el);
  return { a: rnd(K * Math.sqrt(el.a)), e: el.e, inc_deg: rnd(t.inc), node_deg: rnd(t.node), peri_deg: rnd(t.peri),
    M0_deg: rnd(startM0(el)), period_days: el.period, span_days: SPAN_DAYS };
}
// Rest place of a planet relative to the Sun (before the Sun's own offset S0).
const restPos = (el) => M.orbitPosition(orbitOf(el), 0);

// Spiral arms: a logarithmic spiral r = r0 * exp(b * theta), b = tan(pitch). Four arms, drawn as spheres (stars).
const ARMS = 4, PER_ARM = 46, PITCH_DEG = 14, R_IN = 1200, R_OUT = 5200;
const B = Math.tan(PITCH_DEG / DEG), THETA_MAX = Math.log(R_OUT / R_IN) / B;
function armStars() {
  const out = [];
  for (let a = 0; a < ARMS; a++) {
    for (let k = 0; k < PER_ARM; k++) {
      const t = k / (PER_ARM - 1);
      const th = THETA_MAX * t, r = R_IN * Math.exp(B * th);
      const ang = th + (a * 2 * Math.PI) / ARMS;
      const jitter = (((k * 0.618034 + a * 0.381966) % 1) - 0.5) * 0.12 * r;   // a small deterministic spread
      out.push({ a, k, x: (r + jitter) * Math.cos(ang), y: (r + jitter) * Math.sin(ang), size: rnd(22 + 26 * ((k * 0.37 + a * 0.21) % 1)) });
    }
  }
  return out;
}

// Structure (viewer rule: a group moves only by its motion; its rest position is not used):
//   galaxy (still)
//     disc, bulge, centre, arm stars
//     sun-path (orbit motion: the Sun's circle round the centre; its rest is the origin)
//       sun, corona (at S0)
//       orbit-<planet> (orbit motion, tilted) > body-<planet> (spin) > ball-<planet> (at S0 + rest place)
function defs() {
  const out = [];
  out.push(['galaxy', { name: 'Milky Way (stylised)', description: 'the galactic disc, drawn as a spiral pattern (not to scale)', type: 'group', dimensions: [], position: [0, 0, 0] }]);
  out.push(['disc', { name: 'Galactic disc', description: 'the flat disc the Sun orbits in', type: 'cylinder', dimensions: [5600, 4], position: [0, 0, 0], material: 'disc', parent: 'galaxy' }]);
  out.push(['bulge', { name: 'Galactic bulge', description: 'the dense central bulge (drawn faint; taps pass through)', type: 'sphere', dimensions: [420], position: [0, 0, 0], material: 'bulge', parent: 'galaxy' }]);
  out.push(['centre', { name: 'Galactic centre', description: 'the centre of the Milky Way, around the black hole Sagittarius A*', type: 'sphere', dimensions: [60], position: [0, 0, 0], material: 'centre', parent: 'galaxy' }]);
  out.push(['arms', { name: 'Spiral arms', description: 'stars along four spiral arms (a drawn pattern, not real positions)', type: 'group', dimensions: [], position: [0, 0, 0], parent: 'galaxy' }]);
  for (const s of armStars()) {
    out.push([`star-${s.a}-${s.k}`, { name: `Arm ${s.a + 1} star ${s.k + 1}`, description: '', type: 'sphere', dimensions: [s.size], position: rnd3([s.x, s.y, 0]), material: 'arm', parent: 'arms' }]);
  }
  out.push(['sun-path', { name: 'Sun orbit', description: 'the Sun, carried round the centre (sped up; see the description)', type: 'group', dimensions: [], position: [0, 0, 0], parent: 'galaxy' }]);
  out.push(['sun', { name: 'Sun', description: 'the star (stylised size); about 21 parsecs above the galactic plane', type: 'sphere', dimensions: [40], position: rnd3(S0), material: 'sun', parent: 'sun-path' }]);
  out.push(['corona', { name: 'Sun glow', description: 'a faint glow round the Sun (taps pass through it)', type: 'sphere', dimensions: [48], position: rnd3(S0), material: 'corona', parent: 'sun-path' }]);
  for (const key of PICK) {
    const el = ST.ELEMENTS[key], p = SS.PLANETS[key], c = add3(restPos(el), S0);
    out.push([`orbit-${key}`, { name: `${p.name} orbit`, description: 'the true path round the Sun, tilted with the solar plane (no line drawn)', type: 'group', dimensions: [], position: [0, 0, 0], parent: 'sun-path' }]);
    out.push(...SS.bodyDefs(key, p, rnd3(c), `orbit-${key}`, 5, {}));
  }
  return out;
}

function motions(uuid) {
  const list = [];
  // The Sun round the galactic centre: a circle of radius GAL_R, in the galactic plane, sped up (see the top note).
  list.push({ id: 'sun-galactic-orbit', target: 'sun-path', kind: 'orbit', a: GAL_R, e: 0, inc_deg: 0, node_deg: 0, peri_deg: 0,
    M0_deg: 0, period_days: rnd(GAL_LAP_YEARS * 365.25), span_days: SPAN_DAYS });
  for (const key of PICK) {
    const el = ST.ELEMENTS[key], p = SS.PLANETS[key], c = add3(restPos(el), S0);
    list.push({ id: `${key}-orbit`, target: `orbit-${key}`, kind: 'orbit', ...orbitOf(el) });
    list.push({ id: `${key}-spin`, target: `body-${key}`, kind: 'spin', axis: p.spinAxis || 'z', pivot: rnd3(c), cycles: rnd(SPAN_DAYS / el.rot) });
  }
  list.push({ id: 'sun-spin', target: 'sun', kind: 'spin', axis: 'z', pivot: rnd3(S0), cycles: rnd(SPAN_DAYS / SUN_ROT) });
  return {
    schema: M.MOTION_SCHEMA,
    model_id: 'galaxy-sun-v01',
    name: 'Sun round the galaxy centre, 200 years',
    description: `The Sun sweeps ${GAL_SWEEP_DEG} degrees round the galactic centre in ${SPAN_YEARS} years (sped up about ${Math.round(GAL_REAL_LAP_YEARS / GAL_LAP_YEARS).toLocaleString('en-US')} times; the real lap is about 230 million years). The planets go round the Sun on their true orbits, tilted with the solar plane. ${SPAN_YEARS} years plays in ${LOOP_S} s, then holds.`,
    units: 'in', up: 'z',
    loop_s: LOOP_S,
    loop: false,
    timeline: { start_date: START, span_days: SPAN_DAYS, note: `${SPAN_YEARS} years of the Sun's motion` },
    autoplay: { plays: 1 },
    motions: list.map((m) => ({ ...m, target: uuid(m.target) })),
  };
}

const MATERIALS = {
  sun: { color: '#ffd23f', opacity: 1 },
  corona: { color: '#ffb347', opacity: 0.2 },
  disc: { color: '#5a6fa8', opacity: 0.12 },
  bulge: { color: '#ffd9a0', opacity: 0.3 },
  centre: { color: '#ffffff', opacity: 1 },
  arm: { color: '#a9c4ff', opacity: 0.9 },
};

const SCENE = {
  id: 'galaxy-sun-v01',
  builtin: true,
  project: 'Galaxy Sun',
  header: {
    model_id: 'galaxy-sun-v01',
    name: 'Galaxy Sun V01',
    description: `The Sun and four planets (Earth, Mars, Jupiter, Saturn) carried round the Milky Way's centre. The galactic sweep is sped up so 200 years shows as a 30-degree arc (the real pace is too slow to see); the planets keep their true orbits, tilted about 63 degrees to the galaxy. No orbit paths are drawn.`,
    units: 'in', up: 'z', world: WORLD_ID,
    materials: { ...SS.MATERIALS, ...MATERIALS },
  },
  defs: defs(),
  motion: (uuid) => motions(uuid),
};

module.exports = { GALAXY_SUN: SCENE, GAL_R, SUN_Z, TILT_DEG, SPAN_YEARS, LOOP_S, PICK, GAL_SWEEP_DEG, GAL_LAP_YEARS, tiltedElements, orbitOf, restPos, S0 };
