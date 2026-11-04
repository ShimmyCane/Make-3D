// Node tests for the canvas-free pattern textures (js/core/patterns.js, P2). Run: node tests/test_patterns.js
const assert = require('assert');
const path = require('path');
const root = path.join(__dirname, '..');
const S = require(path.join(root, 'js/core/schema.js'));
const G = require(path.join(root, 'js/core/geometry.js'));
const P = require(path.join(root, 'js/core/patterns.js'));

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };

const px = (bytes, x, y, size) => { const i = (y * size + x) * 4; return [bytes[i], bytes[i + 1], bytes[i + 2]]; };
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

t('spec: flat materials and unknown patterns give no texture', () => {
  assert.strictEqual(P.patternSpec({ color: '#ffffff' }), null);
  assert.strictEqual(P.patternSpec({ pattern: 'none' }), null);
  assert.strictEqual(P.patternSpec({ pattern: 'marble' }), null);
});

t('spec: pattern colour defaults to a darker shade of the base colour; scale defaults to 1', () => {
  const s = P.patternSpec({ pattern: 'wood', color: '#ffffff' });
  assert.strictEqual(s.pattern_color, '#a6a6a6');
  assert.strictEqual(s.scale, 1);
  assert.strictEqual(P.patternSpec({ pattern: 'tile', color: '#ffffff', pattern_scale: 4 }).scale, 4);
});

t('keys: same spec gives the same key; a change in any field gives a new key', () => {
  const a = P.patternSpec({ pattern: 'wood', color: '#8b5a2b', pattern_scale: 2 });
  const b = P.patternSpec({ pattern: 'wood', color: '#8b5a2b', pattern_scale: 2 });
  assert.strictEqual(P.patternKey(a), P.patternKey(b));
  assert.notStrictEqual(P.patternKey(a), P.patternKey(P.patternSpec({ pattern: 'wood', color: '#8b5a2b', pattern_scale: 3 })));
  assert.notStrictEqual(P.patternKey(a), P.patternKey(P.patternSpec({ pattern: 'stripe', color: '#8b5a2b', pattern_scale: 2 })));
});

t('pixels: RGBA, full alpha, right size; same spec gives identical bytes', () => {
  const s = P.patternSpec({ pattern: 'wood', color: '#8b5a2b' });
  const a = P.patternPixels(s), b = P.patternPixels(s);
  assert.strictEqual(a.length, P.TILE * P.TILE * 4);
  for (let i = 3; i < a.length; i += 4) assert.strictEqual(a[i], 255);
  assert.ok(same(a, b));
});

t('pixels: each pattern is seamless (the wrap-around step is no bigger than the steps inside the tile)', () => {
  for (const name of ['wood', 'tile', 'stripe', 'leaf']) {
    const s = P.patternSpec({ pattern: name, color: '#8b5a2b' });
    const size = P.TILE, bytes = P.patternPixels(s);
    const step = (ax, ay, bx, by) => Math.max(...[0, 1, 2].map((c) => Math.abs(px(bytes, ax, ay, size)[c] - px(bytes, bx, by, size)[c])));
    let seam = 0, inside = 0;
    for (let k = 0; k < size; k++) {
      seam = Math.max(seam, step(size - 1, k, 0, k), step(k, size - 1, k, 0));
      for (let j = 0; j < size - 1; j++) inside = Math.max(inside, step(j, k, j + 1, k), step(k, j, k, j + 1));
    }
    assert.ok(seam <= inside, `${name}: seam step ${seam} is bigger than the largest inside step ${inside}`);
  }
});

t('pixels: tile pattern has grout in the first column and a base-coloured centre', () => {
  const s = P.patternSpec({ pattern: 'tile', color: '#ffffff', pattern_color: '#000000' });
  const bytes = P.patternPixels(s), size = P.TILE;
  assert.deepStrictEqual(px(bytes, 0, 10, size), [0, 0, 0]);
  assert.deepStrictEqual(px(bytes, 10, 10, size), [255, 255, 255]);
});

t('pixels: stripe pattern alternates between the two colours', () => {
  const s = P.patternSpec({ pattern: 'stripe', color: '#ffffff', pattern_color: '#000000' });
  const bytes = P.patternPixels(s), size = P.TILE;
  assert.deepStrictEqual(px(bytes, 0, 5, size), [255, 255, 255]);
  assert.deepStrictEqual(px(bytes, 8, 5, size), [0, 0, 0]);
});

t('pixels: leaf pattern has veins in the pattern colour and shading in between', () => {
  const s = P.patternSpec({ pattern: 'leaf', color: '#ffffff', pattern_color: '#000000' });
  const bytes = P.patternPixels(s), size = P.TILE;
  let dark = 0, light = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const r = px(bytes, x, y, size)[0];
    if (r === 0) dark++; else light++;
  }
  assert.ok(dark > 0 && light > dark, `veins ${dark}, other ${light}`);
  const tones = new Set(); for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) tones.add(px(bytes, x, y, size)[0]);
  assert.ok(tones.size > 2, `shading varies (${tones.size} tones)`);
});

t('materials: pattern fields are validated by set_material and kept in the table', () => {
  const header = { schema: S.SCHEMA.model, model_id: 'pat', name: 'pat', description: '', up: 'z', units: 'in', materials: {} };
  const m = G.applyOperation(G.emptyModel(header), { op: 'set_material', material: 'deck', set: { pattern: 'wood', pattern_scale: 3, pattern_color: '#5c3a1e' } });
  assert.deepStrictEqual(m.materials.deck, Object.assign({}, S.MATERIAL_DEFAULTS, { pattern: 'wood', pattern_scale: 3, pattern_color: '#5c3a1e' }));
  assert.throws(() => G.applyOperation(G.emptyModel(header), { op: 'set_material', material: 'deck', set: { pattern: 'marble' } }), /pattern/);
  assert.throws(() => G.applyOperation(G.emptyModel(header), { op: 'set_material', material: 'deck', set: { pattern_scale: 2.5 } }), /pattern_scale/);
  assert.throws(() => G.applyOperation(G.emptyModel(header), { op: 'set_material', material: 'deck', set: { pattern_color: 'brown' } }), /pattern_color/);
});

console.log(`\n${n} test groups passed`);
