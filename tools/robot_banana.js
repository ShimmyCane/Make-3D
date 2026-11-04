// Robot with a banana: the first animation test scene (convo v0.7).
// A toy robot about 3 ft tall holds a banana and walks round a closed, winding path of stepping stones.
// Sizes in inches, Z up, ground z = 0. At rest the robot stands at the origin facing +X.
//
// Two parts:
//   ROBOT_BANANA      the scene (model parts), like every other scene in tools/scenes.js.
//   motionFor(uuid)   the motion file (make3d.motion/0.1), kept separate from the model.
//
// Everything loops. The path closes on itself, and each swing or bob repeats a whole number of times per
// lap, so the last frame flows into the first. Steps are timed to the walking speed: one stride (two steps)
// covers STRIDE inches, so the feet don't slide.

const M = require('../js/core/motion.js');

const WORLD_ID = 'default-world';
// One name in the Library for every robot: this scene (V01) and the robot-loop scenes (V02 to V05) are its versions.
const ROBOT_PROJECT = 'Robot going for a stroll';

const MATERIALS = {
  body: { color: '#a8e0c8', opacity: 1 },   // mint
  head: { color: '#bfe3f0', opacity: 1 },   // sky
  accent: { color: '#f4a38c', opacity: 1 }, // coral
  joint: { color: '#c9c3d9', opacity: 1 },  // lavender
  ink: { color: '#2d2a26', opacity: 1 },
  banana: { color: '#ffd96a', opacity: 1 },
  peel: { color: '#7a5a43', opacity: 1 },
  stone: { color: '#e9e4d8', opacity: 1 },
};

// The walk: a closed, organic loop with turns (inches, on the ground). It starts at the robot's feet,
// heading roughly +X, so the first frame matches the rest pose.
const PATH = [
  [0, 0], [40, 12], [80, 0], [100, 34], [80, 66], [44, 56],
  [14, 80], [-26, 74], [-48, 40], [-30, 12],
];

// Robot sizes
const HIP_Z = 15, LEG_LEN = 13.5, SHOULDER_Z = 27, ARM_Y = 6.8, LEG_Y = 3.5;
const SWING_LEG = 24;                                            // degrees each way
const STEP = 2 * LEG_LEN * Math.sin((SWING_LEG * Math.PI) / 180); // one step, about 11 in
const STRIDE = 2 * STEP;                                          // left + right
const STRIDE_S = 1.0;
const ANKLE_Z = 1.75;
// the foot stays flat (it counter-turns at the ankle), so it lifts by the hip-to-ankle drop at full swing
const FOOT_LIFT = (HIP_Z - ANKLE_Z) * (1 - Math.cos((SWING_LEG * Math.PI) / 180));                                             // seconds per stride

// Right arm reaches forward and down 45 degrees to hold the banana up in front.
const R_ARM_TILT = 45;
const rad = (d) => (d * Math.PI) / 180;
const R_DIR = [Math.sin(rad(R_ARM_TILT)), 0, -Math.cos(rad(R_ARM_TILT))];
const R_SHOULDER = [0, -ARM_Y, SHOULDER_Z];
const HAND_R = [0, 1, 2].map((i) => R_SHOULDER[i] + 10 * R_DIR[i]);

