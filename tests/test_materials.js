// Node tests for the material table and set_material (P1). Run: node tests/test_materials.js
const assert = require('assert');
const path = require('path');
const root = path.join(__dirname, '..');
const S = require(path.join(root, 'js/core/schema.js'));
const G = require(path.join(root, 'js/core/geometry.js'));
const R = require(path.join(root, 'js/core/rules.js'));

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };

const header = { schema: S.SCHEMA.model, model_id: 'mat-test', name: 'Mat test', description: '', up: 'z', units: 'in',
  materials: { wood: { color: '#8b5a2b', opacity: 1 } } };
const world = { rules: [] };
const base = G.emptyModel(header);

t('set_material: changes roughness and metalness of an existing entry, keeps colour', () => {
  const m = G.applyOperation(base, { op: 'set_material', material: 'wood', set: { roughness: 0.4, metalness: 0.1 } });
  assert.deepStrictEqual(m.materials.wood, { color: '#8b5a2b', opacity: 1, roughness: 0.4, metalness: 0.1 });
  assert.strictEqual(base.materials.wood.roughness, undefined, 'the input model is not mutated');
});

t('set_material: a new id starts from the defaults', () => {
  const m = G.applyOperation(base, { op: 'set_material', material: 'glass', set: { opacity: 0.3 } });
  assert.deepStrictEqual(m.materials.glass, { color: '#c9c3b5', opacity: 0.3, roughness: 0.75, metalness: 0 });
});

t('set_material: replay of history gives the same table', () => {
  const history = { header, operations: [
    { seq: 1, op: 'set_material', material: 'wood', set: { roughness: 0.6 } },
    { seq: 2, op: 'set_material', material: 'wood', set: { color: '#a0522d' } },
  ] };
  const m = G.replay(history);
  assert.deepStrictEqual(m.materials.wood, { color: '#a0522d', opacity: 1, roughness: 0.6, metalness: 0 });
});

t('set_material: out-of-range or unknown values are rejected by the engine and by the rules check', () => {
  assert.throws(() => G.applyOperation(base, { op: 'set_material', material: 'wood', set: { roughness: 1.5 } }), /roughness/);
  assert.throws(() => G.applyOperation(base, { op: 'set_material', material: 'wood', set: { shine: 0.2 } }), /unknown material field/);
  assert.throws(() => G.applyOperation(base, { op: 'set_material', material: 'wood', set: { color: 'red' } }), /color/);
  assert.throws(() => G.applyOperation(base, { op: 'set_material', set: { roughness: 0.2 } }), /material id/);
  const r = R.checkOperation(base, { op: 'set_material', material: 'wood', set: { metalness: -1 } }, world);
  assert.strictEqual(r.outcome, 'reject');
  assert.strictEqual(R.checkOperation(base, { op: 'set_material', material: 'wood', set: { roughness: 0.2 } }, world).outcome, 'accept');
});

t('set_material: does not touch objects or the history rules for other ops', () => {
  const m = G.applyOperation(base, { op: 'set_material', material: 'wood', set: { roughness: 0.2 } });
  assert.deepStrictEqual(m.objects, []);
  assert.strictEqual(m.version, 1);
});

console.log(`\n${n} test groups passed`);
