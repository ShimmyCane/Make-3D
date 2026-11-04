// Earth V23: launch sites, large satellites only, and mountain ranges that read as mountains.
// Built on V22 (tools/earth_v22.js, earthV22Defs): the parts below are dropped and replaced, the rest stays.
//
// What changed from V22:
//   - Rockets: six real launch sites (Kennedy, Baikonur, Kourou, Jiuquan, Vandenberg, Wenchang), each on land,
//     with its pad. A rocket climbs straight up the local vertical (the ground normal, not an axis), holds at
//     the top, and comes back down to its pad. Launches are staggered through the loop. The pad waits for the
//     launch on a profile, so the rocket stays put until its turn.
//   - Satellites: only large units are kept, as Jimmy asked: the ISS, Tiangong (a second station), Hubble
//     (Hubble class), and a geostationary weather satellite (GOES class). The constellation, the navigation ring,
//     the geostationary comsats and the polar satellite are removed.
//   - Mountains: the V12 cones (up to 4.4 in tall, 1.5 in across) were giant pyramids. They are replaced by
//     small peaks along four ranges (the Andes, the Rockies, the Alps and the Himalaya), 0.25 in across at the
//     base and 0.35 to 0.6 in tall. Still exaggerated, but in proportion to the rest.
//
// Units and scale are as in tools/earth_v22.js: Earth's radius 9.5 in, about 670 km per inch.
// Deployment of new satellites is not in this version (see the schematic, section 21, for the open choice).

const M = require('../js/core/motion.js');
const SS = require('./solar_system.js');
const PV = require('./planet_views.js');
const V22 = require('./earth_v22.js');
const V4 = require('./planet_views_v4.js');

const { surf, disc, cone } = PV;
const { earthV22Defs, R } = V22;
const c = [0, 0, 0];
const body = 'body-earth';
const LOOP_EARTH = 480;
const rnd = (n) => Math.round(n * 1000) / 1000;
const DEG = 180 / Math.PI;

// the V22 parts that V23 replaces: the constellation and navigation rings, the geostationary comsats, the
// polar satellite, the V22 rockets and pads, and the V12 mountain cones
const DROP = /^(mtn-|arm22-(leo|gps|geo|polar)|orbit22-(leo|gps|geo|polar)|polar22|rocket22|pad22)/;

// Each site launches one rocket and one new satellite. Four first stages come back to their pad; two fall into the
// sea downrange and splash. The satellite rides up on the nose, is released at the top, and drops out of sight
// into the planet. It is hoisted back to the nose before the loop ends, so the loop closes.
const SITES = [
  { name: 'Kennedy', lat: 28.5, lon: -80.6, splash: null },
  { name: 'Baikonur', lat: 45.9, lon: 63.3, splash: null },
  { name: 'Kourou', lat: 5.2, lon: -52.8, splash: { lat: 8, lon: -40 } },
  { name: 'Jiuquan', lat: 40.9, lon: 100.3, splash: null },
  { name: 'Vandenberg', lat: 34.7, lon: -120.6, splash: null },
  { name: 'Wenchang', lat: 19.6, lon: 110.9, splash: { lat: 16, lon: 135 } },
];

// the time, along a closed path, at which each waypoint is reached: marks are [index, loop fraction];
// the profile maps time to distance by the length of the polyline between the marks
function profileFrom(points, marks, closeAt) {
  const n = points.length;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const L = [0];
  for (let k = 1; k < n; k++) L[k] = L[k - 1] + dist(points[k - 1], points[k]);
  const total = L[n - 1] + dist(points[n - 1], points[0]);
  const pr = [[0, 0]];
  for (const [i, t] of marks) pr.push([rnd(t), rnd(L[i] / total)]);
  pr.push([rnd(closeAt), 1], [1, 1]);
  return pr;
}