// path: the walk (defaults to V01's PATH). opts.tagged: give the banana group its visibility tag (Robot loop V02 on).
function defs(path = PATH, opts = {}) {
  const d = [];
  const add = (key, o) => d.push([key, o]);

  add('robot', { name: 'Robot', description: 'toy robot, about 3 ft tall; walks the path', type: 'group', dimensions: [], position: [0, 0, 0] });

  // legs: each leg is its own group so it swings from the hip
  for (const [side, y] of [['l', LEG_Y], ['r', -LEG_Y]]) {
    const S = side === 'l' ? 'Left' : 'Right';
    add(`leg-${side}`, { name: `${S} leg`, description: 'swings from the hip', type: 'group', dimensions: [], position: [0, y, HIP_Z], parent: 'robot' });
    add(`thigh-${side}`, { name: `${S} leg tube`, type: 'cylinder', dimensions: [1.4, LEG_LEN], position: [0, y, 1.75 + LEG_LEN / 2], material: 'joint', parent: `leg-${side}` });
    add(`foot-${side}`, { name: `${S} foot`, type: 'box', dimensions: [6, 3.5, 1.5], position: [1, y, 1], material: 'accent', parent: `leg-${side}` });
  }

  // upper body bobs a little on each step
  add('upper', { name: 'Upper body', description: 'sways a little on each step', type: 'group', dimensions: [], position: [0, 0, 24], parent: 'robot' });
  add('pelvis', { name: 'Hips', type: 'box', dimensions: [7, 10, 3], position: [0, 0, 15.5], material: 'joint', parent: 'upper' });
  add('torso', { name: 'Body', type: 'box', dimensions: [8, 11, 11], position: [0, 0, 22.5], material: 'body', parent: 'upper' });
  add('panel', { name: 'Chest panel', type: 'box', dimensions: [0.5, 6, 4], position: [4.25, 0, 23.5], material: 'accent', parent: 'upper' });
  add('button1', { name: 'Button 1', type: 'sphere', dimensions: [0.7], position: [4.6, -1.5, 23.5], material: 'banana', parent: 'upper' });
  add('button2', { name: 'Button 2', type: 'sphere', dimensions: [0.7], position: [4.6, 1.5, 23.5], material: 'head', parent: 'upper' });
  add('neck', { name: 'Neck', type: 'cylinder', dimensions: [1.5, 2], position: [0, 0, 29], material: 'joint', parent: 'upper' });
  add('head', { name: 'Head', type: 'box', dimensions: [8, 9, 7], position: [0, 0, 33.5], material: 'head', parent: 'upper' });
  add('eye-l', { name: 'Left eye', type: 'sphere', dimensions: [1.2], position: [4, 2, 34.5], material: 'ink', parent: 'upper' });
  add('eye-r', { name: 'Right eye', type: 'sphere', dimensions: [1.2], position: [4, -2, 34.5], material: 'ink', parent: 'upper' });
  add('mouth', { name: 'Mouth', type: 'box', dimensions: [0.4, 3, 0.6], position: [4.1, 0, 31.8], material: 'accent', parent: 'upper' });
  add('antenna', { name: 'Antenna', type: 'cylinder', dimensions: [0.3, 4], position: [0, 0, 39], material: 'ink', parent: 'upper' });
  add('antenna-ball', { name: 'Antenna ball', type: 'sphere', dimensions: [1], position: [0, 0, 41.5], material: 'accent', parent: 'upper' });

  // left arm hangs and swings
  add('arm-l', { name: 'Left arm', description: 'swings from the shoulder', type: 'group', dimensions: [], position: [0, ARM_Y, SHOULDER_Z], parent: 'upper' });
  add('arm-l-tube', { name: 'Left arm tube', type: 'cylinder', dimensions: [1.2, 10], position: [0, ARM_Y, SHOULDER_Z - 5], material: 'joint', parent: 'arm-l' });
  add('hand-l', { name: 'Left hand', type: 'sphere', dimensions: [1.8], position: [0, ARM_Y, SHOULDER_Z - 10.5], material: 'accent', parent: 'arm-l' });

  // right arm reaches forward and holds the banana; the banana is in the arm's group, so it travels with the hand
  add('arm-r', { name: 'Right arm', description: 'holds the banana up in front', type: 'group', dimensions: [], position: R_SHOULDER, parent: 'upper' });
  add('arm-r-tube', { name: 'Right arm tube', type: 'cylinder', dimensions: [1.2, 10],
    position: [0, 1, 2].map((i) => R_SHOULDER[i] + 5 * R_DIR[i]), rotation_y: -R_ARM_TILT, material: 'joint', parent: 'arm-r' });
  add('hand-r', { name: 'Right hand', type: 'sphere', dimensions: [1.8], position: HAND_R, material: 'accent', parent: 'arm-r' });

  // banana: a curved row of short tilted cylinders, fat in the middle, brown at the tips.
  // It bends forward (away from the robot), held upright by its middle.
  add('banana', { name: 'Banana', description: 'held in the right hand', type: 'group', dimensions: [], position: HAND_R, parent: 'arm-r',
    ...(opts.tagged ? { tags: ['show:banana'] } : {}) });
  const R = 6, N = 7, SPAN = 100;                 // arc radius (in), segments, degrees of arc
  const centre = [HAND_R[0] + 1.2 - R, HAND_R[1], HAND_R[2]];
  const segLen = (R * rad(SPAN)) / N;
  for (let i = 0; i < N; i++) {
    const a = rad(-SPAN / 2 + SPAN * (i + 0.5) / N);
    const fat = 0.65 + 0.35 * Math.cos((a / rad(SPAN / 2)) * (Math.PI / 2));
    add(`banana-${i + 1}`, { name: `Banana piece ${i + 1}`, type: 'cylinder', dimensions: [fat, segLen + 0.3],
      position: [centre[0] + R * Math.cos(a), centre[1], centre[2] + R * Math.sin(a)],
      rotation_y: -(a * 180) / Math.PI, material: 'banana', parent: 'banana' });
  }
  for (const [k, sgn] of [['tip-top', 1], ['tip-bottom', -1]]) {
    const a = rad(sgn * SPAN / 2);
    add(`banana-${k}`, { name: sgn > 0 ? 'Banana stem' : 'Banana tip', type: 'sphere', dimensions: [0.55],
      position: [centre[0] + R * Math.cos(a), centre[1], centre[2] + R * Math.sin(a)], material: 'peel', parent: 'banana' });
  }

  // stepping stones along the path, about one per step
  add('stones', { name: 'Stepping stones', description: 'the path the robot walks', type: 'group', dimensions: [], position: [0, 0, 0] });
  const pts = path.map((p) => [p[0], p[1], 0]);
  const count = Math.round(M.pathLength(pts) / 16);
  for (let i = 0; i < count; i++) {
    const { point } = M.pathAt(pts, i / count);
    add(`stone-${i + 1}`, { name: `Stone ${i + 1}`, type: 'cylinder', dimensions: [3.2 + (i % 3) * 0.4, 0.25],
      position: [round(point[0]), round(point[1]), 0.125], material: 'stone', parent: 'stones' });
  }
  return d;
}

