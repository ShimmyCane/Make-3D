// Grand Ocean Aquarium: a large imagined public aquarium in the style of the kelp tank at the California Science
// Center (Los Angeles). A 100 x 60 ft tank, 28 ft deep, with a 100 ft walk-through tunnel along the floor, a long
// glass viewing gallery, an entry lobby and exit hall, and a deck round the top of the pool.
// Built in five increments, a rough object count each:
//   V01 ~100   blockout: tank, tunnel, lobby, gallery, first sharks and big fish, rocks, kelp (still)
//   V02 ~150+  animated: fish swim loops, tails beat, kelp sways; more fish with fins and eyes
//   V03 ~200   guest spaces: tunnel ribs, benches, window bays, rails, lamps, signs
//   V04 ~500   schools of small fish, rays, turtles, kelp forest, reef, guests walking the tunnel
//   V05 ~1000  full life: more schools, jellyfish, diver, bubbles, coral, urchins, stars, anemones, lights
// Sizes are feet in the code (how a designer reads a plan), stored as inches (x12). Z up, ground z = 0.
// Position = centre of each object's box. Sources and estimates: 04 AI/Make 3D/research/aquarium.md.
//
// One code path builds every version: defsFor(v). Version N adds blocks with "if (v >= N)". Older versions stay
// reproducible: change them by adding blocks, not by deleting. Every random choice is seeded by the object's key,
// so a version never changes what an older version contains.

const M = require('../js/core/motion.js');

const WORLD_ID = 'aquarium-world';
const F = 12;
const LOOP_S = 60;                  // one loop, seconds
const COUNTS = [100, 150, 200, 500, 1000, 1200];
const rnd = (n) => Math.round(n * 1000) / 1000;
const DEG = 180 / Math.PI;

// ---------- seeded random (per key, so adding objects never shuffles old ones)
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rngFor(key) {
  let a = hash(key);
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const MATERIALS = {
  sand: { color: '#f2e4c4', opacity: 1 },
  rock: { color: '#bdb5a8', opacity: 1 },
  rock2: { color: '#d3cbbd', opacity: 1 },
  glass: { color: '#bfe6f2', opacity: 0.2 },
  water: { color: '#8fd3e6', opacity: 0.09 },
  surface: { color: '#a9e2ee', opacity: 0.3 },
  concrete: { color: '#ebe6da', opacity: 1 },
  deck: { color: '#e2b98f', opacity: 1 },
  roof: { color: '#f7c9bd', opacity: 0.3 },
  steel: { color: '#b9c0ca', opacity: 1 },
  acrylic: { color: '#d7eef5', opacity: 0.22 },
  rib: { color: '#c9d6df', opacity: 1 },
  lamp: { color: '#fff1a8', opacity: 1 },
  sign: { color: '#fff8e7', opacity: 1 },
  bench: { color: '#e9b99a', opacity: 1 },
  mint: { color: '#a6e3d7', opacity: 1 },
  beam: { color: '#ffe9a6', opacity: 0.16 },
  wall: { color: '#e4dccb', opacity: 0.5 },
  coral: { color: '#f4a38c', opacity: 1 },
  // animals
  shark: { color: '#aeb9c4', opacity: 1 },
  zebra: { color: '#ecd79c', opacity: 1 },
  spot: { color: '#8a6f4a', opacity: 1 },
  bonnet: { color: '#b9c3a8', opacity: 1 },
  leopard: { color: '#d8cdb2', opacity: 1 },
  blacktip: { color: '#bdb9b1', opacity: 1 },
  bass: { color: '#8c9aa8', opacity: 1 },
  garibaldi: { color: '#ffa05c', opacity: 1 },
  sheephead: { color: '#ec8c92', opacity: 1 },
  moray: { color: '#a8b87c', opacity: 1 },
  yellowtail: { color: '#d9d08a', opacity: 1 },
  barracuda: { color: '#a9b5bf', opacity: 1 },
  ray: { color: '#9a8fae', opacity: 1 },
  eagle: { color: '#86a0b8', opacity: 1 },
  turtle: { color: '#b3aa72', opacity: 1 },
  turtleSkin: { color: '#cfc79a', opacity: 1 },
  anchovy: { color: '#d8e3ec', opacity: 1 },
  sardine: { color: '#b8cbdc', opacity: 1 },
  blacksmith: { color: '#8f9ac2', opacity: 1 },
  tang: { color: '#8fb8f0', opacity: 1 },
  yellowTang: { color: '#ffe27a', opacity: 1 },
  idol: { color: '#f3efd0', opacity: 1 },
  sergeant: { color: '#e5e7a8', opacity: 1 },
  opaleye: { color: '#9bb59a', opacity: 1 },
  clown: { color: '#ff9a5a', opacity: 1 },
  ink: { color: '#2d2a26', opacity: 1 },
  white: { color: '#fffdf6', opacity: 1 },
  jelly: { color: '#f2c7e6', opacity: 0.75 },
  // plants and reef
  kelp: { color: '#9fb86a', opacity: 1 },
  kelp2: { color: '#b5c97c', opacity: 1 },
  stem: { color: '#8aa05a', opacity: 1 },
  grass: { color: '#8fd08a', opacity: 1 },
  fan: { color: '#e88fb0', opacity: 1 },
  coralY: { color: '#ffd36e', opacity: 1 },
  coralP: { color: '#c7a8e8', opacity: 1 },
  urchin: { color: '#7d6fa8', opacity: 1 },
  star: { color: '#ff8f6a', opacity: 1 },
  anemone: { color: '#f6a6c1', opacity: 1 },
  // people
  skin: { color: '#f2c9a5', opacity: 1 },
  shirtA: { color: '#8fc4f0', opacity: 1 },
  shirtB: { color: '#f7a8a0', opacity: 1 },
  shirtC: { color: '#c7b2ea', opacity: 1 },
  suit: { color: '#4a5a73', opacity: 1 },
  tankgas: { color: '#f2c94c', opacity: 1 },
  bubble: { color: '#e8f7fb', opacity: 0.6 },
};

// ---------- species (sizes in feet; estimates unless the research file says otherwise)
const SP = {
  sandtiger: { name: 'Sand tiger shark', L: 9, kind: 'shark', mat: 'shark',
    desc: 'Looks fierce, with teeth that stick out of its mouth, but it is calm around people. It gulps air at the surface so it can float. Adults are 8 to 10 ft.' },
  zebra: { name: 'Zebra shark', L: 6.5, kind: 'shark', mat: 'zebra',
    desc: 'The babies are striped like a zebra; adults are spotted. It rests on the sand and its long tail is about half its length. Usually 5 to 8 ft.' },
  bonnet: { name: 'Bonnethead shark', L: 3.5, kind: 'ham', mat: 'bonnet',
    desc: 'The smallest hammerhead. Its shovel-shaped head helps it find crabs and shrimp. About 30 to 50 inches long.' },
  leopard: { name: 'Leopard shark', L: 4.5, kind: 'shark', mat: 'leopard',
    desc: 'A harmless California shark with dark saddle spots. It cruises bays and shallow water looking for clams and crabs.' },
  blacktip: { name: 'Blacktip reef shark', L: 5, kind: 'shark', mat: 'blacktip',
    desc: 'Black tips on its fins. It patrols shallow reefs and is shy of people.' },
  seabass: { name: 'Giant sea bass', L: 6, kind: 'fish', mat: 'bass', fat: 1.15,
    desc: 'California\'s biggest bony reef fish. It can grow past 7 ft and 500 lb, and it can live for decades. Now protected.' },
  yellowtail: { name: 'Yellowtail', L: 3.2, kind: 'fish', mat: 'yellowtail', fat: 0.8,
    desc: 'A fast open-water fish with a yellow tail and a stripe down its side. It hunts in groups.' },
  barracuda: { name: 'Pacific barracuda', L: 3.5, kind: 'fish', mat: 'barracuda', fat: 0.6,
    desc: 'A long silver hunter with sharp teeth. It hovers still, then darts at its food.' },
  sheephead: { name: 'California sheephead', L: 2, kind: 'fish', mat: 'sheephead', fat: 1.2,
    desc: 'Males are black and red, females are pink. Strong teeth let it crack open sea urchins and crabs.' },
  clown: { name: 'Ocellaris clownfish', L: 0.4, kind: 'fish', mat: 'clown', fat: 1.2, desc: 'Orange with white stripes. It lives safely among the stinging tentacles of a sea anemone and the anemone is kept clean in return.' },
  miniray: { name: 'Small bat ray', L: 1.6, kind: 'ray', mat: 'ray', desc: 'A young bat ray in the touch pool. Touch it gently with two fingers on its back, never its tail. Its skin feels like wet velvet.' },
  garibaldi: { name: 'Garibaldi', L: 1, kind: 'fish', mat: 'garibaldi', fat: 1.2,
    desc: 'California\'s official state marine fish. Bright orange and bold; it guards its little patch of reef.' },
  batray: { name: 'Bat ray', L: 5, kind: 'ray', mat: 'ray',
    desc: 'It flaps its wing-like fins to glide. It has a barb on its tail but is gentle and curious.' },
  eagleray: { name: 'Spotted eagle ray', L: 5.5, kind: 'ray', mat: 'eagle',
    desc: 'Pale spots on a dark back, and a long whip tail. It soars along the glass like a bird.' },
  turtle: { name: 'Green sea turtle', L: 3.3, kind: 'turtle', mat: 'turtle',
    desc: 'It eats seagrass, and its fat is green, which is where the name comes from. It can hold its breath for hours when resting.' },
  moray: { name: 'California moray eel', L: 4, kind: 'eel', mat: 'moray',
    desc: 'It hides in a rock crack by day and peeks out. Opening and closing its mouth is how it breathes, not a threat.' },
  // schools
  anchovy: { name: 'Northern anchovy', L: 0.45, kind: 'tiny', mat: 'anchovy', desc: 'A tiny silver fish that swims in huge tight schools. Food for nearly everything bigger.' },
  sardine: { name: 'Pacific sardine', L: 0.6, kind: 'tiny', mat: 'sardine', desc: 'A silver, oily fish that schools by the thousand. It filters tiny plants from the water.' },
  blacksmith: { name: 'Blacksmith', L: 0.5, kind: 'tiny', mat: 'blacksmith', desc: 'A small bluish-purple California reef fish that hovers in loose groups above the kelp.' },
  bluetang: { name: 'Blue tang', L: 0.6, kind: 'tiny', mat: 'tang', desc: 'A blue reef fish with a sharp spine at the tail root. It grazes on algae.' },
  yellowtang: { name: 'Yellow tang', L: 0.55, kind: 'tiny', mat: 'yellowTang', desc: 'A bright yellow reef fish that grazes algae off the rocks all day.' },
  idol: { name: 'Moorish idol', L: 0.55, kind: 'tiny', mat: 'idol', desc: 'Tall black, white and yellow stripes with a long streamer on its back fin.' },
  sergeant: { name: 'Sergeant major', L: 0.45, kind: 'tiny', mat: 'sergeant', desc: 'Five black stripes like a sergeant\'s badge. The parents guard their eggs fiercely.' },
  opaleye: { name: 'Opaleye', L: 0.8, kind: 'tiny', mat: 'opaleye', desc: 'A green fish with bright blue eyes that grazes the kelp in schools.' },
};

// ---------- loop paths for swimmers (feet), closed and organic
function loopPts(key, cx, cy, rx, ry, z0, za, dir = 1) {
  const r = rngFor(key + '/loop');
  const th0 = r() * Math.PI * 2, ph = r() * Math.PI * 2, e = 0.09, n = 12;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const th = th0 + dir * (Math.PI * 2 * i) / n;
    const k = 1 + e * Math.sin(3 * th + ph);
    pts.push([rnd(cx + rx * k * Math.cos(th)), rnd(cy + ry * k * Math.sin(th)), rnd(z0 + za * Math.sin(2 * th + ph))]);
  }
  return pts;
}

