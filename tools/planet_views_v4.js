// Planet views V04 to V06 (eight planets) and Earth V11 to V20. Built on tools/planet_views.js.
//
// What is new in these versions:
//   - Surfaces and bands are procedural shaders (schematic §18), not flat colours or stacked slices. Each
//     material is a few numbers in header.materials (colours, noise seed, band frequency; for Earth, the land
//     boxes). Nothing is an image.
//   - Earth's land is shaded from a rough map (latitude and longitude boxes with ragged, noise-blurred edges);
//     its clouds are a noise shell that drifts, not blobs. The old dots and blobs stay in V02 to V10.
//   - Each planet view frames the planet at 75% of the screen (header.view).
//
// Versions are cumulative: each "if (v >= N)" block adds one layer. Older versions are not changed.

const M = require('../js/core/motion.js');
const SS = require('./solar_system.js');
const PV = require('./planet_views.js');
const LAND5 = require('./earth_land_5deg.js');

const { surf, disc, dot, cone, ring, rocket, storm, textures, bodyDefs, cells, inAny, LAND, DESERT, CITY, WORLD_ID, EXTRA, earthEarlierDefs } = PV;
const LOOP_S = 240, LOOP_EARTH = 480;
const rnd = (n) => Math.round(n * 1000) / 1000;

// ---------- procedural materials (the shader kinds are in js/viewer/viewer.js)
const SHADE = {
  shade_mercury: { color: '#a59d92', kind: 'bands', a: '#a59d92', b: '#6d665e', c: '#8a8178', freq: 0, seed: 2 },
  shade_venus: { color: '#f3dca0', kind: 'bands', a: '#f3dca0', b: '#e0b86e', c: '#fff2cf', freq: 9, seed: 4 },
  shade_mars: { color: '#c8643f', kind: 'bands', a: '#c8643f', b: '#7a3524', c: '#e08a5c', freq: 0, seed: 5 },
  shade_jupiter: { color: '#e8c49a', kind: 'bands', a: '#e8c49a', b: '#b87c55', c: '#f2e6d0', freq: 12, seed: 6 },
  shade_saturn: { color: '#ecd8a0', kind: 'bands', a: '#ecd8a0', b: '#d9b97c', c: '#f5e8c4', freq: 10, seed: 7 },
  shade_uranus: { color: '#a9e6f0', kind: 'bands', a: '#a9e6f0', b: '#8fd4e6', c: '#c9f2f8', freq: 6, seed: 8 },
  shade_neptune: { color: '#4f73e0', kind: 'bands', a: '#4f73e0', b: '#3b5fc2', c: '#6f93f0', freq: 8, seed: 9 },
  shade_pluto: { color: '#d6c3a1', kind: 'bands', a: '#d6c3a1', b: '#8c7660', c: '#efe2c8', freq: 0, seed: 10 },
};
// continents and deserts as ellipses on the map: [centre lat, centre lon, radius lat, radius lon] in degrees.
// Rough outlines (about 28% of the sphere is land, as on Earth), not survey data.
const LAND_E = [[45, -100, 25, 32], [72, -42, 10, 14], [15, -90, 5, 10], [-15, -60, 30, 16], [54, 14, 9, 18],
  [3, 20, 26, 22], [52, 95, 20, 45], [25, 70, 10, 12], [-1, 112, 10, 12], [-25, 134, 9, 13], [-82, 0, 8, 180]];
const DESERT_E = [[23, 13, 9, 22], [-25, 134, 6, 9], [24, 47, 6, 8]];
const EARTH_MATS = {
  earth_surface: { color: '#4f8fd6', opacity: 1, kind: 'earth', ocean: '#3f80c8', oceanDeep: '#1f4f8a', land_color: '#5f9e5a',
    desert_color: '#d9b77a', ice: '#f4f8ff', seed: 3, land: LAND_E, desert: DESERT_E },
  clouds_layer: { color: '#ffffff', opacity: 0.35, kind: 'clouds', coverage: 0.5, scale: 2.4, seed: 5, alpha: 0.9 },
  clouds_layer2: { color: '#ffffff', opacity: 0.3, kind: 'clouds', coverage: 0.6, scale: 3.1, seed: 9, alpha: 0.7 },
  aurora: { color: '#7dffb0', opacity: 0.35 },
};
// V21 only (kept out of the shared list, so V01 to V20 files do not change): the sea alone; the land is a dot
// per 5-degree cell (earth_land_5deg.js), not ellipses
const OCEAN21 = { earth_ocean21: { color: '#3f80c8', opacity: 1, kind: 'earth', ocean: '#3f80c8', oceanDeep: '#3f80c8', land_color: '#5f9e5a',
  desert_color: '#d9b77a', ice: '#f4f8ff', seed: 3, land: [], desert: [], no_land: true } };
