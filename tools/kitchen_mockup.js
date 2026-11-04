// Kitchen mockup, built from two photos of a display kitchen (photos are not committed).
// Sizes are visual estimates in inches, not measurements. Z up. Y is depth: the back wall is y = 0 and the room
// runs toward +y, toward the camera. X runs left to right as seen by someone standing at the front and facing the
// back wall. Layout is written in view coordinates (x from the viewer's left) and mirrored once at the end, as the
// living room is, because with Z up the viewer's left is +x.
//
// Layout (view coordinates): a U of runs. The back run sits along the back wall, with the stove between two counters.
// The sink run sits along the green left wall. The return run sits on the right, with a wood bar on its outside.
//
// One code path builds every version: defsFor(v). Version N is the next increment after N-1. Keep the older
// versions reproducible: edit by adding "if (v >= N)" blocks, not by deleting.

const WORLD_ID = 'default-world';
const W = 186;  // room width in view coordinates

const MATERIALS = {
  wall: { color: '#f4f0e6', opacity: 1 },
  floor: { color: '#8c9094', opacity: 1 },
  green: { color: '#3f9b5a', opacity: 1 },
  yellow: { color: '#e8b43a', opacity: 1 },
  cabinet: { color: '#f1ead8', opacity: 1 },
  wood: { color: '#7a4e2d', opacity: 1 },
  steel: { color: '#c9ced3', opacity: 1 },
  tile: { color: '#e8c35a', opacity: 1 },
  tileRed: { color: '#b5573a', opacity: 1 },
  chrome: { color: '#e3e7ea', opacity: 1 },
  black: { color: '#1e1f22', opacity: 1 },
  bowl: { color: '#7d858c', opacity: 1 },
  bulb: { color: '#fff0a6', opacity: 1 },
  iron: { color: '#40454b', opacity: 1 },
};

const GROUPS = [
  ['shell', 'Room shell', 'floor, back wall, green left wall, yellow panel'],
  ['back', 'Back run', 'base cabinets, stove, counters, tiles, backsplash, doors'],
  ['sink', 'Sink run', 'left-wall run: fridge, drawers, sink, faucets'],
  ['ret', 'Return run', 'right-side run: counter, tiles, doors'],
  ['bar', 'Wood bar', 'dark wood bar and ledge on the outside of the return run'],
  ['up', 'Upper cabinets', 'wall cabinets and the wood top shelf'],
  ['fx', 'Fixtures', 'frying pan, hooks, ceiling light'],
];

