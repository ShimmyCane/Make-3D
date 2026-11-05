// Scene definitions for the built-in samples. All sizes in inches, Z up, position = centre of each object's box.
// tools/build_samples.js turns these into operation lists, replays them and writes the files.
// Keys become readable uuids: "<scene>-<key>".

const WORLD_ID = 'default-world';

const PLANTER = {
  id: 'garden-planter',
  header: {
    model_id: 'garden-planter',
    name: 'Garden planter',
    description: 'A sunny trough planter with snap peas and lettuce, on a stone path by a short picket fence.',
    units: 'in', up: 'z', world: WORLD_ID,
    materials: {
      clay: { color: '#e8a07a', opacity: 1 }, soil: { color: '#7a5a43', opacity: 1 },
      pea: { color: '#7fc97a', opacity: 1 }, stem: { color: '#5f9e5a', opacity: 1 },
      lettuce: { color: '#c4e8b0', opacity: 1 }, stone: { color: '#e9e4d8', opacity: 1 },
      wood: { color: '#f6e7c8', opacity: 1 }, sun: { color: '#ffd96a', opacity: 1 },
    },
  },
  defs: [
    ['pot', { name: 'Trough', description: 'the planter box', type: 'box', dimensions: [36, 12, 14], position: [0, 0, 7], material: 'clay' }],
    ['soil', { name: 'Soil', description: 'sits inside the rim', type: 'box', dimensions: [34, 10, 1.5], position: [0, 0, 14.75], material: 'soil' }],
    ['peas', { name: 'Snap peas', description: 'climbing peas on the left', type: 'group', dimensions: [], position: [-10, 0, 0] }],
    ['lettuce', { name: 'Lettuce', description: 'three heads on the right', type: 'group', dimensions: [], position: [11, 0, 0] }],
    ['pea1', { name: 'Pea stem 1', description: '', type: 'cylinder', dimensions: [0.3, 12], position: [-12, 0, 21.5], material: 'stem', parent: 'peas' }],
    ['pea2', { name: 'Pea stem 2', description: '', type: 'cylinder', dimensions: [0.3, 14], position: [-8, 0, 22.5], material: 'stem', parent: 'peas' }],
    ['pea3', { name: 'Pea stem 3', description: 'tip bends over', type: 'cylinder', dimensions: [0.3, 10], position: [-4, 0, 20.5], material: 'stem', parent: 'peas', rotation_y: 20 }],
    ['pod1', { name: 'Pea pod 1', description: '', type: 'sphere', dimensions: [1.2], position: [-12.5, 0, 25], material: 'pea', parent: 'peas' }],
    ['pod2', { name: 'Pea pod 2', description: '', type: 'sphere', dimensions: [1.2], position: [-7.5, 0, 27], material: 'pea', parent: 'peas' }],
    ['pod3', { name: 'Pea pod 3', description: '', type: 'sphere', dimensions: [1.2], position: [-3.5, 0, 24], material: 'pea', parent: 'peas' }],
    ['tip', { name: 'Pea tendril', description: 'a small cone tip', type: 'cone', dimensions: [0.6, 2.5], position: [-12, 0, 28.25], material: 'stem', parent: 'peas' }],
    ['head1', { name: 'Lettuce head 1', description: '', type: 'sphere', dimensions: [3.5], position: [7, 0, 19], material: 'lettuce', parent: 'lettuce' }],
    ['head2', { name: 'Lettuce head 2', description: '', type: 'sphere', dimensions: [3.5], position: [11, 0, 19.5], material: 'lettuce', parent: 'lettuce' }],
    ['head3', { name: 'Lettuce head 3', description: '', type: 'sphere', dimensions: [3.5], position: [15, 0, 19], material: 'lettuce', parent: 'lettuce' }],
    ['path', { name: 'Stone path', description: 'in front of the trough', type: 'box', dimensions: [72, 18, 0.5], position: [0, -20, 0.25], material: 'stone' }],
    ['fence', { name: 'Picket fence', description: 'behind the trough', type: 'group', dimensions: [], position: [0, 0, 0] }],
    ...[-24, -20, -16, 16, 20, 24].map((x, i) => [`picket${i + 1}`, { name: `Picket ${i + 1}`, description: '', type: 'box', dimensions: [1.5, 0.75, 30], position: [x, 22, 15], material: 'wood', parent: 'fence' }]),
    ['sun', { name: 'Sun', description: 'high and to the left, sets the light', type: 'sphere', dimensions: [6], position: [-70, -40, 110], material: 'sun' }],
  ],
  modify: [{ key: 'head2', set: { dimensions: [4] }, note: 'larger middle lettuce head' }],
};