// swimming zones: the tunnel fills y -5.5..5.5, z 0..11.5, so low swimmers stay to the sides
// v6: from V06 the back wall has bubble domes, so low and wall swimmers keep a little further in
function zoneLoop(key, zone, L, v6 = false) {
  const r = rngFor(key + '/zone');
  const u = (a, b) => a + (b - a) * r();
  switch (zone) {
    case 'high': return loopPts(key, u(-5, 5), u(-5, 5), u(26, 34), u(13, 17), 19, 3.5, r() < 0.5 ? 1 : -1);
    case 'mid': return loopPts(key, u(-6, 6), u(-4, 4), u(24, 33), u(11, 16), 15.5, 1.8, r() < 0.5 ? 1 : -1);
    case 'wall': return loopPts(key, u(-4, 4), v6 ? -17 : -20, u(26, 34), 3.5, u(12, 20), 3, r() < 0.5 ? 1 : -1);
    case 'low': { const s = r() < 0.5 ? 1 : -1; return loopPts(key, u(-4, 4), s * (v6 ? 16.5 : 18.5), u(26, 34), u(5, 6.5) * (v6 ? 0.8 : 1), 5, 1.2, s); }
    default: throw new Error('zone ' + zone);
  }
}

function defsFor(v) {
  const defs = [];
  const motions = [];
  const add = (key, def) => defs.push([key, def]);
  const inch = (arr) => arr.map((x) => rnd(x * F));

  const box = (key, name, description, size, at, o = {}) =>
    add(key, { name, description, type: 'box', dimensions: inch(size), position: inch(at), ...o });
  const cyl = (key, name, description, r, h, at, o = {}) =>
    add(key, { name, description, type: 'cylinder', dimensions: inch([r, h]), position: inch(at), ...o });
  const sph = (key, name, description, r, at, o = {}) =>
    add(key, { name, description, type: 'sphere', dimensions: inch([r]), position: inch(at), ...o });
  const cone = (key, name, description, r, h, at, o = {}) =>
    add(key, { name, description, type: 'cone', dimensions: inch([r, h]), position: inch(at), ...o });
  const group = (key, name, description, at = [0, 0, 0], o = {}) =>
    add(key, { name, description, type: 'group', dimensions: [], position: inch(at), ...o });
  const thin = (x) => Math.max(x, 0.03);        // keep every size above the 0.25 in rule
  const motion = (m) => motions.push(m);
  const inchPts = (pts) => pts.map((p) => p.map((x) => rnd(x * F)));

  // =====================================================================================================
  // V01 blockout (~100): the tank, the tunnel, the lobby, the gallery, first sharks and big fish, rocks, kelp
  // =====================================================================================================
  group('tank', 'Main tank', 'the big pool: 100 x 60 ft, 28 ft of water. Sand floor, glass walls, a tunnel through the middle');
  box('sand', 'Sand floor', 'the sandy bottom of the tank, 1 ft deep', [100, 60, 1], [0, 0, 0.5], { parent: 'tank', material: 'sand' });
  box('water', 'Water', 'the water in the tank, about 28 ft deep (see-through)', [100, 60, 27], [0, 0, 14.5], { parent: 'tank', material: 'water' });
  box('surface', 'Water surface', 'the top of the pool', [100, 60, 0.2], [0, 0, 28], { parent: 'tank', material: 'surface' });
  [['front', 0, -30, 100, 0.6], ['back', 0, 30, 100, 0.6], ['west', -50, 0, 0.6, 60], ['east', 50, 0, 0.6, 60]].forEach(([n, x, y, w, d]) =>
    box(`glass-${n}`, `Tank glass: ${n}`, 'thick acrylic wall of the tank', [w, d, 27], [x, y, 14.5], { parent: 'tank', material: 'glass' }));
  [['front', 0, -31, 102, 2], ['back', 0, 31, 102, 2], ['west', -51, 0, 2, 62], ['east', 51, 0, 2, 62]].forEach(([n, x, y, w, d]) =>
    box(`rim-${n}`, `Pool rim: ${n}`, 'concrete edge round the top of the pool', [w, d, 1.5], [x, y, 28.25], { parent: 'tank', material: 'concrete' }));

  group('tunnel', 'Walk-through tunnel', 'a 100 ft clear tunnel along the tank floor; guests walk under the fish. Acrylic is about 10 ft across');
  cyl('tunnel-tube', 'Acrylic tunnel tube', 'thick clear acrylic, round, 10 ft across, 112 ft long', 5.2, 112, [0, 0, 6], { parent: 'tunnel', material: 'acrylic', rotation_y: 90 });
  box('tunnel-floor', 'Tunnel walkway', 'the floor guests walk on', [112, 6, 0.4], [0, 0, 1.2], { parent: 'tunnel', material: 'concrete' });
  [-1, 1].forEach((s, i) => box(`portal-${i + 1}`, i ? 'Tunnel exit portal' : 'Tunnel entrance portal', 'steel frame where the tunnel leaves the tank', [3, 12, 12], [s * 56, 0, 6.5], { parent: 'tunnel', material: 'steel' }));

  group('lobby', 'Entry lobby', 'where guests enter, at the west end');
  box('lobby-floor', 'Lobby floor', 'polished concrete', [24, 30, 0.5], [-67, 0, 0.25], { parent: 'lobby', material: 'concrete' });
  [['n', -67, 15, 24, 0.6], ['s', -67, -15, 24, 0.6], ['w', -79, 0, 0.6, 30]].forEach(([n, x, y, w, d]) =>
    box(`lobby-wall-${n}`, `Lobby wall ${n.toUpperCase()}`, '', [w, d, 14], [x, y, 7.25], { parent: 'lobby', material: 'wall' }));
  box('lobby-roof', 'Lobby roof', 'see-through so you can look in', [25, 31, 0.6], [-67, 0, 14.5], { parent: 'lobby', material: 'roof' });
  box('lobby-desk', 'Ticket desk', 'guests check in here', [10, 3, 3], [-70, 8, 1.75], { parent: 'lobby', material: 'bench' });
  box('lobby-door', 'Entrance doors', 'the way in from the street', [0.6, 8, 8], [-79, 0, 4.25], { parent: 'lobby', material: 'mint' });

  group('exit', 'Exit hall', 'the east end of the tunnel; gift shop and exit');
  box('exit-floor', 'Exit hall floor', '', [22, 30, 0.5], [67, 0, 0.25], { parent: 'exit', material: 'concrete' });
  [['n', 67, 15, 22, 0.6], ['s', 67, -15, 22, 0.6], ['e', 78, 0, 0.6, 30]].forEach(([n, x, y, w, d]) =>
    box(`exit-wall-${n}`, `Exit wall ${n.toUpperCase()}`, '', [w, d, 14], [x, y, 7.25], { parent: 'exit', material: 'wall' }));
  box('exit-roof', 'Exit hall roof', '', [23, 31, 0.6], [67, 0, 14.5], { parent: 'exit', material: 'roof' });
  box('exit-shop', 'Gift shop counter', 'plush sharks and postcards', [3, 12, 3.5], [72, 0, 2], { parent: 'exit', material: 'bench' });

  group('gallery', 'Viewing gallery', 'a 100 ft glass wall along the front of the tank, with benches. The main place to sit and watch');
  box('gallery-floor', 'Gallery floor', 'dark floor so the glass glows', [100, 17, 0.5], [0, -39.5, 0.25], { parent: 'gallery', material: 'concrete' });
  box('gallery-back', 'Gallery back wall', '', [100, 0.6, 14], [0, -48, 7.25], { parent: 'gallery', material: 'wall' });
  [-50, 50].forEach((x, i) => box(`gallery-end-${i + 1}`, `Gallery end wall ${i + 1}`, '', [0.6, 17, 14], [x, -39.5, 7.25], { parent: 'gallery', material: 'wall' }));
  box('gallery-roof', 'Gallery roof', 'also the deck beside the pool', [101, 18, 0.6], [0, -39.5, 14.5], { parent: 'gallery', material: 'roof' });

  group('deck', 'Pool deck', 'walkway round the top of the pool where guests look down at the water');
  box('deck-back', 'Back deck', '', [102, 6, 0.6], [0, 35, 27.8], { parent: 'deck', material: 'deck' });
  [-1, 1].forEach((s, i) => box(`deck-side-${i + 1}`, `Side deck ${i + 1}`, '', [6, 62, 0.6], [s * 54, 0, 27.8], { parent: 'deck', material: 'deck' }));

  group('rocks', 'Rockwork', 'rock piles on the sand where small fish hide');
  [[-38, 20, 3.2], [10, 22, 3.6], [42, -22, 3.2], [-40, -20, 3.4], [-6, -20, 2.4], [24, -24, 2.8]].forEach(([x, y, r], i) =>
    sph(`rock-${i + 1}`, `Rock pile ${i + 1}`, 'rock pile with crevices where small fish hide', r, [x, y, r], { parent: 'rocks', material: i % 2 ? 'rock2' : 'rock' }));

  // ---- fish builder -------------------------------------------------------------------------------------
  // A fish faces heading h (degrees) with its centre at `at` (feet). Parts are placed from its local frame:
  // x forward, y left, z up. Detail d: 1 body and tail, 2 adds fins, 3 adds eyes.
  function fish(key, spId, at, h, d, o = {}) {
    const s = SP[spId], L = o.L || s.L, hr = (h * Math.PI) / 180, c = Math.cos(hr), sn = Math.sin(hr);
    const P = (lx, ly, lz) => [rnd(at[0] + lx * c - ly * sn), rnd(at[1] + lx * sn + ly * c), rnd(at[2] + lz)];
    const nm = o.name || s.name, parent = o.parent || key;
    const tailKey = `${key}-tail`;
    const part = (suffix, label, type, dims, loc, mat, rot = {}) => {
      const pos = P(...loc);
      const def = { name: `${nm} ${label}`, description: label === 'body' || !o.noGroup ? (o.desc || s.desc) : `${label} of the ${nm.toLowerCase()}`,
        type, dimensions: inch(dims), position: inch(pos), parent, material: mat, rotation_z: rnd(h + (rot.z || 0)) };
      if (rot.y) def.rotation_y = rot.y;
      add(`${key}-${suffix}`, def);
    };
    if (!o.noGroup) group(key, `${nm}${o.tag ? ' ' + o.tag : ''}`, s.desc, at);
    const fat = s.fat || 1;
    let tailRoot;
    if (s.kind === 'fish' || s.kind === 'tiny') {
      part('body', 'body', 'box', [0.6 * L, thin(0.13 * L * fat), thin(0.3 * L * fat)], [0.05 * L, 0, 0], s.mat);
      tailRoot = -0.25 * L;
      part('tail', 'tail', 'box', [0.2 * L, thin(0.04 * L), thin(0.3 * L)], [-0.36 * L, 0, 0], s.accent || s.mat);
      if (d >= 2 && s.kind === 'fish') part('fin', 'back fin', 'box', [0.25 * L, thin(0.03 * L), thin(0.12 * L)], [0.05 * L, 0, 0.2 * L * fat], s.mat);
      if (d >= 3 && s.kind === 'fish') [1, -1].forEach((e, i) => part(`eye${i + 1}`, 'eye', 'sphere', [thin(0.035 * L)], [0.28 * L, e * 0.065 * L * fat, 0.05 * L], 'ink'));
    } else if (s.kind === 'shark' || s.kind === 'ham') {
      part('body', 'body', 'cylinder', [0.07 * L, 0.75 * L], [-0.05 * L, 0, 0], s.mat, { y: 90 });
      tailRoot = -0.42 * L;
      part('tail', 'tail', 'box', [0.12 * L, thin(0.03 * L), 0.25 * L], [-0.49 * L, 0, 0.04 * L], s.mat);
      if (s.kind === 'shark') part('snout', 'snout', 'cone', [0.07 * L, 0.2 * L], [0.425 * L, 0, 0], s.mat, { y: 90 });
      else part('head', 'hammer head', 'box', [0.1 * L, 0.26 * L, thin(0.03 * L)], [0.36 * L, 0, 0], s.mat);
      if (d >= 2) part('dorsal', 'dorsal fin', 'cone', [0.06 * L, 0.14 * L], [0.0, 0, 0.14 * L], s.mat);
      if (d >= 3) {
        [1, -1].forEach((e, i) => part(`pec${i + 1}`, 'side fin', 'box', [0.12 * L, 0.15 * L, thin(0.02 * L)], [0.12 * L, e * 0.12 * L, -0.04 * L], s.mat, { z: -e * 20 }));
        [1, -1].forEach((e, i) => part(`eye${i + 1}`, 'eye', 'sphere', [thin(0.015 * L)], [0.33 * L, e * 0.05 * L, 0.05 * L], 'ink'));
      }
    } else if (s.kind === 'ray') {
      part('body', 'wings', 'box', [0.55 * L, 0.55 * L, thin(0.04 * L)], [0, 0, 0], s.mat, { z: 45 });
      tailRoot = -0.28 * L;
      part('tail', 'tail', 'cylinder', [thin(0.012 * L), 0.7 * L], [-0.62 * L, 0, 0], s.mat, { y: 90 });
      part('hump', 'head', 'sphere', [0.07 * L], [0.12 * L, 0, 0.03 * L], s.mat);
      if (d >= 3) [1, -1].forEach((e, i) => part(`eye${i + 1}`, 'eye', 'sphere', [thin(0.018 * L)], [0.17 * L, e * 0.05 * L, 0.06 * L], 'ink'));
    } else if (s.kind === 'turtle') {
      part('body', 'shell', 'box', [0.5 * L, 0.42 * L, 0.14 * L], [0, 0, 0], s.mat);
      tailRoot = -0.2 * L;
      part('head', 'head', 'sphere', [0.07 * L], [0.34 * L, 0, 0.02 * L], 'turtleSkin');
      [[0.12, 1], [0.12, -1], [-0.14, 1], [-0.14, -1]].forEach(([fx, e], i) =>
        part(`flipper${i + 1}`, 'flipper', 'box', [0.2 * L, 0.07 * L, thin(0.02 * L)], [fx * L, e * 0.28 * L, -0.03 * L], 'turtleSkin', { z: -e * (fx > 0 ? 35 : -35) }));
      part('tail', 'tail', 'box', [0.1 * L, thin(0.03 * L), thin(0.03 * L)], [-0.28 * L, 0, 0], 'turtleSkin');
      if (d >= 3) [1, -1].forEach((e, i) => part(`eye${i + 1}`, 'eye', 'sphere', [thin(0.015 * L)], [0.4 * L, e * 0.04 * L, 0.05 * L], 'ink'));
    } else if (s.kind === 'eel') {
      part('body', 'body', 'cylinder', [0.04 * L, 0.7 * L], [0, 0, 0], s.mat, { y: 90 });
      tailRoot = -0.2 * L;
      part('tail', 'tail', 'cylinder', [0.025 * L, 0.3 * L], [-0.45 * L, 0, 0], s.mat, { y: 90 });
      part('head', 'head', 'sphere', [0.06 * L], [0.37 * L, 0, 0], s.mat);
      if (d >= 3) [1, -1].forEach((e, i) => part(`eye${i + 1}`, 'eye', 'sphere', [thin(0.012 * L)], [0.4 * L, e * 0.04 * L, 0.02 * L], 'ink'));
    }
    return { P, tailRoot: tailRoot === undefined ? null : P(tailRoot, 0, 0), L, s };
  }

  // A hero fish (its own group, its own swim loop, a beating tail). Speed from its length, whole cycles per loop.
  function hero(key, spId, zone, minDetail = 1, o = {}) {
    const s = SP[spId], r = rngFor(key + '/hero');
    const pts = o.pts || zoneLoop(key, zone, s.L, v >= 6);
    const { heading } = M.pathAt(inchPts(pts), 0);
    const h = rnd(heading * DEG);
    const d = v >= 4 ? 3 : Math.min(v, 2);   // detail grows with the version: eyes and side fins arrive in V04
    const at = pts[0];
    const f = fish(key, spId, at, h, Math.min(d, 3), o);
    if (v >= 2) {
      const speed = o.speed || Math.min(4, Math.max(1.5, 0.4 * s.L));  // feet per second
      const cycles = Math.max(1, Math.round((speed * LOOP_S) / M.pathLength(pts)));
      motion({ id: `${key}-swim`, target: key, kind: 'path', points: inchPts(pts), face: 'tangent', rest_heading_deg: h,
        pivot: inch(at), cycles, phase: 0 });
      if (f.tailRoot && s.kind !== 'ray' && s.kind !== 'turtle') {
        motion({ id: `${key}-tail`, target: `${key}-tail`, kind: 'swing', axis: 'z', pivot: inch(f.tailRoot),
          from: -16, to: 16, cycles: Math.round(10 + 20 * r()) * 2, phase: r() < 0.5 ? 0 : 0.5 });
      }
    }
    return f;
  }

  // ---- V01 animals: three sand tigers, two zebra sharks, a leopard shark, two giant sea bass, a turtle, three small hero fish
  const heroList1 = [
    ['sandtiger-1', 'sandtiger', 'high'], ['sandtiger-2', 'sandtiger', 'mid'], ['sandtiger-3', 'sandtiger', 'high'],
    ['zebra-1', 'zebra', 'low'], ['seabass-1', 'seabass', 'mid'], ['seabass-2', 'seabass', 'wall'],
    ['turtle-1', 'turtle', 'wall'], ['garibaldi-1', 'garibaldi', 'wall'],
  ];
  heroList1.forEach(([k, id, z]) => hero(k, id, z, 1, { tag: k.split('-')[1] }));

  // ---- V01 plants: still kelp (a stem and three blades per strand)
  function kelp(key, x, y, H, tilt = 0) {
    const r = rngFor(key + '/kelp');
    group(key, 'Giant kelp', 'a brown-green seaweed that can grow up to 2 ft a day and forms underwater forests', [x, y, 1]);
    cyl(`${key}-stem`, 'Kelp stem', 'the long stem (stipe)', 0.12, H, [x, y, 1 + H / 2], { parent: key, material: 'stem' });
    for (let i = 0; i < 3; i++) {
      const bz = 1 + H * (0.35 + 0.25 * i);
      box(`${key}-blade${i + 1}`, 'Kelp blade', 'a leaf-like blade', [0.15, thin(0.7), 1.4], [x + (i % 2 ? 0.4 : -0.4), y, bz], { parent: key, material: i % 2 ? 'kelp' : 'kelp2', rotation_z: rnd(r() * 180) });
    }
    if (v >= 2) {
      const rr = rngFor(key + '/sway');
      motion({ id: `${key}-sway-x`, target: key, kind: 'swing', axis: 'x', pivot: inch([x, y, 1]), from: -3, to: 3, cycles: 2 + Math.floor(rr() * 3), phase: rr() < 0.5 ? 0 : 0.5 });
      motion({ id: `${key}-sway-y`, target: key, kind: 'swing', axis: 'y', pivot: inch([x, y, 1]), from: -3, to: 3, cycles: 2 + Math.floor(rr() * 3), phase: rr() < 0.5 ? 0 : 0.5 });
    }
  }
  [[-44, 22, 19], [-14, 25, 17], [16, 25, 20], [30, 22, 18]].forEach(([x, y, H], i) => kelp(`kelp-${i + 1}`, x, y, H));

  // =====================================================================================================
  // V02 animated (~150+): fish with fins and eyes, more sharks and big fish, more kelp
  // =====================================================================================================
  if (v >= 2) {
    [['blacktip-1', 'blacktip', 'mid'], ['bonnet-1', 'bonnet', 'mid'], ['zebra-2', 'zebra', 'low'],
      ['yellowtail-1', 'yellowtail', 'high'], ['yellowtail-2', 'yellowtail', 'high'], ['barracuda-1', 'barracuda', 'mid'],
      ['batray-1', 'batray', 'low'], ['garibaldi-2', 'garibaldi', 'low']]
      .forEach(([k, id, z]) => hero(k, id, z, 1, { tag: k.split('-')[1] }));
    [[-48, 12, 21], [24, 28, 23], [46, 8, 19]].forEach(([x, y, H], i) => kelp(`kelp-${i + 7}`, x, y, H));
  }

  // =====================================================================================================
  // V03 guest spaces (~200): tunnel ribs, benches, window bays, rails, lamps, signs
  // =====================================================================================================
  if (v >= 3) {
    // tunnel ribs: 9 rings of 5 steel arcs round the acrylic, every 12 ft
    group('ribs', 'Tunnel ribs', 'steel ribs that hold the acrylic sections together');
    for (let i = 0; i < 6; i++) {
      const x = -48 + i * 19.2;
      for (let j = 0; j < 3; j++) {
        const a = (-60 + j * 60) * Math.PI / 180, R = 5.35;
        box(`rib-${i + 1}-${j + 1}`, `Tunnel rib ${i + 1}.${j + 1}`, 'steel rib segment round the tunnel', [0.7, thin(5.2), 0.4],
          [x, R * Math.sin(a), 6 + R * Math.cos(a)], { parent: 'ribs', material: 'rib', rotation_x: rnd(-a * DEG) });
      }
    }
    // gallery: benches, rails, window piers, lamps and signs
    group('gallery-furniture', 'Gallery seating and fittings', 'where guests sit to watch the fish');
    for (let i = 0; i < 4; i++) {
      const x = -37.5 + i * 25;
      box(`bench-${i + 1}`, `Gallery bench ${i + 1}`, 'long bench facing the glass', [14, 2, 1.6], [x, -36, 0.8 + 0.5], { parent: 'gallery-furniture', material: 'bench' });
      box(`bench-back-${i + 1}`, `Bench back ${i + 1}`, '', [14, 0.4, 1.4], [x, -37, 2.3], { parent: 'gallery-furniture', material: 'bench' });
    }
    for (let i = 0; i < 5; i++) {
      const x = -50 + i * 25;
      box(`pier-${i + 1}`, `Window pier ${i + 1}`, 'concrete post between window panels', [1, 1.5, 14], [x, -30.5, 7.25], { parent: 'gallery-furniture', material: 'concrete' });
    }
    for (let i = 0; i < 5; i++) {
      const x = -40 + i * 20;
      cone(`lamp-${i + 1}`, `Gallery lamp ${i + 1}`, 'a warm spotlight that lights the glass', 0.8, 1.2, [x, -34, 12.8], { parent: 'gallery-furniture', material: 'lamp' });
    }
    [-30, 0, 30].forEach((x, i) => box(`sign-${i + 1}`, `Tank sign ${i + 1}`, 'a sign showing the animals on this side of the tank', [6, 0.3, 3], [x, -47.4, 7], { parent: 'gallery-furniture', material: 'sign' }));
    // railings along the deck above the pool
    group('rails', 'Pool railings', 'safety rails round the deck');
    for (let i = 0; i < 6; i++) {
      const x = -45 + i * 18;
      cyl(`rail-front-${i + 1}`, `Rail post ${i + 1}`, 'rail post at the pool edge', 0.12, 3.5, [x, 32.5, 29.7], { parent: 'rails', material: 'steel' });
    }
    box('rail-back', 'Back handrail', 'handrail along the back of the deck', [100, 0.3, 0.3], [0, 32.5, 31], { parent: 'rails', material: 'steel' });
    // lobby and exit hall details
    group('lobby-furniture', 'Lobby details', '');
    [-70, -62].forEach((x, i) => box(`lobby-bench-${i + 1}`, `Lobby bench ${i + 1}`, '', [4, 2, 1.4], [x, -9, 0.7 + 0.3], { parent: 'lobby-furniture', material: 'bench' }));
    box('lobby-sign', 'Welcome sign', 'welcome to the Grand Ocean Aquarium', [10, 0.3, 3], [-70, 14.5, 9], { parent: 'lobby-furniture', material: 'sign' });
    box('exit-sign-1', 'Exit sign', '', [4, 0.3, 1.5], [60, 14.5, 10], { parent: 'lobby-furniture', material: 'mint' });
    [-3, 3].forEach((s, i) => box(`tunnel-lamp-${i + 1}`, `Tunnel light ${i + 1}`, '', [100, 0.4, 0.3], [0, s, 11.3], { parent: 'ribs', material: 'lamp' }));
  }


  // =====================================================================================================
  // V04 life (~500): schools of small fish, rays, a kelp forest, the reef, guests walking the tunnel
  // =====================================================================================================
  // A school: one group that swims a loop, with small fish (body and tail) as its children. Every fish is
  // a named, tappable object; the group carries them all.
  function school(key, spId, n, zone, spread, o = {}) {
    const s = SP[spId], r = rngFor(key + '/school');
    const pts = o.pts || zoneLoop(key, zone, s.L, v >= 6);
    const { heading } = M.pathAt(inchPts(pts), 0);
    const h = rnd(heading * DEG), at = pts[0];
    group(key, o.title || `School of ${s.name.toLowerCase()}s`, s.desc, at);
    for (let i = 0; i < n; i++) {
      const p = [at[0] + (r() - 0.5) * spread[0], at[1] + (r() - 0.5) * spread[1], at[2] + (r() - 0.5) * spread[2]];
      fish(`${key}-${i + 1}`, spId, p, rnd(h + (r() - 0.5) * 24), 1, { noGroup: true, parent: key, name: s.name + ' ' + (i + 1) });
    }
    const speed = o.speed || 2, cycles = Math.max(1, Math.round((speed * LOOP_S) / M.pathLength(pts)));
    motion({ id: `${key}-swim`, target: key, kind: 'path', points: inchPts(pts), face: 'tangent', rest_heading_deg: h, pivot: inch(at), cycles, phase: 0 });
  }

  if (v >= 4) {
    // the kelp forest along the back of the tank
    for (let i = 0; i < 8; i++) {
      const r = rngFor(`kelp-f${i}`);
      kelp(`kelp-${i + 10}`, -46 + i * 12 + r() * 3, 18 + r() * 9, 14 + r() * 12);
    }
    // schools: anchovies in the open water, blacksmith over the kelp, opaleye near the rocks
    school('anchovy-school', 'anchovy', 22, 'high', [4, 2.5, 2.5], { speed: 3 });
    school('blacksmith-school', 'blacksmith', 14, 'mid', [3.5, 2.5, 2], { speed: 1.6 });
    school('opaleye-school', 'opaleye', 10, 'low', [3, 2, 2], { speed: 1.4 });
    // more big animals
    [['sandtiger-4', 'sandtiger', 'mid'], ['leopard-1', 'leopard', 'low'], ['bonnet-2', 'bonnet', 'low'], ['bonnet-3', 'bonnet', 'mid'],
      ['batray-2', 'batray', 'low'], ['eagleray-1', 'eagleray', 'high'], ['turtle-2', 'turtle', 'high'],
      ['sheephead-1', 'sheephead', 'low'], ['sheephead-2', 'sheephead', 'low'], ['seabass-3', 'seabass', 'high'],
      ['barracuda-2', 'barracuda', 'high'], ['blacktip-2', 'blacktip', 'high']]
      .forEach(([k, id, z]) => hero(k, id, z, 1, { tag: k.split('-')[1] }));
    // moray in a rock crack: head sticks out and weaves
    hero('moray-1', 'moray', 'low', 1, { pts: [[-38, 14.5, 3], [-37.2, 14.2, 3.1], [-37, 15, 3.2]], tag: '1' });
    // reef: coral heads and fans on the rock piles
    group('reef', 'Reef', 'coral and sea fans growing on the rocks');
    for (let i = 0; i < 12; i++) {
      const r = rngFor(`coral${i}`), m = ['coralY', 'coralP', 'coral', 'fan'][i % 4];
      const x = -40 + i * 7.5 + r() * 2, y = (i % 2 ? 1 : -1) * (12 + r() * 14);
      sph(`coral-${i + 1}`, i % 4 === 3 ? `Sea fan ${i + 1}` : `Coral head ${i + 1}`, i % 4 === 3 ? 'a soft sea fan that waves in the current' : 'a hard coral colony built by thousands of tiny animals',
        0.8 + r() * 0.8, [x, y, 1.5 + r()], { parent: 'reef', material: m });
    }
    // guests: gallery watchers (still) and tunnel walkers (animated)
    group('guests', 'Guests', 'visitors enjoying the aquarium');
    function person(key, x, y, z, mat, parent, o = {}) {
      const hh = o.h || 0;
      box(`${key}-body`, 'Guest', 'a visitor, 5 ft tall (estimate)', [1.2, 0.8, 3], [x, y, z + 1.5], { parent, material: mat, rotation_z: hh });
      sph(`${key}-head`, 'Guest head', '', 0.45, [x, y, z + 3.5], { parent, material: 'skin' });
    }
    [[-30, -34, 'shirtA'], [-28.5, -34, 'shirtB'], [-4, -33.5, 'shirtC'], [14, -34, 'shirtA'], [28, -33.5, 'shirtB'], [29.5, -33.5, 'shirtA']]
      .forEach(([x, y, m], i) => person(`gallery-guest-${i + 1}`, x, y, 0.5, m, 'guests'));
    // two guests walk the tunnel on opposite lanes: out along one side, back along the other
    [['walker-1', 'shirtA', -44, 1.6], ['walker-2', 'shirtB', -36, -1.6]].forEach(([k, mat, x0, ly]) => {
      const pts = [[x0, ly, 1.4], [-10, ly, 1.4], [30, ly, 1.4], [44, 0, 1.4], [30, -ly, 1.4], [-10, -ly, 1.4], [-44, 0, 1.4]];
      const wh = rnd(M.pathAt(inchPts(pts), 0).heading * DEG);
      group(k, 'Tunnel guest', 'a visitor walking through the tunnel', pts[0], { parent: 'guests' });
      person(k, x0, ly, 1.4, mat, k, { h: wh });
      motion({ id: `${k}-walk`, target: k, kind: 'path', face: 'tangent', rest_heading_deg: wh, cycles: 1, phase: 0,
        points: inchPts(pts), pivot: inch(pts[0]) });
    });
  }


  // =====================================================================================================
  // V05 full life (~1000): more schools, jellyfish, a diver, bubbles, eelgrass, anemones, urchins, stars, lights
  // =====================================================================================================
  if (v >= 5) {
    school('sardine-school', 'sardine', 24, 'high', [5, 3, 3], { speed: 3.2 });
    school('sardine-school-2', 'sardine', 16, 'mid', [4, 3, 2.5], { speed: 2.6, title: 'Second school of sardines' });
    school('bluetang-school', 'bluetang', 14, 'low', [3.5, 2.5, 2], { speed: 1.5 });
    school('yellowtang-school', 'yellowtang', 14, 'low', [3.5, 2.5, 2], { speed: 1.5 });
    school('sergeant-school', 'sergeant', 10, 'wall', [3, 1.5, 2], { speed: 1.4 });
    school('idol-school', 'idol', 9, 'wall', [3, 1.5, 2], { speed: 1.3 });
    school('anchovy-school-2', 'anchovy', 18, 'wall', [4.5, 2, 3], { speed: 3, title: 'Second school of anchovies' });
    school('blacksmith-school-2', 'blacksmith', 8, 'low', [3, 2, 2], { speed: 1.6, title: 'Second school of blacksmith' });
    [['sandtiger-5', 'sandtiger', 'high'], ['zebra-3', 'zebra', 'low'], ['leopard-2', 'leopard', 'low'], ['bonnet-4', 'bonnet', 'high'],
      ['blacktip-3', 'blacktip', 'mid'], ['yellowtail-3', 'yellowtail', 'high'], ['batray-3', 'batray', 'low'], ['garibaldi-3', 'garibaldi', 'wall'],
      ['garibaldi-4', 'garibaldi', 'low'], ['seabass-4', 'seabass', 'wall']]
      .forEach(([k, id, z]) => hero(k, id, z, 1, { tag: k.split('-')[1] }));

    // anemone with clownfish
    group('anemone-patch', 'Anemone patch', 'sea anemones: soft animals that sting small prey with their tentacles');
    [[-28, -22], [-16, -26], [18, -24]].forEach(([x, y], i) => {
      cone(`anemone-${i + 1}`, `Sea anemone ${i + 1}`, 'a soft animal with stinging tentacles; clownfish live safely inside', 0.9, 1.1, [x, y, 1.55], { parent: 'anemone-patch', material: 'anemone', rotation_x: 180 });
    });
    [[-28, -22, 'clown-1'], [18, -24, 'clown-2']].forEach(([x, y, k]) =>
      hero(k, 'clown', 'low', 1, { tag: k.split('-')[1], pts: [[x - 1.2, y, 2.6], [x, y - 1.2, 2.9], [x + 1.2, y, 2.6], [x, y + 1.2, 2.9]] }));

    // jellyfish drift and pulse
    for (let i = 0; i < 8; i++) {
      const r = rngFor(`jelly${i}`), x = -40 + i * 11 + r() * 3, y = (i % 2 ? 1 : -1) * (14 + r() * 8), z = 14 + r() * 8;
      group(`jelly-${i + 1}`, `Moon jelly ${i + 1}`, 'A see-through jellyfish with no brain and no heart. It pulses its bell to drift and catches tiny food on its sticky skin.', [x, y, z]);
      sph(`jelly-${i + 1}-bell`, `Moon jelly ${i + 1} bell`, 'the pulsing bell of the jellyfish', 0.9, [x, y, z], { parent: `jelly-${i + 1}`, material: 'jelly' });
      for (let t = 0; t < 3; t++) cyl(`jelly-${i + 1}-arm${t + 1}`, `Moon jelly ${i + 1} tentacle`, 'a short trailing tentacle', 0.05, 1.8, [x + (t - 1) * 0.35, y, z - 1.5], { parent: `jelly-${i + 1}`, material: 'jelly' });
      const pts = loopPts(`jelly-${i + 1}`, x, y, 3 + r() * 2, 2 + r() * 2, z, 0.8);
      motion({ id: `jelly-${i + 1}-drift`, target: `jelly-${i + 1}`, kind: 'path', points: inchPts(pts), face: 'tangent', rest_heading_deg: rnd(M.pathAt(inchPts(pts), 0).heading * DEG),
        cycles: 1, phase: 0, pivot: inch(pts[0]) });
      motion({ id: `jelly-${i + 1}-pulse`, target: `jelly-${i + 1}-bell`, kind: 'bob', axis: 'z', amount: 0.25 * F, cycles: 6 + (i % 3), phase: 0 });
    }

    // a diver feeding the fish, with a trail of bubbles
    const dpts = loopPts('diver', 0, -2, 14, 8, 17, 2, 1);
    const [dx, dy, dz] = dpts[0], dh = rnd(M.pathAt(inchPts(dpts), 0).heading * DEG);
    group('diver', 'Diver', 'A staff diver who feeds the fish and cleans the glass. Divers talk to guests through a speaker in the mask.', [dx, dy, dz]);
    const dc = Math.cos((dh * Math.PI) / 180), ds = Math.sin((dh * Math.PI) / 180);
    const DP = (lx, ly, lz) => [dx + lx * dc - ly * ds, dy + lx * ds + ly * dc, dz + lz];
    box('diver-body', 'Diver body', 'a staff diver in a wet suit', [2.6, 1, 1], DP(0, 0, 0), { parent: 'diver', material: 'suit', rotation_z: dh });
    sph('diver-head', 'Diver head', 'with a mask', 0.45, DP(1.6, 0, 0.15), { parent: 'diver', material: 'skin' });
    cyl('diver-tank', 'Air tank', 'air for about an hour', 0.3, 1.8, DP(-0.2, 0, 0.8), { parent: 'diver', material: 'tankgas', rotation_y: 90, rotation_z: dh });
    box('diver-fins', 'Diver fins', '', [1.2, 0.8, 0.1], DP(-1.9, 0, 0), { parent: 'diver', material: 'ink', rotation_z: dh });
    for (let b = 0; b < 3; b++) sph(`diver-bubble-${b + 1}`, 'Diver bubble', 'bubbles from the regulator', 0.2, DP(1.4 + b * 0.25, 0.4 + b * 0.2, 0.7 + b * 0.6), { parent: 'diver', material: 'bubble' });
    motion({ id: 'diver-swim', target: 'diver', kind: 'path', points: inchPts(dpts), face: 'tangent', rest_heading_deg: dh, pivot: inch([dx, dy, dz]), cycles: 1, phase: 0 });

    // bubble vents on the floor
    group('bubbles', 'Bubble vents', 'air vents that push oxygen into the water');
    [[-12, -24], [14, 26], [40, 26]].forEach(([x, y], i) => {
      cyl(`vent-${i + 1}`, `Air vent ${i + 1}`, 'sends a stream of bubbles up', 0.5, 0.3, [x, y, 1.2], { parent: 'bubbles', material: 'steel' });
      for (let b = 0; b < 5; b++) sph(`bubble-${i + 1}-${b + 1}`, 'Bubble', 'an air bubble rising', 0.18 + b * 0.04, [x + (b % 2 ? 0.3 : -0.3), y, 3 + b * 2.4], { parent: 'bubbles', material: 'bubble' });
    });

    // eelgrass patches, swaying
    for (let i = 0; i < 6; i++) {
      const r = rngFor(`grass${i}`), gx = -40 + i * 16 + r() * 4, gy = i % 2 ? -26 : 24;
      group(`grass-${i + 1}`, 'Eelgrass', 'a grassy underwater meadow; baby fish hide in it', [gx, gy, 1]);
      for (let b = 0; b < 4; b++) {
        box(`grass-${i + 1}-${b + 1}`, 'Eelgrass blade', 'a long thin blade', [0.12, 0.05, 3 + r() * 1.5], [gx + (r() - 0.5) * 2.5, gy + (r() - 0.5) * 2, 1 + 1.9], { parent: `grass-${i + 1}`, material: 'grass' });
      }
      const rr = rngFor(`grass${i}/sway`);
      motion({ id: `grass-${i + 1}-sway`, target: `grass-${i + 1}`, kind: 'swing', axis: 'x', pivot: inch([gx, gy, 1]), from: -5, to: 5, cycles: 3 + Math.floor(rr() * 3), phase: rr() < 0.5 ? 0 : 0.5 });
    }

    // more kelp, and urchins, stars and rocks on the sand
    for (let i = 0; i < 4; i++) {
      const r = rngFor(`kelp-g${i}`);
      kelp(`kelp-${i + 30}`, -42 + i * 24 + r() * 3, -22 - r() * 5, 12 + r() * 10);
    }
    group('critters', 'Seabed critters', 'urchins, sea stars and abalone on the sand and rocks');
    for (let i = 0; i < 12; i++) {
      const r = rngFor(`crit${i}`), x = -46 + r() * 92, y = (r() < 0.5 ? -1 : 1) * (9 + r() * 18);
      if (i % 3 === 0) sph(`urchin-${i + 1}`, `Purple sea urchin ${i + 1}`, 'a spiny ball that grazes kelp. Sheephead fish can crack it open.', 0.3, [x, y, 1.3], { parent: 'critters', material: 'urchin' });
      else if (i % 3 === 1) box(`star-${i + 1}`, `Bat star ${i + 1}`, 'a sea star that can have five or more arms. Not a fish at all.', [0.7, 0.7, 0.12], [x, y, 1.08], { parent: 'critters', material: 'star', rotation_z: rnd(r() * 90) });
      else sph(`abalone-${i + 1}`, `Abalone ${i + 1}`, 'a sea snail with a shiny shell, once nearly fished out in California', 0.35, [x, y, 1.2], { parent: 'critters', material: 'rock2' });
    }
    group('pebbles', 'Pebbles', 'small rocks scattered on the sand');
    for (let i = 0; i < 10; i++) {
      const r = rngFor(`peb${i}`);
      sph(`pebble-${i + 1}`, `Pebble ${i + 1}`, 'a smooth stone', 0.3 + r() * 0.5, [-46 + r() * 92, (r() < 0.5 ? -1 : 1) * (8 + r() * 20), 1.1], { parent: 'pebbles', material: i % 2 ? 'rock' : 'rock2' });
    }

    // more guests: gallery and the pool deck
    for (let i = 0; i < 6; i++) {
      const r = rngFor(`guest${i}`), mats = ['shirtA', 'shirtB', 'shirtC'];
      person(`gallery-guest-${i + 7}`, -44 + i * 9 + r() * 4, -34.5 - r() * 3, 0.5, mats[i % 3], 'guests');
    }
    for (let i = 0; i < 6; i++) {
      const r = rngFor(`deckguest${i}`), mats = ['shirtC', 'shirtA', 'shirtB'];
      person(`deck-guest-${i + 1}`, -40 + i * 15 + r() * 3, 35 + r() * 1.5, 28.1, mats[i % 3], 'guests');
    }
    // lamps over the deck
    group('deck-lamps', 'Deck lamps', 'lights for evening visits');
    for (let i = 0; i < 6; i++) {
      cyl(`deck-lamp-post-${i + 1}`, `Deck lamp post ${i + 1}`, '', 0.15, 8, [-45 + i * 18, 37, 32], { parent: 'deck-lamps', material: 'steel' });
      sph(`deck-lamp-${i + 1}`, `Deck lamp ${i + 1}`, 'warm light over the deck', 0.6, [-45 + i * 18, 37, 36.4], { parent: 'deck-lamps', material: 'lamp' });
    }
  }


  // =====================================================================================================
  // V06 two storeys and small rooms (~1200): the tank is two floors tall (14 ft each). Small rooms on both levels
  // look into it: a sunroom, dark and quiet rooms, and a kids' den with low windows, bubble domes and a touch pool.
  // =====================================================================================================
  if (v >= 6) {
    group('level2', 'Upper level', 'the second storey, 14 ft above the first: rooms, a gallery and a sunroom. The tank is two storeys tall');
    // A small room beside the tank. Open on the tank side (the tank glass is its window; sill and header frame it).
    // dir: 'back' (tank is toward -y), 'east' (tank toward -x), 'west' (tank toward +x).
    function room(id, name, desc, x0, x1, y0, y1, z0, hgt, dir, o = {}) {
      const g = `room-${id}`, wm = o.wall || 'wall', cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, w = x1 - x0, d = y1 - y0;
      group(g, name, desc, [cx, cy, z0], { parent: o.parent });
      const zc = z0 + hgt / 2;
      box(`${g}-floor`, `${name} floor`, '', [w, d, 0.5], [cx, cy, z0 + 0.25], { parent: g, material: o.floor || 'concrete' });
      const tankSide = dir; // which side faces the tank
      const wall = (k, label, size, at) => box(`${g}-wall-${k}`, `${name} wall ${label}`, '', size, at, { parent: g, material: wm });
      if (tankSide !== 'back') wall('far', 'far', [w, 0.6, hgt], [cx, y1, zc]); else wall('far', 'back', [w, 0.6, hgt], [cx, y1, zc]);
      if (dir === 'back') { wall('a', 'side 1', [0.6, d, hgt], [x0, cy, zc]); wall('b', 'side 2', [0.6, d, hgt], [x1, cy, zc]); }
      else { wall('a', 'side 1', [w, 0.6, hgt], [cx, y0, zc]); }
      // window frame on the tank side
      if (dir === 'back') {
        box(`${g}-sill`, `${name} window sill`, 'where you lean to look in', [w - 1, 0.8, 0.6], [cx, y0 + 0.4, z0 + 2.8], { parent: g, material: 'bench' });
        box(`${g}-header`, `${name} window header`, '', [w - 1, 0.8, 0.6], [cx, y0 + 0.4, z0 + hgt - 0.5], { parent: g, material: 'concrete' });
      } else {
        const sx = dir === 'east' ? x0 + 0.4 : x1 - 0.4;
        box(`${g}-sill`, `${name} window sill`, 'where you lean to look in', [0.8, d - 1, 0.6], [sx, cy, z0 + 2.8], { parent: g, material: 'bench' });
        box(`${g}-header`, `${name} window header`, '', [0.8, d - 1, 0.6], [sx, cy, z0 + hgt - 0.5], { parent: g, material: 'concrete' });
      }
      box(`${g}-roof`, `${name} roof`, o.glassRoof ? 'a glass roof lets the low sun in' : 'a soft roof', [w + 0.5, d + 0.5, 0.5], [cx, cy, z0 + hgt + 0.25], { parent: g, material: o.glassRoof ? 'glass' : 'roof' });
      return { g, cx, cy, w, d, zc };
    }
    const bean = (key, name, x, y, z, mat, parent) => sph(key, name, 'a soft beanbag seat', 0.9, [x, y, z + 0.6], { parent, material: mat });

    // --- ground level: four small rooms along the back of the tank, y 31..45
    const A = room('reef', 'Reef Room', 'a cosy room that looks at the reef and sea fans. Low benches for little ones', -48, -28, 31, 45, 0.5, 13.5, 'back');
    bean('reef-bean-1', 'Reef Room beanbag 1', -43, 35, 0.5, 'shirtB', A.g); bean('reef-bean-2', 'Reef Room beanbag 2', -38, 35, 0.5, 'shirtA', A.g);
    box('reef-sign', 'Reef Room sign', 'Reef Room: look for the sea fans and the garibaldi', [5, 0.3, 2], [-38, 44.5, 8], { parent: A.g, material: 'sign' });
    const B = room('jelly', 'Jelly Room', 'a dim room with soft glowing lamps. The moon jellies drift past the window', -26, -6, 31, 45, 0.5, 13.5, 'back');
    [-21, -16, -11].forEach((x, i) => sph(`jelly-lamp-${i + 1}`, `Jelly Room lamp ${i + 1}`, 'a soft glowing ball', 0.6, [x, 40, 9], { parent: B.g, material: 'jelly' }));
    box('jelly-bench', 'Jelly Room bench', 'a long bench in the dark', [12, 2, 1.4], [-16, 34, 1.4], { parent: B.g, material: 'bench' });
    const C = room('shark', 'Shark Room', 'a dark room with a big window where the sharks glide past. Sit close and count the teeth', -4, 16, 31, 45, 0.5, 13.5, 'back');
    box('shark-bench', 'Shark Room bench', 'a long bench facing the window', [12, 2, 1.4], [6, 34, 1.4], { parent: C.g, material: 'bench' });
    box('shark-sign', 'Shark Room sign', 'Shark Room: sand tiger sharks are calm, even though they look fierce', [5, 0.3, 2], [6, 44.5, 8], { parent: C.g, material: 'sign' });
    // the kids' den: low round windows, a crawl tube to the bubble domes, a touch pool
    const D = room('den', "Kids' Den", 'a kid-height room: low round windows, bubble domes you can crawl up into, and a touch pool with gentle rays', 18, 38, 31, 45, 0.5, 13.5, 'back');
    group('den-kit', "Kids' Den fittings", 'low windows, a crawl tube and domes: made for children under 4 ft tall', [28, 31, 2]);
    [21, 25, 31, 35].forEach((x, i) => cyl(`den-porthole-${i + 1}`, `Low round window ${i + 1}`, 'a round window at kid height. Press your nose to it and watch the fish swim by', 1.2, 0.5, [x, 30.6, 2.5], { parent: 'den-kit', material: 'acrylic', rotation_x: 90 }));
    cyl('den-crawl', 'Crawl tube', 'a low tunnel to crawl through to the bubble domes', 1.5, 8, [28, 36, 2.2], { parent: 'den-kit', material: 'mint', rotation_x: 90 });
    [22, 28, 34].forEach((x, i) => {
      sph(`dome-${i + 1}`, `Bubble dome ${i + 1}`, 'a clear dome that pokes into the tank. Pop your head up inside it and fish swim all round you', 2.2, [x, 28.3, 3.4], { parent: 'den-kit', material: 'acrylic' });
      cyl(`dome-base-${i + 1}`, `Bubble dome ${i + 1} base`, 'the ring that holds the dome to the wall', 1.9, 0.6, [x, 30.2, 3.4], { parent: 'den-kit', material: 'rib', rotation_x: 90 });
      bean(`den-bean-${i + 1}`, `Den beanbag ${i + 1}`, x, 34, 0.5, ['shirtA', 'shirtB', 'shirtC'][i], 'den-kit');
    });
    // touch pool: a shallow basin with two gentle small rays that circle, and sea stars
    group('touch', 'Touch pool', 'a shallow pool: touch the rays gently with two fingers. Please do not pinch or lift them', [22, 41, 1.5], { parent: D.g });
    [[22, 38.5, 9, 0.6], [22, 43.5, 9, 0.6], [17.8, 41, 0.6, 5], [26.2, 41, 0.6, 5]].forEach(([x, y, w, d], i) =>
      box(`touch-rim-${i + 1}`, `Touch pool edge ${i + 1}`, '', [w, d, 1.6], [x, y, 1.3], { parent: 'touch', material: 'concrete' }));
    box('touch-water', 'Touch pool water', 'shallow water, about one foot deep', [8.4, 4.4, 0.9], [22, 41, 1.15], { parent: 'touch', material: 'surface' });
    for (let i = 0; i < 2; i++) {
      const cx = 20.5 + i * 3, pts = loopPts(`minray-${i + 1}`, cx, 41, 1.3, 1.0, 1.35, 0.05, i ? 1 : -1);
      hero(`minray-${i + 1}`, 'miniray', 'low', 1, { pts, tag: String(i + 1), speed: 0.6 });
    }
    [[19.5, 39.3], [24.5, 42.7], [21, 42.8]].forEach(([x, y], i) => box(`touch-star-${i + 1}`, `Touch pool sea star ${i + 1}`, 'a bat star that lives on the bottom of the pool', [0.5, 0.5, 0.1], [x, y, 0.9], { parent: 'touch', material: 'star', rotation_z: 20 * i }));

    // --- upper level: two small back rooms over the ground rooms, a sunroom to the east and a lookout to the west
    const E = room('dive', 'Dive Room', 'the diver waves at the window while feeding the fish. Look for the bubbles', -34, -16, 31, 45, 14.8, 11.7, 'back', { parent: 'level2' });
    bean('dive-bean-1', 'Dive Room beanbag 1', -30, 35, 14.8, 'shirtC', E.g); bean('dive-bean-2', 'Dive Room beanbag 2', -25, 35, 14.8, 'shirtA', E.g);
    const Q = room('quiet', 'Quiet Room', 'a calm room to rest and watch the big fish go by slowly', 4, 22, 31, 45, 14.8, 11.7, 'back', { parent: 'level2' });
    box('quiet-bench', 'Quiet Room bench', 'a long bench facing the window', [10, 2, 1.4], [13, 34, 15.8], { parent: Q.g, material: 'bench' });
    const S = room('sun', 'Sunroom', 'a warm room on the second floor with a glass roof. The low afternoon sun comes in across the water and lights the fish gold', 52, 78, -14, 14, 14.8, 12, 'east', { parent: 'level2', glassRoof: true, floor: 'deck' });
    [[-8, 'shirtB'], [0, 'shirtC'], [8, 'shirtA']].forEach(([y, m], i) => bean(`sun-bean-${i + 1}`, `Sunroom beanbag ${i + 1}`, 56, y, 14.8, m, S.g));
    box('sun-sign', 'Sunroom sign', 'Sunroom: sunshine on the water makes bright wobbly lines on the sand', [0.3, 6, 2], [77.4, 0, 22], { parent: S.g, material: 'sign' });
    const K = room('lookout', 'Lookout', 'a small upper room at the west end. You look down the whole length of the tank and the tunnel', -78, -52, -14, 14, 14.8, 12, 'west', { parent: 'level2' });
    box('lookout-bench', 'Lookout bench', 'a bench at the window', [2, 10, 1.4], [-56, 0, 15.8], { parent: K.g, material: 'bench' });
    // the low sun and its beams
    group('sunlight', 'Low sun', 'the afternoon sun, low in the east. Its beams come through the sunroom windows', [115, 0, 21], {});
    sph('sun', 'The sun', 'the low afternoon sun', 4, [115, 0, 21], { parent: 'sunlight', material: 'lamp' });
    [-6, 0, 6].forEach((y, i) => box(`sunbeam-${i + 1}`, `Sunbeam ${i + 1}`, 'a soft beam of low sunlight', [62, 0.8, 0.8], [83, y, 19 + (i % 2) * 1.5], { parent: 'sunlight', material: 'beam' }));
    motion({ id: 'sun-drift', target: 'sunlight', kind: 'bob', axis: 'z', amount: -F * 8, cycles: 1, phase: 0 });
    // the second-floor gallery and stairs up from the ground floor
    group('stairs', 'Stairs', 'stairs from the lobby side up to the second floor. A ramp beside them is for strollers and wheelchairs', [-47, -40, 7]);
    for (let i = 0; i < 14; i++) box(`step-${i + 1}`, `Stair ${i + 1}`, 'a step', [3.5, 1.1, 0.8], [-47, -46.6 + i * 1.1, 0.5 + i * 0.95], { parent: 'stairs', material: 'deck' });
    box('stair-rail', 'Stair handrail', 'a handrail up the stairs', [0.3, 16, 0.3], [-45, -39, 8], { parent: 'stairs', material: 'steel', rotation_x: 0 });
    group('gallery2', 'Second-floor gallery', 'a viewing gallery over the first, so you see the top half of the tank. 14 ft above the ground floor', [0, -39, 15], { parent: 'level2' });
    [-36, -12, 12, 36].forEach((x, i) => box(`bench2-${i + 1}`, `Upper bench ${i + 1}`, 'a bench facing the glass on the second floor', [10, 2, 1.4], [x, -36, 15.5], { parent: 'gallery2', material: 'bench' }));
    for (let i = 0; i < 5; i++) box(`pier2-${i + 1}`, `Upper window pier ${i + 1}`, 'concrete post between window panels', [1, 1.5, 12], [-50 + i * 25, -30.5, 20.8], { parent: 'gallery2', material: 'concrete' });
    box('gallery2-rail', 'Upper handrail', 'a handrail on the second floor', [100, 0.3, 0.3], [0, -31.6, 17.6], { parent: 'gallery2', material: 'steel' });
    box('level-sign-1', 'Level 1 sign', 'Level 1: the tunnel, the sharks and the kids\' den', [4, 0.3, 1.5], [-47, -47.4, 6], { parent: 'gallery2', material: 'sign' });
    box('level-sign-2', 'Level 2 sign', 'Level 2: the sunroom, the lookout and the top of the tank', [4, 0.3, 1.5], [-47, -47.4, 20], { parent: 'gallery2', material: 'sign' });
  }

  return { defs, motions };
}