function defsFor(v) {
  const d = [];
  // add(key, name, description, type, dimensions, position, material, extra)
  const add = (key, name, description, type, dimensions, position, material, extra = {}) =>
    d.push([key, { name, description, type, dimensions, position, material, ...extra }]);
  // A box from its min and max corners: x across the room, y depth, z height. All in inches.
  const box = (key, name, description, [x0, x1], [y0, y1], [z0, z1], material, extra = {}) =>
    add(key, name, description, 'box', [x1 - x0, y1 - y0, z1 - z0], [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], material, extra);
  // Vertical cylinder [radius, height], centred at (x, y, z).
  const cyl = (key, name, description, r, h, x, y, z, material, extra = {}) =>
    add(key, name, description, 'cylinder', [r, h], [x, y, z], material, extra);
  // Sphere [radius], centred at (x, y, z).
  const sph = (key, name, description, r, x, y, z, material) =>
    add(key, name, description, 'sphere', [r], [x, y, z], material);

  // ---- V01: blockout -------------------------------------------------------
  // Floor top at z = 0.5. Base cabinets are 34.5 high (z 0.5 to 34.5), so the counter tops sit at 36.
  box('shell-floor', 'Floor', 'kitchen floor, room footprint', [0, W], [0, 96], [0, 0.5], 'floor');
  box('shell-back', 'Back wall', 'context only', [0, W], [-1, 0], [0, 96], 'wall');
  box('shell-left', 'Green wall', 'left wall, green paint, context only', [-2, 0], [0, 96], [0, 96], 'green');
  box('back-bl', 'Base cabinets, back left', 'left end of the back run', [0, 60], [0, 24], [0.5, 34.5], 'cabinet');
  box('back-stove', 'Stove block', 'the cooker between the two counters', [60, 92], [0, 24], [0.5, 34.5], 'cabinet');
  box('back-br', 'Base cabinets, back right', 'right of the stove', [92, 180], [0, 24], [0.5, 34.5], 'cabinet');
  box('ret-carcass', 'Return run', 'along the right side of the room, toward the camera', [156, 180], [24, 90], [0.5, 34.5], 'cabinet');
  box('sink-carcass', 'Sink run', 'along the left wall: fridge end, drawers, sink', [0, 24], [24, 90], [0.5, 34.5], 'cabinet');
  box('bar-wood', 'Wood bar', 'dark wood bar on the outside of the return run', [180, 184], [24, 90], [0, 40], 'wood');

  // ---- V02: counter tops, checkered tile insets, red patches ----------------
  if (v >= 2) {
    box('back-top-bl', 'Counter, back left', 'steel top', [0, 60], [0, 24], [34.5, 36], 'steel');
    box('back-top-stove', 'Stove top', 'steel cooktop surface', [60, 92], [0, 24], [34.5, 36], 'steel');
    box('back-top-br', 'Counter, back right', 'steel top', [92, 180], [0, 24], [34.5, 36], 'steel');
    box('ret-top', 'Return counter', 'steel top', [156, 180], [24, 90], [34.5, 36], 'steel');
    box('sink-top', 'Sink counter', 'steel top', [0, 24], [24, 90], [34.5, 36], 'steel');
    box('back-tile-bl', 'Tile, back left', 'yellow tile inset', [2, 58], [2, 22], [36, 36.5], 'tile');
    box('back-tile-bl-red', 'Red tile patch, back left', 'terracotta tile patch', [8, 20], [2, 10], [36.5, 36.75], 'tileRed');
    box('back-tile-br', 'Tile, back right', 'yellow tile inset', [94, 154], [2, 22], [36, 36.5], 'tile');
    box('back-tile-br-red', 'Red tile patch, back right', 'terracotta tile patch', [110, 122], [12, 22], [36.5, 36.75], 'tileRed');
    box('ret-tile', 'Tile, return run', 'yellow tile inset', [158, 178], [26, 88], [36, 36.5], 'tile');
    box('ret-tile-red', 'Red tile patch, return run', 'terracotta tile patch', [160, 176], [60, 70], [36.5, 36.75], 'tileRed');
  }

  // ---- V03: stove detail: oven door, drawer, chrome handles, knobs, burners ----
  if (v >= 3) {
    box('back-stove-door', 'Oven door', 'cream oven door on the front', [63, 89], [24, 25], [10, 30], 'cabinet');
    box('back-stove-drawer', 'Oven drawer', 'drawer under the oven door', [63, 89], [24, 25], [2, 8], 'cabinet');
    box('back-stove-handle', 'Oven door handle', 'chrome bar', [67, 85], [25, 26], [28, 29.2], 'chrome');
    box('back-stove-drawer-handle', 'Oven drawer handle', 'chrome bar', [67, 85], [25, 26], [6.4, 7.6], 'chrome');
    [66, 76, 86].forEach((x, i) => sph(`back-stove-knob-${i + 1}`, `Stove knob ${i + 1}`, 'control knob on the front band', 1.1, x, 25.5, 33, 'chrome'));
    cyl('back-burner-1', 'Burner 1', 'black ring on the cooktop', 5, 0.8, 70, 12, 36.4, 'black');
    cyl('back-burner-2', 'Burner 2', 'black ring on the cooktop', 5, 0.8, 84, 12, 36.4, 'black');
  }

  // ---- V04: doors and drawers on the runs -------------------------------------
  if (v >= 4) {
    box('back-bl-door-1', 'Base door 1', 'cream door, left end', [1, 29], [24, 25], [2, 33], 'cabinet');
    box('back-bl-door-2', 'Base door 2', 'cream door', [31, 59], [24, 25], [2, 33], 'cabinet');
    sph('back-bl-knob-1', 'Door knob, back left 1', 'wood knob', 0.8, 27, 25.4, 30, 'wood');
    sph('back-bl-knob-2', 'Door knob, back left 2', 'wood knob', 0.8, 33, 25.4, 30, 'wood');
    box('back-br-door-1', 'Base door 3', 'cream door, right of the stove', [94, 122], [24, 25], [2, 33], 'cabinet');
    box('back-br-door-2', 'Base door 4', 'cream door', [124, 154], [24, 25], [2, 33], 'cabinet');
    sph('back-br-knob-1', 'Door knob, back right 1', 'wood knob', 0.8, 120, 25.4, 30, 'wood');
    sph('back-br-knob-2', 'Door knob, back right 2', 'wood knob', 0.8, 126, 25.4, 30, 'wood');
    // Sink run, on its front face (x = 24, facing the room).
    box('sink-fridge', 'Fridge door', 'cream door at the left end of the sink run', [24, 25], [26, 48], [2, 33], 'cabinet');
    box('sink-fridge-handle', 'Fridge handle', 'chrome handle', [25, 26.2], [43, 45], [28, 30], 'chrome');
    box('sink-drawer-1', 'Wood drawer 1', 'wood drawer front', [24, 25], [48, 60], [18, 33], 'wood');
    box('sink-drawer-2', 'Wood drawer 2', 'wood drawer front', [24, 25], [48, 60], [2, 16], 'wood');
    box('sink-door', 'Sink base door', 'cream door under the sink', [24, 25], [60, 90], [2, 33], 'cabinet');
    // Return run, on its open face (x = 156, facing the room).
    box('ret-door-1', 'Return door 1', 'cream door on the open side', [155, 156], [24, 57], [2, 33], 'cabinet');
    box('ret-door-2', 'Return door 2', 'cream door on the open side', [155, 156], [57, 90], [2, 33], 'cabinet');
    sph('ret-knob-1', 'Return knob 1', 'wood knob', 0.8, 154.2, 55, 30, 'wood');
    sph('ret-knob-2', 'Return knob 2', 'wood knob', 0.8, 154.2, 59, 30, 'wood');
  }

  // ---- V05: stainless backsplash, upper cabinets, wood top shelf ----------------
  if (v >= 5) {
    box('back-backsplash', 'Stainless backsplash', 'steel, behind the counters', [0, 180], [0, 0.5], [36, 54], 'steel');
    box('up-left', 'Upper cabinet, left', 'cream, two doors', [0, 60], [0, 12], [54, 84], 'cabinet');
    box('up-right', 'Upper cabinet, right', 'cream, two doors', [92, 180], [0, 12], [54, 84], 'cabinet');
    box('up-left-door-1', 'Upper door 1', 'cream door', [1, 29], [12, 13], [56, 82], 'cabinet');
    box('up-left-door-2', 'Upper door 2', 'cream door', [31, 59], [12, 13], [56, 82], 'cabinet');
    box('up-right-door-1', 'Upper door 3', 'cream door', [93, 135], [12, 13], [56, 82], 'cabinet');
    box('up-right-door-2', 'Upper door 4', 'cream door', [137, 179], [12, 13], [56, 82], 'cabinet');
    sph('up-knob-1', 'Upper knob 1', 'wood pull', 0.8, 27, 13.2, 70, 'wood');
    sph('up-knob-2', 'Upper knob 2', 'wood pull', 0.8, 139, 13.2, 70, 'wood');
    box('up-shelf', 'Wood top shelf', 'wood strip over the upper cabinets', [0, 180], [0, 12], [84, 86], 'wood');
  }

  // ---- V06: frying pan on the backsplash, hooks ----------------------------------
  if (v >= 6) {
    cyl('fx-pan', 'Frying pan', 'hung on the backsplash above the stove, face toward the room', 7, 1.5, 76, 1.6, 66, 'iron', { rotation_x: 90 });
    box('fx-pan-handle', 'Pan handle', 'handle pointing down', [75.4, 76.6], [1, 2.2], [49, 59], 'black');
    [108, 116, 124].forEach((x, i) => sph(`fx-hook-${i + 1}`, `Hook ${i + 1}`, 'small hook on the backsplash', 0.8, x, 1.2, 44, 'chrome'));
  }

  // ---- V07: wood ledge on the wood bar -------------------------------------------
  if (v >= 7) {
    box('bar-ledge', 'Wood bar ledge', 'top ledge, sticks out toward the room', [178, 186], [24, 90], [40, 41.5], 'wood');
  }

  // ---- V08: double sink and two faucets ---------------------------------------------
  if (v >= 8) {
    box('sink-bowl-1', 'Sink bowl 1', 'steel basin, nearer the fridge', [6, 21], [58, 70], [36, 36.5], 'bowl');
    box('sink-bowl-2', 'Sink bowl 2', 'steel basin, toward the open end', [6, 21], [74, 86], [36, 36.5], 'bowl');
    cyl('sink-faucet-1', 'Faucet 1', 'over bowl 1, against the wall', 0.9, 10, 3, 64, 41, 'chrome');
    box('sink-faucet-1-spout', 'Faucet 1 spout', 'reaches over bowl 1', [3, 8], [63.5, 64.5], [44.5, 45.5], 'chrome');
    cyl('sink-faucet-2', 'Faucet 2', 'over bowl 2, against the wall', 0.9, 10, 3, 80, 41, 'chrome');
    box('sink-faucet-2-spout', 'Faucet 2 spout', 'reaches over bowl 2', [3, 8], [79.5, 80.5], [44.5, 45.5], 'chrome');
  }

  // ---- V09: ceiling light over the sink, yellow panel above the cabinets ----------------
  if (v >= 9) {
    cyl('fx-bulb-cord', 'Light cord', 'hangs from the ceiling', 0.25, 15, 12, 40, 88.5, 'black');
    sph('fx-bulb', 'Ceiling light bulb', 'over the sink run', 2.2, 12, 40, 79, 'bulb');
    box('shell-yellow', 'Yellow wall panel', 'yellow panel above the cabinets, on the back wall', [92, W], [0, 0.5], [86, 96], 'yellow');
  }

  // ---- V11: open shelf bay at the left end of the back run (first photo) ----------------
  // The left door and its knob go. The left end becomes an open bay with a side, top, bottom and back, and two wood shelves.
  if (v >= 11) {
    const gone = ['back-bl', 'back-bl-door-1', 'back-bl-knob-1'];
    for (let i = d.length - 1; i >= 0; i--) if (gone.includes(d[i][0])) d.splice(i, 1);
    box('back-bl-side', 'Base side, back left', 'left end panel of the open bay', [0, 1], [0, 24], [0.5, 34.5], 'cabinet');
    box('back-bl-run', 'Base cabinets, back left, right of the bay', 'closed cabinet right of the open bay', [29, 60], [0, 24], [0.5, 34.5], 'cabinet');
    box('back-bl-bay-top', 'Bay top', 'top of the open bay, under the counter', [1, 29], [0, 24], [32.5, 34.5], 'cabinet');
    box('back-bl-bay-bottom', 'Bay bottom', 'floor of the open bay', [1, 29], [0, 24], [0.5, 1.5], 'cabinet');
    box('back-bl-bay-back', 'Bay back', 'closes the bay at the wall', [1, 29], [0, 1], [1.5, 32.5], 'cabinet');
    box('back-bl-shelf-1', 'Open shelf 1', 'wood shelf in the bay', [1, 29], [1, 24], [12, 13], 'wood');
    box('back-bl-shelf-2', 'Open shelf 2', 'wood shelf in the bay', [1, 29], [1, 24], [22, 23], 'wood');
  }

  // ---- V10: final pass, grouped ------------------------------------------------------
  // Groups first (parents before children), then every other part gets its group by key prefix.
  if (v >= 10) {
    const groupKeys = GROUPS.map(([p]) => p);
    d.forEach(([k, def]) => {
      if (def.type === 'group') return;
      const p = k.split('-')[0];
      if (groupKeys.includes(p)) def.parent = `g-${p}`;
    });
    d.unshift(...GROUPS.map(([p, n, desc]) => [`g-${p}`, { name: n, description: desc, type: 'group', dimensions: [], position: [0, 0, 0], material: null }]));
  }

  // Mirror in x at the end: standing at the front, the viewer's left is +x. So x = W - x (groups have no size).
  return d.map(([k, def]) => (def.type === 'group' ? [k, def] : [k, { ...def, position: [W - def.position[0], def.position[1], def.position[2]] }]));
}

