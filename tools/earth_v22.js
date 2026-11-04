// Earth V22: the floating parts brought closer to scale. Built on V21 (tools/planet_views_v4.js, earthV4Defs(21)).
//
// Scale: Earth's radius is 9.5 in, so 1 in is about 670 km. Sizes and heights are real where they can be, and
// exaggerated where the real size would vanish (a rocket is about 70 m, a satellite about 10 m):
//   - rockets are about 0.85 in tall (far too big for their size, so they can be seen);
//   - satellites are 0.1 to 0.4 in, and their heights above the ground are stretched about 3 times, keeping the
//     real order: LEO (ISS, Hubble, the LEO ring) < navigation ring (GPS-like) < geostationary ring < the Moon;
//   - storms are about 2.5 in across (about 1,700 km, two to three times their real size, so they show), with puffs on the cloud shell;
//   - cloud shells sit 0.1 and 0.2 in above the ground (about 70 and 130 km), so they read as cloud, not as a halo.
// Orbit lines are faded tubes (opacity 0.3, taps pass through) on the planes the satellites really move in.
// Satellites ride a ring group that spins about the ring's normal (x, y or z), so each one stays on its orbit.
// The geostationary ring spins 32 times per loop, the same as Earth, so it stays over one spot.
//
// Versions are cumulative in spirit: V22 is V21 with these parts replaced. V01 to V21 are not changed.

const M = require('../js/core/motion.js');
const SS = require('./solar_system.js');
const PV = require('./planet_views.js');
const V4 = require('./planet_views_v4.js');

const { surf, disc, dot } = PV;
const { earthV4Defs, MATERIALS_V4, OCEAN21 } = V4;
const R = SS.PLANETS.earth.R;          // 9.5 in
const c = [0, 0, 0];
const body = 'body-earth';
const LOOP_EARTH = 480;
const rnd = (n) => Math.round(n * 1000) / 1000;
const DEG = 180 / Math.PI;

const ORBIT22 = { orbit22: { color: '#cfe6ff', opacity: 0.3 } };

// the parts V22 replaces: the ISS, the polar satellite, the six small satellites, the rockets and their pads,
// the storms, the aurora discs and the two cloud shells (with their groups). Everything else stays.
const REPLACED = /^(iss|polar|rocket-|pad-|storm|sat-|aurora-|cloud)/;

// a point on a ring of radius r in the plane whose normal is the axis (x, y or z), at angle th
function ringPoint(normal, r, th) {
  const a = r * Math.cos(th), b = r * Math.sin(th);
  if (normal === 'z') return [a, b, 0];
  if (normal === 'x') return [0, a, b];
  return [a, 0, b];   // y
}

// a closed, faded tube along an orbit: 72 joints round the ring, the last one repeating the first
function orbitLine(key, name, normal, r, desc) {
  const joints = [];
  for (let k = 0; k <= 72; k++) joints.push(ringPoint(normal, r, (2 * Math.PI * k) / 72).map(rnd));
  const half = [rnd(r), rnd(r), 0.035];
  const dims = normal === 'z' ? [2 * half[0], 2 * half[0], 0.25] : normal === 'x' ? [0.25, 2 * half[0], 2 * half[0]] : [2 * half[0], 0.25, 2 * half[0]];
  return [key, { name, description: desc, type: 'loft', dimensions: dims.map(rnd), position: c, material: 'orbit22', parent: 'orbits',
    shape: { joints, facing: normal === 'z' ? [0, 0, 1] : [1, 0, 0], rings: [[0, 0.035, 0.035], [1, 0.035, 0.035]], samples: 24, sides: 6 } }];
}

// a satellite ring: a group that spins about the normal, with n satellites on it (each made by satDef)
function satRing(key, label, normal, r, n, satDef) {
  const out = [[key, { name: `${label} ring`, description: `${label}: satellites on one ring, turning round the Earth`, type: 'group', dimensions: [], position: c }]];
  for (let k = 0; k < n; k++) out.push(satDef(`${key}-${k}`, `${label} ${k + 1}`, ringPoint(normal, r, (2 * Math.PI * k) / n).map(rnd), key));
  return out;
}

// a small sphere satellite
const sphereSat = (size) => (key, name, p, parent) => [key, { name, description: 'a satellite (exaggerated)', type: 'sphere', dimensions: [size], position: p, material: 'iss', parent }];

