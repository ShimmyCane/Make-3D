// Node tests for the pure engine. Run: node tests/test_core.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const U = require(path.join(root, 'js/core/units.js'));
const S = require(path.join(root, 'js/core/schema.js'));
const G = require(path.join(root, 'js/core/geometry.js'));
const O = require(path.join(root, 'js/core/origin.js'));
const R = require(path.join(root, 'js/core/rules.js'));
const CL = require(path.join(root, 'js/core/clash.js'));
const IO = require(path.join(root, 'js/core/io.js'));
const world = JSON.parse(fs.readFileSync(path.join(root, 'worlds/default-world.json'), 'utf8'));

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const header = { model_id: 't', name: 'Test', units: 'in', up: 'z', world: 'default-world', materials: {} };
const box = (uuid, extra = {}) => ({ uuid, name: uuid, type: 'box', dimensions: [10, 10, 10], position: [0, 0, 5], ...extra });
const add = (o, seq = 1) => ({ seq, op: 'add', object: o });

// --- units
t('units: feet and inches display', () => {
  assert.strictEqual(U.fmtFtIn(36), '3′ 0″');
  assert.strictEqual(U.fmtFtIn(42.5), '3′ 6 1/2″');
  assert.strictEqual(U.fmtFtIn(7.25), '7 1/4″');
  assert.strictEqual(U.fmtFtIn(84), '7′ 0″');
  assert.strictEqual(U.fmtLength(36, 'in'), '36 in');
});
t('units: parsing feet, inches and fractions', () => {
  assert.strictEqual(U.parseLength("3' 6\""), 42);
  assert.strictEqual(U.parseLength('3ft 6in'), 42);
  assert.strictEqual(U.parseLength("7'"), 84);
  assert.strictEqual(U.parseLength('3 1/2'), 3.5);
  assert.strictEqual(U.parseLength('12'), 12);
  assert.ok(Number.isNaN(U.parseLength('tall')));
});

// --- geometry
t('geometry: add, modify keeps unknown fields, rename, delete cascades', () => {
  let m = G.emptyModel(header);
  m = G.applyOperation(m, add({ uuid: 'g', name: 'G', type: 'group', dimensions: [], position: [0, 0, 0] }));
  m = G.applyOperation(m, add(box('c', { parent: 'g', custom_field: 'kept' })));
  m = G.applyOperation(m, { op: 'modify', uuid: 'c', set: { dimensions: [20, 10, 10] } });
  assert.deepStrictEqual(m.objects.find((o) => o.uuid === 'c').dimensions, [20, 10, 10]);
  assert.strictEqual(m.objects.find((o) => o.uuid === 'c').custom_field, 'kept');
  m = G.applyOperation(m, { op: 'rename', uuid: 'c', name: 'Renamed' });
  assert.strictEqual(m.objects.find((o) => o.uuid === 'c').name, 'Renamed');
  m = G.applyOperation(m, { op: 'delete', uuid: 'g' });
  assert.strictEqual(m.objects.length, 0, 'children removed with the group');
  assert.strictEqual(m.version, 5);
});
t('geometry: applying does not mutate the input model', () => {
  const m0 = G.applyOperation(G.emptyModel(header), add(box('a')));
  const snapshot = JSON.stringify(m0);
  G.applyOperation(m0, { op: 'delete', uuid: 'a' });
  assert.strictEqual(JSON.stringify(m0), snapshot);
});
t('geometry: replay of a history equals step-by-step application', () => {
  const history = { header, operations: [add(box('a'), 1), add(box('b'), 2), { seq: 3, op: 'modify', uuid: 'a', set: { position: [9, 0, 5] } }] };
  const m = G.replay(history);
  assert.strictEqual(m.version, 3);
  assert.deepStrictEqual(m.objects.find((o) => o.uuid === 'a').position, [9, 0, 5]);
  assert.strictEqual(G.replay(history, 2).objects[0].position[0], 0, 'scrub back to step 2');
});
t('geometry: out-of-order seq is an error', () => {
  assert.throws(() => G.replay({ header, operations: [add(box('a'), 2)] }));
});

