// Architectural drafting table: a small, quaint vignette of the drafting room before CAD. A tilted board on a
// pedestal, a task lamp, a stool, pencils, pens, erasers, a sharpener, a French ruler and a parallel rule, and an
// elevation drawn in ink on the paper (a Le Corbusier-style villa front: pilotis, ribbon windows, a flat roof).
// Built in seven increments, one code path:
//   V01  ~34   the table, the lamp and the stool, in a room with a window, a rug and a floor
//   V02  ~48   pencils, a pen, erasers, a sharpener with its crank, ink, and blank paper on the board
//   V03  ~55   drafting aids: the French ruler, the parallel rule, a protractor, a scale rule, a mug
//   V04  ~62   animated: the elevation's outline is drawn in ink, the parallel rule shifts, a pencil traces the outline
//   V05  ~67   the pilotis are drawn, the sharpener turns and a pencil goes in, the stool swivels
//   V06  ~70  the ribbon windows are drawn, an eraser rubs out a line, the lamp sways
//   V07  ~72  a second pencil draws the ground line, the scale rule slides, steam rises from the mug
// Sizes are inches, Z up, floor at z = 0. Position = centre of each box. Nothing is random: every version rebuilds
// the same objects in the same places, and each version adds to the one before it.
//
// The board is tilted 30 degrees about X (rotation_x). Parts on it are placed with boardPt(s, t, h): s across the
// board (world X), t up the slope, h off the board surface along its normal. A part on the board takes rotation_x 30.
// A cylinder with rotation_x 30 stands along the board's normal, so a pencil stands on the paper. Only axis-aligned
// parts are used on the board: a rotation that turns a part within the board's plane would tilt it off the board.
//
// Check: node tests/test_drafting.js. Render: node tools/render_models.js <dir> drafting-table-v07

const M = require('../js/core/motion.js');

const WORLD_ID = 'drafting-world';
const LOOP_S = 60;
const COUNTS = [34, 48, 55, 62, 67, 70, 72];
const rnd = (n) => Math.round(n * 1000) / 1000;
const TILT = 30;
const SIN = Math.sin((TILT * Math.PI) / 180), COS = Math.cos((TILT * Math.PI) / 180);
const BOARD_C = [0, 0, 38];          // centre of the board (1 in thick)

// A point on the board. The surface is at h = 0.5; the normal is (0, -SIN, COS).
function boardPt(s, t, h) {
  return [rnd(s), rnd(BOARD_C[1] + t * COS - h * SIN), rnd(BOARD_C[2] + t * SIN + h * COS)];
}
const PAPER_TOP = 0.75;              // paper is 0.25 thick, on the board surface
const INK_H = 0.875;                 // an ink line sits on the paper, centre 0.125 above it
const PENCIL_H = 4.5;                // a 7 in pencil standing with its tip 1.0 in above the paper (tip h = 1.0)
const TIP_H = 1.0;

// Corbusier-style elevation, in board coordinates (inches)
const VOL = { s0: -9, s1: 9, t0: -1, t1: 4 };        // the upper volume with the roof terrace
const GROUND_T = -6;                                 // ground line
const PILOTI_S = [-7, -2.5, 2.5, 7];                 // columns (pilotis) under the volume
const RIBBON_T = [0.5, 2.5];                         // ribbon windows, centre lines

// Corners of a rectangle, sampled along its sides; the first point is the corner (s0, t0)
function rectLoop(s0, s1, t0, t1, perSide = 4) {
  const c = [[s0, t0], [s1, t0], [s1, t1], [s0, t1]];
  const pts = [];
  for (let i = 0; i < 4; i++) {
    const a = c[i], b = c[(i + 1) % 4];
    for (let k = 0; k < perSide; k++) pts.push([a[0] + ((b[0] - a[0]) * k) / perSide, a[1] + ((b[1] - a[1]) * k) / perSide]);
  }
  return pts;
}