// a satellite with two solar panels (a box for the body, a thin box for the panels), at the same place
function bigSat(key, name, p, parent, core, panel, desc) {
  return [
    [`${key}-core`, { name, description: desc, type: 'box', dimensions: core, position: p, material: 'iss', parent }],
    [`${key}-panel`, { name: `${name} panels`, description: '', type: 'box', dimensions: panel, position: p, material: 'panel', parent }],
  ];
}

// a hurricane: a dark eye and three arms of translucent puffs on the cloud shell (puffs about 0.2 in across)
function storm(key, label, lat, lon) {
  const out = [];
  const la = lat / DEG, lo = lon / DEG;
  const n = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
  const e1 = [-Math.sin(lo), Math.cos(lo), 0];
  const e2 = [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)];
  const H = R + 0.14;
  out.push([key, { name: `${label} group`, description: 'a hurricane seen from above (exaggerated)', type: 'group', dimensions: [], position: c, parent: body }]);
  out.push([`${key}-eye`, { name: `${label} eye`, description: 'the calm centre', type: 'sphere', dimensions: [0.25], position: surf(c, R, lat, lon, 0.12).p, material: 'eye', parent: key }]);
  for (let a = 0; a < 3; a++) {
    for (let j = 0; j < 10; j++) {
      const rho = 0.2 + 0.11 * j, th = (a * 120 + j * 18) / DEG;
      const x = rho * Math.cos(th), y = rho * Math.sin(th);
      let P = [0, 1, 2].map((k) => H * n[k] + x * e1[k] + y * e2[k]);
      const L = Math.hypot(...P);
      P = P.map((v) => rnd((v / L) * H));
      out.push([`${key}-arm${a}-${j}`, { name: `${label} cloud ${a + 1}.${j + 1}`, description: '', type: 'sphere', dimensions: [0.25], position: P, material: 'stormhaze', parent: key }]);
    }
  }
  return out;
}

// a launch: a pad (a flat disc on the ground), and a rocket (stage, nose cone and a flame) about 0.7 in tall
function launch(gkey, label, lat, lon, padKey) {
  const out = [];
  out.push([gkey, { name: `${label} rocket`, description: 'a rocket that lifts off once per loop, then returns to the pad (exaggerated)', type: 'group', dimensions: [], position: c, parent: body }]);
  out.push(disc(padKey, `${label} pad`, c, R, lat, lon, 0.35, 'pad', body, 0.0));
  const s1 = surf(c, R, lat, lon, 0.3);
  out.push([`${gkey}-body`, { name: `${label} stage`, description: '', type: 'cylinder', dimensions: [0.25, 0.6], position: s1.p, ...s1.rot, material: 'rocket', parent: gkey }]);
  const s2 = surf(c, R, lat, lon, 0.725);
  out.push([`${gkey}-nose`, { name: `${label} nose cone`, description: '', type: 'cone', dimensions: [0.25, 0.25], position: s2.p, ...s2.rot, material: 'nose', parent: gkey }]);
  const s3 = surf(c, R, lat, lon, 0.0);
  out.push([`${gkey}-plume`, { name: `${label} plume`, description: 'the exhaust', type: 'cone', dimensions: [0.25, 0.25], position: s3.p, rotation_x: 180, rotation_y: s3.rot.rotation_y, rotation_z: s3.rot.rotation_z, material: 'plume', parent: gkey }]);
  return out;
}

// the satellites and orbit lines of V22 (arm groups turn; orbit lines stay still)
const RINGS = [
  // key, label, normal, radius (in from the centre), satellites, cycles per loop (whole numbers)
  { key: 'arm22-leo-a', label: 'Satellite LEO-A', normal: 'z', r: R + 2.8, n: 17, cycles: 36 },
  { key: 'arm22-leo-b', label: 'Satellite LEO-B', normal: 'x', r: R + 3.1, n: 17, cycles: 40 },
  { key: 'arm22-leo-c', label: 'Satellite LEO-C', normal: 'y', r: R + 2.5, n: 17, cycles: 44 },
  { key: 'arm22-leo-d', label: 'Satellite LEO-D', normal: 'z', r: R + 3.4, n: 17, cycles: 30 },
  { key: 'arm22-gps', label: 'Navigation satellite', normal: 'z', r: R + 7.5, n: 6, cycles: 6 },
  { key: 'arm22-geo', label: 'Geostationary satellite', normal: 'z', r: R + 14.5, n: 4, cycles: 32 },
];

