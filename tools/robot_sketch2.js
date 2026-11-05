// Robot Sketch 2: the robot's body rebuilt from the Quick Detail "Robot Sketch 2" (sketch_details id
// a4ec8a88-5833-4504-9df2-1bc0562258b1, tags make3d). Used by Robot loop V07 (tools/robot_loop.js).
//
// What the sketch shows (read from its 50 strokes and its narration: "head", "body", "hinge", "multiple hands",
// "super computer", "very long tail", "super sharp"):
//   - a round head with two eyes and a small mouth
//   - a round body with a chest panel of nine red dots (the "super computer")
//   - a long antenna-like line up from the back of the body, and a long tail
//   - four limbs with claw-like hands or feet (two long arms, two short legs)
//   - two crown-like fan shapes on top, which this version does not model
//
// The sketch has no dimension label, and its scale label (3"=1'-0") would make the robot 27 ft tall, so it is
// not used. The robot is sized to the same 3 ft rig as V01 (legs, arms, hips and the banana are unchanged).
// Proportions are read from the drawing: a head about 0.6 of the body's width, a body about 14 in across.
//
// Parts that are not in the sketch (hat, frisbee, cape) are left out of this version.
// Positions are absolute scene coordinates (inches, Z up), as in tools/robot_banana.js.

const RB = require('./robot_banana.js');
const M = require('../js/core/motion.js');

const SKETCH2_ID = 'a4ec8a88-5833-4504-9df2-1bc0562258b1';

// Parts of Robot V01 that Robot Sketch 2 replaces. The legs, feet, arms, hand, banana, neck and hips are kept.
const REPLACED = new Set(['torso', 'panel', 'button1', 'button2', 'head', 'eye-l', 'eye-r', 'mouth', 'antenna', 'antenna-ball']);

const BODY_Z = 22.5, BODY_R = 7;        // round body, centre and radius
const HEAD_Z = 33.5, HEAD_R = 4.2;      // round head on the neck (neck top z 30)
const ANT_BASE = HEAD_Z + HEAD_R;       // antenna starts at the top of the head
const TAIL_START = [-6.5, 0, 21.5];     // back of the body, low
const TAIL_DEG = 30;                    // the tail rises at 30 degrees, going back
const TAIL_SEG = 5.5;                   // 4 segments, 22 in in all ("very long")
const TAIL_R = [1.0, 0.8, 0.62, 0.45];  // tapers to a point

const round = (x) => Math.round(x * 100) / 100;
const rad = (d) => (d * Math.PI) / 180;

// The body parts, added through add(key, def) in the same order as the sketch reads: body, panel, head, tail.
function bodyDefs() {
  const d = [];
  const add = (key, o) => d.push([key, o]);

  // round body (the sketch's big circle), a sphere on the upper group
  add('torso', { name: 'Body', description: 'round body, from Robot Sketch 2', type: 'sphere', dimensions: [BODY_R],
    position: [0, 0, BODY_Z], material: 'body', parent: 'upper' });

  // chest panel: a flat disc on the front with nine lights (the sketch's red dots, in a 3 x 3 grid)
  add('panel', { name: 'Chest panel', description: 'flat disc on the front of the body', type: 'cylinder', dimensions: [3.2, 0.5],
    position: [6.6, 0, BODY_Z], rotation_y: 90, material: 'joint', parent: 'upper' });
  let light = 0;
  for (const dz of [-2, 0, 2]) for (const dy of [-2, 0, 2]) {
    light += 1;
    const x = Math.sqrt(BODY_R * BODY_R - dy * dy - dz * dz) + 0.2;   // on the body's surface
    add(`light-${light}`, { name: `Chest light ${light}`, description: 'red light on the chest panel', type: 'sphere', dimensions: [0.5],
      position: [round(x), dy, BODY_Z + dz], material: 'accent', parent: 'upper' });
  }

  // round head on the neck, with two eyes and a small mouth
  add('head', { name: 'Head', description: 'round head, from Robot Sketch 2', type: 'sphere', dimensions: [HEAD_R],
    position: [0, 0, HEAD_Z], material: 'head', parent: 'upper' });
  add('eye-l', { name: 'Left eye', type: 'sphere', dimensions: [0.9], position: [3.6, 1.9, 35], material: 'ink', parent: 'upper' });
  add('eye-r', { name: 'Right eye', type: 'sphere', dimensions: [0.9], position: [3.6, -1.9, 35], material: 'ink', parent: 'upper' });
  add('mouth', { name: 'Mouth', type: 'box', dimensions: [0.4, 2.6, 0.6], position: [3.9, 0, 31.2], material: 'accent', parent: 'upper' });

  // long antenna (the sketch's long line up from the body), with a ball on the top
  add('antenna', { name: 'Antenna', description: 'long, from the top of the head', type: 'cylinder', dimensions: [0.3, 7],
    position: [-1.5, 0, ANT_BASE + 3.5], material: 'ink', parent: 'upper' });
  add('antenna-ball', { name: 'Antenna ball', type: 'sphere', dimensions: [0.9], position: [-1.5, 0, ANT_BASE + 7.4], material: 'accent', parent: 'upper' });

  // long tail: four tapering segments going back and up, all on the upper group (it sways with the body)
  const dir = [-Math.cos(rad(TAIL_DEG)), 0, Math.sin(rad(TAIL_DEG))];
  const phi = -(90 - TAIL_DEG);       // rotation about Y that points a cylinder's axis along dir
  TAIL_R.forEach((r, i) => {
    const s = i * TAIL_SEG + TAIL_SEG / 2;
    const pos = [0, 1, 2].map((k) => round(TAIL_START[k] + dir[k] * s));
    add(`tail-${i + 1}`, { name: `Tail ${i + 1}`, description: 'long tail, tapers to the tip', type: 'cylinder', dimensions: [r, TAIL_SEG + 0.2],
      position: pos, rotation_y: phi, material: 'body', parent: 'upper' });
  });
  return d;
}

