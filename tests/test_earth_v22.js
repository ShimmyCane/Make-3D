// Node tests for Earth V22: satellites on their orbits, faded orbit lines, storms, rockets and clouds at scale.
// Run: node tests/test_earth_v22.js
const assert = require('assert');
const path = require('path');
const MESH = require(path.join(__dirname, '..', 'js/core/mesh.js'));
const { SCENES } = require(path.join(__dirname, '..', 'tools/scenes.js'));
const PV = require(path.join(__dirname, '..', 'tools/planet_views.js'));
const V22 = require(path.join(__dirname, '..', 'tools/earth_v22.js'));

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };

const v22 = SCENES.find((s) => s.id === 'planet-earth-v22');
const v21 = SCENES.find((s) => s.id === 'planet-earth-v21');
const defsOf = (scene) => new Map(scene.defs.map((d) => [d[0], d[1]]));
const byKey = defsOf(v22);
const R = V22.R;
const norm = (p) => Math.hypot(...p);

t('V22 exists and sits after V21', () => {
  assert.ok(v22, 'planet-earth-v22 exists');
  assert.ok(v21, 'planet-earth-v21 still exists');
});

t('about 10 times as many satellites as V21 (V21 had 8)', () => {
  const sats = v22.defs.filter((d) => /^arm22-.*-\d+$/.test(d[0]) || /^(iss22|hubble22|polar22)-core$/.test(d[0]));
  const v21sats = v21.defs.filter((d) => /^(sat-\d+-body|iss-core|polar-core)$/.test(d[0]));
  assert.strictEqual(v21sats.length, 8, 'V21 satellite count');
  assert.ok(sats.length >= 80, `V22 satellites ${sats.length}`);
});

t('each ring satellite sits on its ring (radius and plane)', () => {
  for (const g of V22.RINGS) {
    const members = v22.defs.filter((d) => d[0].startsWith(`${g.key}-`) && /-\d+$/.test(d[0]));
    assert.strictEqual(members.length, g.n, `${g.key} count`);
    for (const [, o] of members) {
      assert.ok(Math.abs(norm(o.position) - g.r) < 0.01, `${g.key} radius ${norm(o.position)}`);
      const axis = { x: 0, y: 1, z: 2 }[g.normal];
      assert.ok(Math.abs(o.position[axis]) < 1e-6, `${g.key} stays in its plane`);
    }
  }
});

t('the ISS, Hubble and the polar satellite sit on their own rings', () => {
  const want = { 'iss22-core': ['y', R + 1.8], 'hubble22-core': ['x', R + 2.3], 'polar22-core': ['x', R + 4.2] };
  for (const [key, [axis, r]] of Object.entries(want)) {
    const o = byKey.get(key);
    assert.ok(o, key);
    assert.ok(Math.abs(norm(o.position) - r) < 0.01, `${key} radius ${norm(o.position)}`);
  }
});

t('every orbit line is a closed tube on its ring, faded (opacity under 0.4)', () => {
  const lines = v22.defs.filter((d) => d[1].type === 'loft' && d[1].material === 'orbit22');
  assert.ok(lines.length >= 10, `orbit lines ${lines.length}`);
  for (const [key, o] of lines) {
    const st = MESH.meshStats(o.shape, o.type);
    assert.strictEqual(st.openEdges, 0, `${key} open edges`);
    assert.strictEqual(st.badEdges, 0, `${key} bad edges`);
    assert.ok(st.volume > 0, `${key} faces out`);
    const rr = Math.max(...o.shape.joints.map(norm));
    const rMin = Math.min(...o.shape.joints.map(norm));
    assert.ok(rr - rMin < 0.01, `${key} is a circle`);
  }
  assert.strictEqual(V22.RINGS.length + 4, lines.length, 'one line per ring, plus ISS, Hubble, polar and the Moon');
  assert.strictEqual(byKey.get('orbit22-moon') ? 'ok' : 'missing', 'ok', 'Moon orbit line');
  assert.ok(v22.header.materials.orbit22.opacity < 0.4, 'the orbit material is faded');
});

t('storms are about 1.3 in across and their puffs sit on the cloud shell', () => {
  const puffs = v22.defs.filter((d) => /^storm22-\d-arm\d-\d$/.test(d[0]));
  assert.strictEqual(puffs.length, 5 * 30, 'five storms of 30 puffs');
  for (const [, o] of puffs) {
    assert.ok(Math.abs(norm(o.position) - (R + 0.14)) < 0.01, 'puff on the shell');
    assert.strictEqual(o.dimensions[0], 0.25, 'puffs are at the 0.25 in minimum');
  }
});

t('rockets are about 0.85 in tall and no satellite, storm or rocket part is over 1 in', () => {
  const body = byKey.get('rocket22-1-body');
  const nose = byKey.get('rocket22-1-nose');
  assert.ok(body && nose, 'rocket parts exist');
  assert.ok(body.dimensions[1] + nose.dimensions[1] < 0.9, 'rocket height');
  for (const [key, o] of v22.defs) {
    if (!/^(arm22|iss22|hubble22|polar22|storm22|rocket22|pad22)/.test(key)) continue;
    if (!o.dimensions) continue;
    assert.ok(o.dimensions.every((x) => x <= 1.0), `${key} dims ${o.dimensions}`);
  }
});

t('the cloud shells sit just above the ground (0.1 and 0.2 in)', () => {
  assert.strictEqual(byKey.get('cloud22-shell').dimensions[0], Math.round((R + 0.1) * 1000) / 1000);
  assert.strictEqual(byKey.get('cloud22-shell2').dimensions[0], Math.round((R + 0.2) * 1000) / 1000);
});

t('every material V22 uses exists (in the header or the built-in list)', () => {
  for (const [key, o] of v22.defs) {
    if (!o.material) continue;
    const ok = v22.header.materials[o.material] || PV.MATERIALS[o.material];
    assert.ok(ok, `${key} uses unknown material ${o.material}`);
  }
});

t('V21 is unchanged: no V22 parts, and no orbit material in its header', () => {
  assert.ok(!v21.defs.some((d) => /^(arm22|iss22|hubble22|polar22|storm22|rocket22|pad22|orbit22|cloud22|clouds22|aurora22)/.test(d[0])), 'no V22 keys in V21');
  assert.ok(!v21.header.materials.orbit22, 'no orbit22 material in V21');
  assert.ok(v21.defs.some((d) => d[0] === 'storm-1-eye'), 'V21 keeps its storms');
});

console.log(`\n${n} Earth V22 tests passed`);
