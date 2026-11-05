// Robot loop: the robot-with-banana walks the loop from the Quick Detail "Robot Loop" (sketch_details id
// 3c4c380d-7901-4944-8929-d74e92903789, tags make3d). Increments, one defsFor(v) (skill: each increment is a block):
//   V02  the sketched loop, smoothed into a closed curve; the banana is a visibility group (show:banana)
//   V03  + frisbee held in the left hand (show:frisbee)
//   V04  + top hat on the head (show:hat)
//   V05  frisbee moves to the banana's right hand; + robot cape (show:cape), a wave that flows in turns (tools/robot_cape.js)
// Robot V01 (tools/robot_banana.js) is unchanged. The new scenes reuse its parts and motions with a new path.
//
// Scale: the closed shape on the sketch is labelled 19'-7" (235 in) at 3"=1'-0". Its longest side is taken
// as that length, so sketch units are scaled to inches by 235 / longest side. This is an estimate.

const RB = require('./robot_banana.js');
const CAPE = require('./robot_cape.js');
const SK2 = require('./robot_sketch2.js');
const TR = require('./robot_trace.js');
const M = require('../js/core/motion.js');

const SKETCH_ID = '3c4c380d-7901-4944-8929-d74e92903789';
const LABEL_IN = 235;                     // 19'-7" on the closed shape
const WORLD_ID = 'default-world';