// The full list of parts for V07: Robot V01's rig and banana (minus the replaced parts), then the sketch's body.
function defs(path) {
  const kept = RB.defs(path, { tagged: true }).filter(([key]) => !REPLACED.has(key));
  return [...kept, ...bodyDefs()];
}

// ---------------------------------------------------------------------------------------------
// V08 and V09: the articulated robot. Every limb is a chain of groups with its own joint, so each part moves
// from the joint the sketch shows (the hinge in the arm, the knees, the ears, the head, the tail).
//   V08  the sketch's parts, each jointed: shoulder and elbow on both arms, hip and knee on both legs, two
//        spiky ears on the head, a tilting head with the eyes, mouth and antenna, a tail that wags.
//   V09  the same rig, reinterpreted more fuzzily: the ears and the hands become fluffy clusters, a ring of
//        small fuzz balls runs round the body and the head, and the motion is livelier (bigger flutter,
//        a body bounce on each step, a stronger tail wag, deeper knees).
// Motion is sampled into keys (96 per lap). The feet stay flat: each ankle turns back by the hip and knee.

const RB2 = RB;                        // the rig constants (robot_banana.js)
const KNEE_Z = RB2.HIP_Z - RB2.LEG_LEN / 2;  // the knee, halfway down the leg (8.25 in)
const ELBOW_Z = RB2.SHOULDER_Z - 5;          // the left elbow, 5 in below the shoulder (22 in)
const EAR_Z = HEAD_Z + 0.5;                  // the ears sit on the sides of the head
const HEAD_NECK_Z = 30;                      // the head tilts about the neck
const KEY_N = 96;

// Each joint's style: amplitudes in degrees. V08 is the base; V09 is the fuzzy reinterpretation.
const STYLE = {
  v8: { knee: 32, elbow: 16, elbowWave: 8, ear: 14, earFast: 1, head: 4, antenna: 9, tail: 14, bounce: 0, legSwing: RB2.SWING_LEG, armSwing: 18 },
  v9: { knee: 46, elbow: 22, elbowWave: 12, ear: 26, earFast: 3, head: 7, antenna: 16, tail: 24, bounce: 0.9, legSwing: RB2.SWING_LEG + 2, armSwing: 22 },
};

// Fuzz balls in a ring round a centre c = [x, y, z] (V09 only). plane 'yz': a ring seen from the side (the body's
// outline); plane 'xz': a flat ring facing sideways (an ear).
function fuzzRing(add, prefix, c, r, n, ballR, mat, parent, plane) {
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n;
    const p = plane === 'yz' ? [c[0], c[1] + r * Math.cos(a), c[2] + r * Math.sin(a)] : [c[0] + r * Math.cos(a), c[1], c[2] + r * Math.sin(a)];
    add(`${prefix}-${i + 1}`, { name: `${prefix} ${i + 1}`, type: 'sphere', dimensions: [ballR], position: p.map(round), material: mat, parent });
  }
}