// one launch: the rocket is a group whose pivot is its rest point on the pad (a stage 0.3 in above the ground)
function launch(i, site) {
  const gkey = `rocket23-${i + 1}`, padKey = `pad23-${i + 1}`;
  const out = [];
  const p0 = surf(c, R, site.lat, site.lon, 0.3);
  out.push([gkey, { name: `${site.name} rocket`, description: site.splash ? 'climbs, then the first stage falls downrange and splashes into the sea' : 'climbs about 1 in, then comes back to its pad (exaggerated)', type: 'group', dimensions: [], position: c, parent: body }]);
  out.push(disc(padKey, `${site.name} pad`, c, R, site.lat, site.lon, 0.35, 'pad', body, 0.0));
  out.push([`${gkey}-body`, { name: `${site.name} stage`, description: '', type: 'cylinder', dimensions: [0.25, 0.6], position: p0.p, ...p0.rot, material: 'rocket', parent: gkey }]);
  const s2 = surf(c, R, site.lat, site.lon, 0.725);
  out.push([`${gkey}-nose`, { name: `${site.name} nose cone`, description: '', type: 'cone', dimensions: [0.25, 0.25], position: s2.p, ...s2.rot, material: 'nose', parent: gkey }]);
  const s3 = surf(c, R, site.lat, site.lon, 0.0);
  out.push([`${gkey}-plume`, { name: `${site.name} plume`, description: 'the exhaust', type: 'cone', dimensions: [0.25, 0.25], position: s3.p, rotation_x: 180, rotation_y: s3.rot.rotation_y, rotation_z: s3.rot.rotation_z, material: 'plume', parent: gkey }]);
  return out;
}

// the launch motions for site i: the rocket and its satellite. Launch i starts at 0.10 * i of the loop.
function launchMotions(i, site) {
  const t0 = 0.10 * i;
  const gkey = `rocket23-${i + 1}`, satKey = `sat23-${i + 1}`;
  const pad = surf(c, R, site.lat, site.lon, 0.3).p;
  const up = surf(c, R, site.lat, site.lon, 0.95).p;
  const top = surf(c, R, site.lat, site.lon, 1.6).p;
  const out = [];
  if (site.splash) {
    const M = surf(c, R, site.splash.lat, site.splash.lon, 0.9).p;   // over the sea, on the way down
    const S = surf(c, R, site.splash.lat, site.splash.lon, -0.2).p;  // the splash, just under the surface
    const pts = [pad, up, top, M, S, c];
    out.push({ id: `launch23-${i + 1}`, target: gkey, kind: 'path', points: pts, pivot: pad, cycles: 1,
      profile: profileFrom(pts, [[1, t0 + 0.04], [2, t0 + 0.10], [3, t0 + 0.14], [4, t0 + 0.17], [5, t0 + 0.25]], t0 + 0.32) });
  } else {
    const pts = [pad, up, top, up];
    out.push({ id: `launch23-${i + 1}`, target: gkey, kind: 'path', points: pts, pivot: pad, cycles: 1,
      profile: profileFrom(pts, [[1, t0 + 0.05], [2, t0 + 0.10], [3, t0 + 0.18]], t0 + 0.25) });
  }
  // the new satellite: rides up on the nose, is released at the top and drops into the planet, then is hoisted
  // back to the nose (the path closes through the planet, so it is out of sight there)
  const rest = surf(c, R, site.lat, site.lon, 1.0).p;
  const ride = surf(c, R, site.lat, site.lon, 2.3).p;
  const e1 = [-Math.sin(site.lon / DEG), Math.cos(site.lon / DEG), 0];
  const rel = surf(c, R, site.lat, site.lon, 2.9).p.map((v, k) => rnd(v + 1.5 * e1[k]));
  const spts = [rest, ride, rel, c];
  out.push({ id: `sat23-${i + 1}-deploy`, target: satKey, kind: 'path', points: spts, pivot: rest, cycles: 1,
    profile: profileFrom(spts, [[1, t0 + 0.10], [2, t0 + 0.13], [3, t0 + 0.18]], t0 + 0.36) });
  return out;
}