// Outdoor table: 3 ft x 7 ft top (84 x 36 in), yellow metal frame, a bonsai-style tree, and a parasol
// with three canopies (one on the pole, one on each side arm).
const TABLE = {
  id: 'outdoor-table',
  header: {
    model_id: 'outdoor-table',
    name: 'Outdoor table with parasol',
    description: 'A 3 ft x 7 ft table top on a yellow metal frame, a bonsai-style tree, and a parasol with three canopies for broad shade.',
    units: 'in', up: 'z', world: WORLD_ID,
    materials: {
      teak: { color: '#b98a5e', opacity: 1 }, yellow: { color: '#f2c94c', opacity: 1 },
      canopy: { color: '#fff1b8', opacity: 1 }, pole: { color: '#9aa4ad', opacity: 1 },
      pot: { color: '#e8a07a', opacity: 1 }, trunk: { color: '#7a5a43', opacity: 1 },
      leaf: { color: '#8fbf7a', opacity: 1 }, ground: { color: '#c9c3b5', opacity: 1 },
    },
  },
  defs: [
    ['top', { name: 'Table top', description: '3 ft x 7 ft, centre at 30 in high', type: 'box', dimensions: [84, 36, 1.5], position: [0, 0, 30], material: 'teak' }],
    ['frame', { name: 'Yellow frame', description: 'metal frame under the top', type: 'group', dimensions: [], position: [0, 0, 0] }],
    ...[[-36, -14], [-36, 14], [36, -14], [36, 14]].map(([x, y], i) => [`leg${i + 1}`, { name: `Leg ${i + 1}`, description: '', type: 'box', dimensions: [2, 2, 28], position: [x, y, 14], material: 'yellow', parent: 'frame' }]),
    ['rail1', { name: 'Rail front', description: '', type: 'box', dimensions: [84, 1.5, 2], position: [0, -14, 27], material: 'yellow', parent: 'frame' }],
    ['rail2', { name: 'Rail back', description: '', type: 'box', dimensions: [84, 1.5, 2], position: [0, 14, 27], material: 'yellow', parent: 'frame' }],
    ['brace1', { name: 'Low brace front', description: '', type: 'box', dimensions: [84, 1.5, 1.5], position: [0, -14, 6], material: 'yellow', parent: 'frame' }],
    ['brace2', { name: 'Low brace back', description: '', type: 'box', dimensions: [84, 1.5, 1.5], position: [0, 14, 6], material: 'yellow', parent: 'frame' }],
    ['parasol', { name: 'Parasol', description: 'one pole, three canopies', type: 'group', dimensions: [], position: [0, 0, 0] }],
    ['pole', { name: 'Parasol pole', description: 'through the table centre', type: 'cylinder', dimensions: [0.75, 80], position: [0, 0, 70], material: 'pole', parent: 'parasol' }],
    ['canopy-mid', { name: 'Canopy middle', description: 'top canopy on the pole', type: 'cone', dimensions: [36, 12], position: [0, 0, 104], material: 'canopy', parent: 'parasol' }],
    ['arm-l', { name: 'Arm left', description: 'side arm, tilted out', type: 'cylinder', dimensions: [0.5, 44], position: [-22, 0, 92], rotation_y: 90, material: 'pole', parent: 'parasol' }],
    ['arm-r', { name: 'Arm right', description: 'side arm, tilted out', type: 'cylinder', dimensions: [0.5, 44], position: [22, 0, 92], rotation_y: 90, material: 'pole', parent: 'parasol' }],
    ['canopy-l', { name: 'Canopy left', description: 'side canopy', type: 'cone', dimensions: [22, 9], position: [-44, 0, 96], material: 'canopy', parent: 'parasol' }],
    ['canopy-r', { name: 'Canopy right', description: 'side canopy', type: 'cone', dimensions: [22, 9], position: [44, 0, 96], material: 'canopy', parent: 'parasol' }],
    ['bonsai', { name: 'Bonsai tree', description: 'branching, reaching, on the table end', type: 'group', dimensions: [], position: [-30, 0, 0] }],
    ['bpot', { name: 'Bonsai pot', description: '', type: 'cylinder', dimensions: [6, 4], position: [-30, 0, 32.75], material: 'pot', parent: 'bonsai' }],
    ['btrunk', { name: 'Trunk', description: 'leans a little', type: 'cylinder', dimensions: [0.9, 18], position: [-30, 0, 43.75], rotation_y: 12, material: 'trunk', parent: 'bonsai' }],
    ['bbranch1', { name: 'Branch reaching left', description: '', type: 'cylinder', dimensions: [0.4, 12], position: [-36, 0, 47], rotation_y: 70, material: 'trunk', parent: 'bonsai' }],
    ['bbranch2', { name: 'Branch reaching right', description: '', type: 'cylinder', dimensions: [0.4, 14], position: [-24, 0, 52], rotation_y: -65, material: 'trunk', parent: 'bonsai' }],
    ['bleaf1', { name: 'Foliage left', description: '', type: 'sphere', dimensions: [4.5], position: [-41, 0, 52], material: 'leaf', parent: 'bonsai' }],
    ['bleaf2', { name: 'Foliage right', description: '', type: 'sphere', dimensions: [5], position: [-19, 0, 58], material: 'leaf', parent: 'bonsai' }],
    ['bleaf3', { name: 'Foliage top', description: '', type: 'sphere', dimensions: [6], position: [-31, 0, 56], material: 'leaf', parent: 'bonsai' }],
  ],
  modify: [{ key: 'canopy-mid', set: { dimensions: [38, 12] }, note: 'slightly wider middle canopy' }],
};

