// IFC export tests (plain Node). Run: node tests/test_ifc.js
const assert = require('assert');
const path = require('path');
const X = require(path.join(__dirname, '../js/core/export_ifc.js'));

const M = 0.0254; // inches to metres
const NOW = '2026-11-02T00:00:00Z';
const base = (objects, extra = {}) => ({ model_id: 'ifc-test', name: 'IFC test', units: 'in', materials: {}, objects, ...extra });
const one = (o, extra) => X.exportIFC(base([{ uuid: '6f1c0000-0000-4000-8000-000000000001', name: 'part', ...o }], extra), { now: NOW });

// Every point of every IfcCartesianPointList3D, as [x, y, z] in metres
function points(text) {
  const out = [];
  for (const line of text.split('\n')) {
    if (!line.includes('IFCCARTESIANPOINTLIST3D')) continue;
    const re = /\(([-0-9.E+]+),([-0-9.E+]+),([-0-9.E+]+)\)/g;
    let m;
    while ((m = re.exec(line))) out.push([+m[1], +m[2], +m[3]]);
  }
  return out;
}
function extent(text) {
  const p = points(text);
  const r = (i) => [Math.min(...p.map((q) => q[i])), Math.max(...p.map((q) => q[i]))];
  return { x: r(0), y: r(1), z: r(2) };
}
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} vs ${b}`);
const close = (pair, want, msg) => { near(pair[0], want[0], msg + ' min'); near(pair[1], want[1], msg + ' max'); };

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('header: IFC4 file with metre units and the given timestamp', () => {
  const { text } = one({ type: 'box', dimensions: [1, 1, 1], position: [0, 0, 0.5] });
  assert.ok(text.startsWith('ISO-10303-21;'));
  assert.ok(text.includes("FILE_SCHEMA(('IFC4'));"));
  assert.ok(text.includes("FILE_NAME('IFC test.ifc','2026-11-02T00:00:00'"));
  assert.ok(text.includes('IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)'));
  assert.ok(text.trimEnd().endsWith('END-ISO-10303-21;'));
});

t('scale: a box of 10 in is 0.254 m, and its centre is at the position in metres', () => {
  const { text } = one({ type: 'box', dimensions: [10, 10, 10], position: [0, 0, 5] });
  const e = extent(text);
  close(e.x, [-5 * M, 5 * M], 'x');
  close(e.y, [-5 * M, 5 * M], 'y');
  close(e.z, [0, 10 * M], 'z');
});

t('up: Z stays up, so a 40 in tall cylinder runs up the z axis', () => {
  const { text } = one({ type: 'cylinder', dimensions: [5, 40], position: [0, 0, 20] });
  const e = extent(text);
  close(e.z, [0, 40 * M], 'z');
  close(e.x, [-5 * M, 5 * M], 'x');
});

t('shapes: cone apex is at the top (+z), sphere is centred on its position', () => {
  const cone = extent(one({ type: 'cone', dimensions: [5, 10], position: [0, 0, 5] }).text);
  close(cone.z, [0, 10 * M], 'cone z');
  const ball = extent(one({ type: 'sphere', dimensions: [4], position: [0, 30, 4] }).text);
  close(ball.y, [(30 - 4) * M, (30 + 4) * M], 'sphere y');
  close(ball.z, [0, 8 * M], 'sphere z');
});

t('rotation: a 20 in rail turned 90 degrees about Z lies along y', () => {
  const { text } = one({ type: 'box', dimensions: [20, 2, 2], position: [0, 0, 1], rotation_z: 90 });
  const e = extent(text);
  close(e.x, [-1 * M, 1 * M], 'x');
  close(e.y, [-10 * M, 10 * M], 'y');
});

t('rotation: X then Y then Z, same as the viewer (a 90 degree X turn lays a tall box on its side)', () => {
  const { text } = one({ type: 'box', dimensions: [2, 2, 20], position: [0, 0, 0], rotation_x: 90 });
  const e = extent(text);
  close(e.y, [-10 * M, 10 * M], 'y after rotation_x');
  close(e.z, [-1 * M, 1 * M], 'z after rotation_x');
});

t('elements: each object is one proxy, groups are not drawn', () => {
  const r = X.exportIFC(base([
    { uuid: 'a', name: 'g', type: 'group', dimensions: [], position: [0, 0, 0] },
    { uuid: 'b', name: 'box', type: 'box', dimensions: [1, 1, 1], position: [0, 0, 0.5], parent: 'a' },
    { uuid: 'c', name: 'ball', type: 'sphere', dimensions: [1], position: [5, 0, 1], parent: 'a' },
  ]), { now: NOW });
  assert.strictEqual(r.elements, 2);
  assert.strictEqual((r.text.match(/IFCBUILDINGELEMENTPROXY\(/g) || []).length, 2);
  assert.strictEqual((r.text.match(/IFCTRIANGULATEDFACESET\(/g) || []).length, 2);
  assert.deepStrictEqual(r.skipped, []);
});

t('skipped: objects with a bad size or position are left out and reported', () => {
  const r = X.exportIFC(base([
    { uuid: 'bad-size', type: 'box', dimensions: [0, 1, 1], position: [0, 0, 0] },
    { uuid: 'bad-pos', type: 'box', dimensions: [1, 1, 1], position: [NaN, 0, 0] },
    { uuid: 'ok', type: 'box', dimensions: [1, 1, 1], position: [0, 0, 0.5] },
  ]), { now: NOW });
  assert.strictEqual(r.elements, 1);
  assert.deepStrictEqual(r.skipped.sort(), ['bad-pos', 'bad-size']);
});

t('material: colour becomes an IFC surface style; unknown material has none', () => {
  const r = X.exportIFC(base([
    { uuid: 'a', type: 'box', dimensions: [1, 1, 1], position: [0, 0, 0.5], material: 'oak' },
    { uuid: 'b', type: 'box', dimensions: [1, 1, 1], position: [3, 0, 0.5], material: 'nope' },
  ], { materials: { oak: { color: '#ff8000', opacity: 1 } } }), { now: NOW });
  assert.ok(r.text.includes('IFCCOLOURRGB($,1.0000000,0.5019608,0.0000000)'));
  assert.strictEqual((r.text.match(/IFCSTYLEDITEM\(/g) || []).length, 1);
});

t('names and tags: quotes are escaped, tags and description are kept', () => {
  const { text } = one({ type: 'box', name: "Joe's bench", description: 'sits on the floor', tags: ['surface', 'frame'], dimensions: [1, 1, 1], position: [0, 0, 0.5] });
  assert.ok(text.includes("'Joe''s bench'"));
  assert.ok(text.includes("'sits on the floor'"));
  assert.ok(text.includes("'surface, frame'"));
});

t('guid: 22 characters from the IFC alphabet, stable for the same uuid', () => {
  const g = X.ifcGuid('6f1c0000000040008000000000000001');
  assert.strictEqual(g.length, 22);
  assert.ok(/^[0-9A-Za-z_$]{22}$/.test(g));
  const a = one({ type: 'box', dimensions: [1, 1, 1], position: [0, 0, 0.5] }).text;
  const b = one({ type: 'box', dimensions: [1, 1, 1], position: [0, 0, 0.5] }).text;
  assert.strictEqual(a, b);
});

t('units: unknown units throw; inches are the default', () => {
  assert.throws(() => X.exportIFC(base([], { units: 'furlong' }), { now: NOW }), /unknown units/);
  assert.ok(X.exportIFC({ model_id: 'x', objects: [] }, { now: NOW }).text.includes('IFCUNITASSIGNMENT'));
});

console.log(`\n${n} IFC test groups passed`);