// The articulated parts. Positions are absolute (inches, Z up), like the rest of the rig; the groups give the
// joints their motion. Parts that RB's rig already has (legs, arms, banana, hips, neck) are rebuilt here
// because each limb now has a second joint.
function articulatedDefs(path, fuzzy) {
  const drop = new Set(['thigh-l', 'foot-l', 'thigh-r', 'foot-r', 'arm-l-tube', 'hand-l', 'arm-r-tube', 'hand-r',
    'torso', 'panel', 'button1', 'button2', 'head', 'eye-l', 'eye-r', 'mouth', 'antenna', 'antenna-ball']);
  const base = RB2.defs(path, { tagged: true }).filter(([key]) => !drop.has(key));
  // the banana is held in the right hand, on the right elbow group (a group, so it moves with the forearm).
  // It is added last, after elbow-r exists.
  const isBanana = ([key]) => key === 'banana' || key.startsWith('banana-');
  const bananaParts = base.filter(isBanana).map(([key, o]) => [key, key === 'banana' ? { ...o, parent: 'elbow-r' } : o]);
  const d = base.filter((e) => !isBanana(e));
  const add = (key, o) => d.push([key, o]);

  // legs: hip (leg group) -> knee group -> shin and foot. Upper leg runs from hip to knee.
  for (const [side, y] of [['l', RB2.LEG_Y], ['r', -RB2.LEG_Y]]) {
    const S2 = side === 'l' ? 'Left' : 'Right';
    add(`thigh-${side}`, { name: `${S2} thigh`, description: 'hip to knee', type: 'cylinder', dimensions: [1.4, RB2.HIP_Z - KNEE_Z + 0.2],
      position: [0, y, (RB2.HIP_Z + KNEE_Z) / 2], material: 'joint', parent: `leg-${side}` });
    add(`knee-${side}`, { name: `${S2} knee`, description: 'bends; the foot turns to stay flat', type: 'group', dimensions: [],
      position: [0, y, KNEE_Z], parent: `leg-${side}` });
    add(`shin-${side}`, { name: `${S2} shin`, type: 'cylinder', dimensions: [1.3, KNEE_Z - RB2.ANKLE_Z + 0.2],
      position: [0, y, (KNEE_Z + RB2.ANKLE_Z) / 2], material: 'joint', parent: `knee-${side}` });
    add(`foot-${side}`, { name: `${S2} foot`, type: 'box', dimensions: [6, 3.5, 1.5], position: [1, y, 1], material: 'accent', parent: `knee-${side}` });
  }

  // arms: shoulder -> elbow group -> forearm and hand. Upper arm and forearm are 5 in each.
  add('upper-arm-l', { name: 'Left upper arm', type: 'cylinder', dimensions: [1.2, 5.2], position: [0, RB2.ARM_Y, RB2.SHOULDER_Z - 2.5], material: 'joint', parent: 'arm-l' });
  add('elbow-l', { name: 'Left elbow', description: 'bends', type: 'group', dimensions: [], position: [0, RB2.ARM_Y, ELBOW_Z], parent: 'arm-l' });
  add('forearm-l', { name: 'Left forearm', type: 'cylinder', dimensions: [1.1, 5.7], position: [0, RB2.ARM_Y, ELBOW_Z - 2.75], material: 'joint', parent: 'elbow-l' });
  add('hand-l', { name: 'Left hand', description: 'a claw', type: 'sphere', dimensions: [fuzzy ? 2.3 : 1.8], position: [0, RB2.ARM_Y, RB2.SHOULDER_Z - 10.5], material: 'accent', parent: 'elbow-l' });

  const [sx, sy, sz] = RB2.R_SHOULDER, D = RB2.R_DIR;
  const E = [sx + 5 * D[0], sy + 5 * D[1], sz + 5 * D[2]];                // the right elbow
  add('upper-arm-r', { name: 'Right upper arm', type: 'cylinder', dimensions: [1.2, 5.2],
    position: [0, 1, 2].map((k) => round(RB2.R_SHOULDER[k] + 2.5 * D[k])), rotation_y: -RB2.R_ARM_TILT, material: 'joint', parent: 'arm-r' });
  add('elbow-r', { name: 'Right elbow', description: 'bends; the wrist waves the banana', type: 'group', dimensions: [], position: E, parent: 'arm-r' });
  add('forearm-r', { name: 'Right forearm', type: 'cylinder', dimensions: [1.1, 5.2],
    position: [0, 1, 2].map((k) => round(E[k] + 2.5 * D[k])), rotation_y: -RB2.R_ARM_TILT, material: 'joint', parent: 'elbow-r' });
  add('hand-r', { name: 'Right hand', type: 'sphere', dimensions: [fuzzy ? 2.3 : 1.8], position: RB2.HAND_R, material: 'accent', parent: 'elbow-r' });

  // body (the sketch's round body, chest panel and nine lights, unchanged from V07)
  add('torso', { name: 'Body', description: 'round body, from Robot Sketch 2', type: 'sphere', dimensions: [BODY_R], position: [0, 0, BODY_Z], material: 'body', parent: 'upper' });
  add('panel', { name: 'Chest panel', type: 'cylinder', dimensions: [3.2, 0.5], position: [6.6, 0, BODY_Z], rotation_y: 90, material: 'joint', parent: 'upper' });
  let light = 0;
  for (const dz of [-2, 0, 2]) for (const dy of [-2, 0, 2]) {
    light += 1;
    const x = Math.sqrt(BODY_R * BODY_R - dy * dy - dz * dz) + 0.2;
    add(`light-${light}`, { name: `Chest light ${light}`, type: 'sphere', dimensions: [0.5], position: [round(x), dy, BODY_Z + dz], material: 'accent', parent: 'upper' });
  }
  if (fuzzy) fuzzRing(add, 'Body fuzz', [0, 0, BODY_Z], BODY_R + 0.4, 10, 0.5, 'head', 'upper', 'yz');

  // head group: tilts about the neck. The head, eyes, mouth, ears and antenna all ride on it.
  add('head-group', { name: 'Head', description: 'tilts; the ears and antenna ride on it', type: 'group', dimensions: [], position: [0, 0, HEAD_NECK_Z], parent: 'upper' });
  add('head', { name: 'Head sphere', type: 'sphere', dimensions: [HEAD_R], position: [0, 0, HEAD_Z], material: 'head', parent: 'head-group' });
  add('eye-l', { name: 'Left eye', description: 'a small curl in the sketch, a dot here', type: 'sphere', dimensions: [0.9], position: [3.6, 1.9, 35], material: 'ink', parent: 'head-group' });
  add('eye-r', { name: 'Right eye', type: 'sphere', dimensions: [0.9], position: [3.6, -1.9, 35], material: 'ink', parent: 'head-group' });
  add('mouth', { name: 'Mouth', type: 'box', dimensions: [0.4, 2.6, 0.6], position: [3.9, 0, 31.2], material: 'accent', parent: 'head-group' });
  // ears: a fan of spikes on each side of the head (sketch: the spiky shapes); fuzzy in V09 (a cluster of balls)
  for (const [side, y] of [['l', HEAD_R + 0.2], ['r', -(HEAD_R + 0.2)]]) {
    const S2 = side === 'l' ? 'Left' : 'Right';
    add(`ear-${side}`, { name: `${S2} ear`, description: 'flaps', type: 'group', dimensions: [], position: [0, y, EAR_Z], parent: 'head-group' });
    if (fuzzy) {
      fuzzRing(add, `ear-${side}-fuzz`, [0, y, EAR_Z + 1.2], 1.2, 5, 0.9, 'head', `ear-${side}`, 'xz');
    } else {
      [-22, 0, 22].forEach((lean, i) => add(`ear-${side}-spike-${i + 1}`, { name: `${S2} ear spike ${i + 1}`, type: 'cylinder',
        dimensions: [0.35, 4.4], position: [round(lean * 0.05), y, EAR_Z + 2.2], rotation_y: lean, material: 'accent', parent: `ear-${side}` }));
    }
  }
  // antenna (the sketch's long line): a group at its base, so it sways
  add('antenna-base', { name: 'Antenna base', type: 'group', dimensions: [], position: [-1.5, 0, HEAD_Z + HEAD_R], parent: 'head-group' });
  add('antenna', { name: 'Antenna', type: 'cylinder', dimensions: [0.3, 7], position: [0, 0, 3.5], material: 'ink', parent: 'antenna-base' });
  add('antenna-ball', { name: 'Antenna ball', type: 'sphere', dimensions: [0.9], position: [0, 0, 7.4], material: 'accent', parent: 'antenna-base' });

  // tail: a group at the back of the body, the four segments hang from it and wag
  add('tail-group', { name: 'Tail', description: 'long; wags side to side', type: 'group', dimensions: [], position: TAIL_START, parent: 'upper' });
  const dir = [-Math.cos(rad(TAIL_DEG)), 0, Math.sin(rad(TAIL_DEG))];
  const phi = -(90 - TAIL_DEG);
  TAIL_R.forEach((r, i) => {
    const s = i * TAIL_SEG + TAIL_SEG / 2;
    add(`tail-${i + 1}`, { name: `Tail ${i + 1}`, type: 'cylinder', dimensions: [r, TAIL_SEG + 0.2],
      position: [0, 1, 2].map((k) => round(TAIL_START[k] + dir[k] * s)), rotation_y: phi, material: 'body', parent: 'tail-group' });
  });
  d.push(...bananaParts);
  return d;
}