function sceneFor(v) {
  const pad = String(v).padStart(2, '0');
  const id = `aquarium-v${pad}`;
  const built = defsFor(v);
  const scene = {
    id,
    builtin: true,
    project: 'Grand Ocean Aquarium',
    header: {
      model_id: id,
      name: `Grand Ocean Aquarium V${pad}`,
      description: `Grand Ocean Aquarium, increment ${v} of 6 (about ${COUNTS[v - 1]} objects). A 100 x 60 x 28 ft tank, two storeys tall, with a 100 ft walk-through tunnel, and from V06 small rooms on two levels. Tap an animal to read about it. Sizes are estimates, in inches.`,
      units: 'in', up: 'z', world: WORLD_ID,
      materials: MATERIALS,
    },
    defs: built.defs,
  };
  if (v >= 2) {
    scene.motion = (uuid) => ({
      schema: M.MOTION_SCHEMA,
      model_id: id,
      name: 'Swim and sway',
      description: 'Fish swim closed loops, tails beat, kelp sways. Every motion repeats a whole number of times per 60 s loop, so it never jumps.',
      units: 'in', up: 'z',
      loop_s: LOOP_S,
      autoplay: { plays: 2 },
      motions: defsForMotions(v).map((m) => ({ ...m, target: uuid(m.target) })),
    });
  }
  return scene;
}
const defsForMotions = (v) => defsFor(v).motions;

const AQUARIUM = Array.from({ length: 6 }, (_, i) => sceneFor(i + 1));

module.exports = { AQUARIUM, WORLD_ID, COUNTS, LOOP_S, MATERIALS, SP, defsFor, sceneFor };