const MATERIALS_V4 = { ...PV.MATERIALS, ...SHADE, ...EARTH_MATS, stormhaze: { color: '#ffffff', opacity: 0.45 } };

// extra moons and spots, by the version they arrive in
const EXTRA_V5 = {
  jupiter: [{ name: 'Leda', d: 100, r: 0.5, mat: 'himalia', cycles: 1, v: 5 }, { name: 'Ananke', d: 120, r: 0.5, mat: 'himalia', cycles: 1, v: 5 }],
  saturn: [{ name: 'Phoebe', d: 110, r: 1.0, mat: 'himalia', cycles: 1, v: 5 }],
  neptune: [{ name: 'Larissa', d: 36, r: 0.7, mat: 'proteus', cycles: 3, v: 5 }],
  pluto: [{ name: 'Styx', d: 25, r: 0.3, mat: 'nix', cycles: 1, v: 5 }],
};

// more surface detail, cumulative from V04 (v = 4, 5, 6)
function extraTextures(key, v, c, R, body) {
  const d = [];
  const craters = (list, base) => list.forEach(([la, lo, r], i) => d.push(dot(`${base}-${i}`, 'Crater', c, R, la, lo, r, 'crater', body, -0.4)));
  if (key === 'mercury') {
    if (v >= 4) craters([[-30, 110, 0.9], [42, -10, 1.0], [-8, 40, 0.8], [18, -170, 0.9], [-50, -90, 1.1], [30, 80, 0.7], [-20, 150, 0.9], [60, 30, 0.8]], 'mc4');
    if (v >= 5) craters([[-12, -60, 1.1], [48, 140, 0.9], [-42, 10, 0.8], [8, 100, 1.0], [-26, -120, 0.9], [35, -100, 0.7], [-62, 120, 1.0], [14, 60, 0.6], [-4, 20, 0.7], [56, -40, 0.9]], 'mc5');
    if (v >= 6) [[22, 10], [-35, 60], [5, -130]].forEach(([la, lo], i) => d.push(dot(`ray6-${i}`, 'Bright ray', c, R, la, lo, 1.3, 'brightray', body, 0.1)));
  }
  if (key === 'venus') {
    if (v >= 4) [[-15, 20], [25, -60], [-40, 110], [10, 150], [45, 60], [-25, -120]].forEach(([la, lo], i) => d.push(cone(`volc-${i}`, 'Volcano', c, R, la, lo, 1.2, 2.2, 'dark', body, 'a volcano')));
    if (v >= 6) [[60, -30], [-55, 70], [20, -150], [-10, 5], [35, 120], [-30, -40]].forEach(([la, lo], i) => d.push(dot(`vcl6-${i}`, 'Cloud top', c, R, la, lo, 2.2, 'venusb1', body, 0.6)));
  }
  if (key === 'mars') {
    if (v >= 4) [[0, -110], [-2, -102], [3, -95]].forEach(([la, lo], i) => d.push(cone(`tharsis-${i}`, 'Tharsis volcano', c, R, la, lo, 1.6, 2.4, 'olympus', body)));
    if (v >= 5) for (let i = 0; i < 6; i++) d.push(dot(`canyon-${i}`, 'Canyon', c, R, -2 + i * 0.5, -80 + i * 14, 0.9, 'dark', body, -0.3));
    if (v >= 6) [[15, -170], [-30, 40], [40, -60], [-10, 120], [28, 150], [-42, -140], [5, 60], [-20, -10], [35, 20], [-5, -40]].forEach(([la, lo], i) => d.push(dot(`dust6-${i}`, 'Dust storm', c, R, la, lo, 2.4, 'dustv', body, 1.8)));
  }
  if (key === 'saturn' && v >= 4) d.push(ring('ring-div', 'Ring division', c, 1.45 * R, 0.2, 'ringdark', body));
  if (key === 'saturn' && v >= 6) d.push(ring('ring-div2', 'Second division', c, 1.25 * R, -0.2, 'ringdark', body));
  if (key === 'uranus' && v >= 5) [[30, -120], [-35, 150], [0, 30]].forEach(([la, lo], i) => d.push(dot(`ucl-${i}`, 'Bright cloud', c, R, la, lo, 1.2, 'ice', body, 0.3)));
  if (key === 'uranus' && v >= 6) [[15, -60], [-55, 100], [60, 180], [-15, -150]].forEach(([la, lo], i) => d.push(dot(`ucl6-${i}`, 'Bright cloud', c, R, la, lo, 1.0, 'ice', body, 0.3)));
  if (key === 'neptune') {
    if (v >= 5) [[-45, 110], [30, -110], [-10, -10], [55, -70], [5, 90]].forEach(([la, lo], i) => d.push(dot(`ncl5-${i}`, 'White cloud', c, R, la, lo, 1.0, 'ice', body, 0.3)));
    if (v >= 6) [[-60, -150], [20, 170], [45, 40], [-25, 60], [10, -120], [-38, -20]].forEach(([la, lo], i) => d.push(dot(`nd6-${i}`, 'Dark spot', c, R, la, lo, 1.4, 'neptuneb', body, 0.3)));
  }
  if (key === 'pluto') {
    if (v >= 4) [[-45, 30], [-5, -150], [40, -60], [-25, 120], [55, 100], [-60, -110]].forEach(([la, lo], i) => d.push(dot(`pice4-${i}`, 'Ice', c, R, la, lo, 0.8, 'pluto_heart', body, 0.1)));
    if (v >= 5) for (let i = 0; i < 6; i++) d.push(dot(`pmtn5-${i}`, 'Mountain', c, R, -30 + i * 12, -60 + i * 40, 0.4, 'mtn', body, 0.2));
  }
  return d;
}

