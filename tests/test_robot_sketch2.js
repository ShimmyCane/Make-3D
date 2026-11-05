// Node tests for Robot loop V07 (tools/robot_sketch2.js): the robot rebuilt from Quick Detail "Robot Sketch 2".
// Run: node tests/test_robot_sketch2.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const MO = require(path.join(root, 'js/core/motion.js'));
const G = require(path.join(root, 'js/core/geometry.js'));
const V = require(path.join(root, 'js/core/visibility.js'));
const RL = require(path.join(root, 'tools/robot_loop.js'));
const SK2 = require(path.join(root, 'tools/robot_sketch2.js'));

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} is not near ${b}`);

const dir = path.join(root, 'models', 'robot-loop-v07');
const model = G.replay(JSON.parse(fs.readFileSync(path.join(dir, 'history.json'), 'utf8')));
const motion = JSON.parse(fs.readFileSync(path.join(dir, 'motion.json'), 'utf8'));
const byName = (name) => model.objects.find((o) => o.name === name);

t('sketch: V07 is built from Quick Detail "Robot Sketch 2" (id in the code; title in the description)', () => {
  assert.strictEqual(SK2.SKETCH2_ID, 'a4ec8a88-5833-4504-9df2-1bc0562258b1');
  const v7 = RL.ROBOT_LOOP.find((s) => s.header.model_id === 'robot-loop-v07');
  assert.ok(v7.header.description.includes('Robot Sketch 2'));
});

t('V07: replays, the motion passes its check, and every motion targets a part of the model', () => {
  assert.strictEqual(MO.checkMotion(model, motion).outcome, 'accept');
  const ids = new Set(model.objects.map((o) => o.uuid));
  for (const m of motion.motions) assert.ok(ids.has(m.target), m.id);
  assert.strictEqual(motion.autoplay.plays, 2);
});

t('V07: the loop has no jump (first frame = last frame)', () => {
  const a = MO.poseAt(model, motion, 0), b = MO.poseAt(model, motion, motion.loop_s - 1e-6);
  for (const k of Object.keys(a)) a[k].forEach((x, i) => near(x, b[k][i], 1e-3));
});

t('V07: the walk is the Robot Path 2 walk (the same path as V06)', () => {
  const walk = motion.motions.find((m) => m.id === 'walk');
  assert.strictEqual(walk.points.length, RL.PATH_V6.length);
  RL.PATH_V6.forEach((p, i) => { near(walk.points[i][0], p[0], 1e-9); near(walk.points[i][1], p[1], 1e-9); });
});

t('V07: the sketch body: round body and head, nine chest lights, long antenna and four tail segments', () => {
  assert.strictEqual(byName('Body').type, 'sphere');
  assert.strictEqual(byName('Head').type, 'sphere');
  assert.strictEqual(model.objects.filter((o) => /^Chest light \d$/.test(o.name)).length, 9);
  assert.strictEqual(model.objects.filter((o) => /^Tail \d$/.test(o.name)).length, 4);
  assert.ok(byName('Antenna'), 'antenna');
  assert.strictEqual(byName('Body').parent, byName('Upper body').uuid);
});

t('V07: the robot keeps its legs, arms and banana; no hat, frisbee or cape (not in the sketch)', () => {
  for (const name of ['Left leg', 'Right leg', 'Left arm', 'Right arm', 'Banana', 'Left eye', 'Right eye']) assert.ok(byName(name), name);
  for (const name of ['Top hat', 'Frisbee', 'Cape cloth', 'Cape']) assert.strictEqual(model.objects.filter((o) => o.name === name).length, 0, name);
});

t('visibility: V07 has the banana group only', () => {
  assert.deepStrictEqual(V.groupsIn(model).map((g) => g.label), ['banana']);
});

t('V07: the old body parts are gone (one Body, one Head, one Antenna)', () => {
  for (const name of ['Body', 'Head', 'Antenna', 'Chest panel', 'Hips']) assert.strictEqual(model.objects.filter((o) => o.name === name).length, 1, name);
});

// V08 (articulated) and V09 (fuzzy): the same checks for each.
for (const v of [8, 9]) {
  const id = `robot-loop-v0${v}`;
  const dirV = path.join(root, 'models', id);
  const mod = G.replay(JSON.parse(fs.readFileSync(path.join(dirV, 'history.json'), 'utf8')));
  const mot = JSON.parse(fs.readFileSync(path.join(dirV, 'motion.json'), 'utf8'));
  const named = (re) => mod.objects.filter((o) => re.test(o.name));

  t(`V0${v}: replays, the motion passes its check, every motion targets a part, and the loop has no jump`, () => {
    assert.strictEqual(MO.checkMotion(mod, mot).outcome, 'accept', id);
    const ids = new Set(mod.objects.map((o) => o.uuid));
    for (const m of mot.motions) assert.ok(ids.has(m.target), `${id} ${m.id}`);
    const a = MO.poseAt(mod, mot, 0), b = MO.poseAt(mod, mot, mot.loop_s - 1e-6);
    for (const k of Object.keys(a)) a[k].forEach((x, i) => near(x, b[k][i], 1e-3));
  });

  t(`V0${v}: the joints exist: knees, elbows, ears, head, antenna and tail`, () => {
    for (const re of [/^Left knee$/, /^Right knee$/, /^Left elbow$/, /^Right elbow$/, /^Left ear$/, /^Right ear$/,
      /^Head$/, /^Antenna$/, /^Tail$/, /^Left shin$/, /^Right forearm$/]) assert.strictEqual(named(re).length, 1, `${id} ${re}`);
    for (const k of ['left-knee', 'right-knee', 'left-elbow', 'right-elbow', 'left-ear', 'right-ear', 'head-tilt', 'antenna-sway', 'tail-wag']) {
      assert.ok(mot.motions.some((m) => m.id === k), `${id} ${k}`);
    }
  });

  t(`V0${v}: the banana rides on the right forearm, so the wrist moves it`, () => {
    const banana = named(/^Banana$/)[0];
    assert.strictEqual(banana.parent, named(/^Right elbow$/)[0].uuid);
  });
}

t('V09 is the fuzzy version: fuzz balls on the body and the ears; V08 has none', () => {
  const fuzz = (id) => G.replay(JSON.parse(fs.readFileSync(path.join(root, 'models', id, 'history.json'), 'utf8')))
    .objects.filter((o) => /fuzz/i.test(o.name)).length;
  assert.strictEqual(fuzz('robot-loop-v08'), 0);
  assert.ok(fuzz('robot-loop-v09') >= 10 + 5 * 2, `fuzz balls ${fuzz('robot-loop-v09')}`);
});

// V10 (play): five limbs with hinges, a whipping tail, a bouncing antenna, blinking lids.
{
  const id = 'robot-loop-v10';
  const dirV = path.join(root, 'models', id);
  const mod = G.replay(JSON.parse(fs.readFileSync(path.join(dirV, 'history.json'), 'utf8')));
  const mot = JSON.parse(fs.readFileSync(path.join(dirV, 'motion.json'), 'utf8'));
  const named = (re) => mod.objects.filter((o) => re.test(o.name));

  t('V10: replays, the motion passes its check, every motion targets a part, and the loop has no jump', () => {
    assert.strictEqual(MO.checkMotion(mod, mot).outcome, 'accept', id);
    const ids = new Set(mod.objects.map((o) => o.uuid));
    for (const m of mot.motions) assert.ok(ids.has(m.target), `${id} ${m.id}`);
    const a = MO.poseAt(mod, mot, 0), b = MO.poseAt(mod, mot, mot.loop_s - 1e-6);
    for (const k of Object.keys(a)) a[k].forEach((x, i) => near(x, b[k][i], 1e-3));
  });

  t('V10: five limbs (three arms, two legs), each with a hinge cap', () => {
    for (const re of [/^Left arm$/, /^Right arm$/, /^Waving arm$/, /^Left leg$/, /^Right leg$/,
      /^Left elbow hinge$/, /^Right elbow hinge$/, /^Waving elbow hinge$/, /^Left knee hinge$/, /^Right knee hinge$/]) {
      assert.strictEqual(named(re).length, 1, `${id} ${re}`);
    }
  });

  t('V10: the tail is a chain of four joints, the eyelids are hinged, the antenna bounces', () => {
    for (let k = 1; k <= 4; k++) assert.strictEqual(named(new RegExp(`^Tail joint ${k}$`)).length, 1, `joint ${k}`);
    assert.strictEqual(named(/^Tail \d$/).length, 4);
    assert.strictEqual(named(/^(Left|Right) eyelid$/).length, 2);
    for (const k of ['tail-whip-1', 'tail-whip-4', 'blink-l', 'blink-r', 'antenna-bounce', 'wave-arm', 'bounce', 'left-arm', 'left-elbow']) {
      assert.ok(mot.motions.some((m) => m.id === k), `${id} ${k}`);
    }
  });

  t('V10: the banana is still in the right hand (on the right elbow), and the walk is still the Robot Path 2 walk', () => {
    assert.strictEqual(named(/^Banana$/)[0].parent, named(/^Right elbow$/)[0].uuid);
    const walk = mot.motions.find((m) => m.id === 'walk');
    assert.strictEqual(walk.points.length, RL.PATH_V6.length);
  });
}

console.log(`\n${n} robot sketch 2 tests passed`);
