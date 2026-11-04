// Living room, built from a family photo (kept in private/, not committed).
// Sizes are visual estimates in inches, not measurements. Z up. Y is depth: the back wall is y = 0 and the room
// runs toward +y, toward the camera. X runs left to right along the back wall, from x = 0 at the left wall.
// Rotation is about Y only, so chairs can only face along +y or -y.
//
// One code path builds every version: defsFor(v). Version N is the blockout or fix list from the review of
// version N-1. Keep the older versions reproducible: edit by adding "if (v >= N)" blocks, not by deleting.

const WORLD_ID = 'default-world';

const MATERIALS = {
  wall: { color: '#f7f3ea', opacity: 1 },
  floor: { color: '#c9955f', opacity: 1 },
  yellow: { color: '#f2c94c', opacity: 1 },
  black: { color: '#1d1f23', opacity: 1 },
  pot: { color: '#c97b5d', opacity: 1 },
  leaf: { color: '#5f9e5a', opacity: 1 },
  leafLight: { color: '#86b86f', opacity: 1 },
  fan: { color: '#9ec9e8', opacity: 1 },
  fanPink: { color: '#f2b8c6', opacity: 1 },
  sofa: { color: '#8d949c', opacity: 1 },
  glass: { color: '#bfe3f2', opacity: 0.45 },
  tableWood: { color: '#e3c08f', opacity: 1 },
  tableLeg: { color: '#f4f1ea', opacity: 1 },
  chairWood: { color: '#d4a77a', opacity: 1 },
  chairBlue: { color: '#3f8fd2', opacity: 1 },
  rug: { color: '#aebfae', opacity: 1 },
  bin: { color: '#f5f5f2', opacity: 1 },
  door: { color: '#8a5a3c', opacity: 1 },
  basket: { color: '#d9bf8c', opacity: 1 },
  trim: { color: '#ffffff', opacity: 1 },
  puzzleBox: { color: '#8c3b2e', opacity: 1 },
  bottle: { color: '#2f7f86', opacity: 1 },
  boxDark: { color: '#3a3a3a', opacity: 1 },
  puzzle1: { color: '#6fa8dc', opacity: 1 },
  puzzle2: { color: '#f4c542', opacity: 1 },
  shoe1: { color: '#2b2b2b', opacity: 1 },
  shoe2: { color: '#6b4f3a', opacity: 1 },
  book0: { color: '#e76f51', opacity: 1 },
  book1: { color: '#2a9d8f', opacity: 1 },
  book2: { color: '#e9c46a', opacity: 1 },
  book3: { color: '#6d597a', opacity: 1 },
  book4: { color: '#8ab17d', opacity: 1 },
  book5: { color: '#f4a261', opacity: 1 },
  book6: { color: '#457b9d', opacity: 1 },
};