// The stroke's [x, y] points in sketch units (z and time dropped), in drawing order. The stroke closes on itself.
const SKETCH_PTS = [
  [-12.1913, 7.1625], [-12.9046, 6.0926], [-12.9046, 5.617], [-13.0235, 5.2604], [-13.2612, 4.5471],
  [-13.7368, 3.8337], [-14.2123, 3.1204], [-14.6879, 2.2882], [-15.1634, 1.2183], [-15.639, 0.1483],
  [-16.3523, -0.8028], [-16.9467, -2.1105], [-17.3034, -3.1805], [-17.7789, -4.1316], [-18.1356, -5.2016],
  [-18.4922, -6.1527], [-18.8489, -6.9849], [-18.9678, -7.9359], [-19.2055, -8.7681], [-19.5622, -9.6003],
  [-19.9188, -10.7892], [-20.2755, -11.978], [-20.3944, -13.2858], [-20.6322, -14.4746], [-20.8699, -15.7824],
  [-20.9888, -16.9712], [-20.9888, -18.1601], [-20.9888, -19.2301], [-20.9888, -20.1812], [-20.9888, -21.2511],
  [-20.9888, -22.5589], [-20.6322, -23.9855], [-20.2755, -25.1744], [-19.6811, -26.4821], [-18.8489, -27.7898],
  [-18.0167, -28.9787], [-17.1845, -30.1676], [-16.2334, -31.1186], [-15.4012, -32.1886], [-14.569, -33.0208],
  [-13.7368, -33.7341], [-12.9046, -34.3286], [-12.0724, -34.923], [-11.0024, -35.2796], [-9.8136, -35.7552],
  [-8.8625, -35.993], [-7.6736, -36.3496], [-6.3659, -36.5874], [-5.177, -36.944], [-3.8693, -37.3007],
  [-2.5615, -37.4196], [-1.2538, -37.5385], [0.1728, -37.5385], [1.4806, -37.5385], [2.7883, -37.5385],
  [3.9772, -37.5385], [5.2849, -37.5385], [6.4738, -37.3007], [7.9004, -36.7063], [9.327, -35.993],
  [10.397, -35.2796], [11.7047, -34.5663], [12.7747, -33.7341], [13.9636, -32.783], [15.0335, -31.832],
  [16.2224, -30.8809], [17.0546, -29.8109], [17.8868, -28.7409], [18.719, -27.9087], [19.5512, -26.9576],
  [20.1456, -26.1254], [20.74, -25.0555], [21.3345, -24.1044], [21.9289, -23.0344], [22.2856, -22.0833],
  [22.6422, -21.2511], [22.88, -20.6567], [22.9989, -20.1812], [22.9989, -19.9434], [22.9989, -19.7056],
  [22.9989, -19.4678], [22.88, -18.8734], [22.1667, -18.279], [21.3345, -17.5657], [20.5023, -16.8524],
  [19.789, -16.2579], [19.0756, -15.5446], [18.4812, -14.7124], [17.7679, -13.8802], [17.0546, -13.048],
  [16.3413, -12.3347], [15.7468, -11.5025], [15.0335, -10.6703], [14.4391, -9.7192], [13.7258, -8.7681],
  [13.1314, -7.6982], [12.5369, -6.6282], [11.9425, -5.4393], [11.3481, -4.2505], [10.8725, -3.0616],
  [10.397, -1.7539], [10.0403, -0.565], [9.6837, 0.5049], [9.5648, 1.456], [9.5648, 2.2882],
  [9.5648, 3.1204], [9.5648, 3.9526], [9.8026, 4.6659], [10.397, 5.3793], [11.1103, 6.0926],
  [11.9425, 6.687], [12.6558, 7.2814], [13.488, 7.757], [14.3202, 8.2325], [15.0335, 8.5892],
  [15.8657, 9.1836], [16.4602, 9.4214], [17.1735, 10.0158], [17.8868, 10.2536], [18.6001, 10.7291],
  [19.3134, 10.848], [19.9078, 11.2047], [20.5023, 11.4424], [20.9778, 11.6802], [21.3345, 12.0369],
  [21.81, 12.3935], [22.2856, 12.5124], [22.7611, 12.7502], [23.1178, 12.9879], [23.5933, 13.2257],
  [23.8311, 13.5824], [23.95, 13.8201], [24.0688, 14.2957], [24.0688, 14.6523], [24.0688, 15.2468],
  [24.0688, 15.9601], [23.95, 16.7923], [23.7122, 17.5056], [23.3555, 18.2189], [22.9989, 18.9322],
  [22.5233, 19.7644], [22.0478, 20.3588], [21.3345, 20.9533], [20.6212, 21.6666], [19.9078, 22.0232],
  [19.1945, 22.6177], [18.4812, 23.2121], [17.7679, 23.6876], [17.0546, 24.1632], [16.2224, 24.6387],
  [15.1524, 24.9954], [14.0824, 25.2332], [12.8936, 25.4709], [11.7047, 25.4709], [10.2781, 25.5898],
  [8.7326, 25.5898], [7.306, 25.5898], [5.8793, 25.5898], [4.4527, 25.5898], [2.9072, 25.4709],
  [1.5995, 24.9954], [0.2917, 24.5198], [-0.7783, 24.0443], [-1.8482, 23.4499], [-2.7993, 22.9743],
  [-3.6315, 22.3799], [-4.3448, 21.9044], [-4.8204, 21.4288], [-5.4148, 20.8344], [-5.6526, 20.3588],
  [-5.8903, 19.8833], [-6.1281, 19.4078], [-6.247, 19.0511], [-6.3659, 18.8133], [-6.3659, 18.5756],
  [-6.6037, 18.3378], [-6.7225, 17.9811], [-6.9603, 17.5056], [-7.1981, 17.03], [-7.4359, 16.4356],
  [-7.6736, 15.9601], [-7.9114, 15.4845], [-8.1492, 14.8901], [-8.3869, 14.4146], [-8.6247, 13.939],
  [-8.8625, 13.7012], [-8.9814, 13.4635], [-9.2191, 13.2257], [-9.2191, 12.9879], [-9.2191, 12.7502],
  [-9.1003, 12.5124], [-8.8625, 12.3935], [-8.6247, 12.0369], [-8.2681, 11.5613], [-8.0303, 11.2047],
  [-7.5547, 10.7291], [-7.1981, 10.2536], [-6.9603, 9.778], [-6.6037, 9.1836], [-6.3659, 8.7081],
  [-6.247, 8.2325], [-5.8903, 7.6381], [-5.6526, 7.0437], [-5.4148, 6.4492], [-5.2959, 5.9737],
  [-5.177, 5.3793], [-5.177, 4.7848], [-5.177, 4.1904], [-5.177, 3.596], [-5.177, 3.0015],
  [-5.5337, 2.2882], [-6.1281, 1.456], [-6.6037, 0.8616], [-7.1981, 0.2672], [-8.0303, -0.3273],
  [-8.8625, -0.9217], [-9.8136, -1.5161], [-10.7647, -1.8728], [-11.7157, -2.2294], [-12.6668, -2.3483],
  [-13.499, -2.3483], [-14.4501, -2.3483], [-15.1634, -2.3483], [-15.8767, -2.3483], [-16.4712, -2.3483],
  [-16.9467, -2.3483], [-17.3034, -1.9917], [-17.5411, -1.635], [-17.8978, -1.1595], [-18.1356, -0.8028],
  [-18.3733, -0.0895], [-18.73, 0.3861], [-18.9678, 0.9805], [-19.0866, 1.5749], [-19.4433, 2.2882],
  [-19.5622, 3.0015], [-19.8, 3.596], [-19.8, 4.0715], [-19.8, 4.6659], [-19.8, 5.1415],
  [-19.8, 5.617], [-19.8, 6.0926], [-19.8, 6.4492], [-19.8, 6.8059], [-19.8, 7.0437],
  [-19.8, 7.5192], [-19.8, 7.8759], [-19.6811, 8.3514], [-19.4433, 8.7081], [-19.2055, 9.1836],
  [-18.9678, 9.5403], [-18.8489, 9.8969], [-18.6111, 10.0158], [-18.3733, 10.3725], [-18.1356, 10.6102],
  [-17.7789, 10.848], [-17.4222, 11.2047], [-17.1845, 11.3235], [-16.9467, 11.4424], [-16.59, 11.5613],
  [-16.3523, 11.5613], [-15.9956, 11.5613], [-15.7578, 11.5613], [-15.5201, 11.5613], [-15.2823, 11.5613],
  [-14.8068, 11.5613], [-14.3312, 11.5613], [-13.9746, 11.5613], [-13.7368, 11.4424], [-13.3801, 11.2047],
  [-13.1424, 10.9669], [-12.9046, 10.7291], [-12.6668, 10.6102], [-12.4291, 10.1347], [-12.0724, 9.5403],
  [-11.8346, 9.1836], [-11.7157, 8.9458], [-11.5969, 8.5892], [-11.5969, 8.3514], [-11.5969, 7.9947],
  [-11.5969, 7.757], [-11.5969, 7.5192], [-11.5969, 7.0437], [-11.7157, 6.8059], [-11.9535, 6.3303],
  [-12.1913, 6.0926], [-12.3102, 5.7359], [-12.4291, 5.3793], [-12.5479, 5.0226],
];