// Keys for a joint: f(u) for u in 0..1, sampled at KEY_N points, as [[t, degrees], ...] starting at 0.
function sampleKeys(f) {
  const v = Array.from({ length: KEY_N }, (_, i) => f(i / KEY_N));
  return v.map((x, i) => [round(i / KEY_N), round(x - v[0])]);
}

// Motion for V08/V09. Strides: as in the robot's walk (one stride per 2 steps, a whole number per lap).
function articulatedMotion(uuid, path, fuzzy) {
  const S = fuzzy ? STYLE.v9 : STYLE.v8;
  const E = RB2.R_SHOULDER.map((c, k) => c + 5 * RB2.R_DIR[k]);      // the right elbow (as in articulatedDefs)
  const base = RB2.motionFor(uuid, path);
  const pts = path.map((p) => [p[0], p[1], 0]);
  const strides = Math.max(1, Math.round(M.pathLength(pts) / RB2.STRIDE));
  const th = (u) => 2 * Math.PI * strides * u;          // the leg's phase over the lap
  const hip = (u, ph) => S.legSwing * Math.sin(th(u) + ph);
  const knee = (u, ph) => S.knee * Math.max(0, -Math.sin(th(u) + ph));   // the knee folds as the leg swings forward
  const keep = base.motions.filter((m) => !['left-leg', 'right-leg', 'left-foot', 'right-foot', 'left-arm', 'right-arm'].includes(m.id));
  const extra = [];
  for (const [side, ph, y] of [['left', 0, RB2.LEG_Y], ['right', Math.PI, -RB2.LEG_Y]]) {
    const s = side === 'left' ? 'l' : 'r';
    extra.push({ id: `${side}-leg`, target: uuid(`leg-${s}`), kind: 'swing', axis: 'y', pivot: [0, y, RB2.HIP_Z],
      keys: sampleKeys((u) => hip(u, ph)) });
    extra.push({ id: `${side}-knee`, target: uuid(`knee-${s}`), kind: 'swing', axis: 'y', pivot: [0, y, KNEE_Z],
      keys: sampleKeys((u) => knee(u, ph)) });
    // the foot turns back at the ankle by the hip plus the knee, so it stays flat
    extra.push({ id: `${side}-foot`, target: uuid(`foot-${s}`), kind: 'swing', axis: 'y', pivot: [0, y, RB2.ANKLE_Z],
      keys: sampleKeys((u) => -(hip(u, ph) + knee(u, ph))) });
  }
  // arms: the shoulders swing against the legs; the elbows bend on each stride (the left folds forward as the arm swings)
  const armPh = { l: Math.PI, r: 0 };
  extra.push({ id: 'left-arm', target: uuid('arm-l'), kind: 'swing', axis: 'y', pivot: [0, RB2.ARM_Y, RB2.SHOULDER_Z],
    keys: sampleKeys((u) => S.armSwing * Math.sin(th(u) + armPh.l)) });
  extra.push({ id: 'right-arm', target: uuid('arm-r'), kind: 'swing', axis: 'y', pivot: RB2.R_SHOULDER,
    keys: sampleKeys((u) => 6 * Math.sin(th(u))) });
  extra.push({ id: 'left-elbow', target: uuid('elbow-l'), kind: 'swing', axis: 'y', pivot: [0, RB2.ARM_Y, ELBOW_Z],
    keys: sampleKeys((u) => -(S.elbow + S.elbow * 0.5 * Math.sin(th(u) + armPh.l))) });
  // the right elbow waves the banana: twice per stride
  extra.push({ id: 'right-elbow', target: uuid('elbow-r'), kind: 'swing', axis: 'y', pivot: E,
    keys: sampleKeys((u) => -(S.elbowWave + S.elbowWave * Math.sin(2 * th(u)))) });
  // ears: flap on each step (the ears flap faster in V09)
  extra.push({ id: 'left-ear', target: uuid('ear-l'), kind: 'swing', axis: 'x', pivot: [0, HEAD_R, EAR_Z],
    keys: sampleKeys((u) => S.ear * Math.sin(S.earFast * th(u) + 1)) });
  extra.push({ id: 'right-ear', target: uuid('ear-r'), kind: 'swing', axis: 'x', pivot: [0, -HEAD_R, EAR_Z],
    keys: sampleKeys((u) => -S.ear * Math.sin(S.earFast * th(u) + 1)) });
  // head: nods and tilts as the robot walks
  extra.push({ id: 'head-tilt', target: uuid('head-group'), kind: 'swing', axis: 'x', pivot: [0, 0, HEAD_NECK_Z],
    keys: sampleKeys((u) => S.head * Math.sin(th(u) * 2)) });
  // antenna: sways, most in V09
  extra.push({ id: 'antenna-sway', target: uuid('antenna-base'), kind: 'swing', axis: 'x', pivot: [-1.5, 0, HEAD_Z + HEAD_R],
    keys: sampleKeys((u) => S.antenna * Math.sin(th(u) * 2 + 0.7)) });
  // tail: wags side to side (about the vertical axis at its root)
  extra.push({ id: 'tail-wag', target: uuid('tail-group'), kind: 'swing', axis: 'z', pivot: TAIL_START,
    keys: sampleKeys((u) => S.tail * Math.sin(th(u) + Math.PI / 2)) });
  // V09: the body bounces on each step (the upper body; the legs do not move with it)
  if (S.bounce) extra.push({ id: 'bounce', target: uuid('upper'), kind: 'bob', axis: 'z', amount: S.bounce, cycles: strides * 2, phase: 0 });

  return { ...base, description: `${base.description} ${fuzzy ? 'Fuzzy: the ears flutter fast, the body bounces, the tail wags and the knees bend deep.' : 'Jointed: knees, elbows, ears, head, antenna and tail move with the walk.'}`,
    motions: [...keep, ...extra] };
}

