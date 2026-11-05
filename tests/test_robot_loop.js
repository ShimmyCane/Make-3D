// Node tests for the Robot loop scenes (robot-loop-v02 to v04): the sketched loop, its seam, the walk,
// and the visibility groups. Run: node tests/test_robot_loop.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const MO = require(path.join(root, 'js/core/motion.js'));
const G = require(path.join(root, 'js/core/geometry.js'));
const V = require(path.join(root, 'js/core/visibility.js'));
const RL = require(path.join(root, 'tools/robot_loop.js'));

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} is not near ${b}`);
const nearV = (a, b, eps = 1e-6) => a.forEach((x, i) => near(x, b[i], eps));

const P3 = RL.PATH.map((p) => [p[0], p[1], 0]);

t('sketch: the transcribed stroke has the extent the database gives (x -20.9888..24.0688, y -37.5385..25.5898)', () => {
  const xs = RL.SKETCH_PTS.map((p) => p[0]), ys = RL.SKETCH_PTS.map((p) => p[1]);
  near(Math.min(...xs), -20.9888, 1e-4); near(Math.max(...xs), 24.0688, 1e-4);
  near(Math.min(...ys), -37.5385, 1e-4); near(Math.max(...ys), 25.5898, 1e-4);
  assert.strictEqual(RL.SKETCH_ID, '3c4c380d-7901-4944-8929-d74e92903789');
});

t('path: 48 points, closed (the last point joins the first), about 838 in long', () => {
  assert.strictEqual(RL.PATH.length, 48);
  const { pathLength, pathAt } = MO;
  const a = pathAt(P3, 0).point, b = pathAt(P3, 0.9999).point;
  assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.5, 'closure gap');
  const len = pathLength(P3);
  assert.ok(len > 800 && len < 880, `length ${len}`);
});

t('path: the seam is smooth (the heading turns across it no more than it does anywhere else)', () => {
  // heading of the closed curve, in degrees; the change across the seam over about 2 in
  const H = (u) => MO.pathAt(P3, u).heading * 180 / Math.PI;
  const diff = (a, b) => { const x = Math.abs(a - b) % 360; return x > 180 ? 360 - x : x; };
  const seam = diff(H(0.0005), H(0.9995));
  let elsewhere = 0;
  for (let i = 0; i < RL.PATH.length; i++) { const u = i / RL.PATH.length; elsewhere = Math.max(elsewhere, diff(H(u + 0.001), H(u - 0.001))); }
  assert.ok(seam < 4, `seam turns ${seam.toFixed(2)} degrees`);
  assert.ok(seam <= elsewhere, `seam ${seam.toFixed(2)} is sharper than the loop's tightest ${elsewhere.toFixed(2)}`);
});

t('path: the rest pose faces +X from the origin (heading 0)', () => {
  assert.ok(Math.abs(MO.pathAt(P3, 0).heading) < 0.5 * Math.PI / 180);
  nearV(RL.PATH[0], [0, 0], 1e-9);
});

const scenes = RL.ROBOT_LOOP;
const byVersion = Object.fromEntries(scenes.map((s) => [s.header.model_id, s]));

t('scenes: V02 to V06 exist; each adds to the one before (older parts kept, V05 moves the frisbee)', () => {
  assert.deepStrictEqual(scenes.map((s) => s.header.model_id), ['robot-loop-v02', 'robot-loop-v03', 'robot-loop-v04', 'robot-loop-v05', 'robot-loop-v06', 'robot-loop-v07', 'robot-loop-v08', 'robot-loop-v09', 'robot-loop-v10', 'robot-loop-v11']);
  const keys = (v) => RL.defsFor(v).map(([k]) => k);
  const v2 = keys(2), v3 = keys(3), v4 = keys(4);
  for (const k of v2) assert.ok(v3.includes(k), `v3 keeps ${k}`);
  for (const k of v3) assert.ok(v4.includes(k), `v4 keeps ${k}`);
  assert.ok(v3.includes('frisbee-disc') && !v2.includes('frisbee-disc'));
  assert.ok(v4.includes('hat-crown') && !v3.includes('hat-crown'));
});