const VERSION_NOTES = {
  1: 'V01: blockout. Room shell, back run in three boxes with the stove between, sink run, return run and wood bar as boxes.',
  2: 'V02: review of V01. Steel counter tops, checkered tile insets with terracotta patches.',
  3: 'V03: stove detail. Oven door, drawer, chrome handles, three knobs and two burners.',
  4: 'V04: doors and drawers on the runs. Wood drawers and a fridge door with a chrome handle at the sink run.',
  5: 'V05: stainless backsplash, upper cabinets with doors and wood pulls, wood top shelf. Open space above the stove.',
  6: 'V06: frying pan hung on the backsplash above the stove, with a handle, and three hooks.',
  7: 'V07: wood ledge on top of the wood bar.',
  8: 'V08: double sink bowls and two faucets on the sink run.',
  9: 'V09: ceiling light over the sink, and a yellow panel above the upper cabinets.',
  10: 'V10: final pass. Objects grouped into room shell, back run, sink run, return run, wood bar, upper cabinets and fixtures. Layout unchanged.',
  11: 'V11: review of V10. The left door of the back run becomes an open bay with two wood shelves, as in the first photo. Layout unchanged.',
};

function sceneFor(v) {
  const id = `kitchen-mockup-v${String(v).padStart(2, '0')}`;
  return {
    id,
    builtin: true,
    header: {
      model_id: id,
      name: `Kitchen mockup V${String(v).padStart(2, '0')}`,
      description: `Kitchen mockup from photos, estimated sizes in inches. ${VERSION_NOTES[v]}`,
      units: 'in', up: 'z', world: WORLD_ID,
      view: { azimuth_deg: 214 },
      materials: MATERIALS,
    },
    defs: defsFor(v),
  };
}

// Eleven versions, V01 to V11. Add one number per review round.
const KITCHEN_MOCKUP = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((v) => sceneFor(v));

module.exports = { KITCHEN_MOCKUP, defsFor, sceneFor };