const MATERIALS = {
  floor: { color: '#c9a77a', opacity: 1 },
  rug: { color: '#9c4a3a', opacity: 1 },
  wall: { color: '#efe6d2', opacity: 1 },
  frame: { color: '#8b6a4b', opacity: 1 },
  glass: { color: '#cfe9f2', opacity: 0.3 },
  wood: { color: '#b5835a', opacity: 1 },
  iron: { color: '#3d4247', opacity: 1 },
  brass: { color: '#c9a24a', opacity: 1 },
  board: { color: '#2f6b57', opacity: 1 },
  tray: { color: '#8c6a47', opacity: 1 },
  leather: { color: '#7a4e35', opacity: 1 },
  paper: { color: '#fbf6ea', opacity: 1 },
  ink: { color: '#2d2a26', opacity: 1 },
  pencil: { color: '#e0b84e', opacity: 1 },
  pencilRed: { color: '#c8553d', opacity: 1 },
  pencilBlue: { color: '#7fa8c9', opacity: 1 },
  penBlue: { color: '#2f5a9a', opacity: 1 },
  eraserPink: { color: '#e8a0a8', opacity: 1 },
  eraserBlue: { color: '#8fb3d9', opacity: 1 },
  rule: { color: '#ead9b0', opacity: 1 },
  steel: { color: '#b9c0ca', opacity: 1 },
  sharpener: { color: '#a33b2a', opacity: 1 },
  inkBottle: { color: '#243e5a', opacity: 0.9 },
  lampShade: { color: '#f4e3b5', opacity: 1 },
  bulb: { color: '#fff1a8', opacity: 1 },
  mug: { color: '#f2ede4', opacity: 1 },
  steam: { color: '#ffffff', opacity: 0.35 },
  bin: { color: '#8c8c80', opacity: 1 },
  tube: { color: '#d8c49a', opacity: 1 },
  pot: { color: '#b5583e', opacity: 1 },
  plant: { color: '#6f9a5a', opacity: 1 },
};

