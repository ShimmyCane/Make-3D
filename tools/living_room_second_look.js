// Living room, second look (V11 to V15). Built from two more photos (kept in private/, not committed).
// Sizes are visual estimates in inches, not measurements. Z up.
//
// Why a new layout: the new photos show the room is longer than the first layout assumed. The TV wall is a side
// wall (the yellow bookcase runs along it), and the sofa, the big window, two narrow windows and the front door
// are all on the far wall. So this file is drawn in final coordinates, with no mirror step.
//
// Coordinates: the camera stands at the near end, looking toward +y. So +x is to the right, +y is away from the
// camera, and z is up. The room is 156 in wide (x), 216 in long (y), 96 in high. The near end is open.
// Rotation is about Y only, so chairs can only face along +y or -y.

const W = 156; // room width, x
const L = 216; // room length, y (far wall at y = L)
const H = 96;  // room height, z
const T = 4;   // wall thickness

const MATERIALS = {
  wall: { color: '#f7f3ea', opacity: 1 },
  floor: { color: '#c9955f', opacity: 1 },
  yellow: { color: '#f2c94c', opacity: 1 },
  black: { color: '#1d1f23', opacity: 1 },
  pot: { color: '#c97b5d', opacity: 1 },
  potBlue: { color: '#2d4f8a', opacity: 1 },
  leaf: { color: '#5f9e5a', opacity: 1 },
  leafLight: { color: '#86b86f', opacity: 1 },
  trunk: { color: '#7a5a43', opacity: 1 },
  sofa: { color: '#8d949c', opacity: 1 },
  glass: { color: '#bfe3f2', opacity: 0.45 },
  door: { color: '#8a5a3c', opacity: 1 },
  trim: { color: '#ffffff', opacity: 1 },
  tableWood: { color: '#e3c08f', opacity: 1 },
  tableLeg: { color: '#f4f1ea', opacity: 1 },
  chairWood: { color: '#d4a77a', opacity: 1 },
  chairBlue: { color: '#3f8fd2', opacity: 1 },
  rug: { color: '#aebfae', opacity: 1 },
  bin: { color: '#f5f5f2', opacity: 1 },
  shoe1: { color: '#2b2b2b', opacity: 1 },
  shoe2: { color: '#6b4f3a', opacity: 1 },
  cork: { color: '#a77f58', opacity: 1 },
  chairPink: { color: '#e7a9c4', opacity: 1 },
  fan: { color: '#9ec9e8', opacity: 1 },
  fanPink: { color: '#f2b8c6', opacity: 1 },
  puzzleBox: { color: '#8c3b2e', opacity: 1 },
  bottle: { color: '#2f7f86', opacity: 1 },
  boxDark: { color: '#3a3a3a', opacity: 1 },
  puzzle1: { color: '#6fa8dc', opacity: 1 },
  puzzle2: { color: '#f4c542', opacity: 1 },
  paperRed: { color: '#d64545', opacity: 1 },
  paperWhite: { color: '#fafafa', opacity: 1 },
  poster: { color: '#8fb8e0', opacity: 1 },
  lantern: { color: '#e8532c', opacity: 1 },
  printer: { color: '#6c7075', opacity: 1 },
  boxBrown: { color: '#b08a5a', opacity: 1 },
  green: { color: '#5fae54', opacity: 1 },
  paperBag: { color: '#e8d9b5', opacity: 1 },
  clearBin: { color: '#dfe7ea', opacity: 1 },
  basket: { color: '#d9bf8c', opacity: 1 },
  jacket: { color: '#222428', opacity: 1 },
  book0: { color: '#e76f51', opacity: 1 },
  book1: { color: '#2a9d8f', opacity: 1 },
  book2: { color: '#e9c46a', opacity: 1 },
  book3: { color: '#6d597a', opacity: 1 },
  book4: { color: '#8ab17d', opacity: 1 },
  book5: { color: '#f4a261', opacity: 1 },
  book6: { color: '#457b9d', opacity: 1 },
  lightPanel: { color: '#fffbe6', opacity: 1 },
};

// Openings in the far wall, as x ranges and z ranges (inches).
const FAR_OPENINGS = [
  { key: 'narrow-left', x0: 10, x1: 22, z0: 42, z1: 84, glass: true },
  { key: 'big', x0: 34, x1: 92, z0: 36, z1: 84, glass: true },
  { key: 'narrow-right', x0: 100, x1: 110, z0: 42, z1: 84, glass: true },
  { key: 'door', x0: 118, x1: 150, z0: 0, z1: 80, glass: false },
];

