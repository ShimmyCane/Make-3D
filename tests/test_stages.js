// Node tests for the staged passes (js/core/stages.js, P4). Run: node tests/test_stages.js
const assert = require('assert');
const path = require('path');
const root = path.join(__dirname, '..');
const S = require(path.join(root, 'js/core/schema.js'));
const ST = require(path.join(root, 'js/core/stages.js'));

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };

const header = { schema: S.SCHEMA.history, model_id: 'stage-test', name: 'Stage test', description: '', up: 'z', units: 'in',
  materials: { wood: { color: '#8b5a2b', opacity: 1 }, paint: { color: '#ffffff', opacity: 1 } } };
const add = (seq, uuid, material) => ({ seq, op: 'add', object: { uuid, name: uuid, type: 'box', dimensions: [10, 10, 10], position: [0, 0, 5], material } });
const history = { header, operations: [
  add(1, 'a', 'wood'), add(2, 'b', 'paint'), add(3, 'c', 'wood'),
] };

t('stages: a first run computes each stage once', () => {
  const cache = new Map(), counts = {};
  const out = ST.runStages(history, undefined, cache, counts);
  assert.deepStrictEqual(counts, { structure: 1, shape: 1, material: 1 });
  assert.deepStrictEqual(out.structure.objects.map((o) => o.uuid), ['a', 'b', 'c']);
  assert.strictEqual(out.shape.length, 3);
  assert.strictEqual(out.material.find((m) => m.uuid === 'a').color, '#8b5a2b');
});

t('stages: a material edit reruns only the material stage', () => {
  const cache = new Map(), counts = {};
  ST.runStages(history, undefined, cache, counts);
  const edited = { header, operations: [...history.operations, { seq: 4, op: 'set_material', material: 'wood', set: { color: '#c08040', roughness: 0.3 } }] };
  const out = ST.runStages(edited, undefined, cache, counts);
  assert.deepStrictEqual(counts, { structure: 1, shape: 1, material: 2 }, 'structure and shape were reused');
  assert.strictEqual(out.material.find((m) => m.uuid === 'a').color, '#c08040');
  assert.strictEqual(out.material.find((m) => m.uuid === 'a').roughness, 0.3);
  assert.strictEqual(out.material.find((m) => m.uuid === 'b').color, '#ffffff', 'other materials are unchanged');
});

t('stages: an object edit reruns all three stages', () => {
  const cache = new Map(), counts = {};
  ST.runStages(history, undefined, cache, counts);
  const moved = { header, operations: [...history.operations, { seq: 4, op: 'modify', uuid: 'a', set: { position: [9, 0, 5] } }] };
  const out = ST.runStages(moved, undefined, cache, counts);
  assert.deepStrictEqual(counts, { structure: 2, shape: 2, material: 2 });
  assert.deepStrictEqual(out.shape.find((o) => o.uuid === 'a').position, [9, 0, 5]);
});

t('stages: a repeat run with the same history is all cache hits', () => {
  const cache = new Map(), counts = {};
  ST.runStages(history, undefined, cache, counts);
  ST.runStages(history, undefined, cache, counts);
  assert.deepStrictEqual(counts, { structure: 1, shape: 1, material: 1 });
});

t('stages: the material stage agrees with a full replay of the history', () => {
  const G = require(path.join(root, 'js/core/geometry.js'));
  const full = G.replay(history);
  const staged = ST.materialStage(history);
  assert.deepStrictEqual(staged.map((m) => m.uuid), full.objects.map((o) => o.uuid));
  assert.strictEqual(staged.find((m) => m.uuid === 'c').color, full.materials.wood.color);
});

t('stages: keys change only when the stage input changes', () => {
  const k1 = ST.stageKeys(history);
  const k2 = ST.stageKeys({ header, operations: [...history.operations, { seq: 4, op: 'set_material', material: 'paint', set: { roughness: 0.9 } }] });
  assert.strictEqual(k1.structure, k2.structure);
  assert.strictEqual(k1.shape, k2.shape);
  assert.notStrictEqual(k1.material, k2.material);
});

console.log(`\n${n} test groups passed`);