function earthV22Defs() {
  // V21 without the parts V22 replaces (land, sea, the Moon, mountains and sea ice stay as they were)
  const base = earthV4Defs(21).filter((d) => !REPLACED.test(d[0]));
  const defs = base.map((d) => (d[0] === 'ball-earth' ? [d[0], { ...d[1], material: 'earth_ocean21' }] : d));

  defs.push(['orbits', { name: 'Orbit lines', description: 'faded lines that show the paths of the satellites', type: 'group', dimensions: [], position: c }]);
  defs.push(orbitLine('orbit22-moon', 'Moon orbit line', 'z', 30, 'the path of the Moon'));

  // the satellite rings and their orbit lines
  for (const g of RINGS) {
    defs.push(...satRing(g.key, g.label, g.normal, g.r, g.n, sphereSat(0.25)));
    defs.push(orbitLine(`orbit22-${g.key.slice(6)}`, `${g.label} orbit`, g.normal, g.r, `the path of ${g.label.toLowerCase()}s`));
  }

  // the ISS, Hubble and the polar weather satellite: each a group on its own ring
  defs.push(['arm22-iss', { name: 'ISS ring', description: 'the space station, turning round the Earth', type: 'group', dimensions: [], position: c }]);
  defs.push(...bigSat('iss22', 'ISS', ringPoint('y', R + 1.8, 0), 'arm22-iss', [0.4, 0.25, 0.25], [0.25, 0.6, 0.25], 'the space station (drawn about 4 times its true size against the Earth)'));
  defs.push(orbitLine('orbit22-iss', 'ISS orbit', 'y', R + 1.8, 'the path of the space station'));

  defs.push(['arm22-hubble', { name: 'Hubble ring', description: 'the Hubble telescope, turning round the Earth', type: 'group', dimensions: [], position: c }]);
  defs.push(...bigSat('hubble22', 'Hubble', ringPoint('x', R + 2.3, 0), 'arm22-hubble', [0.25, 0.25, 0.3], [0.25, 0.36, 0.25], 'the Hubble telescope (about 13 m; drawn larger than to scale)'));
  defs.push(orbitLine('orbit22-hubble', 'Hubble orbit', 'x', R + 2.3, 'the path of Hubble'));

  defs.push(['arm22-polar', { name: 'Polar satellite ring', description: 'a weather satellite on a polar orbit', type: 'group', dimensions: [], position: c }]);
  defs.push(...bigSat('polar22', 'Polar weather satellite', ringPoint('x', R + 4.2, 0), 'arm22-polar', [0.25, 0.25, 0.25], [0.25, 0.5, 0.25], 'a weather satellite on a polar orbit'));
  defs.push(orbitLine('orbit22-polar', 'Polar orbit', 'x', R + 4.2, 'the polar orbit of the weather satellite'));

  // storms, aurora and the two cloud shells (the shells just above the ground)
  defs.push(...storm('storm22-1', 'Storm', 20, 150));
  defs.push(...storm('storm22-2', 'Storm 2', -30, -120));
  defs.push(...storm('storm22-3', 'Storm 3', 45, -30));
  defs.push(...storm('storm22-4', 'Storm 4', -45, 60));
  defs.push(...storm('storm22-5', 'Storm 5', 10, 100));
  defs.push(disc('aurora22-n', 'Northern aurora', c, R, 74, 0, 2.2, 'aurora', body, 0.12, 'light over the north pole'));
  defs.push(disc('aurora22-s', 'Southern aurora', c, R, -74, 0, 2.2, 'aurora', body, 0.12, 'light over the south pole'));
  defs.push(['clouds22', { name: 'Cloud layer', description: 'a noise shell that drifts faster than the ground', type: 'group', dimensions: [], position: c }]);
  defs.push(['cloud22-shell', { name: 'Cloud shell', description: 'clouds from noise (taps pass through)', type: 'sphere', dimensions: [rnd(R + 0.1)], position: c, material: 'clouds_layer', parent: 'clouds22' }]);
  defs.push(['clouds22b', { name: 'Upper cloud layer', description: 'a second, thinner cloud shell turning the other way', type: 'group', dimensions: [], position: c }]);
  defs.push(['cloud22-shell2', { name: 'Upper cloud shell', description: '', type: 'sphere', dimensions: [rnd(R + 0.2)], position: c, material: 'clouds_layer2', parent: 'clouds22b' }]);

  // launches (the rockets lift about 1 in and return to their pads)
  defs.push(...launch('rocket22-1', 'Launch 1', 0, 0, 'pad22-1'));
  defs.push(...launch('rocket22-2', 'Launch 2', 0, 90, 'pad22-2'));
  defs.push(...launch('rocket22-3', 'Launch 3', 0, 180, 'pad22-3'));
  defs.push(...launch('rocket22-4', 'Launch 4', 0, -90, 'pad22-4'));

  return defs;
}