function defsFor(v) {
  // V11 on: the second look, redrawn in the new orientation (tools/living_room_second_look.js).
  if (v >= 11) return require('./living_room_second_look.js').defsFor2(v);
  const d = [];
  // add(key, name, description, type, dimensions, position, material, extra)
  const add = (key, name, description, type, dimensions, position, material, extra = {}) =>
    d.push([key, { name, description, type, dimensions, position, material, ...extra }]);

  // ---- V01: blockout -------------------------------------------------------
  // Room: 200 in wide (x), 144 in deep (y), 96 in high (z). Floor top at z = 0.5.
  add('floor', 'Floor', 'wood floor, room footprint', 'box', [200, 144, 0.5], [100, 72, 0.25], 'floor');

  // Back wall (y = 0) with two window openings: narrow A (x 128-146, z 42-84), wide B (x 150-196, z 36-84).
  add('wall-back-left', 'Back wall, left part', 'context only', 'box', [128, 4, 96], [64, -2, 48], 'wall');
  add('wall-gap', 'Back wall, between windows', 'context only', 'box', [4, 4, 96], [148, -2, 48], 'wall');
  add('wall-back-right', 'Back wall, far right', 'context only', 'box', [4, 4, 96], [198, -2, 48], 'wall');
  add('wall-A-above', 'Above window A', 'context only', 'box', [18, 4, 12], [137, -2, 90], 'wall');
  add('wall-A-below', 'Below window A', 'context only', 'box', [18, 4, 42], [137, -2, 21], 'wall');
  add('wall-B-above', 'Above window B', 'context only', 'box', [46, 4, 12], [173, -2, 90], 'wall');
  add('wall-B-below', 'Below window B', 'context only', 'box', [46, 4, 36], [173, -2, 18], 'wall');
  add('wall-left', 'Left wall', 'context only', 'box', [4, 144, 96], [-2, 72, 48], 'wall');
  add('wall-right', 'Right wall', 'context only, door is on it', 'box', [4, 144, 96], [202, 72, 48], 'wall');
  add('door', 'Door', 'door to the next room, front right', 'box', [2, 30, 80], [199, 118, 40], 'door');

  // Bookcase: yellow cube unit, four cubes wide (120 in), two high (30 in), 14 in deep.
  if (v < 2) {
    add('bookcase', 'Yellow bookcase', 'low cube unit under the TV, 120 in wide', 'box', [120, 14, 30], [60, 7, 15], 'yellow');
  } else {
    // V02: four cubes wide, two high, from parts: back, two sides, three dividers, three shelves.
    add('bookcase', 'Yellow bookcase', 'low cube unit under the TV, 120 in wide, eight open cubbies', 'group', [], [0, 0, 0], null);
    add('bc-back', 'Bookcase back', 'back panel of the yellow unit', 'box', [120, 0.8, 30], [60, 0.4, 15], 'yellow', { parent: 'bookcase' });
    add('bc-side-l', 'Bookcase left side', '', 'box', [1.2, 14, 30], [0.6, 7, 15], 'yellow', { parent: 'bookcase' });
    add('bc-side-r', 'Bookcase right side', '', 'box', [1.2, 14, 30], [119.4, 7, 15], 'yellow', { parent: 'bookcase' });
    [30, 60, 90].forEach((x, i) => add(`bc-div-${i + 1}`, `Bookcase divider ${i + 1}`, '', 'box', [1.2, 14, 30], [x, 7, 15], 'yellow', { parent: 'bookcase' }));
    [0.6, 14.4, 29.4].forEach((z, i) => add(`bc-shelf-${i + 1}`, `Bookcase shelf ${i + 1}`, '', 'box', [120, 14, 1.2], [60, 7, z], 'yellow', { parent: 'bookcase' }));
  }

  // TV on a black stand, on top of the bookcase.
  add('tv-stand', 'TV stand', 'black stand on the bookcase', 'box', [56, 12, 4], [34, 6, 32], 'black');
  add('tv', 'TV', 'large flat TV, about 56 in wide', 'box', [56, 3, 33], [34, 1.5, 50.5], 'black');

  if (v >= 2) {
    // V02: glass in the two window openings, just inside the wall.
    add('glass-A', 'Window A glass', 'narrow window, behind the plant', 'box', [18, 0.5, 42], [137, 0.25, 63], 'glass');
    add('glass-B', 'Window B glass', 'wide window, above the sofa', 'box', [46, 0.5, 48], [173, 0.25, 60], 'glass');
  }

  if (v >= 3) {
    // V03: books standing in the cubbies, two rows of four. The second cubby on the bottom row holds a basket.
    const cols = [[1.2, 29.4], [30.6, 59.4], [60.6, 89.4], [90.6, 118.8]];
    const rows = [[1.2, 13.8], [15, 28.8]];
    let n = 0;
    rows.forEach(([z0], r) => cols.forEach(([x0, x1], c) => {
      if (r === 0 && c === 1) {
        add('basket', 'Basket', 'woven basket in the bottom cubby', 'box', [12, 10, 8], [45, 5, 5.2], 'basket', { parent: 'bookcase' });
        return;
      }
      let x = x0 + 0.8;
      for (let i = 0; i < 7 && x < x1 - 2.4; i++) {
        const w = 1.2 + ((n * 7 + i * 3) % 5) * 0.2;      // book thickness, 1.2 to 2.0 in
        const h = 7.5 + ((n * 5 + i * 11) % 5) * 0.8;     // book height, 7.5 to 10.7 in
        if (x + w > x1 - 0.8) break;
        add(`book-${n}`, `Book ${n + 1}`, '', 'box', [w, 9, h], [x + w / 2, 5.5, z0 + h / 2], `book${(n * 3) % 7}`, { parent: 'bookcase' });
        x += w + 0.1;
        n++;
      }
    }));
  }

  // Plant foliage: one ball in V01 to V04; in V05 a group of leaf clusters, so it reads as a leafy plant.
  const leaves = (key, name, desc, x, y, z, r) => {
    if (v < 5) { add(key, name, desc, 'sphere', [r], [x, y, z], 'leaf'); return; }
    add(key, name, desc, 'group', [], [0, 0, 0], null);
    [[0, 0, 0.35], [-0.7, 0.1, 0.1], [0.7, 0, 0.2], [0.2, -0.5, -0.1], [-0.3, 0.6, 0.5], [0.5, 0.4, -0.3]].forEach(([dx, dy, dz], i) =>
      add(`${key}-${i + 1}`, `${name}, leaf cluster ${i + 1}`, '', 'sphere', [r * 0.55], [x + dx * r, y + dy * r, z + dz * r], i % 2 ? 'leaf' : 'leafLight', { parent: key }));
  };

  // Things on top of the bookcase: two plants and two small fans.
  add('pot-1', 'Plant pot 1', 'terracotta pot, right end of the bookcase', 'cylinder', [6, 12], [92, 7, 36], 'pot');
  leaves('leaves-1', 'Plant 1 leaves', 'big leafy plant', 92, 7, 52, 11);
  add('pot-2', 'Plant pot 2', 'smaller pot beside plant 1', 'cylinder', [5, 10], [108, 7, 35], 'pot');
  leaves('leaves-2', 'Plant 2 leaves', 'smaller leafy plant', 108, 7, 46, 9);
  add('fan-blue', 'Blue fan', 'small blue fan on the bookcase', 'cylinder', [4, 7], [68, 8, 33.5], 'fan');
  add('fan-pink', 'Pink fan', 'small pink fan on the bookcase', 'cylinder', [3.5, 7], [80, 7, 33.5], 'fanPink');

  // Tall floor plant between the bookcase and the sofa.
  add('floor-pot', 'Tall plant pot', 'floor pot, in front of the bookcase end', 'cylinder', [8, 16], [124, 24, 8], 'pot');
  leaves('floor-leaves', 'Tall plant leaves', 'tall leafy plant', 124, 24, 50, 14);

  // Grey sofa against the back wall, under window B. Blockout: one box.
  if (v < 4) {
  add('sofa', 'Grey sofa', 'against the back wall, under the wide window, 64 in long', 'box', [64, 34, 30], [164, 17, 15], 'sofa');
  } else {
    // V04: a sofa with a low back against the wall, two arms and two seat cushions.
    add('sofa', 'Grey sofa', 'against the back wall, under the wide window, 64 in long', 'group', [], [0, 0, 0], null);
    add('sofa-base', 'Sofa base', '', 'box', [64, 34, 10], [164, 17, 5], 'sofa', { parent: 'sofa' });
    add('sofa-back', 'Sofa back', 'low back against the wall', 'box', [64, 8, 22], [164, 4, 21], 'sofa', { parent: 'sofa' });
    add('sofa-arm-l', 'Sofa arm, left end', '', 'box', [6, 34, 16], [135, 17, 8], 'sofa', { parent: 'sofa' });
    add('sofa-arm-r', 'Sofa arm, right end', '', 'box', [6, 34, 16], [193, 17, 8], 'sofa', { parent: 'sofa' });
    add('sofa-cushions', 'Seat cushions', 'two seat cushions, 52 in wide', 'box', [52, 26, 6], [164, 21, 13], 'sofa', { parent: 'sofa' });
  }

  // Children's table: 44 x 30 in top, 22 in high. Four legs.
  add('table-top', 'Children’s table top', 'light wood top, 22 in high', 'box', [44, 30, 1.5], [104, 61, 21.25], 'tableWood');
  add('table-leg-1', 'Table leg 1', 'white leg', 'cylinder', [1, 20.5], [84, 50, 10.25], 'tableLeg');
  add('table-leg-2', 'Table leg 2', 'white leg', 'cylinder', [1, 20.5], [124, 50, 10.25], 'tableLeg');
  add('table-leg-3', 'Table leg 3', 'white leg', 'cylinder', [1, 20.5], [84, 72, 10.25], 'tableLeg');
  add('table-leg-4', 'Table leg 4', 'white leg', 'cylinder', [1, 20.5], [124, 72, 10.25], 'tableLeg');

  if (v < 4) {
    // Chairs. Blockout: a seat and a back for each. A chair's back is on the side away from the table.
    add('chair-1', 'Wooden chair 1', 'back of the table, faces the table', 'box', [14, 14, 1.5], [96, 34, 11.25], 'chairWood');
    add('chair-1-back', 'Wooden chair 1 back', '', 'box', [14, 1.5, 12], [96, 27.25, 17], 'chairWood');
    add('chair-2', 'Wooden chair 2', 'left side of the table', 'box', [14, 14, 1.5], [70, 62, 11.25], 'chairWood');
    add('chair-2-back', 'Wooden chair 2 back', '', 'box', [14, 1.5, 12], [70, 55.25, 17], 'chairWood');
    add('chair-3', 'Wooden chair 3', 'front of the table, facing back', 'box', [14, 14, 1.5], [104, 94, 11.25], 'chairWood');
    add('chair-3-back', 'Wooden chair 3 back', '', 'box', [14, 1.5, 12], [104, 100.75, 17], 'chairWood');
    add('chair-blue', 'Blue chair', 'small plastic chair, front right of the table', 'box', [13, 13, 1.2], [136, 96, 10], 'chairBlue');
    add('chair-blue-back', 'Blue chair back', '', 'box', [13, 1.5, 10], [136, 102.75, 15], 'chairBlue');
  } else {
    // V04: chairs with four legs and a back. A chair can only face along y (rotation is about Y), so its back is on
    // the side away from the table: towards = +1 when the table is at higher y, -1 when it is lower.
    const chair = (key, name, desc, x, y, towards, seatH, mat) => {
      add(key, name, desc, 'group', [], [0, 0, 0], null);
      add(`${key}-seat`, `${name} seat`, '', 'box', [14, 14, 1.5], [x, y, seatH - 0.75], mat, { parent: key });
      add(`${key}-back`, `${name} back`, '', 'box', [14, 1.2, 10], [x, y - towards * 6.75, seatH + 5], mat, { parent: key });
      [[-6, -6], [6, -6], [-6, 6], [6, 6]].forEach(([dx, dy], i) =>
        add(`${key}-leg-${i + 1}`, `${name} leg ${i + 1}`, '', 'box', [1.2, 1.2, seatH - 1.5], [x + dx, y + dy, (seatH - 1.5) / 2], mat, { parent: key }));
    };
    chair('chair-1', 'Wooden chair 1', 'back of the table, faces it', 96, 34, 1, 12, 'chairWood');
    chair('chair-2', 'Wooden chair 2', 'front of the table, moved from the left side (chairs can only face along y)', 84, 94, -1, 12, 'chairWood');
    chair('chair-3', 'Wooden chair 3', 'front of the table, beside chair 2', 104, 94, -1, 12, 'chairWood');
    chair('chair-blue', 'Blue chair', 'small plastic chair, front right of the table', 136, 94, -1, 10, 'chairBlue');
  }

  if (v >= 9) {
    // V09: the door reads as a door from inside: a white frame on the room face and a round handle.
    add('door-jamb-front', 'Door frame, front', 'white frame', 'box', [1, 2, 80], [197.5, 134, 40], 'trim');
    add('door-jamb-back', 'Door frame, back', 'white frame', 'box', [1, 2, 80], [197.5, 102, 40], 'trim');
    add('door-head', 'Door frame, top', 'white frame', 'box', [1, 34, 2], [197.5, 118, 81], 'trim');
    add('door-handle', 'Door handle', 'round handle, about waist high', 'sphere', [1], [196.5, 124, 38], 'trim');
  }

  if (v >= 8) {
    // V08: a boxed puzzle on the left end of the bookcase, as in the photo.
    add('boxed-puzzle', 'Boxed puzzle', 'small boxed puzzle on the bookcase, left end', 'box', [7, 4, 9], [14, 6, 34.5], 'puzzleBox');
  }

  if (v >= 7) {
    // V07: white trim. Window frames, a baseboard along the three walls, and a light switch by the door.
    // Window A frame (x 128-146, z 42-84) and window B frame (x 150-196, z 36-84), on the room face of the wall.
    add('frame-A-top', 'Window A frame, top', 'white frame', 'box', [20, 1, 1.5], [137, 0.5, 83.25], 'trim');
    add('frame-A-bottom', 'Window A frame, sill', 'white frame', 'box', [20, 1, 1.5], [137, 0.5, 42.75], 'trim');
    add('frame-A-left', 'Window A frame, left', 'white frame', 'box', [1.5, 1, 42], [128.75, 0.5, 63], 'trim');
    add('frame-A-right', 'Window A frame, right', 'white frame', 'box', [1.5, 1, 42], [145.25, 0.5, 63], 'trim');
    add('frame-B-top', 'Window B frame, top', 'white frame', 'box', [46, 1, 1.5], [173, 0.5, 83.25], 'trim');
    add('frame-B-bottom', 'Window B frame, sill', 'white frame', 'box', [46, 1, 1.5], [173, 0.5, 36.75], 'trim');
    add('frame-B-left', 'Window B frame, left', 'white frame', 'box', [1.5, 1, 48], [150.75, 0.5, 60], 'trim');
    add('frame-B-right', 'Window B frame, right', 'white frame', 'box', [1.5, 1, 48], [195.25, 0.5, 60], 'trim');
    // Baseboards, 4 in high, along the back wall and both side walls.
    add('base-back', 'Baseboard, back wall', 'white, 4 in high', 'box', [200, 1, 4], [100, 0.5, 2], 'trim');
    add('base-left', 'Baseboard, left wall', 'white, 4 in high', 'box', [1, 144, 4], [0.5, 72, 2], 'trim');
    add('base-right', 'Baseboard, right wall', 'white, 4 in high', 'box', [1, 144, 4], [199.5, 72, 2], 'trim');
    // Light switch plate on the door wall, beside the door.
    add('switch', 'Light switch', 'white plate by the door', 'box', [0.4, 4, 6], [199.6, 96, 50], 'trim');
  }

  if (v >= 6) {
    // V06: things on the children's table, and a pair of shoes on the rug, as in the photo.
    add('bottle', 'Water bottle', 'teal bottle, on the table', 'cylinder', [2.3, 10], [110, 62, 27], 'bottle');
    add('dark-box', 'Dark box', 'dark case on the table', 'box', [14, 8, 3], [100, 52, 23.5], 'boxDark');
    add('puzzle-1', 'Puzzle sheet 1', 'flat blue sheet on the table', 'box', [12, 9, 0.3], [96, 56, 22.15], 'puzzle1');
    add('puzzle-2', 'Puzzle sheet 2', 'flat yellow sheet on the table', 'box', [10, 8, 0.3], [118, 70, 22.15], 'puzzle2');
    add('shoe-1', 'Shoe 1', 'dark shoe on the rug', 'box', [8, 4, 3], [146, 124, 2.5], 'shoe1');
    add('shoe-2', 'Shoe 2', 'brown shoe on the rug', 'box', [8, 4, 3], [156, 120, 2.5], 'shoe2');
  }

  // Floor items.
  add('rug', 'Rug', 'grey-green rug, front right', 'box', [44, 30, 0.5], [150, 122, 0.75], 'rug');
  add('bin', 'Bin', 'white bin, front left corner', 'cylinder', [6, 14], [8, 128, 7], 'bin');

  if (v >= 10) {
    // V10: group the parts so the Objects list shows the structure. Only ungrouped parts are moved; groups are added first.
    const groups = [
      ['room-shell', 'Room shell', 'floor, walls, baseboards, door and light switch', /^(floor$|wall-|base-|door|switch)/],
      ['windows', 'Windows', 'glass panes and white frames', /^(glass-|frame-)/],
      ['tv-wall', 'TV and bookcase things', 'TV, stand, fans and the boxed puzzle on the bookcase', /^(tv|boxed-puzzle|fan-)/],
      ['plants', 'Plants', 'pots and leaves', /^(pot-|leaves-|floor-pot|floor-leaves)/],
      ['childrens-table', 'Children’s table and chairs', 'table, chairs, and the things on the table', /^(table-|chair|bottle|dark-box|puzzle-)/],
      ['floor-items', 'Floor items', 'rug, bin and shoes', /^(rug|bin|shoe-)/],
    ];
    for (const [k, def] of d) {
      if (def.type === 'group' || def.parent) continue;
      const g = groups.find(([, , , re]) => re.test(k));
      if (g) def.parent = g[0];
    }
    d.unshift(...groups.map(([k, n, desc]) => [k, { name: n, description: desc, type: 'group', dimensions: [], position: [0, 0, 0], material: null }]));
  }

  // Mirror in x at the end. The layout above was written with x from the left wall, but with Z up a viewer
  // standing at the front (facing the back wall) has +x on the left. So the final x = 200 - x (groups have no size).
  return d.map(([k, def]) => (def.type === 'group' ? [k, def] : [k, { ...def, position: [200 - def.position[0], def.position[1], def.position[2]] }]));
}