function planetDefsV4(key, v) {
  const p0 = SS.PLANETS[key];
  const c = [0, 0, 0], body = `body-${key}`;
  const p = { ...p0, mat: 'shade_' + key, bands: undefined };   // the shaded ball replaces the stacked bands
  const defs = bodyDefs(key, p, c, null, 5);                    // ball, rings, atmosphere
  defs.push(...textures(key, 3, c, p0.R, body));                // the V03 spots and discs stay
  defs.push(...extraTextures(key, v, c, p0.R, body));
  const moons = [...(SS.MOONS[key] || []),
    ...((EXTRA[key] || []).filter((m) => m.v <= v)),
    ...((EXTRA_V5[key] || []).filter((m) => m.v <= v))];
  for (const m of moons) {
    const mk = m.name.toLowerCase();
    defs.push([`arm-${mk}`, { name: `${m.name} orbit`, description: 'turns the moon round the planet', type: 'group', dimensions: [], position: c }]);
    defs.push([`moon-${mk}`, { name: m.name, description: `a moon of ${p0.name}`, type: 'sphere', dimensions: [rnd(m.r)], position: [m.d, 0, 0], material: m.mat, parent: `arm-${mk}` }]);
  }
  return { defs, moons, p0 };
}

function planetSceneV4(key, v) {
  const p0 = SS.PLANETS[key];
  const id = `planet-${key}-v0${v}`;
  const { defs, moons } = planetDefsV4(key, v);
  return {
    id, builtin: true, project: `${p0.name} (planet view)`,
    header: {
      model_id: id, name: `${p0.name} (planet view) V0${v}`,
      description: `${p0.name} on its own, increment ${v} of 6: ${p0.desc}. Surfaces and bands are shaded procedurally; sizes are rough. Spins${moons.length ? ', with its moons going round' : ''}. Use the button to go back to the Solar System.`,
      units: 'in', up: 'z', world: WORLD_ID, materials: MATERIALS_V4,
      view: { fill: 0.75, radius: p0.R },
      links: [{ label: 'Back to the Solar System', target: 'solar-system-v07', transition: 'fade' }],
    },
    defs,
    motion: (uuid) => {
      const c = [0, 0, 0];
      const list = [{ id: `${key}-spin`, target: `body-${key}`, kind: 'spin', axis: p0.spinAxis || 'z', pivot: c, cycles: p0.spin }];
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

// ---------- Earth V11 to V20: the shaded surface and cloud shells replace the dots and blobs
const CITY2 = [[30, 40, 128, 146], [8, 30, 70, 88], [-35, -20, 17, 35], [-25, -20, -50, -40]];

// A softer storm for V11 and later: three arms of small, translucent puffs round a dark eye (no big spheres).
function stormSoft(key, label, c, R, lat, lon) {
  const out = [];
  const la = lat / 57.29578, lo = lon / 57.29578;
  const n = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
  const e1 = [-Math.sin(lo), Math.cos(lo), 0];
  const e2 = [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)];
  out.push([key, { name: `${label} group`, description: 'a hurricane seen from above', type: 'group', dimensions: [], position: c, parent: 'body-earth' }]);
  out.push([`${key}-eye`, { name: `${label} eye`, description: 'the calm centre', type: 'sphere', dimensions: [0.9], position: surf(c, R, lat, lon, 0.3).p, material: 'eye', parent: key }]);
  for (let a = 0; a < 3; a++) {
    for (let j = 0; j < 12; j++) {
      const rho = 1.2 + 0.85 * j, th = (a * 120 + j * 22) / 57.29578;
      const x = rho * Math.cos(th), y = rho * Math.sin(th);
      let P = [0, 1, 2].map((k) => R * n[k] + x * e1[k] + y * e2[k]);
      const L = Math.hypot(...P);
      P = P.map((v) => rnd((v / L) * (R + 0.45)));
      out.push([`${key}-arm${a}-${j}`, { name: `${label} cloud ${a + 1}.${j + 1}`, description: '', type: 'sphere', dimensions: [rnd(0.4 + 0.035 * j)], position: P, material: 'stormhaze', parent: key }]);
    }
  }
  return out;
}

function earthV4Defs(v) {
  const base = earthEarlierDefs(10).defs.filter((d) => !/^land-|^cloud-|^ice-[ns]$|^clouds$|^storm-/.test(d[0]));
  // the ball takes the shaded surface (its atmosphere and rim are kept as they are)
  const defs = base.map((d) => (d[0] === 'ball-earth' ? [d[0], { ...d[1], material: v >= 21 ? 'earth_ocean21' : 'earth_surface' }] : d));
  const c = [0, 0, 0], R = SS.PLANETS.earth.R, body = 'body-earth';
  if (v >= 11) {
    defs.push(['clouds', { name: 'Cloud layer', description: 'a noise shell that drifts faster than the ground', type: 'group', dimensions: [], position: c }]);
    defs.push(['cloud-shell', { name: 'Cloud shell', description: 'clouds from noise (taps pass through)', type: 'sphere', dimensions: [rnd(R * 1.035)], position: c, material: 'clouds_layer', parent: 'clouds' }]);
  }
  if (v >= 12) {
    [[30, 85, 4.4], [-20, -68, 3.6], [45, -115, 3.0], [46, 8, 2.0]].forEach(([la, lo, h], g) => {
      for (let i = 0; i < 4; i++) defs.push(cone(`mtn-${g}-${i}`, 'Mountain', c, R, la + (i % 2) * 2.5, lo + Math.floor(i / 2) * 2.5, 1.5, h * (0.7 + 0.1 * i), 'mtn', body, 'a mountain range'));
    });
  }
  if (v >= 7) defs.push(...stormSoft('storm-1', 'Storm', c, R, 20, 150));
  if (v >= 10) defs.push(...stormSoft('storm-2', 'Storm 2', c, R, -30, -120));
  if (v >= 13) {
    defs.push(...stormSoft('storm-3', 'Storm 3', c, R, 45, -30));
    defs.push(disc('aurora-n', 'Northern aurora', c, R, 74, 0, 6, 'aurora', body, 0.3, 'light over the north pole'));
    defs.push(disc('aurora-s', 'Southern aurora', c, R, -74, 0, 6, 'aurora', body, 0.3, 'light over the south pole'));
  }
  if (v >= 14) {
    [[10, 'z', 'sat-1'], [12, 'y', 'sat-2'], [14, 'x', 'sat-3'], [11, 'z', 'sat-4'], [13, 'y', 'sat-5'], [15, 'x', 'sat-6']].forEach(([dd, ax, key], i) => {
      defs.push([key, { name: `Small satellite ${i + 1} group`, description: 'a small satellite on its own low orbit', type: 'group', dimensions: [], position: c }]);
      const pos = ax === 'x' ? [0, R + 6 + dd, 0] : [R + 6 + dd, 0, 0];
      defs.push([`${key}-body`, { name: `Small satellite ${i + 1}`, description: '', type: 'sphere', dimensions: [0.7], position: pos, material: 'iss', parent: key }]);
    });
  }
  if (v >= 15) {
    let i = 0;
    for (const [la, lo] of cells()) {
      if (!inAny(la, lo, CITY2) || !inAny(la, lo, LAND)) continue;
      if (i++ % 2) continue;
      defs.push(dot(`city15-${i}`, 'City lights', c, R, la, lo, 0.5, 'light', body, 0.3));
    }
  }
  if (v >= 16) {
    const mc = [30, 0, 0];   // craters on the Moon (its centre is at 30 in)
    [[15, 30], [-20, 80], [40, -60], [-35, 150], [5, -120], [25, 10], [-10, -30], [50, 100]].forEach(([la, lo], i) => defs.push(dot(`mcr-${i}`, 'Moon crater', mc, 2.7, la, lo, 0.5, 'crater', 'arm-moon', -0.2)));
  }
  if (v >= 17) {
    defs.push(...rocket('rocket-3', 'Launch 3', c, R, 0, 180, 'pad-3', 'x'));
    defs.push(...rocket('rocket-4', 'Launch 4', c, R, 0, -90, 'pad-4', 'y'));
  }
  if (v >= 18) {
    defs.push(...stormSoft('storm-4', 'Storm 4', c, R, -45, 60));
    defs.push(...stormSoft('storm-5', 'Storm 5', c, R, 10, 100));
  }
  if (v >= 19) {
    for (let k = 0; k < 12; k++) defs.push(dot(`ice19-${k}`, 'Sea ice', c, R, 78, k * 30, 1.6, 'ice', body, -0.2));
  }
  if (v >= 21) {
    // the dot map: one dot per land cell of a 5-degree grid (four times the 10-degree grid of V02 to V10), each
    // smaller, sand in the rough desert boxes and white on Antarctica. Real coastline cells, not ellipses.
    let i = 0;
    for (const cell of LAND5.landCells()) {
      const mat = cell.ice ? 'ice' : cell.desert ? 'dsand' : 'land';
      const name = cell.ice ? 'Antarctic ice' : cell.desert ? 'Desert' : 'Land';
      defs.push(dot(`land21-${i++}`, name, c, R, cell.lat, cell.lon, 0.36, mat, body, -0.1));
    }
  }
  if (v >= 20) {
    defs.push(['clouds2', { name: 'Upper cloud layer', description: 'a second, thinner cloud shell turning the other way', type: 'group', dimensions: [], position: c }]);
    defs.push(['cloud-shell2', { name: 'Upper cloud shell', description: '', type: 'sphere', dimensions: [rnd(R * 1.05)], position: c, material: 'clouds_layer2', parent: 'clouds2' }]);
  }
  return defs;
}

const EARTH_V21_DESC = 'Earth on its own, increment 21 of 21. The continents are a dot map: one dot per cell of a 5-degree grid that is land on a real coastline map (Natural Earth 1:50m, sampled), so the coasts follow the real shapes. Dots are smaller and four times denser than V02 to V10. Deserts are rough boxes; sizes are rough, not to scale.';

function earthSceneV4(v) {
  const p0 = SS.PLANETS.earth, id = `planet-earth-v${v}`;
  const k = v >= 17 ? 2 : 1;
  const defs = earthV4Defs(v);
  const haveKeys = new Set(defs.map((d) => d[0]));
  const motions = (uuid) => {
    const c = [0, 0, 0];
    const list = [
      { id: 'earth-spin', target: 'body-earth', kind: 'spin', axis: 'z', pivot: c, cycles: 32 },
      { id: 'moon-orbit', target: 'arm-moon', kind: 'spin', axis: 'z', pivot: c, cycles: 16 },
    ];
    if (v >= 11) list.push({ id: 'cloud-drift', target: 'clouds', kind: 'spin', axis: 'z', pivot: c, cycles: 40 });
    if (v >= 20) list.push({ id: 'cloud-drift2', target: 'clouds2', kind: 'spin', axis: 'y', pivot: c, cycles: 30 });
    list.push({ id: 'iss-orbit', target: 'iss', kind: 'spin', axis: 'z', pivot: c, cycles: 72 });
    list.push({ id: 'launch-1', target: 'rocket-1', kind: 'bob', axis: 'x', amount: 26, cycles: 2, phase: 0 });
    list.push({ id: 'launch-2', target: 'rocket-2', kind: 'bob', axis: 'y', amount: 26, cycles: 2, phase: 0.5 });
    if (v >= 17) {
      list.push({ id: 'launch-3', target: 'rocket-3', kind: 'bob', axis: 'x', amount: -26, cycles: 2, phase: 0.25 });
      list.push({ id: 'launch-4', target: 'rocket-4', kind: 'bob', axis: 'y', amount: -26, cycles: 2, phase: 0.75 });
    }
    for (const sk of ['storm-1', 'storm-2', 'storm-3', 'storm-4', 'storm-5']) {
      if (!haveKeys.has(sk)) continue;
      list.push({ id: `${sk}-turn`, target: sk, kind: 'spin', axis: 'z', pivot: c, cycles: 32 });
    }
    list.push({ id: 'polar-orbit', target: 'polar', kind: 'spin', axis: 'x', pivot: c, cycles: 36 });
    if (v >= 14) for (const [sk, ax, cy] of [['sat-1', 'z', 24], ['sat-2', 'y', 30], ['sat-3', 'x', 36], ['sat-4', 'z', 28], ['sat-5', 'y', 34], ['sat-6', 'x', 40]]) list.push({ id: `${sk}-orbit`, target: sk, kind: 'spin', axis: ax, pivot: c, cycles: cy });
    return {
      schema: M.MOTION_SCHEMA, model_id: id, name: 'Spin, clouds, station, launches, storms',
      description: `Earth spins; the Moon goes round. Clouds drift on their own shells. Launches lift off and return to their pads. Storms turn. One ${LOOP_EARTH} s loop; every motion is a whole number of turns, so it never jumps.`,
      units: 'in', up: 'z', loop_s: LOOP_EARTH, autoplay: { plays: 2 },
      motions: list.map((m) => ({ ...m, target: uuid(m.target) })),
    };
  };
  return {
    id, builtin: true, project: 'Earth (planet view)',
    header: {
      model_id: id, name: `Earth (planet view) V${v}`,
      description: v >= 21 ? EARTH_V21_DESC : `Earth on its own, increment ${v} of 20. Shaded continents, deserts and ice from a rough map; a noise cloud shell that drifts; a station, launches, storms, aurora, a constellation of small satellites, city lights and craters on the Moon. Sizes are rough; not to scale.`,
      units: 'in', up: 'z', world: WORLD_ID, materials: v >= 21 ? { ...MATERIALS_V4, ...OCEAN21 } : MATERIALS_V4,
      view: { fill: 0.75, radius: p0.R },
      links: [{ label: 'Back to the Solar System', target: 'solar-system-v07', transition: 'fade' }],
    },
    defs,
    motion: motions,
  };
}

const PLANET_VIEWS_V4_6 = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']
  .flatMap((k) => [4, 5, 6].map((v) => planetSceneV4(k, v)));
const EARTH_VIEWS_V11_20 = Array.from({ length: 10 }, (_, i) => earthSceneV4(11 + i));
// V21: the dot map of real coastlines (see earthV4Defs); the same moving parts as V20
const EARTH_VIEWS_V21 = [earthSceneV4(21)];

module.exports = { PLANET_VIEWS_V4_6, EARTH_VIEWS_V11_20, EARTH_VIEWS_V21, MATERIALS_V4, OCEAN21, earthV4Defs };