const DESC = 'Earth on its own, increment 22 of 22. The floating parts are brought closer to scale: rockets about 0.85 in tall, satellites on faded orbit lines (about 80 of them: a LEO constellation on four rings, the ISS, Hubble, a navigation ring, geostationary satellites and a polar weather satellite), storms about 2.5 in across on the cloud shell, and clouds just above the ground. The dot map, the Moon and the rest are as in V21. Exaggerated where the real size would vanish.';

function earthSceneV22() {
  const p0 = SS.PLANETS.earth, id = 'planet-earth-v22';
  const defs = earthV22Defs();
  const motions = (uuid) => {
    const list = [
      { id: 'earth-spin', target: 'body-earth', kind: 'spin', axis: 'z', pivot: c, cycles: 32 },
      { id: 'moon-orbit', target: 'arm-moon', kind: 'spin', axis: 'z', pivot: c, cycles: 16 },
      { id: 'cloud-drift', target: 'clouds22', kind: 'spin', axis: 'z', pivot: c, cycles: 40 },
      { id: 'cloud-drift2', target: 'clouds22b', kind: 'spin', axis: 'y', pivot: c, cycles: 30 },
    ];
    for (const g of RINGS) list.push({ id: `${g.key}-turn`, target: g.key, kind: 'spin', axis: g.normal, pivot: c, cycles: g.cycles });
    list.push({ id: 'arm22-iss-turn', target: 'arm22-iss', kind: 'spin', axis: 'y', pivot: c, cycles: 60 });
    list.push({ id: 'arm22-hubble-turn', target: 'arm22-hubble', kind: 'spin', axis: 'x', pivot: c, cycles: 52 });
    list.push({ id: 'arm22-polar-turn', target: 'arm22-polar', kind: 'spin', axis: 'x', pivot: c, cycles: 36 });
    for (const sk of ['storm22-1', 'storm22-2', 'storm22-3', 'storm22-4', 'storm22-5']) list.push({ id: `${sk}-turn`, target: sk, kind: 'spin', axis: 'z', pivot: c, cycles: 32 });
    list.push({ id: 'launch-1', target: 'rocket22-1', kind: 'bob', axis: 'x', amount: 1.0, cycles: 2, phase: 0 });
    list.push({ id: 'launch-2', target: 'rocket22-2', kind: 'bob', axis: 'y', amount: 1.0, cycles: 2, phase: 0.5 });
    list.push({ id: 'launch-3', target: 'rocket22-3', kind: 'bob', axis: 'x', amount: -1.0, cycles: 2, phase: 0.25 });
    list.push({ id: 'launch-4', target: 'rocket22-4', kind: 'bob', axis: 'y', amount: -1.0, cycles: 2, phase: 0.75 });
    return {
      schema: M.MOTION_SCHEMA, model_id: id, name: 'Spin, clouds, satellites, launches, storms',
      description: `Earth spins; the Moon goes round. About 80 satellites go round on their rings (the geostationary ones keep over one spot). Clouds drift on their shells. Launches lift off and return. Storms turn. One ${LOOP_EARTH} s loop; each motion is a whole number of turns, so it never jumps.`,
      units: 'in', up: 'z', loop_s: LOOP_EARTH, autoplay: { plays: 2 },
      motions: list.map((m) => ({ ...m, target: uuid(m.target) })),
    };
  };
  return {
    id, builtin: true, project: 'Earth (planet view)',
    header: {
      model_id: id, name: 'Earth (planet view) V22',
      description: DESC,
      units: 'in', up: 'z', world: PV.WORLD_ID, materials: { ...MATERIALS_V4, ...OCEAN21, ...ORBIT22 },
      view: { fill: 0.75, radius: p0.R },
      links: [{ label: 'Back to the Solar System', target: 'solar-system-v07', transition: 'fade' }],
    },
    defs,
    motion: motions,
  };
}

const EARTH_VIEWS_V22 = [earthSceneV22()];
module.exports = { EARTH_VIEWS_V22, earthV22Defs, RINGS, ringPoint, R };