// a mountain range: n peaks along a straight line on the map, heights varying along it
function range(prefix, name, la0, lo0, la1, lo1, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0 : i / (n - 1);
    const la = la0 + (la1 - la0) * f, lo = lo0 + (lo1 - lo0) * f;
    const h = rnd(0.35 + 0.25 * (0.5 + 0.5 * Math.sin(i * 2.1)));
    out.push(cone(`${prefix}-${i}`, `${name} peak`, c, R, la, lo, 0.25, h, 'mtn', body, 'a peak in a range (exaggerated)'));
  }
  return out;
}

// the large satellites: a body with two solar panels, on its own ring (the ring group turns about its normal)
function bigRing(key, label, normal, r, cycles) {
  return { key, label, normal, r, cycles };
}

const RINGS23 = [
  bigRing('arm23-tiangong', 'Tiangong (second station)', 'y', R + 2.1, 56),
  bigRing('arm23-goes', 'Geostationary weather satellite', 'z', R + 14.5, 32),
];

function ringPoint(normal, r, th) {
  const a = r * Math.cos(th), b = r * Math.sin(th);
  if (normal === 'z') return [a, b, 0];
  if (normal === 'x') return [0, a, b];
  return [a, 0, b];
}

function orbitLine(key, name, normal, r, desc) {
  const joints = [];
  for (let k = 0; k <= 72; k++) joints.push(ringPoint(normal, r, (2 * Math.PI * k) / 72).map(rnd));
  const d = rnd(r);
  const dims = normal === 'z' ? [2 * d, 2 * d, 0.25] : normal === 'x' ? [0.25, 2 * d, 2 * d] : [2 * d, 0.25, 2 * d];
  return [key, { name, description: desc, type: 'loft', dimensions: dims, position: c, material: 'orbit22', parent: 'orbits',
    shape: { joints, facing: normal === 'z' ? [0, 0, 1] : [1, 0, 0], rings: [[0, 0.035, 0.035], [1, 0.035, 0.035]], samples: 24, sides: 6 } }];
}

function earthV23Defs() {
  const kept = earthV22Defs().filter((d) => !DROP.test(d[0]));
  const defs = kept.slice();
  // the orbit-line group is in the V22 list; the new lines go in it
  for (const g of RINGS23) defs.push([g.key, { name: `${g.label} ring`, description: `${g.label}, turning round the Earth`, type: 'group', dimensions: [], position: c }]);
  // Tiangong: a body with panels, like the ISS (a second station)
  defs.push(['tiangong23-core', { name: 'Tiangong', description: 'the Chinese space station (drawn larger than to scale)', type: 'box', dimensions: [0.4, 0.25, 0.25], position: ringPoint('y', R + 2.1, 0), material: 'iss', parent: 'arm23-tiangong' }]);
  defs.push(['tiangong23-panel', { name: 'Tiangong panels', description: '', type: 'box', dimensions: [0.25, 0.6, 0.25], position: ringPoint('y', R + 2.1, 0), material: 'panel', parent: 'arm23-tiangong' }]);
  defs.push(orbitLine('orbit23-tiangong', 'Tiangong orbit', 'y', R + 2.1, 'the path of Tiangong'));
  // the geostationary weather satellite: a larger body with a panel, over one spot of the Earth
  defs.push(['goes23-core', { name: 'Geostationary weather satellite', description: 'a weather satellite over one spot of the Earth (drawn larger than to scale)', type: 'box', dimensions: [0.3, 0.3, 0.3], position: ringPoint('z', R + 14.5, 0), material: 'iss', parent: 'arm23-goes' }]);
  defs.push(['goes23-panel', { name: 'Weather satellite panels', description: '', type: 'box', dimensions: [0.25, 0.8, 0.25], position: ringPoint('z', R + 14.5, 0), material: 'panel', parent: 'arm23-goes' }]);
  defs.push(orbitLine('orbit23-goes', 'Geostationary orbit', 'z', R + 14.5, 'the geostationary orbit, 36,000 km up (exaggerated)'));
  // the launches
  SITES.forEach((site, i) => {
    defs.push(...launch(i, site));
    const rest = surf(c, R, site.lat, site.lon, 1.0).p;
    defs.push([`sat23-${i + 1}`, { name: `New satellite ${i + 1} (${site.name})`, description: 'released at the top of the climb; drops out of sight', type: 'sphere', dimensions: [0.25], position: rest, material: 'iss', parent: body }]);
  });
  // the mountain ranges
  defs.push(...range('andes', 'Andes', -5, -78, -35, -70, 9));
  defs.push(...range('rockies', 'Rockies', 50, -125, 35, -108, 6));
  defs.push(...range('alps', 'Alps', 46, 6, 44, 14, 4));
  defs.push(...range('himalaya', 'Himalaya', 27, 80, 31, 95, 6));
  return defs;
}

