// Node tests for Robot loop V05: the cape (tools/robot_cape.js) and the frisbee in the banana's hand.
// Run: node tests/test_robot_cape.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const MO = require(path.join(root, 'js/core/motion.js'));
const G = require(path.join(root, 'js/core/geometry.js'));
const RL = require(path.join(root, 'tools/robot_loop.js'));
const C = require(path.join(root, 'tools/robot_cape.js'));

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} is not near ${b}`);

const dir = path.join(root, 'models/robot-loop-v05');
const model = G.replay(JSON.parse(fs.readFileSync(path.join(dir, 'history.json'), 'utf8')));
const motion = JSON.parse(fs.readFileSync(path.join(dir, 'motion.json'), 'utf8'));
const byName = (name) => model.objects.find((o) => o.name === name);
const cape = byName('Cape cloth');

t('V05: replays, the motion passes its check, and every motion targets a part of the model', () => {
  assert.strictEqual(MO.checkMotion(model, motion).outcome, 'accept');
  const ids = new Set(model.objects.map((o) => o.uuid));
  for (const m of motion.motions) assert.ok(ids.has(m.target), m.id);
});

t('frisbee: V05 holds it in the banana hand (right arm), and there is no left-hand frisbee', () => {
  assert.strictEqual(byName('Frisbee').parent, byName('Right arm').uuid);
  assert.strictEqual(model.objects.filter((o) => o.name === 'Frisbee').length, 1);
  const disc = byName('Frisbee disc');
  const hand = require(path.join(root, 'tools/robot_banana.js')).HAND_R;
  // the disc hangs outside the hand: same height and forward position, offset 4.5 in in y
  near(disc.position[0], hand[0], 1e-9);
  near(disc.position[2], hand[2], 1e-9);
  near(disc.position[1], hand[1] - 4.5, 1e-9);
});

t('cape: a double-sided sheet on a 7-joint skeleton, hanging from the upper body', () => {
  assert.ok(cape, 'the cape sheet exists');
  assert.strictEqual(cape.type, 'sheet');
  assert.strictEqual(cape.shape.joints.length, 7);
  assert.strictEqual(cape.shape.rings.length, 9);
  assert.strictEqual(byName('Cape').parent, byName('Upper body').uuid);
  assert.strictEqual(cape.parent, byName('Cape').uuid);
  // the cape hangs from the shoulders (about z 26.5) to near the ground (about z 4.5)
  near(cape.shape.joints[0][2], C.Z_TOP, 1e-6);
  near(cape.shape.joints[6][2], C.Z_BOT, 1e-6);
  // width across the robot, not front to back: the joints sit at x = CAPE_X behind the back
  assert.ok(cape.shape.joints.every((j) => Math.abs(j[0] - C.CAPE_X) < 1e-9));
});

t('cape: tassels, holes and border are attached to the cape, so they move with it', () => {
  const tassels = model.objects.filter((o) => /^Tassel /.test(o.name));
  const holes = model.objects.filter((o) => /^Hole /.test(o.name));
  const beads = model.objects.filter((o) => /^Border bead /.test(o.name));
  assert.strictEqual(tassels.length, 6);
  assert.strictEqual(holes.length, 9);
  assert.strictEqual(beads.length, 24);
  for (const o of [...tassels, ...holes, ...beads]) {
    assert.ok(o.attach, `${o.name} has an attach`);
    assert.strictEqual(o.attach.to, cape.uuid, o.name);
    assert.ok(o.attach.joint >= 0 && o.attach.joint < 7, o.name);
  }
});

t('motion: the cape starts at rest (every bend is 0 at the start of the loop)', () => {
  const bends = motion.motions.filter((m) => m.target === cape.uuid);
  assert.ok(bends.length >= 2, 'sway and wave bends exist');
  for (const b of bends) {
    assert.strictEqual(b.kind, 'bend', b.id);
    assert.strictEqual(b.keys[0][0], 0, b.id);
    assert.strictEqual(b.keys[0][1], 0, b.id);
    for (let i = 1; i < b.keys.length; i++) assert.ok(b.keys[i][0] > b.keys[i - 1][0], `${b.id} keys rise`);
    assert.ok(b.keys[b.keys.length - 1][0] < 1, `${b.id} keys stay below 1`);
  }
});

t('motion: the lower cape moves, and by no more than a few inches (a flow, not a flap)', () => {
  const bottom = 6, rest = cape.shape.joints[bottom];
  let maxD = 0;
  for (let i = 0; i <= 190; i++) {
    const p = MO.skinAt(model, motion, (motion.loop_s * i) / 190)[cape.uuid][bottom];
    const q = [0, 1, 2].map((r) => p[r * 4] * rest[0] + p[r * 4 + 1] * rest[1] + p[r * 4 + 2] * rest[2] + p[r * 4 + 3]);
    maxD = Math.max(maxD, Math.hypot(q[0] - rest[0], q[1] - rest[1], q[2] - rest[2]));
  }
  assert.ok(maxD > 1, `the bottom moves ${maxD.toFixed(2)} in`);
  assert.ok(maxD < 9, `the bottom moves no more than 9 in (${maxD.toFixed(2)})`);
});

t('motion: the flow is bigger in a tight turn than on a straight (the sway follows the turn rate)', () => {
  const s = C.turnSignal(RL.PATH.map((p) => [p[0], p[1], 0]));
  const tight = s.reduce((best, v, i) => (Math.abs(v) > Math.abs(s[best]) ? i : best), 0);
  const calm = s.reduce((best, v, i) => (Math.abs(v) < Math.abs(s[best]) ? i : best), 0);
  const sway = motion.motions.find((m) => m.id === 'cape-sway');
  // the keys are shifted to start at 0; the sway itself is the deviation from their mean
  const mean = sway.keys.reduce((a, k) => a + k[1], 0) / sway.keys.length;
  const at = (i) => Math.abs(sway.keys[i][1] - mean);
  assert.ok(at(tight) > 3 * Math.max(at(calm), 0.01), `tight ${at(tight).toFixed(2)} vs calm ${at(calm).toFixed(2)}`);
});

t('V02 to V04 have no cape (their history is unchanged by V05)', () => {
  for (const v of [2, 3, 4]) {
    const names = RL.defsFor(v).map(([, o]) => o.name);
    assert.ok(!names.includes('Cape cloth'), `v${v}`);
  }
  assert.ok(RL.defsFor(4).some(([, o]) => o.name === 'Frisbee' && o.parent === 'arm-l'));
});

console.log(`\n${n} robot cape tests passed`);