// The sketch's own extent, in sketch units (its longest side).
function sketchExtent() {
  const xs = SKETCH_PTS.map((p) => p[0]), ys = SKETCH_PTS.map((p) => p[1]);
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

// The loop in inches: 48 evenly spaced points round the closed curve (the spline wraps, so the start and the
// end join smoothly), moved so the first point is the origin and the path leaves it heading +X (the rest pose).
const LOOP_POINTS = 48;
// The stroke does not join at its ends: the last point is about 8 in from the first, with a sharp turn between.
// A Gaussian average round the closed loop (sigma 3 points, about 9 in) turns that corner into a smooth join,
// the seam turns by about 4 degrees, and no point moves more than about 3 in.
const SEAM_SIGMA = 3;
function smoothClosed(P, sigma) {
  const n = P.length, r = Math.ceil(3 * sigma), out = [];
  for (let i = 0; i < n; i++) {
    let sx = 0, sy = 0, sw = 0;
    for (let j = -r; j <= r; j++) {
      const w = Math.exp(-(j * j) / (2 * sigma * sigma)), q = P[(i + j + n * 10) % n];
      sx += w * q[0]; sy += w * q[1]; sw += w;
    }
    out.push([sx / sw, sy / sw, 0]);
  }
  return out;
}
// The walk for any closed sketch stroke: sketch points, inches per unit, and the smoothing sigma.
function loopPath() {
  const e = sketchExtent();
  return loopFrom(SKETCH_PTS, LABEL_IN / Math.max(e.w, e.h), SEAM_SIGMA);
}
// n: points the walk path is sampled at. Tight curves need more (Robot Path 2 uses 120, about 3 in apart).
function loopFrom(sketch, k, sigma, n = LOOP_POINTS) {
  const raw = smoothClosed(sketch.map(([x, y]) => [x * k, y * k, 0]), sigma);
  const s = M.pathAt(raw, 0).point;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const p = M.pathAt(raw, i / n).point;
    pts.push([p[0] - s[0], p[1] - s[1]]);
  }
  // Turn the loop so the walk's heading at the start is exactly +X. The walk reads its heading from these
  // 48 points, so the turn is measured on them (not on the dense stroke, whose tangent differs a little).
  const h = M.pathAt(pts.map((p) => [p[0], p[1], 0]), 0).heading;
  const cos = Math.cos(-h), sin = Math.sin(-h);
  return pts.map(([x, y]) => [round(x * cos - y * sin), round(x * sin + y * cos)]);
}
const round = (x) => Math.round(x * 100) / 100;

