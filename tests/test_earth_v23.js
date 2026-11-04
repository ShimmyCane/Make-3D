// Node tests for Earth V23: launch sites with out-and-back launches, large satellites only, and mountain ranges.
// Run: node tests/test_earth_v23.js
const assert = require('assert');
const path = require('path');
const { SCENES } = require(path.join(__dirname, '..', 'tools/scenes.js'));
const V23 = require(path.join(__dirname, '..', 'tools/earth_v23.js'));
const R = 9.5;

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };

const v23 = SCENES.find((s) => s.id === 'planet-earth-v23');
const v22 = SCENES.find((s) => s.id === 'planet-earth-v22');
const byKey = new Map(v23.defs.map((d) => [d[0], d[1]]));
const norm = (p) => Math.hypot(...p);
const unit = (p) => p.map((x) => x / norm(p));

t('V23 exists and V22 is still there', () => {
  assert.ok(v23, 'planet-earth-v23 exists');
  assert.ok(v22, 'planet-earth-v22 still exists');
});

t('only the large satellites are left (no constellation, navigation, comsat or polar rings)', () => {
  assert.ok(!v23.defs.some((d) => /^arm22-(leo|gps|geo|polar)|^orbit22-(leo|gps|geo|polar)|^polar22/.test(d[0])), 'no small-satellite keys');
  for (const key of ['iss22-core', 'hubble22-core', 'tiangong23-core', 'goes23-core']) assert.ok(byKey.has(key), `${key} is there`);
});

t('six real launch sites, each with a pad, a rocket group and a launch path', () => {
  assert.strictEqual(V23.SITES.length, 6);
  for (let i = 1; i <= 6; i++) {
    assert.ok(byKey.has(`pad23-${i}`), `pad ${i}`);
    assert.ok(byKey.has(`rocket23-${i}-body`), `rocket ${i}`);
  }
});

t('each launch climbs the local vertical from the pad and comes back (or splashes), closing on itself', () => {
  const motions = v23.motion(() => 'x').motions.filter((m) => /^launch23-/.test(m.id));
  assert.strictEqual(motions.length, 6);
  for (const m of motions) {
    const [p0, up, top] = m.points;
    const splash = m.points.length === 6;
    if (!splash) assert.deepStrictEqual(m.points[3], up, `${m.id}: out and back on the same line`);
    else assert.deepStrictEqual(m.points[5], [0, 0, 0], `${m.id}: a splash ends inside the planet`);
    const dir = unit(p0);
    const climb = unit(p0.map((x, k) => up[k] - p0[k]));
    assert.ok(Math.abs(dot(dir, climb) - 1) < 1e-3, `${m.id}: climbs along the ground normal`);
    assert.ok(Math.abs(norm(top) - norm(p0) - 1.3) < 0.02, `${m.id}: climbs about 1.3 in`);
    assert.ok(Math.abs(norm(p0) - (R + 0.3)) < 0.01, `${m.id}: starts on the pad`);
  }
});

t('four rockets come back to their pads and two fall into the sea', () => {
  const motions = v23.motion(() => 'x').motions.filter((m) => /^launch23-/.test(m.id));
  assert.strictEqual(motions.filter((m) => m.points.length === 4).length, 4, 'pad returns');
  assert.strictEqual(motions.filter((m) => m.points.length === 6).length, 2, 'splashes');
  const sea = V23.SITES.filter((x) => x.splash);
  assert.strictEqual(sea.length, 2);
  const LAND5 = require(path.join(__dirname, '..', 'tools/earth_land_5deg.js'));
  for (const x of sea) {
    const i = Math.round((87.5 - x.splash.lat) / 5), j = (((Math.round((x.splash.lon + 177.5) / 5)) % 72) + 72) % 72;
    assert.strictEqual(LAND5.ROWS[i][j], '0', `${x.name} splash is at sea`);
  }
});

t('each launch releases a new satellite, which drops into the planet and is hoisted back to the nose', () => {
  const sats = v23.motion(() => 'x').motions.filter((m) => /^sat23-\d+-deploy$/.test(m.id));
  assert.strictEqual(sats.length, 6);
  for (const m of sats) {
    assert.strictEqual(m.points.length, 4);
    assert.deepStrictEqual(m.points[3], [0, 0, 0], `${m.id}: goes into the planet`);
    assert.ok(Math.abs(Math.hypot(...m.pivot) - (R + 1.0)) < 0.01, `${m.id}: starts on the nose`);
  }
});

t('each launch profile holds on the pad, climbs, and ends on the pad', () => {
  const motions = v23.motion(() => 'x').motions.filter((m) => /^launch23-/.test(m.id));
  for (const m of motions) {
    const pr = m.profile;
    assert.deepStrictEqual(pr[0], [0, 0]);
    assert.deepStrictEqual(pr[pr.length - 1], [1, 1]);
    for (let k = 1; k < pr.length; k++) {
      assert.ok(pr[k][0] >= pr[k - 1][0] && pr[k][1] >= pr[k - 1][1], `${m.id}: profile non-decreasing`);
    }
  }
});

t('the mountains are small peaks, not pyramids (base 0.25 in, 0.35 to 0.6 in tall)', () => {
  const peaks = v23.defs.filter((d) => /^(andes|rockies|alps|himalaya)-\d+$/.test(d[0]));
  assert.strictEqual(peaks.length, 9 + 6 + 4 + 6);
  for (const [key, o] of peaks) {
    assert.strictEqual(o.dimensions[0], 0.25, `${key} base`);
    assert.ok(o.dimensions[1] >= 0.35 && o.dimensions[1] <= 0.6, `${key} height ${o.dimensions[1]}`);
  }
  assert.ok(!v23.defs.some((d) => /^mtn-/.test(d[0])), 'the V12 cones are gone');
});

t('V22 is unchanged: its launches and constellation are still there', () => {
  assert.ok(v22.defs.some((d) => d[0] === 'rocket22-1-body'), 'V22 rockets');
  assert.ok(v22.defs.some((d) => /^arm22-leo-a-0$/.test(d[0])), 'V22 constellation');
  assert.ok(v22.defs.some((d) => d[0] === 'mtn-0-0'), 'V22 mountain cones');
});

console.log(`\n${n} Earth V23 tests passed`);
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
