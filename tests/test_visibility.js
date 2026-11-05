// Node tests for the Parts dropdown rules (js/core/visibility.js). Run: node tests/test_visibility.js
const assert = require('assert');
const path = require('path');
const V = require(path.join(__dirname, '..', 'js/core/visibility.js'));

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('tags: show:<label> gives the label; other tags and empty labels give null', () => {
  assert.strictEqual(V.parseShowTag('show:banana'), 'banana');
  assert.strictEqual(V.parseShowTag('show: hat '), 'hat');
  assert.strictEqual(V.parseShowTag('show:'), null);
  assert.strictEqual(V.parseShowTag('link:kitchen'), null);
  assert.strictEqual(V.parseShowTag('shape'), null);
  assert.strictEqual(V.parseShowTag(null), null);
});

const model = { objects: [
  { uuid: 'r', name: 'Robot', tags: [] },
  { uuid: 'b', name: 'Banana', tags: ['show:banana'] },
  { uuid: 'f', name: 'Frisbee', tags: ['show:frisbee', 'shape'] },
  { uuid: 'b2', name: 'Banana tip', tags: ['show:banana'] },
  { name: 'No uuid', tags: ['show:hat'] },
] };

t('groupsIn: one control per label, in the order first seen, with every uuid of that label', () => {
  const groups = V.groupsIn(model);
  assert.deepStrictEqual(groups, [
    { label: 'banana', uuids: ['b', 'b2'] },
    { label: 'frisbee', uuids: ['f'] },
  ]);
});

t('groupsIn: a model without show: tags has no controls', () => {
  assert.deepStrictEqual(V.groupsIn({ objects: [{ uuid: 'a', tags: ['shape'] }] }), []);
  assert.deepStrictEqual(V.groupsIn(null), []);
});

t('hiddenUuids: returns the uuids of the labels turned off, and nothing else', () => {
  const groups = V.groupsIn(model);
  assert.deepStrictEqual(V.hiddenUuids(groups, ['banana']), ['b', 'b2']);
  assert.deepStrictEqual(V.hiddenUuids(groups, ['frisbee', 'banana']), ['b', 'b2', 'f']);
  assert.deepStrictEqual(V.hiddenUuids(groups, []), []);
  assert.deepStrictEqual(V.hiddenUuids(groups, ['hat']), []);
});

console.log(`\n${n} visibility tests passed`);

t('hidden_at_start: the objects whose eye starts shut', () => {
  const m = { objects: [
    { uuid: 'g', name: 'Trails', tags: ['show:trails'], hidden_at_start: true },
    { uuid: 'p', name: 'Plane', tags: ['show:plane'] },
    { uuid: 'q', name: 'Bead', tags: [], hidden_at_start: false },
  ] };
  assert.deepStrictEqual(V.startHiddenUuids(m), ['g']);
  assert.deepStrictEqual(V.startHiddenUuids({ objects: [] }), []);
});