// Outdoor table V2 (convo v0.5): 7 ft x 3 ft white oak top on yellow painted 2 in angle legs, a rectangular
// frame under the top, a centre beam and a low back bar. A folding red parasol with one large canopy at the far
// end, on a square base that hides two sandbags. A bonsai in a 2 ft box on the ground, 8 ft from the table end,
// with one main limb that forks three times in 3-D and sparse leaves.
const bonsaiBranches = () => {
  // A bonsai, not a bare frame. Shape rules used here:
  // - the trunk is thick at the soil and tapers fast; it leans toward the table and its leader ends in a pad;
  // - branches arch UP from the trunk (never flat); the main limb climbs in steps, from about 15 to 45 degrees;
  // - a balance branch goes out the other way, so the tree is not one-sided;
  // - each branch ends in a foliage pad: a cluster of spheres, not a single ball;
  // - a dead branch (jin) on the far side says the tree is old.
  // Model axes, Z up. A cylinder lies along its own Z axis; rotation_x, then rotation_y, turn +Z onto its direction.
  const vadd = (a, b) => a.map((v, i) => v + b[i]);
  const vscale = (a, k) => a.map((v) => v * k);
  const vnorm = (a) => { const l = Math.hypot(...a); return a.map((v) => v / l); };
  const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const toDeg = (r) => (r * 180) / Math.PI;
  const turnAngles = (dir) => ({
    rotation_x: +toDeg(Math.asin(Math.max(-1, Math.min(1, -dir[1])))).toFixed(3),
    rotation_y: +toDeg(Math.atan2(dir[0], dir[2])).toFixed(3),
  });
  // a new direction: pitch away from dir, then yaw around it (degrees)
  const turn = (dir, pitch, yaw) => {
    const ref = Math.abs(dir[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
    const u = vnorm(vcross(dir, ref));
    const v = vcross(dir, u);
    const p = (pitch * Math.PI) / 180, y = (yaw * Math.PI) / 180;
    const side = vadd(vscale(u, Math.cos(y)), vscale(v, Math.sin(y)));
    return vnorm(vadd(vscale(dir, Math.cos(p)), vscale(side, Math.sin(p))));
  };
  const up = (deg, toward = [1, 0.04]) => { // climb deg above horizontal, toward a horizontal direction
    const r = (deg * Math.PI) / 180;
    const h = vnorm([toward[0], toward[1], 0]);
    return vnorm([h[0] * Math.cos(r), h[1] * Math.cos(r), Math.sin(r)]);
  };

  const defs = [];
  const seg = (start, dir, len, rad, key, label, material = 'trunk', tags = ['plant']) => {
    const mid = vadd(start, vscale(dir, len / 2));
    defs.push([key, { name: label, description: '', type: 'cylinder', dimensions: [rad, len],
      position: mid.map((v) => +v.toFixed(2)), ...turnAngles(dir), material, parent: 'bonsai', tags }]);
    return vadd(start, vscale(dir, len));
  };
  // a foliage pad: a cluster of spheres around a tip, so it reads as leaves, not a ball on a stick
  const pads = [];
  const pad = (c, size, name) => {
    const offs = [[0, 0, 0, 1], [0.8, 0.2, 0.3, 0.8], [-0.7, -0.3, 0.1, 0.75], [0.1, 0.8, -0.2, 0.7]];
    offs.forEach(([x, y, z, k], i) => {
      const p = [c[0] + x * size, c[1] + y * size, c[2] + z * size];
      defs.push([`${name}-${i}`, { name: i === 0 ? name : `${name} part ${i}`, description: '', type: 'sphere',
        dimensions: [size * k], position: p.map((v) => +v.toFixed(2)), material: 'leaf', parent: 'bonsai', tags: ['plant'] }]);
    });
    pads.push(c);
  };

  // trunk: four tapered pieces, thick at the soil. The last piece is the leader.
  const lean = [18, 24, 30, 36];   // slanting trunk: it leans toward the table as it rises
  const radii = [4.0, 3.2, 2.5, 1.7];
  const lengths = [16, 16, 16, 44]; // the last piece is the leader: the apex is the highest point
  const trunkDirs = lean.map((deg) => vnorm([Math.sin((deg * Math.PI) / 180), 0, Math.cos((deg * Math.PI) / 180)]));
  const trunkEnds = [];
  let p = [-150, 0, 24];
  trunkDirs.forEach((dir, i) => {
    p = seg(p, dir, lengths[i], radii[i], `t-${i + 1}`, `Trunk ${i + 1}`);
    trunkEnds.push(p);
  });
  pad(trunkEnds[3], 4.8, 'Foliage apex');

  // dead branch on the far side (jin), from the first piece of trunk
  seg(vadd([-150, 0, 24], vscale(trunkDirs[0], 5)), vnorm([-1, 0.1, 0.6]), 12, 1.0, 'jin', 'Dead branch (jin)', 'deadwood');

  // balance branch: out the other way from the second piece, with its own pad
  const balanceEnd = seg(trunkEnds[0], vnorm([-0.8, 0.05, 0.5]), 22, 1.4, 'bal', 'Balance branch');
  pad(balanceEnd, 4.8, 'Foliage balance');

  // main limb: leaves the second piece of trunk and climbs in three steps (15, 30, 45 degrees), arching toward the table
  const limb1 = seg(trunkEnds[1], up(28), 26, 2.2, 'limb-1', 'Main limb 1');
  const limb2 = seg(limb1, up(35), 22, 1.6, 'limb-2', 'Main limb 2');
  const limbEnd = seg(limb2, up(30), 18, 1.1, 'limb-3', 'Main limb 3');

  // crown: from three points along the main limb, four branches each. Two spread up and out on either side,
  // two go out level. Each ends in a foliage pad, so the crown is a dome with pads at several heights.
  const sprays = [[limb1, up(28), 15], [limb2, up(35), 13], [limbEnd, up(30), 11]];
  for (const [start, dir, len] of sprays) {
    [-135, -45, 0, 180].forEach((yaw, i) => {
      const d = turn(dir, 30, yaw);
      const end = seg(start, d, len, 0.7, `b-${sprays.findIndex((x) => x[0] === start) + 1}-${i + 1}`,
        `Branch ${sprays.findIndex((x) => x[0] === start) + 1}.${i + 1}`);
      pad(end, 4.0 + (i % 2) * 0.6, `Foliage ${sprays.findIndex((x) => x[0] === start) + 1}.${i + 1}`);
    });
  }

  return defs;
};

// Canopy: one folding cloth draped over three arm tips, as in the older three-head parasol. The cloth is a
// grid of thin tilted panels that follow a wavy surface: peaks at each arm (ridges at 0, 120 and 240 degrees),
// sagging between them. Three metal arms hold the peaks from the pole top. All three arms are the same.
const CANOPY = { cx: 48, cy: 0, r: 70, base: 106, ridge: 8, dome: 16 };  // apex at the top, edge sags, ridges at the arms
const canopyZ = (x, y) => {
  const r = Math.min(Math.hypot(x, y) / CANOPY.r, 1);
  const th = Math.atan2(y, x);
  return CANOPY.base + CANOPY.ridge * r * Math.cos(3 * th) - CANOPY.dome * r * r;
};
const canopyDefs = () => {
  const defs = [];
  const turnAngles = (dir) => ({
    rotation_x: +((Math.asin(Math.max(-1, Math.min(1, -dir[1]))) * 180) / Math.PI).toFixed(3),
    rotation_y: +((Math.atan2(dir[0], dir[2]) * 180) / Math.PI).toFixed(3),
  });
  const norm = (a) => { const l = Math.hypot(...a); return a.map((v) => v / l); };
  // three arms from the pole top to the ridge peaks
  const top = [CANOPY.cx, CANOPY.cy, canopyZ(0, 0)];
  [0, 120, 240].forEach((deg, i) => {
    const t = (deg * Math.PI) / 180;
    const ex = CANOPY.cx + 0.95 * CANOPY.r * Math.cos(t), ey = CANOPY.cy + 0.95 * CANOPY.r * Math.sin(t);
    const end = [ex, ey, canopyZ(ex - CANOPY.cx, ey - CANOPY.cy)];
    const d = top.map((v, k) => end[k] - v);
    const len = Math.hypot(...d);
    const dir = norm(d);
    const mid = top.map((v, k) => v + (d[k] / 2));
    defs.push([`arm-${i + 1}`, { name: `Canopy arm ${i + 1}`, description: 'one of three arms, same length', type: 'cylinder',
      dimensions: [0.5, len], position: mid.map((v) => +v.toFixed(2)), ...turnAngles(dir), material: 'metal', parent: 'parasol', tags: ['stand'] }]);
  });
  // cloth: panels on a grid, kept inside the circle; each panel is tilted to the surface normal
  const N = 11, cell = (2 * CANOPY.r) / N, h = 0.5;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = -CANOPY.r + (i + 0.5) * cell, y = -CANOPY.r + (j + 0.5) * cell;
    if (Math.hypot(x, y) > CANOPY.r + cell * 0.3) continue;
    const dzdx = (canopyZ(x + h, y) - canopyZ(x - h, y)) / (2 * h);
    const dzdy = (canopyZ(x, y + h) - canopyZ(x, y - h)) / (2 * h);
    const n = norm([-dzdx, -dzdy, 1]);
    defs.push([`cloth-${i}-${j}`, { name: `Canopy panel ${i + 1}-${j + 1}`, description: '', type: 'box',
      dimensions: [cell * 1.3, cell * 1.3, 0.6], position: [CANOPY.cx + x, CANOPY.cy + y, +canopyZ(x, y).toFixed(2)],
      ...turnAngles(n), material: 'canopy', parent: 'parasol', tags: ['shade'] }]);
  }
  return defs;
};

const OUTDOOR_V2 = {
  id: 'outdoor-table-v2',
  header: {
    model_id: 'outdoor-table-v2',
    name: 'Outdoor table with parasol V2',
    description: 'A 7 ft x 3 ft white oak top on yellow painted angle-iron legs, with a rectangular frame, a centre beam and a low back bar. A folding red parasol with one large canopy at the far end, on a square base with two sandbags. A bonsai in a 2 ft box on the ground, 8 ft from the table, reaching over it.',
    units: 'in', up: 'z', world: WORLD_ID,
    materials: {
      oak: { color: '#e6d3b3', opacity: 1 }, yellow: { color: '#f2c94c', opacity: 1 },
      canopy: { color: '#c4544a', opacity: 1 }, metal: { color: '#9aa4ad', opacity: 1 },
      sandbag: { color: '#c9b48a', opacity: 1 }, box: { color: '#b58a62', opacity: 1 },
      trunk: { color: '#7a5a43', opacity: 1 }, leaf: { color: '#6fa86a', opacity: 1 },
      deadwood: { color: '#cfc6b4', opacity: 1 },
    },
  },
  defs: [
    ['top', { name: 'Table top', description: 'white oak veneer, 7 ft x 3 ft, centre at 30 in high', type: 'box', dimensions: [84, 36, 1.5], position: [0, 0, 30], material: 'oak', tags: ['surface'] }],
    ['frame', { name: 'Frame', description: 'yellow painted angle iron', type: 'group', dimensions: [], position: [0, 0, 0] }],
    ...[[-36, -14], [-36, 14], [36, -14], [36, 14]].map(([x, y], i) => [`leg${i + 1}`, { name: `Leg ${i + 1}`, description: '2 in angle', type: 'box', dimensions: [2, 2, 29.25], position: [x, y, 14.625], material: 'yellow', parent: 'frame', tags: ['frame'] }]),
    ['rail-front', { name: 'Rail front', description: 'rectangular frame, long side', type: 'box', dimensions: [84, 1.5, 2], position: [0, -14, 27.25], material: 'yellow', parent: 'frame', tags: ['frame'] }],
    ['rail-back', { name: 'Rail back', description: 'rectangular frame, long side', type: 'box', dimensions: [84, 1.5, 2], position: [0, 14, 27.25], material: 'yellow', parent: 'frame', tags: ['frame'] }],
    ['rail-end-l', { name: 'Rail end left', description: 'rectangular frame, short side', type: 'box', dimensions: [1.5, 28, 2], position: [-36, 0, 27.25], material: 'yellow', parent: 'frame', tags: ['frame'] }],
    ['rail-end-r', { name: 'Rail end right', description: 'rectangular frame, short side', type: 'box', dimensions: [1.5, 28, 2], position: [36, 0, 27.25], material: 'yellow', parent: 'frame', tags: ['frame'] }],
    ['centre-beam', { name: 'Centre beam', description: 'between the end rails, under the top', type: 'box', dimensions: [72, 1.5, 2], position: [0, 0, 27.25], material: 'yellow', parent: 'frame', tags: ['frame'] }],
    ['low-bar', { name: 'Low back bar', description: 'about 6 in off the ground, back only, for feet', type: 'box', dimensions: [84, 1.5, 1.5], position: [0, 14, 6], material: 'yellow', parent: 'frame', tags: ['frame'] }],
    ['parasol', { name: 'Parasol', description: 'folding, all canopy panels open as one, at the far end', type: 'group', dimensions: [], position: [0, 0, 0], tags: ['shade'] }],
    ['pole', { name: 'Parasol pole', description: 'from the ground to the apex of the canopy', type: 'cylinder', dimensions: [0.75, 98], position: [48, 0, 57], material: 'metal', parent: 'parasol', tags: ['stand'] }],
    ['base', { name: 'Square base', description: '24 in square, hides the sandbags', type: 'box', dimensions: [24, 24, 8], position: [48, 0, 4], material: 'metal', parent: 'parasol', tags: ['stand'] }],
    ['sandbag-1', { name: 'Sandbag 1', description: 'inside the base', type: 'box', dimensions: [12, 6, 4], position: [48, -6, 4], material: 'sandbag', parent: 'parasol', tags: ['ballast'] }],
    ['sandbag-2', { name: 'Sandbag 2', description: 'inside the base', type: 'box', dimensions: [12, 6, 4], position: [48, 6, 4], material: 'sandbag', parent: 'parasol', tags: ['ballast'] }],
    ...canopyDefs(),
    ['bonsai', { name: 'Bonsai tree', description: 'on the ground, 8 ft from the table end, one main limb', type: 'group', dimensions: [], position: [-150, 0, 0], tags: ['plant'] }],
    ['box', { name: 'Bonsai box', description: '2 ft x 2 ft x 2 ft, on the ground', type: 'box', dimensions: [24, 24, 24], position: [-150, 0, 12], material: 'box', parent: 'bonsai', tags: ['container'] }],
    ...bonsaiBranches(),
  ],
};

// Kitchen: a run of cabinets along the back wall, fridge at the left, stove, a sink run with a triple sink
// and two faucets, a dishwasher, drawers and a door, and upper cabinets with a sliding acrylic cup display.
// Back wall is y = 0; base cabinets are 24 in deep; counter tops at 36 in.
const KITCHEN = {
  id: 'kitchen',
  header: {
    model_id: 'kitchen',
    name: 'Kitchen',
    description: 'Walk-in kitchen: fridge, counter and stove on the left; a sink run with a triple sink and two faucets; a dishwasher, drawers and a door on the right; upper cabinets with a sliding acrylic cup display over the sink.',
    units: 'in', up: 'z', world: WORLD_ID,
    view: { azimuth_deg: 214 },   // start from the room side, not behind the back wall
    materials: {
      wall: { color: '#fde3cf', opacity: 1 }, cabinet: { color: '#dfeadf', opacity: 1 },
      counter: { color: '#e9e4d8', opacity: 1 }, steel: { color: '#b9c0c6', opacity: 1 },
      fridge: { color: '#f4f6f8', opacity: 1 }, acrylic: { color: '#dbe7f6', opacity: 0.35 },
      cup: { color: '#ffffff', opacity: 1 }, faucet: { color: '#c7ced6', opacity: 1 },
    },
  },
  defs: [
    ['wall', { name: 'Back wall', description: 'context only', type: 'box', dimensions: [240, 1, 96], position: [120, -0.5, 48], material: 'wall' }],
    ['fridge', { name: 'Fridge', description: 'left end', type: 'box', dimensions: [36, 30, 70], position: [18, 15, 35], material: 'fridge' }],
    ['run1', { name: 'Counter run', description: 'after the fridge', type: 'group', dimensions: [], position: [0, 0, 0] }],
    ['run1-base', { name: 'Base cabinets 1', description: '', type: 'box', dimensions: [36, 24, 34.5], position: [54, 12, 17.25], material: 'cabinet', parent: 'run1' }],
    ['run1-top', { name: 'Counter 1', description: '', type: 'box', dimensions: [36, 25.5, 1.5], position: [54, 12.75, 35.25], material: 'counter', parent: 'run1' }],
    ['stove', { name: 'Stove', description: 'four burners on top', type: 'box', dimensions: [30, 24, 36], position: [87, 12, 18], material: 'steel' }],
    ['run2-base', { name: 'Base cabinets 2', description: '', type: 'box', dimensions: [36, 24, 34.5], position: [120, 12, 17.25], material: 'cabinet' }],
    ['run2-top', { name: 'Counter 2', description: '', type: 'box', dimensions: [36, 25.5, 1.5], position: [120, 12.75, 35.25], material: 'counter' }],
    ['sink', { name: 'Sink run', description: 'corner run with the triple sink', type: 'group', dimensions: [], position: [0, 0, 0] }],
    ['sink-base', { name: 'Sink base cabinets', description: '', type: 'box', dimensions: [54, 24, 34.5], position: [165, 12, 17.25], material: 'cabinet', parent: 'sink' }],
    ['sink-top', { name: 'Sink counter', description: '', type: 'box', dimensions: [54, 25.5, 1.5], position: [165, 12.75, 35.25], material: 'counter', parent: 'sink' }],
    ['bowl1', { name: 'Sink bowl 1', description: 'of three', type: 'box', dimensions: [12, 16, 5], position: [148, 12, 33.5], material: 'steel', parent: 'sink' }],
    ['bowl2', { name: 'Sink bowl 2', description: 'of three', type: 'box', dimensions: [12, 16, 5], position: [165, 12, 33.5], material: 'steel', parent: 'sink' }],
    ['bowl3', { name: 'Sink bowl 3', description: 'of three', type: 'box', dimensions: [12, 16, 5], position: [182, 12, 33.5], material: 'steel', parent: 'sink' }],
    ['faucet1', { name: 'Faucet 1', description: 'over bowl 1', type: 'cylinder', dimensions: [0.6, 12], position: [156, 3, 42], material: 'faucet', parent: 'sink' }],
    ['faucet2', { name: 'Faucet 2', description: 'over bowl 3', type: 'cylinder', dimensions: [0.6, 12], position: [174, 3, 42], material: 'faucet', parent: 'sink' }],
    ['dish', { name: 'Dishwasher', description: 'after the corner, with a gap', type: 'box', dimensions: [22, 24, 34.5], position: [205, 12, 17.25], material: 'steel' }],
    ['drawers', { name: 'Drawers and doors', description: 'far right', type: 'group', dimensions: [], position: [0, 0, 0] }],
    ['dbase', { name: 'Drawer base', description: '', type: 'box', dimensions: [22, 24, 34.5], position: [229, 12, 17.25], material: 'cabinet', parent: 'drawers' }],
    ['drw1', { name: 'Drawer 1', description: 'top drawer front', type: 'box', dimensions: [20, 0.75, 7], position: [229, 24.4, 31], material: 'steel', parent: 'drawers' }],
    ['drw2', { name: 'Drawer 2', description: 'middle drawer front', type: 'box', dimensions: [20, 0.75, 7], position: [229, 24.4, 22.5], material: 'steel', parent: 'drawers' }],
    ['door', { name: 'Cupboard door', description: 'bottom door front', type: 'box', dimensions: [20, 0.75, 13], position: [229, 24.4, 9.5], material: 'steel', parent: 'drawers' }],
    ['upper', { name: 'Upper cabinets', description: 'over the sink run', type: 'group', dimensions: [], position: [0, 0, 0] }],
    ['upper-box', { name: 'Upper cabinet', description: 'bottom at 54 in', type: 'box', dimensions: [54, 12, 30], position: [165, 6, 69], material: 'cabinet', parent: 'upper' }],
    ['display', { name: 'Sliding acrylic display', description: 'slides in front of the cups', type: 'box', dimensions: [48, 0.25, 22], position: [165, 13, 66], material: 'acrylic', parent: 'upper' }],
    ['cup1', { name: 'Cup 1', description: 'on the shelf', type: 'cylinder', dimensions: [1.8, 4.5], position: [152, 7, 60], material: 'cup', parent: 'upper' }],
    ['cup2', { name: 'Cup 2', description: '', type: 'cylinder', dimensions: [1.8, 4.5], position: [165, 7, 60], material: 'cup', parent: 'upper' }],
    ['cup3', { name: 'Cup 3', description: '', type: 'cylinder', dimensions: [1.8, 4.5], position: [178, 7, 60], material: 'cup', parent: 'upper' }],
  ],
  modify: [{ key: 'display', set: { description: 'slides in front of the cups; a little higher' }, note: 'tidy the description' }],
};

// Mirror the kitchen across its centre line (x -> 240 - x), so that standing in front of the back wall,
// the fridge is on your left and the dishwasher and drawers on your right, as described.
KITCHEN.defs = KITCHEN.defs.map(([k, d]) => [k, { ...d, position: [240 - d.position[0], d.position[1], d.position[2]] }]);

const { LIVING_ROOM } = require('./living_room.js');
const { KITCHEN_MOCKUP } = require('./kitchen_mockup.js');

const { HONDA_CRV } = require('./honda_crv.js');
const { ROBOT_BANANA } = require('./robot_banana.js');
const { ROBOT_LOOP } = require('./robot_loop.js');
const { CORNICE } = require('./cornice.js');
const { HAWK } = require('./hawk.js');
const { ADVENTURE_PARK } = require('./adventure_park.js');
const { ADVENTURE_PARK_COMPACT } = require('./adventure_park_compact.js');
const { AQUARIUM } = require('./aquarium.js');
const { HABITAT } = require('./habitat_aquarium.js');
const { SOLAR_SYSTEM, PLANET_VIEWS } = require('./solar_system.js');
const { SOLAR_TRUE } = require('./solar_true.js');
const { PLANET_VIEWS_V2V3, EARTH_VIEWS } = require('./planet_views.js');
const { SOLAR_TRUE_V07, SOLAR_TRUE_V08 } = require('./solar_true.js');
const { GALAXY_SUN, GALAXY_SUN_V02, GALAXY_SUN_V03, GALAXY_SUN_V04 } = require('./galaxy_sun.js');
const { GALAXY_HELIX_V05, GALAXY_HELIX_V06, GALAXY_HELIX_V07, GALAXY_HELIX_V08 } = require('./galaxy_helix.js');
const { PLANET_VIEWS_V4_6, EARTH_VIEWS_V11_20, EARTH_VIEWS_V21 } = require('./planet_views_v4.js');
const { EARTH_VIEWS_V22 } = require('./earth_v22.js');
const { EARTH_VIEWS_V23 } = require('./earth_v23.js');

module.exports = { WORLD_ID, SCENES: [PLANTER, TABLE, OUTDOOR_V2, KITCHEN, ...LIVING_ROOM, ...KITCHEN_MOCKUP, ...HONDA_CRV, ...ADVENTURE_PARK, ...ADVENTURE_PARK_COMPACT, ...AQUARIUM, ...HABITAT, ...SOLAR_SYSTEM, ...PLANET_VIEWS, ...PLANET_VIEWS_V2V3, ...EARTH_VIEWS, SOLAR_TRUE, SOLAR_TRUE_V07, SOLAR_TRUE_V08, ...PLANET_VIEWS_V4_6, ...EARTH_VIEWS_V11_20, ...EARTH_VIEWS_V21, ...EARTH_VIEWS_V22, ...EARTH_VIEWS_V23, ROBOT_BANANA, ...ROBOT_LOOP, ...HAWK, ...CORNICE, GALAXY_SUN, GALAXY_SUN_V02, GALAXY_SUN_V03, GALAXY_SUN_V04, GALAXY_HELIX_V05, GALAXY_HELIX_V06, GALAXY_HELIX_V07, GALAXY_HELIX_V08] };