// --- rules
t('rules: accept a valid add', () => {
  const r = R.checkOperation(G.emptyModel(header), add(box('a')), world);
  assert.strictEqual(r.outcome, 'accept');
});
t('rules: reject unknown uuid, duplicate uuid, bad coordinates, missing dimensions', () => {
  const m = G.applyOperation(G.emptyModel(header), add(box('a')));
  assert.strictEqual(R.checkOperation(m, { op: 'modify', uuid: 'zz', set: {} }, world).outcome, 'reject');
  assert.strictEqual(R.checkOperation(m, add(box('a')), world).outcome, 'reject');
  assert.strictEqual(R.checkOperation(m, add(box('b', { position: ['x', 0, 0] })), world).outcome, 'reject');
  assert.strictEqual(R.checkOperation(m, add(box('b', { dimensions: [10, 10] })), world).outcome, 'reject');
  assert.strictEqual(R.checkOperation(m, add(box('b', { parent: 'nope' })), world).outcome, 'reject');
});
t('rules: warnings for tiny dimensions and out-of-bounds, still accepted', () => {
  const m = G.emptyModel(header);
  const tiny = R.checkOperation(m, add(box('a', { dimensions: [0.1, 10, 10] })), world);
  assert.strictEqual(tiny.outcome, 'accept_with_warnings');
  const far = R.checkOperation(m, add(box('b', { position: [900, 0, 5] })), world);
  assert.strictEqual(far.outcome, 'accept_with_warnings');
  assert.ok(far.issues.some((i) => i.type === 'within_bounds'));
});
t('rules: overlap is allowed by default, flagged in model check when mode is flag', () => {
  let m = G.applyOperation(G.emptyModel(header), add(box('a')));
  m = G.applyOperation(m, add(box('b', { position: [2, 0, 5] })));
  assert.strictEqual(R.checkOperation(m, add(box('c', { position: [3, 0, 5] })), world).outcome, 'accept');
  assert.strictEqual(R.checkModel(m, world).issues.filter((i) => i.type === 'object_overlap').length, 0);
  const flagWorld = JSON.parse(JSON.stringify(world));
  flagWorld.rules.find((r) => r.type === 'object_overlap').mode = 'flag';
  assert.strictEqual(R.checkModel(m, flagWorld).issues.filter((i) => i.type === 'object_overlap').length, 1);
});
t('rules: allowed_overlap and parent-child pairs are not flagged', () => {
  const flagWorld = JSON.parse(JSON.stringify(world));
  flagWorld.rules.find((r) => r.type === 'object_overlap').mode = 'flag';
  let m = G.applyOperation(G.emptyModel(header), add(box('g', { type: 'group', dimensions: [] })));
  m = G.applyOperation(m, add(box('a', { parent: 'g' })));
  m = G.applyOperation(m, add(box('b', { position: [2, 0, 5], allowed_overlap: ['a'] })));
  assert.strictEqual(R.checkModel(m, flagWorld).issues.filter((i) => i.type === 'object_overlap').length, 0);
});

// --- origin
t('origin: major box centre when most objects are big', () => {
  const objs = [box('a', { position: [0, 0, 5] }), box('b', { position: [10, 0, 5] }), box('c', { position: [-10, 0, 5] })];
  const r = O.majorBox(objs);
  assert.strictEqual(r.method, 'major');
  assert.deepStrictEqual(r.origin.map((v) => Math.round(v * 1000) / 1000), [0, 0, 5]);
  assert.strictEqual(r.groundZ, 0);
});
t('origin: a far small spire extends the full box but not the major box', () => {
  const objs = [box('a', { dimensions: [40, 40, 40], position: [-20, 0, 20] }),
    box('b', { dimensions: [40, 40, 40], position: [0, 0, 20] }),
    box('c', { dimensions: [40, 40, 40], position: [20, 0, 20] }),
    box('spire', { dimensions: [1, 1, 40], position: [100, 0, 20] })];
  const r = O.majorBox(objs);
  assert.deepStrictEqual(r.outlierUuids, ['spire']);
  assert.ok(r.fullBox.max[0] > 100);
  assert.ok(r.majorBox.max[0] < 45, 'major box stays with the bulk');
  assert.strictEqual(r.method, 'major', 'one outlier of four is below the 70% trigger');
  assert.ok(Math.abs(r.origin[0]) < 1e-9, 'origin stays at the middle of the bulk');
});
t('origin: a far spire does not drag the origin when most objects are outliers', () => {
  const objs = [box('a', { dimensions: [10, 10, 10], position: [0, 0, 5] }),
    box('b', { dimensions: [10, 10, 10], position: [4, 0, 5] }),
    box('spire', { dimensions: [1, 1, 60], position: [200, 0, 30] })];
  const r = O.majorBox(objs);
  assert.strictEqual(r.method, 'weighted', 'every object is far smaller than the full box');
  assert.ok(r.origin[0] < 20, 'origin stays with the majority, not the spire');
});
t('origin: refined by volume weighting when 70% of objects are outliers', () => {
  const objs = [box('big', { dimensions: [40, 40, 40], position: [0, 0, 20] })];
  for (let i = 0; i < 9; i++) objs.push(box(`s${i}`, { dimensions: [1, 1, 1], position: [50, 0, 0.5] }));
  const r = O.majorBox(objs);
  assert.strictEqual(r.method, 'weighted');
  assert.ok(r.origin[0] < 50 && r.origin[0] > 0, 'origin pulled toward the big object, not the small ones');
});