// ---------------------------------------------------------------------------------------------
// V10 (play): the V08 rig, with more to see. Five limbs from the body, as the drawing has them: two long arms
// (the hinged left arm and the banana arm), a waving arm that rises from the back of the body (new), and two
// long legs. Each joint is a hinge with a visible cap. The tail is a chain of four joints that whips along its
// length. The antenna bounces on its spring. The eyes have lids that blink twice a lap. The body bounces on
// each step.

const TAIL_JOINTS = 4;
const WAVE_S = [-5.5, 0, 27];                        // the waving arm's shoulder, on the back of the body
const WAVE_U = [-0.5, 0, 0.87];                      // upper arm direction (back and up)
const WAVE_F = [-0.707, 0, 0.707];                   // forearm direction (further back)
const WAVE_E = WAVE_S.map((c, k) => c + 6 * WAVE_U[k]);   // the waving elbow (6 in up the arm)
const WAVE_H = WAVE_E.map((c, k) => c + 5 * WAVE_F[k]);   // the waving hand (5 in on)
const LID_Y = 1.9, LID_Z = 36.4;                     // the eyelids' hinge: the top edge of each eye

function playDefs(path) {
  const base = articulatedDefs(path, false).filter(([key]) => !/^tail(-|$)/.test(key));
  const add = (key, o) => base.push([key, o]);
  const dir = [-Math.cos(rad(TAIL_DEG)), 0, Math.sin(rad(TAIL_DEG))];
  const phi = -(90 - TAIL_DEG);

  // hinge caps: a small yellow ball at each elbow and knee, so the joints read as hinges
  add('hinge-elbow-l', { name: 'Left elbow hinge', type: 'sphere', dimensions: [0.8], position: [0, RB2.ARM_Y, ELBOW_Z], material: 'banana', parent: 'elbow-l' });
  const E = RB2.R_SHOULDER.map((c, k) => c + 5 * RB2.R_DIR[k]);
  add('hinge-elbow-r', { name: 'Right elbow hinge', type: 'sphere', dimensions: [0.8], position: E, material: 'banana', parent: 'elbow-r' });
  for (const [side, y] of [['l', RB2.LEG_Y], ['r', -RB2.LEG_Y]]) {
    add(`hinge-knee-${side}`, { name: `${side === 'l' ? 'Left' : 'Right'} knee hinge`, type: 'sphere', dimensions: [0.8], position: [0, y, KNEE_Z], material: 'banana', parent: `knee-${side}` });
  }

  // the waving arm: shoulder group, upper arm, elbow group with forearm and hand
  const upPhi = Math.atan2(WAVE_U[0], WAVE_U[2]) * 180 / Math.PI;
  const fPhi = Math.atan2(WAVE_F[0], WAVE_F[2]) * 180 / Math.PI;
  add('arm-5', { name: 'Waving arm', description: 'rises from the back and waves', type: 'group', dimensions: [], position: WAVE_S, parent: 'upper' });
  add('upper-arm-5', { name: 'Waving arm upper', type: 'cylinder', dimensions: [1.2, 6.2],
    position: WAVE_S.map((c, k) => round(c + 3 * WAVE_U[k])), rotation_y: upPhi, material: 'joint', parent: 'arm-5' });
  add('elbow-5', { name: 'Waving elbow', type: 'group', dimensions: [], position: WAVE_E, parent: 'arm-5' });
  add('hinge-elbow-5', { name: 'Waving elbow hinge', type: 'sphere', dimensions: [0.8], position: WAVE_E, material: 'banana', parent: 'elbow-5' });
  add('forearm-5', { name: 'Waving forearm', type: 'cylinder', dimensions: [1.1, 5.2],
    position: WAVE_E.map((c, k) => round(c + 2.5 * WAVE_F[k])), rotation_y: fPhi, material: 'joint', parent: 'elbow-5' });
  add('hand-5', { name: 'Waving hand', description: 'yellow, waves', type: 'sphere', dimensions: [1.9], position: WAVE_H.map(round), material: 'banana', parent: 'elbow-5' });

  // tail: four joints in a chain; each joint is a group, so the whip runs down the tail
  let parent = 'upper';
  for (let k = 0; k < TAIL_JOINTS; k++) {
    const J = TAIL_START.map((c, i) => c + dir[i] * k * TAIL_SEG);
    add(`tail-g${k}`, { name: `Tail joint ${k + 1}`, description: 'a hinge along the tail', type: 'group', dimensions: [],
      position: J.map(round), parent });
    add(`tail-${k + 1}`, { name: `Tail ${k + 1}`, type: 'cylinder', dimensions: [TAIL_R[k], TAIL_SEG + 0.2],
      position: J.map((c, i) => round(c + dir[i] * TAIL_SEG / 2)), rotation_y: phi, material: 'body', parent: `tail-g${k}` });
    parent = `tail-g${k}`;
  }

  // eyelids: a brow above each eye that drops over it to blink (the lid's hinge is the top edge of the eye)
  for (const [side, y] of [['l', LID_Y], ['r', -LID_Y]]) {
    const S2 = side === 'l' ? 'Left' : 'Right';
    add(`lid-${side}`, { name: `${S2} eyelid hinge`, type: 'group', dimensions: [], position: [4.2, y, LID_Z], parent: 'head-group' });
    add(`lid-${side}-plate`, { name: `${S2} eyelid`, description: 'a brow that drops over the eye to blink', type: 'box', dimensions: [0.5, 2.4, 1.2],
      position: [4.2, y, LID_Z + 1.2], material: 'head', parent: `lid-${side}` });
  }
  return base;
}