const PATH = loopPath();

// Robot Path 2 (Quick Detail fd1878e1-ac12-4355-afee-3ebeeb07d4d9, tags make3d): Jimmy's sketch, one closed stroke
// that crosses itself. Every 6th point of the stroke (139 points). The sketch has no dimension label, so it is sized
// to 10 times the first size (about 760 in across, 90.9 in per unit). Estimate; confirm with Jimmy.
const ROBOT_PATH_ID = 'fd1878e1-ac12-4355-afee-3ebeeb07d4d9';
const ROBOT_PATH_IN_PER_UNIT = 90.9;
const ROBOT_PATH_PTS = [
  [-3.76, -0.96], [-3.73, -1.21], [-3.68, -1.40], [-3.55, -1.60], [-3.41, -1.82], [-3.22, -2.03], [-3.04, -2.19], [-2.86, -2.32], [-2.63, -2.45], [-2.37, -2.59],
  [-2.02, -2.76], [-1.62, -2.93], [-1.23, -3.02], [-0.90, -3.03], [-0.61, -3.03], [-0.34, -3.02], [-0.06, -2.97], [0.26, -2.92], [0.52, -2.81], [0.74, -2.68],
  [0.96, -2.55], [1.14, -2.47], [1.29, -2.38], [1.45, -2.25], [1.59, -2.11], [1.71, -1.93], [1.84, -1.75], [1.93, -1.57], [2.00, -1.42], [2.05, -1.27],
  [2.06, -1.12], [2.06, -0.97], [2.06, -0.77], [2.06, -0.53], [2.06, -0.25], [2.06, 0.02], [2.09, 0.25], [2.13, 0.50], [2.19, 0.73], [2.31, 0.93],
  [2.49, 1.10], [2.70, 1.20], [2.96, 1.25], [3.24, 1.25], [3.52, 1.19], [3.81, 0.96], [4.08, 0.61], [4.32, 0.24], [4.44, -0.07], [4.45, -0.35],
  [4.33, -0.59], [4.08, -0.80], [3.78, -0.98], [3.44, -1.15], [3.06, -1.29], [2.63, -1.40], [2.16, -1.48], [1.63, -1.49], [1.11, -1.46], [0.66, -1.34],
  [0.34, -1.20], [0.11, -1.00], [-0.02, -0.74], [-0.12, -0.41], [-0.18, -0.07], [-0.18, 0.22], [-0.11, 0.48], [0.05, 0.68], [0.24, 0.82], [0.47, 0.87],
  [0.73, 0.84], [0.98, 0.60], [1.16, 0.29], [1.20, -0.10], [1.15, -0.50], [0.98, -0.83], [0.75, -1.07], [0.47, -1.25], [0.15, -1.39], [-0.25, -1.46],
  [-0.66, -1.49], [-1.09, -1.49], [-1.55, -1.33], [-1.97, -1.10], [-2.31, -0.79], [-2.52, -0.47], [-2.62, -0.11], [-2.65, 0.29], [-2.65, 0.67], [-2.60, 1.00],
  [-2.42, 1.34], [-2.14, 1.64], [-1.82, 1.88], [-1.51, 2.04], [-1.21, 2.14], [-0.94, 2.19], [-0.67, 2.20], [-0.37, 2.20], [-0.06, 2.12], [0.28, 2.03],
  [0.61, 1.93], [0.93, 1.80], [1.26, 1.70], [1.59, 1.67], [1.90, 1.66], [2.22, 1.69], [2.51, 1.79], [2.78, 1.93], [2.95, 2.10], [3.02, 2.27],
  [3.04, 2.43], [2.92, 2.60], [2.69, 2.75], [2.41, 2.86], [2.10, 2.95], [1.79, 3.02], [1.46, 3.08], [1.10, 3.12], [0.72, 3.12], [0.36, 3.12],
  [0.03, 3.06], [-0.27, 2.97], [-0.61, 2.88], [-0.92, 2.78], [-1.23, 2.67], [-1.54, 2.56], [-1.87, 2.42], [-2.20, 2.27], [-2.56, 2.12], [-2.89, 1.91],
  [-3.20, 1.62], [-3.47, 1.31], [-3.70, 0.94], [-3.85, 0.51], [-3.91, 0.07], [-3.92, -0.33], [-3.89, -0.69], [-3.80, -0.94], [-3.70, -1.10], [-3.53, -1.22],
];
const PATH_V6 = loopFrom(ROBOT_PATH_PTS, ROBOT_PATH_IN_PER_UNIT, 1.0, 120);
// The walk for each version: V02 to V05 use the sketched loop; V06 uses the Robot Path.
const pathFor = (v) => (v >= 6 ? PATH_V6 : PATH);

