// Node tests for the Earth dot map (V21): the 5-degree land grid and the scene built from it.
// Run: node tests/test_earth_land.js
const assert = require('assert');
const path = require('path');
const LAND5 = require(path.join(__dirname, '..', 'tools/earth_land_5deg.js'));
const { SCENES } = require(path.join(__dirname, '..', 'tools/scenes.js'));

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };

const { ROWS } = LAND5;
const isLand = (lat, lon) => {
  const i = Math.round((87.5 - lat) / 5), j = (((Math.round((lon + 177.5) / 5)) % 72) + 72) % 72;
  return ROWS[Math.min(35, Math.max(0, i))][j] === '1';
};

t('the grid is 36 rows by 72 columns of 0 and 1', () => {
  assert.strictEqual(ROWS.length, 36);
  for (const r of ROWS) { assert.strictEqual(r.length, 72); assert.ok(/^[01]+$/.test(r)); }
});

t('about 27% of the grid is land outside Antarctica (Earth is about 29% with it)', () => {
  const cells = LAND5.landCells();
  const share = cells.filter((c) => !c.ice).length / (36 * 72);
  assert.ok(share > 0.25 && share < 0.30, `land share ${share.toFixed(3)}`);
});

t('known land and sea points fall on the right side of the grid', () => {
  const land = [[48.9, 2.3], [6.5, 3.4], [-18.9, 47.5], [51.5, -0.1], [19.4, -99.1], [-22.9, -43.2], [40.7, -74], [30, 31.2], [-25, 135], [-80, 0]];
  const sea = [[0, -150], [-30, -20], [-20, 80], [20, -40], [-40, -120]];
  for (const [la, lo] of land) assert.ok(isLand(la, lo), `land expected at ${la}, ${lo}`);
  for (const [la, lo] of sea) assert.ok(!isLand(la, lo), `sea expected at ${la}, ${lo}`);
});

t('desert and Antarctic cells are marked; deserts never fall on Antarctica', () => {
  const cells = LAND5.landCells();
  assert.ok(cells.some((c) => c.desert), 'some desert cells');
  assert.ok(cells.filter((c) => c.ice).every((c) => c.lat <= -80), 'ice only in the south');
  assert.ok(cells.filter((c) => c.desert).every((c) => !c.ice));
});

t('V21 puts one dot on each land cell, and no ellipse land on the ball', () => {
  const v21 = SCENES.find((s) => s.id === 'planet-earth-v21');
  assert.ok(v21, 'planet-earth-v21 exists');
  const dots = v21.defs.filter((d) => /^land21-/.test(d[0]));
  assert.strictEqual(dots.length, LAND5.landCells().length);
  const ball = v21.defs.find((d) => d[0] === 'ball-earth');
  assert.strictEqual(ball[1].material, 'earth_ocean21');
  const mat = v21.header.materials.earth_ocean21;
  assert.ok(mat.no_land && mat.land.length === 0 && mat.desert.length === 0, 'the sea has no ellipses and no noise land');
});

t('V20 is unchanged: still the ellipse surface and no dot map', () => {
  const v20 = SCENES.find((s) => s.id === 'planet-earth-v20');
  assert.ok(!v20.defs.some((d) => /^land21-/.test(d[0])));
  assert.strictEqual(v20.defs.find((d) => d[0] === 'ball-earth')[1].material, 'earth_surface');
  assert.ok(!v20.header.materials.earth_ocean21, 'the V21 sea is not in the shared list');
});

console.log(`\n${n} Earth land tests passed`);