// The far-wall openings for each version. V2.1 keeps one window at the corner only (on the TV wall), so the far
// corner window is removed here. V2.3 sets the narrow right window's sill to 36 in, as the big window's sill.
function farOpeningsFor(v) {
  return FAR_OPENINGS
    .filter((o) => !(v >= 21 && o.key === 'narrow-left'))
    .map((o) => (v >= 23 && o.key === 'narrow-right' ? { ...o, z0: 36 } : o));
}

function defsFor2(v) {
  const far = farOpeningsFor(v);
  // V2.2 moves the TV console to the near unit; the far unit top gets the plants and fans.
  const tvY = v >= 22 ? 28 : 84;
  const d = [];
  const add = (key, name, description, type, dimensions, position, material, extra = {}) =>
    d.push([key, { name, description, type, dimensions, position, material, ...extra }]);

  // Foliage: one ball before V15; from V15 a group of leaf clusters, so the plants read as leafy plants.
  const foliage = (key, name, desc, x, y, z, r) => {
    if (v < 15) { add(key, name, desc, 'sphere', [r], [x, y, z], 'leaf'); return; }
    add(key, name, desc, 'group', [], [0, 0, 0], null);
    [[0, 0, 0.35], [-0.7, 0.1, 0.1], [0.7, 0, 0.2], [0.2, -0.5, -0.1], [-0.3, 0.6, 0.5], [0.5, 0.4, -0.3]].forEach(([dx, dy, dz], i) =>
      add(`${key}-${i + 1}`, `${name}, cluster ${i + 1}`, '', 'sphere', [r * 0.55], [x + dx * r, y + dy * r, z + dz * r], i % 2 ? 'leaf' : 'leafLight', { parent: key }));
  };

  // A chair faces the table. Its back is on the side away from the table: towards = +1 when the table is at higher y.
  const chair = (key, name, desc, x, y, towards, seatH, mat) => {
    add(key, name, desc, 'group', [], [0, 0, 0], null);
    add(`${key}-seat`, `${name} seat`, '', 'box', [14, 14, 1.5], [x, y, seatH - 0.75], mat, { parent: key });
    add(`${key}-back`, `${name} back`, '', 'box', [14, 1.2, 10], [x, y - towards * 6.75, seatH + 5], mat, { parent: key });
    [[-6, -6], [6, -6], [-6, 6], [6, 6]].forEach(([dx, dy], i) =>
      add(`${key}-leg-${i + 1}`, `${name} leg ${i + 1}`, '', 'box', [1.2, 1.2, seatH - 1.5], [x + dx, y + dy, (seatH - 1.5) / 2], mat, { parent: key }));
  };

  // A wall along x, at y = yc, from x0 to x1, with openings. Each opening gets the wall below and above it.
  const wallAlongX = (prefix, x0, x1, yc, openings) => {
    let cursor = x0;
    const strip = (a, b) => {
      if (b - a > 0.01) add(`${prefix}-x${Math.round(a)}`, 'Wall piece', 'context only', 'box', [b - a, T, H], [(a + b) / 2, yc, H / 2], 'wall');
    };
    for (const o of openings) {
      strip(cursor, o.x0);
      const w = o.x1 - o.x0;
      const xc = (o.x0 + o.x1) / 2;
      if (o.z0 > 0) add(`${prefix}-${o.key}-below`, `Wall below ${o.key}`, 'context only', 'box', [w, T, o.z0], [xc, yc, o.z0 / 2], 'wall');
      if (o.z1 < H) add(`${prefix}-${o.key}-above`, `Wall above ${o.key}`, 'context only', 'box', [w, T, H - o.z1], [xc, yc, (H + o.z1) / 2], 'wall');
      cursor = o.x1;
    }
    strip(cursor, x1);
  };

  // ---- V11: re-layout in the new orientation (blockout) -------------------
  add('floor', 'Floor', 'wood floor, room footprint', 'box', [W, L, 0.5], [W / 2, L / 2, 0.25], 'floor');
  if (v < 16) add('wall-left', 'Left wall (TV wall)', 'context only, the bookcase runs along it', 'box', [T, L, H], [-T / 2, L / 2, H / 2], 'wall');
  if (v >= 16) {
    // V16: the TV wall has one window, near the far corner, as the plan and photos show. Wall pieces run along y.
    const tvWindow = { key: 'tv-wall', y0: 170, y1: 188, z0: 42, z1: 84 };
    const yc = -T / 2;
    add('tvwall-y0', 'TV wall, near part', 'context only', 'box', [T, tvWindow.y0, H], [yc, tvWindow.y0 / 2, H / 2], 'wall');
    add('tvwall-y1', 'TV wall, far part', 'context only', 'box', [T, L - tvWindow.y1, H], [yc, (L + tvWindow.y1) / 2, H / 2], 'wall');
    add('tvwall-below', 'Wall below TV-wall window', 'context only', 'box', [T, tvWindow.y1 - tvWindow.y0, tvWindow.z0], [yc, (tvWindow.y0 + tvWindow.y1) / 2, tvWindow.z0 / 2], 'wall');
    add('tvwall-above', 'Wall above TV-wall window', 'context only', 'box', [T, tvWindow.y1 - tvWindow.y0, H - tvWindow.z1], [yc, (tvWindow.y0 + tvWindow.y1) / 2, (H + tvWindow.z1) / 2], 'wall');
    add('glass-tv-wall', 'Window glass, TV wall', 'the one window on the TV wall, near the far corner', 'box', [0.5, tvWindow.y1 - tvWindow.y0, tvWindow.z1 - tvWindow.z0], [0.25, (tvWindow.y0 + tvWindow.y1) / 2, (tvWindow.z0 + tvWindow.z1) / 2], 'glass');
  }
  add('wall-right', 'Right wall', 'context only', 'box', [T, L, H], [W + T / 2, L / 2, H / 2], 'wall');
  wallAlongX('far', 0, W, L + T / 2, far);
  far.filter((o) => o.glass).forEach((o) =>
    add(`glass-${o.key}`, `Window glass, ${o.key}`, 'pane in the opening', 'box', [o.x1 - o.x0, 0.5, o.z1 - o.z0], [(o.x0 + o.x1) / 2, L - 0.25, (o.z0 + o.z1) / 2], 'glass'));
  add('door-panel', 'Front door', 'brown door in the far wall, right side', 'box', [32, 1.5, 80], [134, L - 0.75, 40], 'door');

  // Left wall bookcase: two yellow units side by side, four cubes each, 14 in cubes, two high, one cube deep.
  // Runs from the near end (y = 0) to y = 112. The TV stands on the black console on the second unit.
  add('bookcase', 'Yellow bookcase, two units', 'eight cubes, 14 in each, along the left wall', 'group', [], [0, 0, 0], null);
  add('bc-back', 'Bookcase back', '', 'box', [0.8, 112, 28], [13.6, 56, 14], 'yellow', { parent: 'bookcase' });
  add('bc-shelf-bottom', 'Bookcase bottom', '', 'box', [14, 112, 1.2], [7, 56, 0.6], 'yellow', { parent: 'bookcase' });
  add('bc-shelf-middle', 'Bookcase middle shelf', '', 'box', [14, 112, 1.2], [7, 56, 14], 'yellow', { parent: 'bookcase' });
  add('bc-shelf-top', 'Bookcase top', '', 'box', [14, 112, 1.2], [7, 56, 27.4], 'yellow', { parent: 'bookcase' });
  add('bc-side-near', 'Bookcase near end', '', 'box', [14, 1.2, 28], [7, 0.6, 14], 'yellow', { parent: 'bookcase' });
  add('bc-side-far', 'Bookcase far end', '', 'box', [14, 1.2, 28], [7, 111.4, 14], 'yellow', { parent: 'bookcase' });
  [14, 28, 42, 56, 70, 84, 98].forEach((y) =>
    add(`bc-divider-${y}`, `Bookcase divider at ${y} in`, '', 'box', [14, 1.2, 28], [7, y, 14], 'yellow', { parent: 'bookcase' }));
  add('tv-console', 'Black TV console', 'low black stand on the TV unit', 'box', [14, 56, 12], [7, tvY, 34], 'black');
  add('tv', 'TV', 'large flat TV on the console, about 60 in wide, face toward the room', 'box', [3, 60, 34], [4.5, tvY, 57], 'black');

  // Sofa under the big window, on the far wall.
  add('sofa', 'Grey sofa', 'under the big window on the far wall, 64 in long', 'group', [], [0, 0, 0], null);
  add('sofa-base', 'Sofa base', '', 'box', [64, 34, 10], [66, 199, 5], 'sofa', { parent: 'sofa' });
  add('sofa-back', 'Sofa back', 'low back against the far wall', 'box', [64, 8, 22], [66, 212, 21], 'sofa', { parent: 'sofa' });
  add('sofa-arm-l', 'Sofa arm, left', '', 'box', [6, 34, 16], [37, 199, 8], 'sofa', { parent: 'sofa' });
  add('sofa-arm-r', 'Sofa arm, right', '', 'box', [6, 34, 16], [95, 199, 8], 'sofa', { parent: 'sofa' });
  add('sofa-cushions', 'Seat cushions', 'two seat cushions', 'box', [52, 26, 6], [66, 195, 13], 'sofa', { parent: 'sofa' });

  // Children's table in front of the sofa, with two wooden chairs on the near side and a blue chair at the right.
  add('table-top', 'Children’s table top', 'light wood top, 22 in high', 'box', [44, 30, 1.5], [66, 165, 21.25], 'tableWood');
  [[44, 153], [88, 153], [44, 177], [88, 177]].forEach(([x, y], i) =>
    add(`table-leg-${i + 1}`, `Table leg ${i + 1}`, 'white leg', 'cylinder', [1, 20.5], [x, y, 10.25], 'tableLeg'));
  chair('chair-1', 'Wooden chair 1', 'near side of the table, faces it', 56, 138, 1, 12, 'chairWood');
  chair('chair-2', 'Wooden chair 2', 'near side of the table, beside chair 1', 76, 138, 1, 12, 'chairWood');
  chair('chair-blue', 'Blue chair', 'small plastic chair, right side of the table', 106, 156, 1, 10, 'chairBlue');

  // Plants: monstera by the left narrow window, fiddle-leaf fig in a blue pot near the camera on the right.
  add('monstera-pot', 'Monstera pot', 'terracotta pot, far left', 'cylinder', [8, 16], [22, 204, 8], 'pot');
  foliage('monstera-leaves', 'Monstera leaves', 'leafy plant, far left', 22, 204, 46, 14);
  add('fig-pot', 'Fiddle-leaf pot', 'blue pot, near right corner', 'cylinder', [10, 20], [140, 30, 10], 'potBlue');
  add('fig-trunk', 'Fiddle-leaf trunk', 'thin tall trunk', 'cylinder', [0.8, 70], [140, 30, 55], 'trunk');
  foliage('fig-leaves', 'Fiddle-leaf crown', 'big leaves at the top', 140, 30, 84, 16);

  // Floor items: suitcase by the bookcase, white bin, rug and shoes at the door.
  add('suitcase', 'Black suitcase', 'upright suitcase, near end of the bookcase', 'box', [14, 22, 22], [28, 40, 11], 'black');
  add('bin', 'Bin', 'white bin, near middle', 'cylinder', [7, 16], [46, 36, 8], 'bin');
  add('rug', 'Rug', 'grey-green rug at the door', 'box', [32, 24, 0.5], [134, 186, 0.75], 'rug');
  add('shoe-1', 'Shoe 1', 'dark shoe on the rug', 'box', [8, 4, 3], [126, 190, 2.5], 'shoe1');
  add('shoe-2', 'Shoe 2', 'brown shoe on the rug', 'box', [8, 4, 3], [142, 194, 2.5], 'shoe2');

  if (v >= 12) {
    // V12: ceiling. Cork tiles in a straight grid (the photo's tiles are angled, and only Y rotation is allowed here),
    // and two light panels. Ceiling underside at z = 96.
    const tileX = [26, 78, 130];
    const tileY = [24, 60, 96, 132, 168, 204];
    tileX.forEach((x, i) => tileY.forEach((y, j) =>
      add(`ceiling-tile-${i + 1}-${j + 1}`, 'Cork ceiling tile', 'brown cork tile, straight grid', 'box', [44, 32, 1], [x, y, H - 0.5], 'cork')));
    add('light-1', 'Light panel 1', 'white ceiling light, near the sofa', 'box', [36, 28, 1], [78, 80, H - 0.5], 'lightPanel');
    add('light-2', 'Light panel 2', 'white ceiling light, near the table', 'box', [36, 28, 1], [78, 150, H - 0.5], 'lightPanel');
  }

    if (v >= 13) {
    // V13: wall decor from the two photos, a white trim frame round the front door, and the paper lantern.
    add('paper-red-1', 'Red paper diamond 1', 'red paper cut-out on the TV wall, above the bookcase', 'box', [0.3, 9, 9], [0.15, 40, 70], 'paperRed');
    add('paper-red-2', 'Red paper diamond 2', 'red paper cut-out on the TV wall, above the bookcase', 'box', [0.3, 9, 9], [0.15, 56, 70], 'paperRed');
    add('paper-chart', 'Paper chart', 'white chart with handwritten lines, TV wall', 'box', [0.3, 14, 20], [0.15, 26, 58], 'paperWhite');
    add('poster-right', 'Blue poster', 'blue character chart on the right wall', 'box', [0.3, 22, 30], [W - 0.15, 170, 56], 'poster');
    add('switch-right', 'Light switch', 'white plate by the door', 'box', [0.4, 4, 6], [W - 0.2, 150, 52], 'trim');
    add('door-jamb-l', 'Door frame, left', 'white trim', 'box', [1.5, 1, 80], [117, L - 0.5, 40], 'trim');
    add('door-jamb-r', 'Door frame, right', 'white trim', 'box', [1.5, 1, 80], [151, L - 0.5, 40], 'trim');
    add('door-head', 'Door frame, top', 'white trim', 'box', [35, 1, 2], [134, L - 0.5, 81], 'trim');
    add('lantern', 'Paper lantern', 'orange paper lantern hanging by the fiddle-leaf', 'sphere', [6], [146, 28, 66], 'lantern');
  }

    if (v >= 14) {
    // V14: bookcase contents from the TV-wall photo. Near unit (y 0-56): printer on top, storage boxes and a bag.
    // Far unit (y 56-112): upright books in the cubbies, with a basket in the bottom cubby. Two rows: z 1.2-13.8 and 15.4-28.
    add('printer', 'Printer', 'grey printer on top of the bookcase', 'box', [14, 18, 10], [7, v >= 22 ? 84 : 32, 33], 'printer');
    add('box-brown', 'Cardboard box', 'brown box, bottom left cubby', 'box', [11, 13, 8], [6, 7, 5.2], 'boxBrown', { parent: 'bookcase' });
    add('bin-green', 'Green storage bin', 'green bin, bottom cubby', 'box', [10, 12, 8], [6, 21, 5.2], 'green', { parent: 'bookcase' });
    add('bag-paper', 'Paper bag', 'beige bag, bottom cubby', 'box', [12, 10, 9], [6, 35, 5.7], 'paperBag', { parent: 'bookcase' });
    add('bins-clear', 'Clear storage boxes', 'clear boxes, bottom cubby', 'box', [11, 12, 7], [6, 49, 4.7], 'clearBin', { parent: 'bookcase' });
    add('bins-top', 'Clear storage box, top row', 'clear box, top row', 'box', [11, 12, 7], [6, 7, 19], 'clearBin', { parent: 'bookcase' });
    add('bag-top', 'Tote bag, top row', 'soft bag, top row', 'box', [12, 10, 9], [6, 35, 20], 'paperBag', { parent: 'bookcase' });
    add('basket-far', 'Basket', 'wicker basket, bottom cubby of the far unit', 'box', [12, 10, 8], [6, 77, 5.2], 'basket', { parent: 'bookcase' });

    // Books in the far unit: cubbies at y 56-70, 70-84, 84-98, 98-112; skip the basket cubby (y 70-84, bottom row).
    const bookColors = ['book0', 'book1', 'book2', 'book3', 'book4', 'book5', 'book6'];
    let n = 0;
    [[1.2, 13.8], [15.4, 28]].forEach(([z0, z1], r) => [[56, 70], [70, 84], [84, 98], [98, 112]].forEach(([y0, y1], c) => {
      if (r === 0 && c === 1) return;
      let y = y0 + 0.8;
      for (let i = 0; i < 6 && y < y1 - 2.4; i++) {
        const w = 1.2 + ((n * 7 + i * 3) % 5) * 0.2;   // book thickness along y, 1.2 to 2.0 in
        const h = 7.5 + ((n * 5 + i * 11) % 5) * 0.7;  // book height along z, 7.5 to 10.3 in
        if (y + w > y1 - 0.8 || h > z1 - z0) break;
        add(`book-${n}`, `Book ${n + 1}`, '', 'box', [9, w, h], [6.5, y + w / 2, z0 + h / 2], bookColors[(n * 3) % 7], { parent: 'bookcase' });
        y += w + 0.1;
        n++;
      }
    }));

    // Wooden chair near the camera on the right, with a dark jacket over its back.
    chair('chair-near', 'Wooden chair, near camera', 'near the camera, faces the table', 100, 44, 1, 12, 'chairWood');
    add('jacket', 'Dark jacket on the chair', 'jacket over the back of the near chair', 'box', [13, 2, 12], [100, 37.5, 33], 'jacket');
  }

    if (v >= 16) {
    // V16: detail restored from V10 and checked against the plan and elevations.
    // Window frames: white, 1.5 in wide, on the room face of every window.
    const frame = (key, o, face) => {
      const w = o.x1 - o.x0, h = o.z1 - o.z0;
      if (face === 'far') {
        add(`${key}-top`, `${key} frame, head`, 'white frame', 'box', [w + 3, 1, 1.5], [(o.x0 + o.x1) / 2, L - 0.5, o.z1 + 0.75], 'trim');
        add(`${key}-sill`, `${key} frame, sill`, 'white frame', 'box', [w + 3, 1, 1.5], [(o.x0 + o.x1) / 2, L - 0.5, o.z0 - 0.75], 'trim');
        add(`${key}-left`, `${key} frame, left`, 'white frame', 'box', [1.5, 1, h], [o.x0 - 0.75, L - 0.5, (o.z0 + o.z1) / 2], 'trim');
        add(`${key}-right`, `${key} frame, right`, 'white frame', 'box', [1.5, 1, h], [o.x1 + 0.75, L - 0.5, (o.z0 + o.z1) / 2], 'trim');
      }
    };
    far.filter((o) => o.glass).forEach((o) => frame(`frame-${o.key}`, o, 'far'));
    // TV-wall window frame (on the room face, x = 0.5).
    add('frame-tv-top', 'TV-wall window frame, head', 'white frame', 'box', [1, 18 + 3, 1.5], [0.5, 179, 84.75], 'trim');
    add('frame-tv-sill', 'TV-wall window frame, sill', 'white frame', 'box', [1, 18 + 3, 1.5], [0.5, 179, 41.25], 'trim');
    add('frame-tv-near', 'TV-wall window frame, near', 'white frame', 'box', [1, 1.5, 42], [0.5, 169.25, 63], 'trim');
    add('frame-tv-far', 'TV-wall window frame, far', 'white frame', 'box', [1, 1.5, 42], [0.5, 188.75, 63], 'trim');
    // Baseboards, 4 in high. Left wall skips the window; far wall skips the door.
    add('base-left-near', 'Baseboard, left wall, near', 'white, 4 in high', 'box', [1, 170, 4], [0.5, 85, 2], 'trim');
    add('base-left-far', 'Baseboard, left wall, far', 'white, 4 in high', 'box', [1, L - 188, 4], [0.5, (188 + L) / 2, 2], 'trim');
    add('base-right', 'Baseboard, right wall', 'white, 4 in high', 'box', [1, L, 4], [W - 0.5, L / 2, 2], 'trim');
    add('base-far-left', 'Baseboard, far wall, left of door', 'white, 4 in high', 'box', [118, 1, 4], [59, L - 0.5, 2], 'trim');
    add('base-far-right', 'Baseboard, far wall, right of door', 'white, 4 in high', 'box', [W - 150, 1, 4], [(150 + W) / 2, L - 0.5, 2], 'trim');
    add('door-handle', 'Door handle', 'round handle, about waist high', 'sphere', [1], [126, L - 2, 38], 'trim');

    // Bookcase top and the table, restored from V10. Near unit top is y 0-56 at z 28; the TV console is on the far unit.
    if (v < 22) {
      add('fan-blue', 'Blue fan', 'small blue fan on the near unit top', 'cylinder', [4, 7], [7, 50, 31.5], 'fan');
      add('fan-pink', 'Pink fan', 'small pink fan on the near unit top', 'cylinder', [3.5, 7], [7, 12, 31.5], 'fanPink');
      add('boxed-puzzle', 'Boxed puzzle', 'small boxed puzzle on the near unit top', 'box', [7, 4, 9], [7, 3, 32.5], 'puzzleBox');
      add('plant-floor-pot', 'Plant pot by the bookcase', 'terracotta pot, floor, near end of the bookcase (moved from the bookcase top)', 'cylinder', [7, 14], [30, 14, 7], 'pot');
      add('plant-floor-leaves', 'Plant by the bookcase, leaves', 'leafy plant, floor', 'sphere', [11], [30, 14, 36], 'leaf');
    } else {
      // V2.2: the photos show the plants and fans on the far end of the bookcase, beside the corner window.
      add('boxed-puzzle', 'Boxed puzzle', 'small boxed puzzle on the TV console, near end', 'box', [7, 4, 9], [7, 6, 44.5], 'puzzleBox');
      add('plant-pot-far', 'Plant pot, far end of the bookcase', 'terracotta pot on the far unit top', 'cylinder', [6, 12], [7, 66, 34], 'pot');
      add('plant-leaves-far', 'Plant, far end, leaves', 'leafy plant on the far unit top', 'sphere', [10], [7, 66, 50], 'leaf');
      add('plant-pot-far-2', 'Second plant pot, far end', 'smaller pot beside the first', 'cylinder', [5, 10], [7, 92, 33], 'pot');
      add('plant-leaves-far-2', 'Second plant, leaves', 'smaller leafy plant', 'sphere', [9], [7, 92, 46], 'leaf');
      add('fan-pink', 'Pink fan', 'small pink fan, far end of the bookcase', 'cylinder', [3.5, 7], [7, 106, 31.5], 'fanPink');
      add('fan-blue', 'Blue fan', 'small blue fan, far end of the bookcase', 'cylinder', [4, 7], [7, 100, 31.5], 'fan');
    }
    add('bottle', 'Water bottle', 'teal bottle on the children’s table', 'cylinder', [2.3, 10], [74, 170, 27], 'bottle');
    add('dark-box', 'Dark box', 'dark case on the children’s table', 'box', [14, 8, 3], [60, 158, 23.5], 'boxDark');
    add('puzzle-1', 'Puzzle sheet 1', 'blue sheet on the table', 'box', [12, 9, 0.3], [52, 166, 22.15], 'puzzle1');
    add('puzzle-2', 'Puzzle sheet 2', 'yellow sheet on the table', 'box', [10, 8, 0.3], [78, 174, 22.15], 'puzzle2');
    chair('chair-3', 'Wooden chair 3', 'near side of the table, beside chairs 1 and 2 (restored from V10)', 96, 138, 1, 12, 'chairWood');

    // Books in the top row of the near unit, in the cubbies with no top-row items (y 14-28 and 42-56).
    let n = 200;
    [[14, 28], [42, 56]].forEach(([y0, y1]) => {
      let y = y0 + 0.8;
      for (let i = 0; i < 6 && y < y1 - 2.4; i++) {
        const w = 1.2 + ((n * 7 + i * 3) % 5) * 0.2;
        const h = 7.5 + ((n * 5 + i * 11) % 5) * 0.7;
        if (y + w > y1 - 0.8 || h > 12.6) break;
        add(`book-near-${n}`, `Book, near unit ${n - 199}`, '', 'box', [9, w, h], [6.5, y + w / 2, 15.4 + h / 2], ['book0', 'book1', 'book2', 'book3', 'book4', 'book5', 'book6'][(n * 3) % 7], { parent: 'bookcase' });
        y += w + 0.1;
        n++;
      }
    });
  }

  if (v >= 24) {
    // V2.4: pink chair at the near end by the bookcase, as in the near-end photo. Its back faces the bookcase.
    chair('chair-pink', 'Pink chair', 'small pink chair at the near end, by the bookcase', 10, 30, 1, 12, 'chairPink');
  }
  if (v >= 25) {
    // V2.5: small white floor fan by the bookcase, as in the near-end photo.
    add('fan-floor', 'Floor fan', 'small white floor fan by the bookcase', 'cylinder', [5, 12], [24, 72, 6], 'bin');
  }

  if (v >= 15) {
    // V15: group the parts so the Objects list shows the structure. Only ungrouped parts are moved; groups go first.
    const groups = [
      ['room-shell', 'Room shell', 'floor, walls, the far wall with openings and the front door', /^(floor$|wall-|far-|door-panel)/],
      ['windows', 'Windows', 'glass panes', /^glass-/],
      ['ceiling', 'Ceiling', 'cork tiles and light panels', /^(ceiling-tile|light-)/],
      ['tv-wall', 'TV wall things', 'TV, console, paper cut-outs and chart on the TV wall', /^(tv|paper-|printer)/],
      ['plants', 'Plants', 'pots, trunks and leaves', /^(monstera|fig-)/],
      ['childrens-table', 'Children’s table and chairs', 'table, chairs, jacket and the things on the table', /^(table-|chair|jacket)/],
      ['decor', 'Wall decor', 'poster, switch, lantern and door frame', /^(poster-|switch-|door-(jamb|head)|lantern)/],
      ['floor-items', 'Floor items', 'rug, bin, suitcase and shoes', /^(rug|bin|suitcase|shoe-)/],
    ];
    for (const [k, def] of d) {
      if (def.type === 'group' || def.parent) continue;
      const g = groups.find(([, , , re]) => re.test(k));
      if (g) def.parent = g[0];
    }
    d.unshift(...groups.map(([k, n, desc]) => [k, { name: n, description: desc, type: 'group', dimensions: [], position: [0, 0, 0], material: null }]));
  }

  return d;
}