// Frisbee: a flat disc with a rim, held in the left hand (the hand is at x 0, y 6.8, z 16.5 in the robot).
function addFrisbee(add) {
  add('frisbee', { name: 'Frisbee', description: 'held in the left hand', type: 'group', dimensions: [], position: [0, 6.8, 16.5], parent: 'arm-l',
    tags: ['show:frisbee'] });
  add('frisbee-disc', { name: 'Frisbee disc', description: 'flat, coral', type: 'cylinder', dimensions: [4.5, 0.5], position: [0, 12.3, 16.5], material: 'accent', parent: 'frisbee' });
  add('frisbee-rim', { name: 'Frisbee rim', description: 'raised ring on the disc', type: 'cylinder', dimensions: [2.8, 0.6], position: [0, 12.3, 17.05], material: 'joint', parent: 'frisbee' });
}

// V05: the frisbee moves to the banana's hand (right). The disc hangs outside the hand, so the rim touches it.
function addFrisbeeRight(add) {
  const [hx, hy, hz] = RB.HAND_R;
  add('frisbee', { name: 'Frisbee', description: 'held in the right hand, with the banana', type: 'group', dimensions: [], position: [hx, hy, hz], parent: 'arm-r',
    tags: ['show:frisbee'] });
  add('frisbee-disc', { name: 'Frisbee disc', description: 'flat, coral', type: 'cylinder', dimensions: [4.5, 0.5], position: [hx, hy - 4.5, hz], material: 'accent', parent: 'frisbee' });
  add('frisbee-rim', { name: 'Frisbee rim', description: 'raised ring on the disc', type: 'cylinder', dimensions: [2.8, 0.6], position: [hx, hy - 4.5, hz + 0.55], material: 'joint', parent: 'frisbee' });
}

// Top hat: a brim, a crown and a band, on the head (the head top is at z 37).
function addHat(add) {
  add('hat', { name: 'Top hat', description: 'sits on the head', type: 'group', dimensions: [], position: [0, 0, 37], parent: 'upper',
    tags: ['show:hat'] });
  add('hat-brim', { name: 'Hat brim', type: 'cylinder', dimensions: [5.5, 0.6], position: [0, 0, 37.3], material: 'ink', parent: 'hat' });
  add('hat-crown', { name: 'Hat crown', type: 'cylinder', dimensions: [3.6, 6], position: [0, 0, 40.6], material: 'ink', parent: 'hat' });
  add('hat-band', { name: 'Hat band', type: 'cylinder', dimensions: [3.65, 1], position: [0, 0, 38.1], material: 'accent', parent: 'hat' });
}

// The increment for version v (2 to 6). Each version adds to the one before; older parts are kept, and an older
// increment is never rebuilt with newer parts (V03 and V04 keep the frisbee in the left hand).
function defsFor(v) {
  // V07: the robot body is rebuilt from Quick Detail "Robot Sketch 2" (tools/robot_sketch2.js); no hat, frisbee or cape.
  if (v === 7) return SK2.defs(pathFor(v));
  // V08 and V09: the articulated robot (every limb jointed); V09 is the fuzzy reinterpretation
  if (v === 12) return TR.defs(pathFor(v), true);
  if (v === 11) return TR.defs(pathFor(v));
  if (v === 10) return SK2.playDefs(pathFor(v));
  if (v >= 8) return SK2.articulatedDefs(pathFor(v), v === 9);
  const add = (() => { const d = []; const f = (key, o) => d.push([key, o]); f.list = d; return f; })();
  const base = RB.defs(pathFor(v), { tagged: true });
  for (const [key, o] of base) add(key, o);
  if (v >= 3 && v < 5) addFrisbee(add);
  if (v >= 4) addHat(add);
  if (v >= 5) { addFrisbeeRight(add); CAPE.capeDefs(add); }
  return add.list;
}

