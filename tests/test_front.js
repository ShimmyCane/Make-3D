// Node tests for the front page categories (js/ui/front.js). Run: node tests/test_front.js
const assert = require('assert');
const path = require('path');
const F = require(path.join(__dirname, '..', 'js/ui/front.js'));

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('a listed project goes to its category; a project not listed goes to Unsorted', () => {
  assert.strictEqual(F.categoryOf('Hawk'), 'fun');
  assert.strictEqual(F.categoryOf('Robot going for a stroll'), 'tests');
  assert.strictEqual(F.categoryOf('Living room'), 'architecture');
  assert.strictEqual(F.categoryOf('Earth (planet view)'), 'science');
  assert.strictEqual(F.categoryOf('Brand new project'), 'unsorted');
  assert.strictEqual(F.categoryOf('constructor'), 'unsorted');   // no prototype lookups
  assert.strictEqual(F.categoryOf(undefined), 'unsorted');
});

t('every category maps to a known id, and the five categories are in order', () => {
  assert.deepStrictEqual(F.CATEGORIES.map((c) => c.id), ['science', 'tests', 'architecture', 'fun', 'unsorted']);
  for (const id of Object.values(F.PROJECT_CATEGORY)) {
    assert.ok(F.CATEGORIES.some((c) => c.id === id), `unknown category ${id}`);
  }
});

t('grouping keeps every project once, in its category, and always returns five categories', () => {
  const projects = [
    { project: 'Hawk', versions: [{ id: 'hawk-v07', name: 'Hawk V07' }] },
    { project: 'Solar System', versions: [{ id: 'solar-system-v08', name: 'Solar System V08' }] },
    { project: 'Mystery', versions: [{ id: 'mystery-v01', name: 'Mystery V01' }] },
  ];
  const groups = F.groupByCategory(projects);
  assert.strictEqual(groups.length, 5);
  const names = groups.map((g) => g.projects.map((p) => p.project));
  assert.deepStrictEqual(names[0], ['Solar System']);   // science
  assert.deepStrictEqual(names[3], ['Hawk']);           // fun
  assert.deepStrictEqual(names[4], ['Mystery']);        // unsorted
  assert.deepStrictEqual(names[1], []);                 // tests: empty but still there
  assert.strictEqual(groups.reduce((a, g) => a + g.projects.length, 0), projects.length);
});

t('version labels drop the project name; an empty label is V1', () => {
  assert.strictEqual(F.versionLabel({ name: 'Living room V10' }, 'Living room'), 'V10');
  assert.strictEqual(F.versionLabel({ name: 'Kitchen' }, 'Kitchen'), 'V1');
  assert.strictEqual(F.versionLabel({ name: 'Hawk V07' }, 'Robot'), 'Hawk V07');
});

t('parts count comes from the model when there is one, else from the operations', () => {
  assert.strictEqual(F.partsOf({ model: { objects: [1, 2, 3] }, history: { operations: [] } }), '3 parts');
  assert.strictEqual(F.partsOf({ history: { operations: [1, 2] } }), '2 parts');
});

console.log(`${n} front page tests passed`);