// Keys for a blink: open (0) at rest, closed (-180) twice a lap, returning to open.
const BLINK_KEYS = [[0, 0], [0.30, 0], [0.315, -180], [0.335, 0], [0.70, 0], [0.715, -180], [0.735, 0]];

function playMotion(uuid, path) {
  const base = articulatedMotion(uuid, path, false);
  const drop = new Set(['left-arm', 'right-arm', 'left-elbow', 'right-elbow', 'left-ear', 'right-ear', 'head-tilt', 'antenna-sway', 'tail-wag']);
  const keep = base.motions.filter((m) => !drop.has(m.id));
  const pts = path.map((p) => [p[0], p[1], 0]);
  const strides = Math.max(1, Math.round(M.pathLength(pts) / RB2.STRIDE));
  const th = (u) => 2 * Math.PI * strides * u;
  const E = RB2.R_SHOULDER.map((c, k) => c + 5 * RB2.R_DIR[k]);
  const fun = [];
  // hand swings: the hinged left arm swings wide and folds at the elbow; the banana arm holds steady and waves
  fun.push({ id: 'left-arm', target: uuid('arm-l'), kind: 'swing', axis: 'y', pivot: [0, RB2.ARM_Y, RB2.SHOULDER_Z],
    keys: sampleKeys((u) => 30 * Math.sin(th(u) + Math.PI)) });
  fun.push({ id: 'left-elbow', target: uuid('elbow-l'), kind: 'swing', axis: 'y', pivot: [0, RB2.ARM_Y, ELBOW_Z],
    keys: sampleKeys((u) => -(20 + 22 * Math.sin(th(u) + Math.PI))) });
  fun.push({ id: 'right-arm', target: uuid('arm-r'), kind: 'swing', axis: 'y', pivot: RB2.R_SHOULDER,
    keys: sampleKeys((u) => 8 * Math.sin(th(u))) });
  fun.push({ id: 'right-elbow', target: uuid('elbow-r'), kind: 'swing', axis: 'y', pivot: E,
    keys: sampleKeys((u) => -(10 + 12 * Math.sin(2 * th(u)))) });
  // the waving arm: sways back and forth and its elbow flicks
  fun.push({ id: 'wave-arm', target: uuid('arm-5'), kind: 'swing', axis: 'y', pivot: WAVE_S,
    keys: sampleKeys((u) => 38 * Math.sin(th(u) + Math.PI / 2)) });
  fun.push({ id: 'wave-elbow', target: uuid('elbow-5'), kind: 'swing', axis: 'y', pivot: WAVE_E,
    keys: sampleKeys((u) => -(30 + 26 * Math.sin(2 * th(u) + Math.PI))) });
  // ears flap fast
  fun.push({ id: 'left-ear', target: uuid('ear-l'), kind: 'swing', axis: 'x', pivot: [0, HEAD_R, EAR_Z],
    keys: sampleKeys((u) => 20 * Math.sin(2 * th(u) + 1)) });
  fun.push({ id: 'right-ear', target: uuid('ear-r'), kind: 'swing', axis: 'x', pivot: [0, -HEAD_R, EAR_Z],
    keys: sampleKeys((u) => -20 * Math.sin(2 * th(u) + 1)) });
  // head nods and tilts
  fun.push({ id: 'head-tilt', target: uuid('head-group'), kind: 'swing', axis: 'x', pivot: [0, 0, HEAD_NECK_Z],
    keys: sampleKeys((u) => 7 * Math.sin(th(u) * 2)) });
  // antenna: sways, and its whole spring bounces up and down
  fun.push({ id: 'antenna-sway', target: uuid('antenna-base'), kind: 'swing', axis: 'x', pivot: [-1.5, 0, HEAD_Z + HEAD_R],
    keys: sampleKeys((u) => 16 * Math.sin(th(u) * 2 + 0.7)) });
  fun.push({ id: 'antenna-bounce', target: uuid('antenna-base'), kind: 'bob', axis: 'z', amount: 0.7, cycles: strides * 3, phase: 0 });
  // tail: a whip. Each joint swings a little later than the one before, so the wave runs down the tail.
  for (let k = 0; k < TAIL_JOINTS; k++) {
    const J = TAIL_START.map((c, i) => c + [-Math.cos(rad(TAIL_DEG)), 0, Math.sin(rad(TAIL_DEG))][i] * k * TAIL_SEG);
    fun.push({ id: `tail-whip-${k + 1}`, target: uuid(`tail-g${k}`), kind: 'swing', axis: 'z', pivot: J.map(round),
      keys: sampleKeys((u) => 16 * Math.sin(th(u) + Math.PI / 2 - k * 0.8)) });
  }
  // blinks: both lids drop twice a lap
  for (const side of ['l', 'r']) {
    fun.push({ id: `blink-${side}`, target: uuid(`lid-${side}`), kind: 'swing', axis: 'y', pivot: [4.2, side === 'l' ? LID_Y : -LID_Y, LID_Z],
      keys: BLINK_KEYS });
  }
  // the body bounces on each step
  fun.push({ id: 'bounce', target: uuid('upper'), kind: 'bob', axis: 'z', amount: 0.8, cycles: strides * 2, phase: 0 });

  return { ...base, description: 'Play: five limbs swing and hinge (the hinged left arm folds, the banana arm waves, the waving arm rises from the back, two long legs walk), the tail whips, the antenna bounces, the eyelids blink and the body bounces on each step.',
    motions: [...keep, ...fun] };
}

module.exports = { SKETCH2_ID, defs, bodyDefs, REPLACED, TAIL_DEG, articulatedDefs, articulatedMotion, playDefs, playMotion };