const NOTES = {
  2: 'The sketched loop, smoothed into a closed curve: the robot walks it with the banana. Banana is a visibility group.',
  3: 'Adds a frisbee held in the left hand. Frisbee is a visibility group.',
  4: 'Adds a top hat on the head. Hat is a visibility group.',
  5: 'The frisbee moves to the banana hand. Adds the robot cape (Quick Detail "Robot Cape"): a sheet that ripples down its length, and flows more in tight turns. Cape is a visibility group.',
  6: 'Walks the sketch Quick Detail "Robot Path 2" (one stroke that crosses itself). Same parts as V05: frisbee, hat and cape.',
  8: 'Articulated: the sketch robot with jointed arms (shoulder and elbow), legs (hip and knee), ears on the head, a head that tilts with the eyes, mouth and antenna, and a tail that wags. Motion from the walk: the knees fold, the elbows bend, the ears flap, the antenna sways and the tail wags.',
  12: 'Traced robot with depth and play: the limbs bow forward so the figure has volume, the arms and legs hinge at their middle joints, the tail whips down its length, the antenna sways and bounces, the eyelids blink twice a lap, and the body bounces on each step.',
  11: 'Traced from the drawing: each part follows its stroke in Quick Detail "Robot Sketch 2". Five arms from the body (the hinged left arm, the down-left arm, the right arm, the top-left arm and the top arm), two legs, the round body and head as drawn (the head sits to one side), the spiky ears and crest, the antenna and the very long tail. The walk is the Robot Path 2 walk; the arms and legs swing from their roots.',
  10: 'Play: five limbs from the body (the hinged left arm, the banana arm, a waving arm from the back, two long legs). Each has a hinge cap. The arms swing and fold, the tail whips down its length, the antenna bounces on its spring, the eyelids blink twice a lap and the body bounces on each step.',
  9: 'Fuzzy reinterpretation of V08: the ears and hands are fluffy clusters, a ring of fuzz balls runs round the body, and the motion is livelier (the ears flutter fast, the body bounces on each step, the tail wags more, the knees bend deeper).',
  7: 'The robot is rebuilt from Quick Detail "Robot Sketch 2": round body with a chest panel of nine lights, round head, long antenna and long tail, four limbs. It walks the Robot Path 2 walk with the banana. No hat, frisbee or cape (not in the sketch).',
};

// Motion for version v. V05 and V06 add the cape's wave and sway to the walk. V07 has no cape.
function motionFor(v, uuid) {
  const base = RB.motionFor(uuid, pathFor(v));
  if (v === 12) return TR.motionFor(uuid, pathFor(v), true);
  if (v === 11) return TR.motionFor(uuid, pathFor(v));
  if (v === 10) return SK2.playMotion(uuid, pathFor(v));
  if (v >= 8) return SK2.articulatedMotion(uuid, pathFor(v), v === 9);
  if (v !== 5 && v !== 6) return base;
  const path3 = pathFor(v).map((p) => [p[0], p[1], 0]);
  return { ...base, description: `${base.description} The cape ripples down its length and sways in turns.`,
    motions: [...base.motions, ...CAPE.capeMotions(uuid('cape'), path3)] };
}

function sceneFor(v) {
  const id = `robot-loop-v${String(v).padStart(2, '0')}`;
  return {
    id,
    builtin: true,
    project: RB.ROBOT_PROJECT,
    header: {
      model_id: id,
      name: `${RB.ROBOT_PROJECT} V${String(v).padStart(2, '0')}`,
      description: `${NOTES[v]} ${v >= 6 ? `Path from Quick Detail "Robot Path 2" (${ROBOT_PATH_ID}).` : `Walks the loop from Quick Detail "Robot Loop" (${SKETCH_ID}).`}`,
      units: 'in', up: 'z', world: v >= 6 ? 'robot-path-world' : WORLD_ID,
      materials: v === 5 || v === 6 ? { ...RB.MATERIALS, cape: { color: '#bcd9f2', opacity: 1 } } : RB.MATERIALS,
    },
    defs: defsFor(v),
    motion: (uuid) => motionFor(v, uuid),
  };
}

const ROBOT_LOOP = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(sceneFor);

module.exports = { ROBOT_LOOP, defsFor, loopPath, PATH, PATH_V6, SKETCH_ID, SKETCH_PTS, LABEL_IN, ROBOT_PATH_ID };