function defsFor(v) {
  const defs = [];
  const motions = [];
  const add = (key, def) => defs.push([key, def]);
  const motion = (m) => motions.push(m);
  const inch = (arr) => arr.map(rnd);
  const T = { rotation_x: TILT };     // a part that lies on the board

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

  // A line of ink from (s, t) to (s2, t2): horizontal (t2 = t) or vertical (s2 = s). A quarter-inch square section.
  const ink = (key, name, description, s, t, s2, t2, parent) => {
    const horizontal = t2 === t;
    const L = horizontal ? Math.abs(s2 - s) : Math.abs(t2 - t);
    const at = boardPt((s + s2) / 2, (t + t2) / 2, INK_H);
    box(key, name, description, horizontal ? [L, 0.25, 0.25] : [0.25, L, 0.25], at, { ...T, material: 'ink', parent });
  };
  // A pencil standing on the paper at (s, t), tip hovering just above the ink: the pencil's rest pose
  const pencil = (key, name, description, s, t, mat, parent) =>
    cyl(key, name, description, 0.25, 7, boardPt(s, t, PENCIL_H), { ...T, material: mat, parent });
  const pathPts = (list, h) => list.map(([s, t]) => boardPt(s, t, h));

  // =====================================================================================================
  // V01 blockout (~30): the room, the drafting table, a task lamp and a stool
  // =====================================================================================================
  box('floor', 'Floor', 'the wood floor of the drawing room', [120, 100, 1], [0, 0, -0.5], { material: 'wood' });
  box('rug', 'Rug', 'a red rug under the table and the stool', [60, 40, 0.5], [0, -4, 0.25], { material: 'rug' });
  box('wall', 'Back wall', 'the plaster wall behind the table', [120, 1, 96], [0, 24, 48], { material: 'wall' });
  box('window', 'Window glass', 'the window on the back wall, letting in the daylight', [28, 0.4, 34], [-34, 23.4, 58], { material: 'glass' });
  box('window-top', 'Window top frame', 'the top of the window frame', [30, 0.8, 1.2], [-34, 23.2, 75.4], { material: 'frame' });
  box('window-sill', 'Window sill frame', 'the bottom of the window frame', [30, 0.8, 1.2], [-34, 23.2, 40.6], { material: 'frame' });
  box('window-left', 'Window left frame', 'the left side of the window frame', [1.2, 0.8, 36], [-48.4, 23.2, 58], { material: 'frame' });
  box('window-right', 'Window right frame', 'the right side of the window frame', [1.2, 0.8, 36], [-19.6, 23.2, 58], { material: 'frame' });
  box('shelf', 'Wall shelf', 'an oak shelf on the back wall, holding three books and a small plant', [20, 5, 1], [46, 21, 62], { material: 'oak' });
  box('book-1', 'Book 1', 'a blue book on the shelf, a building handbook', [1.5, 3.5, 6], [40, 21, 65.5], { material: 'penBlue' });
  box('book-2', 'Book 2', 'a red book on the shelf, a catalogue of furniture', [1.5, 3.5, 6], [41.8, 21, 65.5], { material: 'pencilRed' });
  box('book-3', 'Book 3', 'a brass-coloured book on the shelf, a survey of old drawings', [1.5, 3.5, 5], [43.6, 21, 65], { material: 'brass' });
  cyl('plant-pot', 'Plant pot', 'a terracotta pot with a fern on the shelf', 2.5, 4, [52, 21, 64], { material: 'pot' });
  sph('plant', 'Fern', 'a small fern, the only green thing in the room apart from the board', 3, [52, 21, 68], { material: 'plant' });
  cyl('bin', 'Waste bin', 'a tin bin for spoiled sheets and shavings', 4, 12, [44, -16, 6], { material: 'bin' });
  cyl('tube', 'Tube of drawings', 'rolled sheets, tied with string, kept at the side of the room', 1.5, 30, [-44, -16, 1.5], { rotation_y: 90, material: 'tube' });

  // the drafting table: a pedestal, a column and a board tilted 30 degrees toward the stool
  group('table', 'Drafting table', 'a wooden drafting table. The board tilts 30 degrees toward the stool, so the drawing sits at a natural reading angle');
  box('base', 'Pedestal base', 'the heavy base that keeps the table steady', [28, 20, 1.5], [0, 0, 0.75], { parent: 'table', material: 'wood' });
  cyl('column', 'Pedestal column', 'the column that holds the board, with the tilt pivot at its top', 1.6, 36, [0, 0, 19.5], { parent: 'table', material: 'wood' });
  box('board', 'Drawing board', 'the tilted drawing board, 48 by 36 inches, with a clean green top', [48, 36, 1], BOARD_C, { ...T, parent: 'table', material: 'board' });
  box('tray', 'Pencil ledge', 'the ledge along the bottom of the board, for pencils, pens and erasers', [48, 3, 1.2], boardPt(0, -19.5, 0), { ...T, parent: 'table', material: 'tray' });

  // the task lamp: a foot, a pole, and a head (arm, shade and bulb) grouped so it can sway
  group('lamp', 'Task lamp', 'a brass task lamp beside the board, with an arm that reaches over the work');
  cyl('lamp-foot', 'Lamp foot', 'the round foot of the lamp', 6, 1.2, [38, 0, 0.6], { parent: 'lamp', material: 'iron' });
  cyl('lamp-pole', 'Lamp pole', 'the pole of the lamp, up from the foot', 0.8, 42.8, [38, 0, 22.6], { parent: 'lamp', material: 'brass' });
  group('lamp-head', 'Lamp head', 'the arm, shade and bulb of the lamp. It sways on the top of the pole', [34, 0, 42], { parent: 'lamp' });
  cyl('lamp-arm', 'Lamp arm', 'the arm that holds the shade out over the board', 0.5, 8, [34, 0, 44.5], { rotation_y: 90, parent: 'lamp-head', material: 'brass' });
  cone('lamp-shade', 'Lamp shade', 'a cream shade, wide at the bottom, to throw the light down on the paper', 4, 4, [30, 0, 42], { parent: 'lamp-head', material: 'lampShade' });
  sph('lamp-bulb', 'Lamp bulb', 'the bulb under the shade', 1.2, [30, 0, 39.5], { parent: 'lamp-head', material: 'bulb' });

  // the stool: a round leather seat on three legs with a foot ring; it swivels on its base
  group('stool', 'Drafting stool', 'a round stool with a leather seat that turns on its base', [0, -36, 0]);
  cyl('stool-seat', 'Stool seat', 'the leather seat', 8, 2, [0, -36, 22], { parent: 'stool', material: 'leather' });
  cyl('stool-leg-1', 'Stool leg 1', 'a wooden leg of the stool', 0.6, 21, [0, -31, 10.5], { parent: 'stool', material: 'wood' });
  cyl('stool-leg-2', 'Stool leg 2', 'a wooden leg of the stool', 0.6, 21, [-4.33, -38.5, 10.5], { parent: 'stool', material: 'wood' });
  cyl('stool-leg-3', 'Stool leg 3', 'a wooden leg of the stool', 0.6, 21, [4.33, -38.5, 10.5], { parent: 'stool', material: 'wood' });
  cyl('stool-ring', 'Foot ring', 'a flat ring the sitter rests their feet on', 6.5, 0.6, [0, -36, 9], { parent: 'stool', material: 'wood' });

  // =====================================================================================================
  // V02 (~50): pencils, a pen, erasers, a sharpener with its crank, ink, and blank paper on the board
  // =====================================================================================================
  if (v >= 2) {
    box('paper', 'Drawing paper', 'a sheet of heavy white drawing paper, 24 by 18 inches, pinned at the corners', [24, 18, 0.25], boardPt(0, 0, 0.625), { ...T, parent: 'table', material: 'paper' });
    // pencils lie along X on the ledge; their centre sits 0.35 in above the ledge floor
    const ledgeH = 0.85;
    [[-10, 'pencil', 'a yellow HB pencil, sharpened to a point'], [-6.5, 'pencilRed', 'a red pencil for the corrections'],
     [-3, 'pencil', 'a yellow pencil with a worn tip'], [0.5, 'pencilBlue', 'a blue pencil for the construction lines'],
     [4, 'pencil', 'a yellow pencil, the spare']].forEach(([s, mat, desc], i) =>
      cyl(`pencil-${i + 1}`, `Pencil ${i + 1}`, desc, 0.25, 7, boardPt(s, -19.5, ledgeH), { rotation_y: 90, parent: 'table', material: mat }));
    cyl('pen-fountain', 'Fountain pen', 'a blue fountain pen lying on the ledge', 0.3, 5.5, boardPt(9.5, -19.5, ledgeH), { rotation_y: 90, parent: 'table', material: 'penBlue' });
    box('eraser-pink', 'Pink eraser', 'a soft pink rubber, worn at one corner', [1.5, 0.8, 0.6], boardPt(12, -19.5, 0.9), { ...T, parent: 'table', material: 'eraserPink' });
    box('eraser-blue', 'Blue eraser', 'a blue plastic eraser for ink', [1.5, 0.8, 0.6], boardPt(14.5, -19.5, 0.9), { ...T, parent: 'table', material: 'eraserBlue' });
    // the sharpener: a body on the ledge, a crank on its side and a handle that shows the turning
    box('sharpener', 'Pencil sharpener', 'a small cast-iron sharpener with a hole for the pencil and a crank on the side', [3, 2, 2], boardPt(-19, -19.5, 1.6), { ...T, parent: 'table', material: 'sharpener' });
    const crank = boardPt(-17.4, -19.5, 1.6);
    cyl('sharpener-crank', 'Sharpener crank', 'the axle of the crank, which the handle turns', 0.3, 1, crank, { rotation_y: 90, parent: 'table', material: 'steel' });
    box('sharpener-handle', 'Crank handle', 'the handle the hand turns to sharpen', [0.5, 0.5, 2], [crank[0], crank[1], rnd(crank[2] + 1)], { parent: 'table', material: 'steel' });
    // ink on the floor by the stool
    cyl('ink-bottle', 'Ink bottle', 'a dark blue glass bottle of drawing ink, on the floor by the stool', 1.6, 3.5, [-30, -20, 1.75], { material: 'inkBottle' });
    cyl('ink-cap', 'Ink bottle cap', 'the glass stopper of the ink bottle', 0.9, 1, [-30, -20, 4], { material: 'iron' });
  }

  // =====================================================================================================
  // V03 (~65): drafting aids: the French ruler, the parallel rule, a protractor, a scale rule, a mug
  // =====================================================================================================
  if (v >= 3) {
    box('french-ruler', 'French ruler', 'a long wooden French ruler with a bevelled edge, laid along the paper', [18, 1.5, 0.25], boardPt(-3, -8, PAPER_TOP + 0.125), { ...T, parent: 'table', material: 'rule' });
    box('parallel-rule', 'Parallel rule', 'the parallel rule that runs across the board on cords. It keeps every horizontal line level', [48, 3, 0.6], boardPt(0, 8, PAPER_TOP + 0.3), { ...T, parent: 'table', material: 'rule' });
    sph('rule-knob-left', 'Parallel rule knob, left', 'a brass knob on the cord at the left end of the rule', 0.7, boardPt(-23, 8, PAPER_TOP + 0.9), { parent: 'table', material: 'brass' });
    sph('rule-knob-right', 'Parallel rule knob, right', 'a brass knob on the cord at the right end of the rule', 0.7, boardPt(23, 8, PAPER_TOP + 0.9), { parent: 'table', material: 'brass' });
    cyl('protractor', 'Protractor', 'a clear half-round protractor for measuring angles, lying on the board', 3, 0.25, boardPt(15, 3, 0.625), { ...T, parent: 'table', material: 'rule' });
    box('scale-rule', 'Scale rule', 'a triangular scale rule, marked in feet and inches for reading plans', [14, 0.9, 0.7], boardPt(-15, -5, 0.85), { ...T, parent: 'table', material: 'rule' });
    cyl('mug', 'Tea mug', 'a white tea mug on the floor by the stool, with the tea still warm', 1.8, 3.8, [-20, -30, 1.9], { material: 'mug' });
  }

  // =====================================================================================================
  // V04 (~80): the elevation is drawn in ink; the parallel rule shifts; a pencil traces the outline
  // =====================================================================================================
  if (v >= 4) {
    group('elevation', 'Elevation drawing', 'an elevation of a small villa in ink: a box on slender columns, ribbon windows, a flat roof', boardPt(0, 0, PAPER_TOP), { parent: 'table' });
    const { s0, s1, t0, t1 } = VOL;
    ink('ground-line', 'Ground line', 'the ground the villa stands on', -10, GROUND_T, 10, GROUND_T, 'elevation');
    ink('volume-base', 'Volume base line', 'the underside of the upper box, on its columns', s0, t0, s1, t0, 'elevation');
    ink('volume-roof', 'Roof terrace line', 'the flat roof terrace edge', s0, t1, s1, t1, 'elevation');
    ink('volume-left', 'Volume left edge', 'the left edge of the upper box', s0, t0, s0, t1, 'elevation');
    ink('volume-right', 'Volume right edge', 'the right edge of the upper box', s1, t0, s1, t1, 'elevation');
    // the pencil that draws the outline: it starts at the corner (s0, t0), its rest pose
    pencil('pencil-trace', 'Pencil tracing the outline', 'a pencil drawing the outline of the upper box, round and round', s0, t0, 'pencilRed', 'table');
    // the parallel rule shifts: it rolls up and down the board on its cords, stays level, and comes back to rest
    const rule0 = boardPt(0, 8, PAPER_TOP + 0.3);
    const shift = Array.from({ length: 12 }, (_, k) => {
      const th = (2 * Math.PI * k) / 12;
      return [0.6 * Math.sin(th), 8 - 1.0 * (1 - Math.cos(th))];
    });
    motion({ id: 'parallel-rule-shift', target: 'parallel-rule', kind: 'path', points: shift.map(([s, t]) => boardPt(s, t, PAPER_TOP + 0.3)), pivot: rule0, cycles: 2, phase: 0 });
    // the French ruler slides along the paper and back
    motion({ id: 'french-ruler-slide', target: 'french-ruler', kind: 'slide', axis: 'x', distance: 4, cycles: 1, phase: 0 });
    motion({ id: 'pencil-trace-path', target: 'pencil-trace', kind: 'path', points: pathPts(rectLoop(s0, s1, t0, t1), PENCIL_H), pivot: boardPt(s0, t0, PENCIL_H), cycles: 2, phase: 0 });
  }

  // =====================================================================================================
  // V05 (~90): the pilotis are drawn; the sharpener turns and a pencil goes into it; the stool swivels
  // =====================================================================================================
  if (v >= 5) {
    PILOTI_S.forEach((s, i) => ink(`piloti-${i + 1}`, `Piloti ${i + 1}`, 'a slender column that lifts the box off the ground, so the ground floor is open', s, GROUND_T, s, VOL.t0, 'elevation'));
    const crank = boardPt(-17.4, -19.5, 1.6);
    motion({ id: 'sharpener-crank-turn', target: 'sharpener-handle', kind: 'spin', axis: 'x', pivot: crank, cycles: 6, phase: 0 });
    // a pencil stands in the sharpener's hole (tip on the sharpener top, h 2.6); it dips into the hole and comes back
    cyl('pencil-sharpen', 'Pencil in the sharpener', 'a pencil being sharpened: the crank turns and the pencil dips into the hole', 0.25, 7, boardPt(-19, -19.5, 2.6 + 3.5), { ...T, parent: 'table', material: 'pencil' });
    motion({ id: 'pencil-sharpen-dip', target: 'pencil-sharpen', kind: 'bob', axis: 'z', amount: -1.2, cycles: 4, phase: 0 });
    motion({ id: 'stool-swivel', target: 'stool', kind: 'swing', axis: 'z', pivot: [0, -36, 0], from: -10, to: 10, cycles: 1, phase: 0 });
  }

  // =====================================================================================================
  // V06 (~100): the ribbon windows are drawn; an eraser rubs out a line; the lamp sways
  // =====================================================================================================
  if (v >= 6) {
    RIBBON_T.forEach((t, i) => box(`ribbon-${i + 1}`, `Ribbon window ${i + 1}`, 'a long strip window, a band of glass that runs across the front of the box', [15, 0.9, 0.3], boardPt(0, t, PAPER_TOP + 0.15), { ...T, parent: 'elevation', material: 'glass' }));
    box('eraser-working', 'Eraser in use', 'the pink eraser held in use, rubbing out a construction mark between the columns', [1.5, 0.8, 0.6], boardPt(0, -3.5, 0.9), { ...T, parent: 'table', material: 'eraserPink' });
    motion({ id: 'eraser-rub', target: 'eraser-working', kind: 'slide', axis: 'x', distance: 1.5, cycles: 4, phase: 0 });
    motion({ id: 'lamp-sway', target: 'lamp-head', kind: 'swing', axis: 'x', pivot: [38, 0, 44.5], from: -4, to: 4, cycles: 1, phase: 0 });
  }

  // =====================================================================================================
  // V07 (~110): a second pencil draws the ground line; the scale rule slides; steam rises from the mug
  // =====================================================================================================
  if (v >= 7) {
    pencil('pencil-ground', 'Blue pencil on the ground line', 'a blue pencil drawing the ground line, across and back', -9, GROUND_T, 'pencilBlue', 'table');
    motion({ id: 'pencil-ground-slide', target: 'pencil-ground', kind: 'slide', axis: 'x', distance: 18, cycles: 2, phase: 0 });
    motion({ id: 'scale-rule-slide', target: 'scale-rule', kind: 'slide', axis: 'x', distance: 3, cycles: 1, phase: 0 });
    sph('steam', 'Steam from the mug', 'a wisp of steam from the warm tea, rising and fading', 0.6, [-20, -30, 6], { material: 'steam' });
    motion({ id: 'steam-rise', target: 'steam', kind: 'bob', axis: 'z', amount: 3, cycles: 1, phase: 0 });
  }

  return { defs, motions };
}