const NOTES = {
  11: 'V11: second look. The new photos show the room is longer. The TV wall is the left wall, the sofa, big window, two narrow windows and front door are on the far wall. Whole layout redrawn in that orientation. Blockout with 14 in bookcase cubes.',
  12: 'V12: ceiling added from the far-wall photo: a grid of cork tiles and two light panels. Tiles are straight, not angled, because the model only rotates about Y.',
  13: 'V13: review of V12. The cork tiles hid the room from above, so they are now see-through. Added the red paper cut-outs and white chart on the TV wall, the blue poster and light switch on the right wall, a white frame round the front door, and the paper lantern.',
  14: 'V14: bookcase contents from the TV-wall photo: printer on top of the near unit, storage boxes and bags, and about 40 upright books in the far unit with a basket. Added the wooden chair with a dark jacket near the camera.',
  15: 'V15: final pass on V14. Plants are leaf clusters, not single balls. Objects grouped (room shell, windows, ceiling, TV wall, plants, children’s table and chairs, decor, floor items), so the Objects list shows the structure. Layout unchanged.',
  21: 'V2.1: plan reconciled with all three photos. One window on the TV wall, at the far corner (it is the window beside the sofa and above the far end of the bookcase), not two. The far wall keeps the big window behind the sofa and the narrow window by the front door.',
  22: 'V2.2: from the TV-wall and near-end photos. The TV stands on the near unit of the bookcase; the printer, plants and fans are on the far unit top, near the corner window, as in the first photo. The boxed puzzle sits on the TV console.',
  23: 'V2.3: from the far-wall elevation. The narrow window by the door has its sill at 36 in, the same as the big window.',
  24: 'V2.4: from the right-wall elevation and the near-end photo. A pink chair by the bookcase, at the near end.',
  25: 'V2.5: final. A small white floor fan by the pink chair, as in the near-end photo. Grouped as before.',
  16: 'V16: merge of V15 and V10. Restored from V10: window frames on every window, a window on the TV wall (near the far corner, as in the photos), baseboards, door handle, blue and pink fans and the boxed puzzle on the bookcase, the water bottle, dark box, two puzzle sheets and the third wooden chair, plus books in the near unit. The V10 bookcase plants moved to the floor, since the TV console now sits on the far unit.',
};

// V2.1 to V2.5 are internal versions 21 to 25; they get ids living-room-v2-1 ... and names "Living room V2.1" ...
function sceneFor2(v) {
  const label = v >= 21 ? `V2.${v - 20}` : `V${String(v).padStart(2, '0')}`;
  const id = v >= 21 ? `living-room-v2-${v - 20}` : `living-room-v${String(v).padStart(2, '0')}`;
  return {
    id,
    builtin: true,
    header: {
      model_id: id,
      name: `Living room ${label}`,
      description: `Living room from two photos, estimated sizes in inches. ${NOTES[v]}`,
      units: 'in', up: 'z', world: 'default-world',
      view: { azimuth_deg: 34 },   // camera at the open near end, looking toward the far wall
      // From V13 the cork tiles are see-through, so the room shows through the ceiling from above.
      materials: v >= 13 ? { ...MATERIALS, cork: { color: '#a77f58', opacity: 0.4 } } : MATERIALS,
    },
    defs: defsFor2(v),
  };
}

module.exports = { defsFor2, sceneFor2, MATERIALS };