const VERSION_NOTES = {
  1: 'V01: blockout. Room shell, bookcase, TV, plants, sofa, children’s table and chairs as boxes.',
  5: 'V05: review of V04. Plants now have leaf clusters instead of single balls, so they read as leafy plants. The tall plant is raised to match.',
  7: 'V07: review of V06. White trim added: window frames, baseboards on three walls, and a light switch by the door.',
  10: 'V10: final pass on V09. Objects grouped into room shell, windows, TV and bookcase things, plants, children’s table and chairs, and floor items, so the Objects list shows the structure. Layout unchanged. Known limit: the right wall hides the door from this camera, and the viewer has no wall-hiding toggle yet.',
  9: 'V09: review of V08. The door has a white frame and a round handle, so it reads as a door from inside the room.',
  8: 'V08: review of V07. Boxed puzzle added on the left end of the bookcase. The door and light switch were cut off at the bottom of the default view, so the review shot zooms out to check them. Camera unchanged.',
  6: 'V06: review of V05. Table now has a water bottle, a dark box and two puzzle sheets, as in the photo. Two shoes on the rug by the door.',
  4: 'V04: review of V03. Chairs now have four legs and a back. Chair 2 moved from the left side to the front of the table, because chairs can only face along y. Sofa now has a back, two arms and cushions.',
  3: 'V03: review of V02. Books added to the cubbies, with a basket in the bottom cubby. Door on the right wall made thicker so it shows.',
  2: 'V02: review of V01. Mirrored in x, so the TV wall is on the left as in the photo (the first layout had it on the right). Bookcase split into eight cubbies. Window glass added.',
};

function sceneFor(v) {
  const id = `living-room-v${String(v).padStart(2, '0')}`;
  return {
    id,
    builtin: true,
    header: {
      model_id: id,
      name: `Living room V${String(v).padStart(2, '0')}`,
      description: `Living room from a photo, estimated sizes in inches. ${VERSION_NOTES[v]}`,
      units: 'in', up: 'z', world: WORLD_ID,
      view: { azimuth_deg: 214 },
      materials: MATERIALS,
    },
    defs: defsFor(v),
  };
}

// Versions built so far. Add one number per review round.
const LIVING_ROOM = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 21, 22, 23, 24, 25].map((v) => (v >= 11 ? require('./living_room_second_look.js').sceneFor2(v) : sceneFor(v)));

module.exports = { LIVING_ROOM, defsFor, sceneFor };