function sceneFor(v) {
  const pad = String(v).padStart(2, '0');
  const id = `drafting-table-v${pad}`;
  const built = defsFor(v);
  const scene = {
    id,
    builtin: true,
    project: 'Architectural drafting table',
    header: {
      model_id: id,
      name: `Architectural drafting table V${pad}`,
      description: `An architectural drafting table before CAD, increment ${v} of 7 (about ${COUNTS[v - 1]} objects). A lamp, a stool, pencils and a French ruler. From V04 the elevation is drawn in ink and the tools move.`,
      units: 'in', up: 'z', world: WORLD_ID,
      materials: MATERIALS,
    },
    defs: built.defs,
  };
  if (v >= 4) {
    scene.motion = (uuid) => ({
      schema: M.MOTION_SCHEMA,
      model_id: id,
      name: 'Drawing at the board',
      description: 'The parallel rule shifts, the French ruler slides, pencils trace the elevation, the sharpener turns and the stool swivels. Every motion repeats a whole number of times in each 60 s loop.',
      units: 'in', up: 'z',
      loop_s: LOOP_S,
      autoplay: { plays: 2 },
      motions: built.motions.map((m) => ({ ...m, target: uuid(m.target) })),
    });
  }
  return scene;
}

const DRAFTING = Array.from({ length: 7 }, (_, i) => sceneFor(i + 1));

module.exports = { DRAFTING, WORLD_ID, COUNTS, LOOP_S, MATERIALS, defsFor, sceneFor, boardPt, rectLoop, VOL, GROUND_T, PILOTI_S, RIBBON_T };