const round = (x) => Math.round(x * 100) / 100;

const ROBOT_BANANA = {
  id: 'robot-banana',
  builtin: true,
  header: {
    model_id: 'robot-banana',
    name: `${ROBOT_PROJECT} V01`,
    description: 'A toy robot holding a banana walks round a winding loop of stepping stones. The first animation test.',
    units: 'in', up: 'z', world: WORLD_ID,
    materials: MATERIALS,
  },
  defs: defs(),
};

// The motion file. uuid(key) turns a scene key into the object's uuid.
function motionFor(uuid, path = PATH) {
  const pts = path.map((p) => [p[0], p[1], 0]);
  const strides = Math.max(1, Math.round(M.pathLength(pts) / STRIDE));
  const loop = strides * STRIDE_S;
  return {
    schema: M.MOTION_SCHEMA,
    model_id: ROBOT_BANANA.id,
    name: 'Walk the loop',
    description: `One lap of the stones is ${strides} strides. Everything repeats a whole number of times per lap, so the loop has no jump.`,
    units: 'in', up: 'z',
    loop_s: loop,
    autoplay: { plays: 2 },
    motions: [
      { id: 'walk', target: uuid('robot'), kind: 'path', points: pts, face: 'tangent', rest_heading_deg: 0,
        pivot: [0, 0, 0], cycles: 1 },
      { id: 'left-leg', target: uuid('leg-l'), kind: 'swing', axis: 'y', pivot: [0, LEG_Y, HIP_Z],
        from: -SWING_LEG, to: SWING_LEG, cycles: strides, phase: 0 },
      { id: 'right-leg', target: uuid('leg-r'), kind: 'swing', axis: 'y', pivot: [0, -LEG_Y, HIP_Z],
        from: -SWING_LEG, to: SWING_LEG, cycles: strides, phase: 0.5 },
      // feet turn back at the ankle by the same angle, so they stay flat on the ground
      { id: 'left-foot', target: uuid('foot-l'), kind: 'swing', axis: 'y', pivot: [0, LEG_Y, ANKLE_Z],
        from: SWING_LEG, to: -SWING_LEG, cycles: strides, phase: 0 },
      { id: 'right-foot', target: uuid('foot-r'), kind: 'swing', axis: 'y', pivot: [0, -LEG_Y, ANKLE_Z],
        from: SWING_LEG, to: -SWING_LEG, cycles: strides, phase: 0.5 },
      { id: 'left-arm', target: uuid('arm-l'), kind: 'swing', axis: 'y', pivot: [0, ARM_Y, SHOULDER_Z],
        from: -18, to: 18, cycles: strides, phase: 0.5 },
      { id: 'right-arm', target: uuid('arm-r'), kind: 'swing', axis: 'y', pivot: R_SHOULDER,
        from: -6, to: 6, cycles: strides, phase: 0 },
      // Swinging legs lift the feet, so the whole robot dips while the legs are spread and rises as they
      // pass under the body (twice per stride). The dip equals the foot lift, so a foot stays on the ground.
      { id: 'dip', target: uuid('robot'), kind: 'bob', axis: 'z', amount: -round(FOOT_LIFT), cycles: strides * 2, phase: 0 },
      // a small side-to-side sway of the upper body, from the hips
      { id: 'sway', target: uuid('upper'), kind: 'swing', axis: 'x', pivot: [0, 0, HIP_Z],
        from: -2, to: 2, cycles: strides, phase: 0 },
    ],
  };
}

ROBOT_BANANA.motion = motionFor;

module.exports = { ROBOT_BANANA, motionFor, defs, MATERIALS, PATH, HAND_R, ROBOT_PROJECT };
