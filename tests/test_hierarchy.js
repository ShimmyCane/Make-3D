// Object hierarchy: the Objects list rows, folding groups, and which groups an object may move into.
// Run: node tests/test_hierarchy.js
const assert = require('assert');
const H = require('../js/core/hierarchy.js');

const model = {
  objects: [
    { uuid: 'body', name: 'Body', type: 'group' },
    { uuid: 'leg', name: 'Leg', type: 'group', parent: 'body' },
    { uuid: 'foot', name: 'Foot', type: 'box', parent: 'leg' },
    { uuid: 'arm', name: 'Arm', type: 'group', parent: 'body' },
    { uuid: 'hand', name: 'Hand', type: 'box', parent: 'arm' },
    { uuid: 'table', name: 'Table', type: 'box' },
    { uuid: 'orphan', name: 'Orphan', type: 'box', parent: 'gone' },
  ],
};

// rows: depth-first, model order; a missing parent counts as top level
{
  const rows = H.treeRows(model).map((r) => `${r.o.uuid}:${r.depth}`);
  assert.deepStrictEqual(rows, ['body:0', 'leg:1', 'foot:2', 'arm:1', 'hand:2', 'table:0', 'orphan:0']);
  const body = H.treeRows(model).find((r) => r.o.uuid === 'body');
  assert.strictEqual(body.hasChildren, true);
  assert.strictEqual(H.treeRows(model).find((r) => r.o.uuid === 'foot').hasChildren, false);
}

// folding a group removes its rows, the group row stays and is marked collapsed
{
  const rows = H.treeRows(model, new Set(['leg'])).map((r) => r.o.uuid);
  assert.ok(rows.includes('leg') && !rows.includes('foot'), 'leg folded: foot hidden from the list');
  const leg = H.treeRows(model, new Set(['leg'])).find((r) => r.o.uuid === 'leg');
  assert.strictEqual(leg.collapsed, true);
  // folding the top group hides everything under it
  const top = H.treeRows(model, new Set(['body'])).map((r) => r.o.uuid);
  assert.deepStrictEqual(top, ['body', 'table', 'orphan']);
}

// a parent loop is still listed, and the walk terminates
{
  const loop = { objects: [
    { uuid: 'a', name: 'A', type: 'group', parent: 'b' },
    { uuid: 'b', name: 'B', type: 'group', parent: 'a' },
  ] };
  const uuids = H.treeRows(loop).map((r) => r.o.uuid).sort();
  assert.deepStrictEqual(uuids, ['a', 'b']);
}

// allowed parents
{
  assert.deepStrictEqual(H.canBeParent(model, 'foot', 'arm'), { ok: true, reason: '' });
  assert.strictEqual(H.canBeParent(model, 'foot', null).ok, true, 'top level is always allowed');
  assert.strictEqual(H.canBeParent(model, 'foot', 'table').ok, false, 'only a group can hold parts');
  assert.strictEqual(H.canBeParent(model, 'body', 'body').ok, false, 'no object inside itself');
  assert.strictEqual(H.canBeParent(model, 'body', 'leg').ok, false, 'a group cannot go inside its own part (loop)');
  assert.strictEqual(H.canBeParent(model, 'leg', 'arm').ok, true, 'a group can move into another group');
  assert.strictEqual(H.canBeParent(model, 'foot', 'nope').ok, false, 'missing group');
  assert.strictEqual(H.canBeParent(model, 'nope', 'arm').ok, false, 'missing object');
}

// attached parts (a skeleton's part) stay in the skeleton's group
{
  const m = { objects: [
    { uuid: 'g1', name: 'G1', type: 'group' },
    { uuid: 'g2', name: 'G2', type: 'group' },
    { uuid: 'sk', name: 'Skeleton', type: 'loft', parent: 'g1' },
    { uuid: 'fin', name: 'Fin', type: 'box', attach: { to: 'sk', joint: 0 }, parent: 'g1' },
  ] };
  assert.strictEqual(H.canBeParent(m, 'fin', 'g2').ok, false);
  assert.strictEqual(H.canBeParent(m, 'fin', 'g1').ok, true);
  assert.strictEqual(H.canBeParent(m, 'fin', null).ok, false);
}

// the groups an object may move into, with a readable path
{
  const opts = H.groupOptions(model, 'foot').map((g) => g.uuid).sort();
  assert.deepStrictEqual(opts, ['arm', 'body', 'leg']);   // its current group (leg) is a valid choice; the foot is not a group
  const legOpts = H.groupOptions(model, 'leg').map((g) => g.uuid).sort();
  assert.deepStrictEqual(legOpts, ['arm', 'body'], 'leg cannot go inside itself or its own parts (foot)');
  assert.strictEqual(H.pathOf(model, model.objects[2]), 'Body › Leg › Foot');
}

// the move is a plain modify step
{
  assert.deepStrictEqual(H.moveOp('foot', 'arm'), { op: 'modify', uuid: 'foot', set: { parent: 'arm' } });
  assert.deepStrictEqual(H.moveOp('foot', null), { op: 'modify', uuid: 'foot', set: { parent: null } });
}

console.log('hierarchy tests passed');

// the move, applied through the geometry engine, sets the parent (what a replay of the history does)
{
  const G = require('../js/core/geometry.js');
  const moved = G.applyOperation(model, H.moveOp('foot', 'arm'));
  assert.strictEqual(moved.objects.find((o) => o.uuid === 'foot').parent, 'arm');
  const top = G.applyOperation(model, H.moveOp('foot', null));
  assert.strictEqual(top.objects.find((o) => o.uuid === 'foot').parent, null);
  console.log('hierarchy move applied through the engine');
}