// --- io and samples
t('geometry: set_header changes name and description, recorded as an op', () => {
  const m = G.applyOperation(G.emptyModel(header), { op: 'set_header', set: { name: 'New name', description: 'desc' } });
  assert.strictEqual(m.name, 'New name');
  assert.strictEqual(m.description, 'desc');
  assert.strictEqual(R.checkOperation(m, { op: 'set_header', set: { up: 'y' } }, world).outcome, 'reject');
});
t('origin: Y-up cylinder height runs along y', () => {
  const b = O.objectBox({ type: 'cylinder', dimensions: [1, 10], position: [0, 5, 0] }, 'y');
  assert.deepStrictEqual(b.min.map((v) => Math.round(v)), [-1, 0, -1]);
  assert.deepStrictEqual(b.max.map((v) => Math.round(v)), [1, 10, 1]);
});
t('io: bundle, history-only and model-only files are read', () => {
  const history = { header, operations: [add(box('a'))] };
  const b = IO.makeBundle({ history, world });
  assert.strictEqual(IO.readBundle(b).history.operations.length, 1);
  assert.strictEqual(IO.readBundle(history, world).world, world);
  const fromModel = IO.readBundle(G.replay(history), world).history;
  assert.strictEqual(G.replay(fromModel).objects.length, 1);
  assert.throws(() => IO.readBundle({ hello: 1 }));
});
t('samples: garden planter history replays to the saved model.json', () => {
  const dir = path.join(root, 'models/garden-planter');
  const history = JSON.parse(fs.readFileSync(path.join(dir, 'history.json'), 'utf8'));
  const saved = JSON.parse(fs.readFileSync(path.join(dir, 'model.json'), 'utf8'));
  assert.deepStrictEqual(G.replay(history), saved);
  assert.strictEqual(R.checkModel(saved, world).outcome, 'accept');
});
t('tags: vocabulary is fixed and objects keep their tags through replay', () => {
  assert.deepStrictEqual(Object.keys(S.TAGS).sort(), ['ballast', 'container', 'frame', 'plant', 'shade', 'stand', 'surface']);
  const o = G.applyOperation(G.emptyModel(header), add(box('a', { tags: ['stand'] })));
  assert.deepStrictEqual(o.objects[0].tags, ['stand']);
  const untagged = G.applyOperation(G.emptyModel(header), add(box('b')));
  assert.deepStrictEqual(untagged.objects[0].tags, []);
});
t('samples: outdoor table V2 replays, checks, and uses only known tags', () => {
  const dir = path.join(root, 'models/outdoor-table-v2');
  const history = JSON.parse(fs.readFileSync(path.join(dir, 'history.json'), 'utf8'));
  const saved = JSON.parse(fs.readFileSync(path.join(dir, 'model.json'), 'utf8'));
  assert.deepStrictEqual(G.replay(history), saved);
  assert.strictEqual(R.checkModel(saved, world).outcome, 'accept');
  for (const o of saved.objects) for (const tg of o.tags) assert.ok(tg in S.TAGS, `unknown tag ${tg} on ${o.name}`);
  const named = (name) => saved.objects.find((o) => o.name === name);
  assert.deepStrictEqual(named('Parasol pole').tags, ['stand']);
  assert.deepStrictEqual(named('Sandbag 1').tags, ['ballast']);
  assert.ok(saved.objects.filter((o) => o.tags.includes('shade')).length >= 20, 'canopy cloth is tagged shade');
  // three equal arms and a draped cloth of panels
  assert.strictEqual(saved.objects.filter((o) => /^Canopy arm \d$/.test(o.name)).length, 3);
  assert.ok(saved.objects.filter((o) => /^Canopy panel/.test(o.name)).length >= 20, 'cloth is made of panels');
  assert.strictEqual(named('Bonsai box').position[0], -150);
});
t('rotation: spin about Z (up), tilt about Y, turn about X, applied X then Y then Z', () => {
  const close = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
  assert.ok(close(O.rotateVector([1, 0, 0], 0, 0, 90), [0, 1, 0]), 'spin: x to y');
  assert.ok(close(O.rotateVector([0, 0, 1], 0, 90, 0), [1, 0, 0]), 'tilt: z to x (matches the old rotation_y)');
  assert.ok(close(O.rotateVector([0, 1, 0], 90, 0, 0), [0, 0, 1]), 'turn: y to z');
  assert.ok(close(O.rotateVector([1, 0, 0], 90, 90, 0), [0, 0, -1]), 'X first: x stays, then Y sends it to -z');
});
t('rotation: a long box spun about Z has its long side along Y', () => {
  const b = O.objectBox({ uuid: 'r', type: 'box', dimensions: [10, 2, 2], position: [0, 0, 0], rotation_z: 90 }, 'z');
  const size = b.max.map((v, i) => +(v - b.min[i]).toFixed(6));
  assert.deepStrictEqual(size, [2, 10, 2]);
  const flat = O.objectBox({ uuid: 'r', type: 'box', dimensions: [10, 2, 2], position: [0, 0, 0] }, 'z');
  assert.deepStrictEqual(flat.max.map((v, i) => +(v - flat.min[i]).toFixed(6)), [10, 2, 2]);
});
t('rules: a non-numeric rotation_z is rejected', () => {
  const r = R.checkOperation(G.emptyModel(header), add(box('spin', { rotation_z: 'fast' })), world);
  assert.strictEqual(r.outcome, 'reject');
  assert.ok(r.issues.some((i) => /rotation_z/.test(i.message)));
});
t('samples: outdoor table V2 bonsai joins end to end in 3-D', () => {
  const saved = JSON.parse(fs.readFileSync(path.join(root, 'models/outdoor-table-v2/model.json'), 'utf8'));
  const byName = (name) => saved.objects.find((o) => o.name === name);
  // the two ends of an object, along its own axis (rotated like the viewer and origin)
  const axis = (o) => O.rotateVector([0, 0, o.dimensions[1] / 2], o.rotation_x, o.rotation_y, o.rotation_z);
  const end = (o) => o.position.map((v, i) => v + axis(o)[i]);
  const start = (o) => o.position.map((v, i) => v - axis(o)[i]);
  const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 0.05);
  assert.ok(near(start(byName('Trunk 1')), [-150, 0, 24]), 'trunk starts at the top of the box');
  for (const [a, b] of [['Trunk 1', 'Trunk 2'], ['Trunk 2', 'Trunk 3'], ['Trunk 3', 'Trunk 4'], ['Trunk 2', 'Main limb 1'], ['Main limb 1', 'Main limb 2'], ['Main limb 2', 'Main limb 3'], ['Main limb 1', 'Branch 1.1'], ['Main limb 2', 'Branch 2.1'], ['Main limb 3', 'Branch 3.1']]) {
    assert.ok(near(start(byName(b)), end(byName(a))), `${b} starts where ${a} ends`);
  }
  assert.ok(byName('Dead branch (jin)'), 'a dead branch is there');
});
t('samples: outdoor table V2 bonsai has a leader above the crown and foliage on several sides', () => {
  const saved = JSON.parse(fs.readFileSync(path.join(root, 'models/outdoor-table-v2/model.json'), 'utf8'));
  const foliage = saved.objects.filter((o) => /^Foliage/.test(o.name) && o.type === 'sphere');
  const apex = saved.objects.find((o) => o.name === 'Foliage apex');
  const crownTop = Math.max(...foliage.filter((o) => !o.name.startsWith('Foliage apex')).map((o) => o.position[2] + o.dimensions[0]));
  assert.ok(apex.position[2] > crownTop, 'the apex is the highest point');
  const ys = foliage.map((o) => o.position[1]);
  assert.ok(Math.min(...ys) < -5 && Math.max(...ys) > 5, 'foliage on both sides of the limb');
});
t('samples: outdoor table V2 has no clashes (parasol clear of the table, tree clear of canopy)', () => {
  const saved = JSON.parse(fs.readFileSync(path.join(root, 'models/outdoor-table-v2/model.json'), 'utf8'));
  assert.deepStrictEqual(CL.findClashes(saved), []);
  // a pole through a plank must be caught (the check is not silent)
  const mk = (name, type, dims, pos) => ({ uuid: name, name, type, dimensions: dims, position: pos, parent: null });
  const demo = { objects: [mk('plank', 'box', [20, 20, 1.5], [0, 0, 10]), mk('pole', 'cylinder', [0.75, 30], [0, 0, 10])] };
  assert.strictEqual(CL.findClashes(demo).length, 1);
});

console.log(`\n${n} test groups passed`);
