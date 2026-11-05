// Node tests for the Architectural drafting table scenes. Run: node tests/test_drafting.js
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '..');
const G = require(path.join(root, 'js/core/geometry.js'));
const MO = require(path.join(root, 'js/core/motion.js'));
const { DRAFTING, COUNTS, boardPt, rectLoop, VOL } = require(path.join(root, 'tools/drafting.js'));
const { SCENES } = require(path.join(root, 'tools/scenes.js'));
const { apply } = MO.mat4;
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };

// Replay a scene the way build_samples does (the build runs the rules; this is the geometry only).
function modelOf(scene) {
  const ops = scene.defs.map(([key, d], i) => ({ seq: i + 1, op: 'add', time: '2026-11-05T00:00:00Z', author: 'test', note: '',
    object: { uuid: `${scene.id}-${key}`, name: d.name, description: d.description || '', type: d.type, dimensions: d.dimensions,
      position: d.position, rotation_y: d.rotation_y || 0, ...(d.rotation_x ? { rotation_x: d.rotation_x } : {}),
      parent: d.parent ? `${scene.id}-${d.parent}` : null, material: d.material || null } }));
  return G.replay({ schema: 'make3d.history/0.1', model_id: scene.id, header: scene.header, operations: ops });
}

t('seven increments, with rough object counts that climb', () => {
  assert.strictEqual(DRAFTING.length, 7);
  DRAFTING.forEach((s, i) => {
    const n = s.defs.length, want = COUNTS[i];
    assert.ok(n >= want * 0.8 && n <= want * 1.25, `V${i + 1} has ${n}, wanted about ${want}`);
    if (i) assert.ok(n > DRAFTING[i - 1].defs.length, `V${i + 1} does not add to V${i}`);
  });
});

t('every version contains the one before it (nothing deleted), and keys are unique', () => {
  let prev = null;
  for (const s of DRAFTING) {
    const keys = s.defs.map((d) => d[0]);
    assert.strictEqual(new Set(keys).size, keys.length, `${s.id} has duplicate keys`);
    if (prev) for (const k of prev) assert.ok(keys.includes(k), `${s.id} lost ${k}`);
    prev = keys;
  }
});

t('the three build increments: V01 has the table, lamp and stool; V02 pencils, sharpener; V03 the French ruler', () => {
  const keys = (v) => new Set(DRAFTING[v - 1].defs.map((d) => d[0]));
  for (const k of ['board', 'column', 'lamp-shade', 'stool-seat']) assert.ok(keys(1).has(k), `V01 lacks ${k}`);
  for (const k of ['pencil-1', 'eraser-pink', 'sharpener', 'ink-bottle']) assert.ok(keys(2).has(k), `V02 lacks ${k}`);
  for (const k of ['french-ruler', 'parallel-rule', 'protractor']) assert.ok(keys(3).has(k), `V03 lacks ${k}`);
  assert.ok(!keys(2).has('french-ruler') && !keys(1).has('pencil-1'), 'an increment leaked into an earlier one');
});

t('every object has a name, and every one that is tapped has a description', () => {
  for (const s of DRAFTING) {
    for (const [k, d] of s.defs) {
      assert.ok(d.name && d.name.length > 2, `${s.id} ${k} has no name`);
      assert.ok(d.description && d.description.length > 15, `${s.id} ${k} has no description`);
    }
  }
});

t('parts that lie on the board take the board tilt; the board itself is 30 degrees', () => {
  const v7 = DRAFTING[6].defs, board = v7.find((d) => d[0] === 'board')[1];
  assert.strictEqual(board.rotation_x, 30);
  for (const k of ['french-ruler', 'parallel-rule', 'paper', 'eraser-working']) {
    const d = v7.find((x) => x[0] === k)[1];
    assert.strictEqual(d.rotation_x, 30, `${k} is not on the board`);
  }
});

t('no animation before V04; V04 to V07 have motions that pass the check; first frame is the rest pose; the loop closes', () => {
  DRAFTING.slice(0, 3).forEach((s) => assert.ok(!s.motion, `${s.id} should be still`));
  DRAFTING.slice(3).forEach((s) => {
    const model = modelOf(s), uuid = (k) => `${s.id}-${k}`, mo = s.motion(uuid);
    assert.strictEqual(MO.checkMotion(model, mo).outcome, 'accept', s.id);
    const p0 = MO.poseAt(model, mo, 0), pL = MO.poseAt(model, mo, mo.loop_s);
    assert.ok(Object.keys(p0).length >= 3, `${s.id} has too few moving parts`);
    for (const id of Object.keys(p0)) {
      p0[id].forEach((x, i) => assert.ok(Math.abs(x - MO.mat4.identity()[i]) < 1e-2, `${s.id} ${id} first frame is not the rest pose`));
      p0[id].forEach((x, i) => assert.ok(Math.abs(x - pL[id][i]) < 1e-2, `${s.id} ${id} loop does not close`));
    }
    mo.motions.forEach((m) => assert.ok(Number.isInteger(m.cycles) && m.cycles >= 1, `${m.id} cycles`));
  });
});

t('the pencil that traces the elevation stays on the outline (its tip lies on the upper box at every point)', () => {
  const pts = rectLoop(VOL.s0, VOL.s1, VOL.t0, VOL.t1);
  for (const [s, tt] of pts) {
    const onEdge = Math.abs(s - VOL.s0) < 1e-9 || Math.abs(s - VOL.s1) < 1e-9 || Math.abs(tt - VOL.t0) < 1e-9 || Math.abs(tt - VOL.t1) < 1e-9;
    assert.ok(onEdge, `point ${s},${tt} is off the outline`);
  }
  const p = boardPt(VOL.s0, VOL.t0, 4.5);
  const tr = DRAFTING[3].defs.find((d) => d[0] === 'pencil-trace')[1];
  assert.deepStrictEqual(tr.position, p, 'the pencil rests on the first corner of the outline');
});

t('the parallel rule stays level on the board while it shifts (every point has the same tilt)', () => {
  const mo = DRAFTING[3].motion((k) => k);
  const m = mo.motions.find((x) => x.id === 'parallel-rule-shift');
  for (const p of m.points) {
    // on the board plane: the normal component of (p - board centre) is the same for every point
    const d = [p[0] - 0, p[1] - 0, p[2] - 38];
    const nrm = d[1] * -0.5 + d[2] * Math.sqrt(3) / 2;
    assert.ok(Math.abs(nrm - 1.05) < 0.02, `point ${p} is off the board by ${nrm}`);
  }
});

t('every scene id is registered in the library with a matching world', () => {
  const ids = SCENES.map((s) => s.id);
  for (let v = 1; v <= 7; v++) {
    const id = `drafting-table-v${String(v).padStart(2, '0')}`;
    assert.ok(ids.includes(id), `${id} is not in scenes.js`);
  }
  const world = JSON.parse(fs.readFileSync(path.join(root, 'worlds/drafting-world.json'), 'utf8'));
  assert.strictEqual(world.world_id, 'drafting-world');
  assert.strictEqual(world.units, 'in');
});

console.log(`\n${n} drafting tests passed`);
