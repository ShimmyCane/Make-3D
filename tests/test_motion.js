// Node tests for the motion engine and the robot-with-banana motion file. Run: node tests/test_motion.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const MO = require(path.join(root, 'js/core/motion.js'));
const IO = require(path.join(root, 'js/core/io.js'));
const G = require(path.join(root, 'js/core/geometry.js'));

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} is not near ${b}`);
const nearV = (a, b, eps = 1e-6) => a.forEach((x, i) => near(x, b[i], eps));
const { apply } = MO.mat4;

const model = { objects: [
  { uuid: 'g', type: 'group', dimensions: [], position: [0, 0, 0] },
  { uuid: 'door', type: 'box', dimensions: [1, 30, 80], position: [0, 15, 40], parent: 'g' },
] };
const motionOf = (m, extra = {}) => ({ schema: MO.MOTION_SCHEMA, loop_s: 4, motions: [{ id: 'm', target: 'door', ...m }], ...extra });

t('swing: turns about the pivot, from the middle angle, and closes the loop', () => {
  const mo = motionOf({ kind: 'swing', axis: 'z', pivot: [0, 0, 0], from: 0, to: 180, cycles: 1, phase: 0 });
  // at t=0 the angle is the middle (90 deg): the door edge at (0, 30, 0) goes to (-30, 0, 0)
  nearV(apply(MO.poseAt(model, mo, 0).door, [0, 30, 0]), [-30, 0, 0]);
  // a quarter of the way: sin = 1, angle 180
  nearV(apply(MO.poseAt(model, mo, 1).door, [0, 30, 0]), [0, -30, 0]);
  // the pivot never moves
  nearV(apply(MO.poseAt(model, mo, 1.37).door, [0, 0, 0]), [0, 0, 0]);
  // end of loop = start
  const a = MO.poseAt(model, mo, 0).door, b = MO.poseAt(model, mo, 4).door;
  a.forEach((x, i) => near(x, b[i]));
});

t('bob and slide: rise smoothly from 0 to the full amount and back', () => {
  const bob = motionOf({ kind: 'bob', axis: 'z', amount: 2, cycles: 1 });
  near(apply(MO.poseAt(model, bob, 0).door, [0, 0, 0])[2], 0);
  near(apply(MO.poseAt(model, bob, 2).door, [0, 0, 0])[2], 2);
  const slide = motionOf({ kind: 'slide', axis: 'y', distance: -10, cycles: 2 });
  near(apply(MO.poseAt(model, slide, 1).door, [0, 0, 0])[1], -10);
  near(apply(MO.poseAt(model, slide, 2).door, [0, 0, 0])[1], 0);
});

t('spin: whole turns per loop', () => {
  const mo = motionOf({ kind: 'spin', axis: 'z', pivot: [0, 0, 0], cycles: 1 });
  nearV(apply(MO.poseAt(model, mo, 1).door, [10, 0, 0]), [0, 10, 0]);
  nearV(apply(MO.poseAt(model, mo, 2).door, [10, 0, 0]), [-10, 0, 0]);
});

t('path: closed loop at constant speed, facing the way it goes', () => {
  const sq = [[0, 0], [100, 0], [100, 100], [0, 100]].map((p) => [...p, 0]);
  const L = MO.pathLength(sq);
  assert.ok(L > 314 && L < 450, `length ${L}`);  // a smooth curve through the corners bulges a little
  // start and end of the loop are the same point
  nearV(MO.pathAt(sq, 0).point, MO.pathAt(sq, 1).point, 1e-9);
  // constant speed: equal time, equal distance
  const d = (u1, u2) => { const a = MO.pathAt(sq, u1).point, b = MO.pathAt(sq, u2).point; return Math.hypot(a[0] - b[0], a[1] - b[1]); };
  near(d(0.1, 0.11), d(0.6, 0.61), 0.05);
  const mo = motionOf({ kind: 'path', points: sq, face: 'tangent', pivot: [0, 0, 0], cycles: 1 }, { loop_s: 10 });
  // the pivot is on the path
  const m = MO.poseAt(model, mo, 2.5).door;
  const p = MO.pathAt(sq, 0.25).point;
  nearV(apply(m, [0, 0, 0]), p, 1e-6);
  // facing: a point 1 in ahead of the pivot (+X at rest) lands along the heading
  const h = MO.pathAt(sq, 0.25).heading;
  nearV(apply(m, [1, 0, 0]), [p[0] + Math.cos(h), p[1] + Math.sin(h), 0], 1e-6);
});

t('several motions on one target apply in file order; missing targets and future starts are skipped', () => {
  const mo = { schema: MO.MOTION_SCHEMA, loop_s: 4, motions: [
    { id: 'a', target: 'door', kind: 'slide', axis: 'x', distance: 10, cycles: 1 },
    { id: 'b', target: 'door', kind: 'spin', axis: 'z', pivot: [0, 0, 0], cycles: 1 },
    { id: 'c', target: 'nobody', kind: 'bob', amount: 1 },
    { id: 'd', target: 'g', kind: 'bob', amount: 1, start: 'tap:door' },
  ] };
  const pose = MO.poseAt(model, mo, 1);
  // slide first (x + 5 at a quarter: rise = 0.5), then a quarter turn: (5, 0, 0) -> (0, 5, 0)
  nearV(apply(pose.door, [0, 0, 0]), [0, 5, 0]);
  assert.ok(!pose.nobody && !pose.g);
});

t('checkMotion: accepts a good file, rejects broken ones, warns on missing targets', () => {
  assert.strictEqual(MO.checkMotion(model, motionOf({ kind: 'swing', from: 0, to: 90, axis: 'z', pivot: [0, 0, 0], cycles: 2 })).outcome, 'accept');
  assert.strictEqual(MO.checkMotion(model, motionOf({ kind: 'swing', from: 0, to: 90, cycles: 1.5 })).outcome, 'reject');
  assert.strictEqual(MO.checkMotion(model, motionOf({ kind: 'wiggle' })).outcome, 'reject');
  assert.strictEqual(MO.checkMotion(model, motionOf({ kind: 'path', points: [[0, 0], [1, 1]] })).outcome, 'reject');
  assert.strictEqual(MO.checkMotion(model, motionOf({ kind: 'bob', amount: 1 }, { loop_s: 0 })).outcome, 'reject');
  const w = MO.checkMotion(model, { schema: MO.MOTION_SCHEMA, loop_s: 2, motions: [{ id: 'x', target: 'gone', kind: 'bob', amount: 1 }] });
  assert.strictEqual(w.outcome, 'warn');
});

t('bundles carry motion as an optional, separate part', () => {
  const history = { schema: 'make3d.history/0.1', model_id: 't', header: { model_id: 't', units: 'in', up: 'z', materials: {} },
    operations: [{ seq: 1, op: 'add', object: { uuid: 'a', name: 'a', type: 'box', dimensions: [1, 1, 1], position: [0, 0, 0.5] } }] };
  const mo = { schema: MO.MOTION_SCHEMA, loop_s: 2, motions: [] };
  const b = IO.makeBundle({ history, world: {}, motion: mo });
  assert.deepStrictEqual(IO.readBundle(JSON.parse(JSON.stringify(b))).motion, mo);
  assert.ok(!('motion' in b.model), 'motion never goes into the model');
  assert.strictEqual(IO.readBundle(IO.makeBundle({ history, world: {} })).motion, null);
});

// --- the robot-with-banana scene
const dir = path.join(root, 'models/robot-banana');
const history = JSON.parse(fs.readFileSync(path.join(dir, 'history.json'), 'utf8'));
const motion = JSON.parse(fs.readFileSync(path.join(dir, 'motion.json'), 'utf8'));
const robot = G.replay(history);
const byId = new Map(robot.objects.map((o) => [o.uuid, o]));
const id = (k) => `robot-banana-${k}`;

// world position of a model point on an object, at time t: compose poses up the parent chain
function worldPoint(uuid, p, time) {
  const pose = MO.poseAt(robot, motion, time);
  let q = p;
  for (let u = uuid; u; u = (byId.get(u) || {}).parent) if (pose[u]) q = apply(pose[u], q);
  return q;
}
const soleOf = (side) => { const f = byId.get(id(`foot-${side}`)); return [f.position[0], f.position[1], f.position[2] - f.dimensions[2] / 2]; };

t('robot: motion file passes its check and every motion targets a part of the robot', () => {
  assert.strictEqual(MO.checkMotion(robot, motion).outcome, 'accept');
  assert.strictEqual(motion.autoplay.plays, 2);
  for (const m of motion.motions) assert.ok(byId.has(m.target), m.id);
});

t('robot: the loop has no jump (last frame = first frame)', () => {
  const a = MO.poseAt(robot, motion, 0), b = MO.poseAt(robot, motion, motion.loop_s - 1e-6);
  for (const k of Object.keys(a)) a[k].forEach((x, i) => near(x, b[k][i], 1e-3));
});

t('robot: the first frame is the rest pose', () => {
  for (const o of robot.objects) {
    if (!o.position || o.type === 'group') continue;
    nearV(worldPoint(o.uuid, o.position, 0), o.position, 0.05);
  }
});

t('robot: the banana stays in the hand all the way round', () => {
  const hand = byId.get(id('hand-r'));
  const mid = byId.get(id('banana-4'));
  const gap0 = Math.hypot(...hand.position.map((x, i) => x - mid.position[i]));
  for (let k = 0; k <= 40; k++) {
    const time = (k / 40) * motion.loop_s;
    const a = worldPoint(hand.uuid, hand.position, time), b = worldPoint(mid.uuid, mid.position, time);
    near(Math.hypot(...a.map((x, i) => x - b[i])), gap0, 1e-6);
  }
});

t('robot: walks the whole loop; the lower foot stays on the ground, never sinking or floating', () => {
  let lowest = Infinity, highest = -Infinity, far = 0;
  for (let k = 0; k <= 400; k++) {
    const time = (k / 400) * motion.loop_s;
    const zs = ['l', 'r'].map((s) => worldPoint(id(`foot-${s}`), soleOf(s), time)[2]);
    const low = Math.min(...zs);
    lowest = Math.min(lowest, low); highest = Math.max(highest, low);
    const c = worldPoint(id('robot'), [0, 0, 0], time);
    far = Math.max(far, Math.hypot(c[0], c[1]));
  }
  // soles sit 0.25 in up at rest (on the stones); the lower foot should stay there
  assert.ok(lowest > 0.2, `a foot sinks to ${lowest}`);
  assert.ok(highest < 0.35, `both feet float up to ${highest}`);
  assert.ok(far > 80, 'the robot leaves the start');
});

console.log(`\n${n} test groups passed`);