t('scenes: each version replays from its history file and its motion passes the check', () => {
  for (const id of ['robot-loop-v02', 'robot-loop-v03', 'robot-loop-v04']) {
    const dir = path.join(root, 'models', id);
    const history = JSON.parse(fs.readFileSync(path.join(dir, 'history.json'), 'utf8'));
    const motion = JSON.parse(fs.readFileSync(path.join(dir, 'motion.json'), 'utf8'));
    const model = G.replay(history);
    assert.strictEqual(MO.checkMotion(model, motion).outcome, 'accept', id);
    assert.strictEqual(motion.autoplay.plays, 2, id);
    const byId = new Set(model.objects.map((o) => o.uuid));
    for (const m of motion.motions) assert.ok(byId.has(m.target), `${id} ${m.id}`);
  }
});

t('motion: the loop has no jump (first frame = last frame) in every version', () => {
  for (const id of ['robot-loop-v02', 'robot-loop-v04']) {
    const dir = path.join(root, 'models', id);
    const model = G.replay(JSON.parse(fs.readFileSync(path.join(dir, 'history.json'), 'utf8')));
    const motion = JSON.parse(fs.readFileSync(path.join(dir, 'motion.json'), 'utf8'));
    const a = MO.poseAt(model, motion, 0), b = MO.poseAt(model, motion, motion.loop_s - 1e-6);
    for (const k of Object.keys(a)) a[k].forEach((x, i) => near(x, b[k][i], 1e-3));
  }
});

t('visibility: banana is a group in V02 and up; frisbee from V03; hat from V04', () => {
  const groups = (v) => V.groupsIn(G.replay(JSON.parse(fs.readFileSync(path.join(root, 'models', `robot-loop-v0${v}`, 'history.json'), 'utf8'))));
  assert.deepStrictEqual(groups(2).map((g) => g.label), ['banana']);
  assert.deepStrictEqual(groups(3).map((g) => g.label), ['banana', 'frisbee']);
  assert.deepStrictEqual(groups(4).map((g) => g.label), ['banana', 'frisbee', 'hat']);
});

t('visibility: in the saved model each control points at the group object of that part', () => {
  const model = G.replay(JSON.parse(fs.readFileSync(path.join(root, 'models/robot-loop-v04/history.json'), 'utf8')));
  const groups = V.groupsIn(model);
  const byLabel = Object.fromEntries(groups.map((g) => [g.label, g.uuids]));
  const names = (uuids) => uuids.map((u) => model.objects.find((o) => o.uuid === u).name);
  assert.deepStrictEqual(names(byLabel.banana), ['Banana']);
  assert.deepStrictEqual(names(byLabel.frisbee), ['Frisbee']);
  assert.deepStrictEqual(names(byLabel.hat), ['Top hat']);
});

t('robot: the frisbee and hat move with the parts they are attached to', () => {
  const model = G.replay(JSON.parse(fs.readFileSync(path.join(root, 'models/robot-loop-v04/history.json'), 'utf8')));
  const find = (name) => model.objects.find((o) => o.name === name);
  assert.strictEqual(find('Frisbee').parent, find('Left arm').uuid);
  assert.strictEqual(find('Top hat').parent, find('Upper body').uuid);
});

t("V06 path: the Robot Path (figure-eight) closes, starts at the origin facing +X, and V06 passes its motion check", () => {
  const P = RL.PATH_V6.map((p) => [p[0], p[1], 0]);
  const a = MO.pathAt(P, 0).point, b = MO.pathAt(P, 0.9999).point;
  assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.5, "closure gap");
  assert.ok(Math.abs(MO.pathAt(P, 0).heading) < 0.5 * Math.PI / 180, "rest heading");
  nearV(RL.PATH_V6[0], [0, 0], 1e-9);
  assert.strictEqual(RL.ROBOT_PATH_ID, "fd1878e1-ac12-4355-afee-3ebeeb07d4d9");
  const dir = path.join(root, "models", "robot-loop-v06");
  const model = G.replay(JSON.parse(fs.readFileSync(path.join(dir, "history.json"), "utf8")));
  const motion = JSON.parse(fs.readFileSync(path.join(dir, "motion.json"), "utf8"));
  assert.strictEqual(MO.checkMotion(model, motion).outcome, "accept");
});

console.log(`\n${n} robot loop tests passed`);