const DESC = 'Earth on its own, increment 23 of 23. Six real launch sites (Kennedy, Baikonur, Kourou, Jiuquan, Vandenberg, Wenchang): each rocket climbs its local vertical and comes back to its pad, one after another. Only the large satellites are kept: the ISS, Tiangong, Hubble and a geostationary weather satellite, on faded orbit lines. The mountains are small peaks along real ranges. Sizes are exaggerated where the real size would vanish.';

function earthSceneV23() {
  const p0 = SS.PLANETS.earth;
  const id = 'planet-earth-v23';
  const defs = earthV23Defs();
  const motions = (uuid) => {
    const list = [
      { id: 'earth-spin', target: 'body-earth', kind: 'spin', axis: 'z', pivot: c, cycles: 32 },
      { id: 'moon-orbit', target: 'arm-moon', kind: 'spin', axis: 'z', pivot: c, cycles: 16 },
      { id: 'cloud-drift', target: 'clouds22', kind: 'spin', axis: 'z', pivot: c, cycles: 40 },
      { id: 'cloud-drift2', target: 'clouds22b', kind: 'spin', axis: 'y', pivot: c, cycles: 30 },
      { id: 'arm22-iss-turn', target: 'arm22-iss', kind: 'spin', axis: 'y', pivot: c, cycles: 60 },
      { id: 'arm22-hubble-turn', target: 'arm22-hubble', kind: 'spin', axis: 'x', pivot: c, cycles: 52 },
      { id: 'arm23-tiangong-turn', target: 'arm23-tiangong', kind: 'spin', axis: 'y', pivot: c, cycles: 56 },
      { id: 'arm23-goes-turn', target: 'arm23-goes', kind: 'spin', axis: 'z', pivot: c, cycles: 32 },
    ];
    for (const sk of ['storm22-1', 'storm22-2', 'storm22-3', 'storm22-4', 'storm22-5']) list.push({ id: `${sk}-turn`, target: sk, kind: 'spin', axis: 'z', pivot: c, cycles: 32 });
    SITES.forEach((site, i) => list.push(...launchMotions(i, site)));
    return {
      schema: M.MOTION_SCHEMA, model_id: id, name: 'Spin, satellites, launches, storms',
      description: `Earth spins; the Moon goes round. The ISS, Tiangong, Hubble and the weather satellite go round. Six rockets launch from their sites one after another: four come back to their pads, two fall into the sea. Each carries a new satellite that is released at the top and drops out of sight. Clouds drift. Storms turn. One ${LOOP_EARTH} s loop; each motion is a whole number of turns, so it never jumps.`,
      units: 'in', up: 'z', loop_s: LOOP_EARTH, autoplay: { plays: 2 },
      motions: list.map((m) => ({ ...m, target: uuid(m.target) })),
    };
  };
  return {
    id, builtin: true, project: 'Earth (planet view)',
    header: {
      model_id: id, name: 'Earth (planet view) V23',
      description: DESC,
      units: 'in', up: 'z', world: PV.WORLD_ID,
      materials: { ...V4.MATERIALS_V4, ...V4.OCEAN21, orbit22: { color: '#cfe6ff', opacity: 0.3 } },
      view: { fill: 0.75, radius: p0.R },
      links: [{ label: 'Back to the Solar System', target: 'solar-system-v07', transition: 'fade' }],
    },
    defs,
    motion: motions,
  };
}

const EARTH_VIEWS_V23 = [earthSceneV23()];
module.exports = { EARTH_VIEWS_V23, earthV23Defs, SITES, RINGS23 };
