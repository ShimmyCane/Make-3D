// Node tests for the Coastal Habitat Aquarium scenes. Run: node tests/test_habitat_aquarium.js
const assert = require('assert');
const path = require('path');
const root = path.join(__dirname, '..');
const G = require(path.join(root, 'js/core/geometry.js'));
const MO = require(path.join(root, 'js/core/motion.js'));
const H = require(path.join(root, 'tools/habitat_aquarium.js'));
const { SCENES } = require(path.join(root, 'tools/scenes.js'));
const { apply } = MO.mat4;
const { HABITAT: ALL, COUNTS, depthFt, tunnelDist, depthFtZ, terrainZ, eOf, SHELF, TERR, PTUN } = H;
const HABITAT = ALL.filter((s) => !/cutaway/.test(s.id));
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };

function modelOf(scene) {
  const ops = scene.defs.map(([key, d], i) => ({ seq: i + 1, op: 'add', time: '2026-11-02T00:00:00Z', author: 'test', note: '',
    object: { uuid: `${scene.id}-${key}`, name: d.name, description: d.description || '', type: d.type, dimensions: d.dimensions,
      position: d.position, rotation_y: d.rotation_y || 0, parent: d.parent ? `${scene.id}-${d.parent}` : null, material: d.material || null } }));
  return G.replay({ schema: 'make3d.history/0.1', model_id: scene.id, header: scene.header, operations: ops });
}

t('seven increments with object counts near the plan, and a cutaway of the last', () => {
  assert.strictEqual(HABITAT.length, 7);
  HABITAT.forEach((s, i) => assert.ok(s.defs.length >= COUNTS[i] * 0.85 && s.defs.length <= COUNTS[i] * 1.25, `H0${i + 1} has ${s.defs.length}, planned about ${COUNTS[i]}`));
  assert.strictEqual(ALL.filter((s) => /cutaway/.test(s.id)).length, 1);
});

t('keys are unique and each increment contains the one before (nothing deleted)', () => {
  let prev = null;
  for (const s of HABITAT) {
    const keys = s.defs.map((d) => d[0]);
    assert.strictEqual(new Set(keys).size, keys.length, `${s.id} duplicate keys`);
    // from H05 the flat sand, the mounds and the tide terraces are replaced by the real terrain, so they may go
    if (prev) for (const k of prev) assert.ok(keys.includes(k) || (/habitat-aquarium-v0[5-7]$/.test(s.id) && /^(sand-\d+|sand-edge-\d+|mound-\d+|tide)/.test(k)), `${s.id} lost ${k}`);
    prev = keys;
  }
});

t('the tank is a curved, lobed outline, not a rectangle (the glass panels face many directions)', () => {
  const angles = new Set(HABITAT[0].defs.filter(([k]) => /^glass-/.test(k)).map(([, d]) => Math.round((d.rotation_z || 0) / 10)));
  assert.ok(angles.size >= 12, `only ${angles.size} directions`);
});

t('animals and plants have names and descriptions to read when tapped (H07)', () => {
  for (const [k, d] of HABITAT[6].defs) {
    assert.ok(d.name && d.name.length > 2, `${k} has no name`);
    if (/(sandtiger|zebra|leopard|bonnet|blacktip|seabass|yellowtail|barracuda|sheephead|garibaldi|batray|eagleray|turtle|moray)-\d+-body$/.test(k)) assert.ok(d.description.length > 20, `${k} has no description`);
  }
});

t('H01 and H02 are still; H03 to H07 pass the motion check, start at rest, and close the loop', () => {
  assert.ok(!HABITAT[0].motion && !HABITAT[1].motion);
  HABITAT.slice(2).forEach((s) => {
    const model = modelOf(s), mo = s.motion((k) => `${s.id}-${k}`);
    assert.strictEqual(MO.checkMotion(model, mo).outcome, 'accept', s.id);
    const p0 = MO.poseAt(model, mo, 0), pL = MO.poseAt(model, mo, mo.loop_s);
    for (const id of Object.keys(p0)) p0[id].forEach((x, i) => {
      assert.ok(Math.abs(x - MO.mat4.identity()[i]) < 1e-2, `${s.id} ${id} first frame is not the rest pose`);
      assert.ok(Math.abs(x - pL[id][i]) < 1e-2, `${s.id} ${id} loop does not close`);
    });
  });
});

t('swimmers stay in the water, clear of the rock wall, the floor, the terrain and the tunnels at every time (H04 to H07)', () => {
  const swimmer = /-(sandtiger|zebra|leopard|bonnet|blacktip|seabass|yellowtail|barracuda|sheephead|garibaldi|batray|eagleray|turtle|anchovy|sardine|blacksmith|opaleye|bluetang|yellowtang|sergeant|idol)-?\w*-?\d*(-|$)/;
  const bad = [];
  HABITAT.slice(3).forEach((s, si) => {
    const v5 = si >= 1, model = modelOf(s), mo = s.motion((k) => `${s.id}-${k}`), byId = new Map(model.objects.map((o) => [o.uuid, o]));
    for (let k = 0; k < 90; k++) {
      const pose = MO.poseAt(model, mo, (k / 90) * mo.loop_s);
      for (const o of model.objects) {
        if (o.type === 'group' || !swimmer.test(o.uuid)) continue;
        let q = o.position;
        for (let u = o.uuid, g = 0; u && g < 64; u = (byId.get(u) || {}).parent, g++) if (pose[u]) q = apply(pose[u], q);
        const [x, y, z] = q.map((n) => n / 12);
        const front = depthFt(x, y) < 6.5 && Math.atan2(y, x) < -0.8 && Math.atan2(y, x) > -2.35;
        const d = v5 ? depthFtZ(x, y, z) : depthFt(x, y);
        if (d < (front ? 1.2 : 2.6) || z > 27.7) bad.push(`${s.id} ${o.uuid} t=${k} wall depth ${d.toFixed(1)} z ${z.toFixed(1)}`);
        if (z < (v5 ? terrainZ(x, y) + 0.9 : 1.1)) bad.push(`${s.id} ${o.uuid} t=${k} under the floor (z ${z.toFixed(1)}, floor ${terrainZ(x, y).toFixed(1)})`);
        if (z < 12.6 && tunnelDist(x, y) < 5.4) bad.push(`${s.id} ${o.uuid} t=${k} in the S tunnel`);
        if (v5 && x > PTUN.x0 && x < PTUN.x1 && Math.abs(y - PTUN.y) < PTUN.r - 0.2 && z > 16 && z < PTUN.zc + PTUN.r - 0.2) bad.push(`${s.id} ${o.uuid} t=${k} in the plateau tunnel`);
      }
    }
  });
  assert.strictEqual(bad.length, 0, bad.slice(0, 8).join('\n'));
});

t('H05: the tank is not a vertical extrusion: the rim swings in and out as the wall leans, and the front window tilts', () => {
  const ring = (s) => s.defs.filter(([k]) => /^rim-\d+$/.test(k)).map(([, d]) => Math.hypot(d.position[0] / 12 / 52, d.position[1] / 12 / 32));
  const a = ring(HABITAT[3]), b = ring(HABITAT[4]);
  const spread = (r) => Math.max(...r) - Math.min(...r);
  assert.ok(spread(b) > spread(a) + 0.05, 'the rim does not follow the leaning wall');
  assert.ok(HABITAT[4].defs.some(([k, d]) => /^glass-/.test(k) && d.rotation_x), 'no tilted front glass');
  assert.ok(!HABITAT[3].defs.some(([k, d]) => /^glass-/.test(k) && d.rotation_x), 'H04 must stay vertical');
});

t('H05: three floor levels: a deep basin at 0, a terrace at 8 ft, and a shelf at 16 ft with a cavern underneath', () => {
  const s = HABITAT[4], top = (d) => (d.position[2] + d.dimensions[1] / 2) / 12;
  const terr = s.defs.filter(([k]) => /^terrace-\d+$/.test(k)).map(([, d]) => top(d));
  assert.ok(terr.length > 15 && Math.max(...terr) > 7.9 && Math.max(...terr) < 8.2, `terrace tops ${Math.max(...terr)}`);
  const slabs = s.defs.filter(([k]) => /^slab-\d+$/.test(k));
  assert.ok(slabs.length > 10);
  slabs.forEach(([, d]) => { const t = top(d), b = (d.position[2] - d.dimensions[1] / 2) / 12; assert.ok(Math.abs(t - 16) < 0.05 && b > 13.9, `slab ${b}..${t}`); });
  const glass = s.defs.filter(([k]) => /^cavern-glass-\d+$/.test(k));
  assert.ok(glass.length >= 8, `${glass.length} cavern windows`);
  glass.forEach(([, d]) => assert.ok((d.position[2] + d.dimensions[2] / 2) / 12 <= 16, 'window above the slab'));
  const floors = s.defs.filter(([k]) => /^cavern-floor-\d+$/.test(k));
  assert.ok(floors.length >= 4 && floors.every(([, d]) => d.position[2] / 12 < 1));
  assert.ok(s.defs.some(([k]) => /^cavern-guest-/.test(k)));
});

t('H06: bridges are above the water and tunnels go through: skybridge arch, Kelp Walk, plateau tunnel, stair tube', () => {
  const s = HABITAT[5];
  const bridge = s.defs.filter(([k, d]) => /^bridge-[ab]-\d+$/.test(k));
  assert.ok(bridge.length >= 26);
  bridge.forEach(([k, d]) => assert.ok(d.position[2] / 12 > 28.4, `${k} is under the surface`));
  const arch = s.defs.filter(([k]) => /^bridge-a-\d+$/.test(k)).map(([, d]) => d.position[2] / 12);
  assert.ok(Math.max(...arch) - Math.min(...arch) > 3.5, 'the skybridge does not arch');
  const tube = s.defs.find(([k]) => k === 'ptunnel-tube')[1];
  assert.ok(tube.position[2] / 12 - 3.2 > 16, 'plateau tunnel is below the slab');
  const st = s.defs.find(([k]) => k === 'stair-tube')[1];
  assert.ok(st.position[2] / 12 - st.dimensions[1] / 24 < 1 && st.position[2] / 12 + st.dimensions[1] / 24 > 16.5, 'the stair tube does not run from the cavern up through the shelf');
  assert.ok(!HABITAT[4].defs.some(([k]) => /^bridge-/.test(k)));
});

t('H07: the plateau gets residents, the terrace gets plants, the bridges get guests', () => {
  const keys = new Set(HABITAT[6].defs.map(([k]) => k)), prev = new Set(HABITAT[5].defs.map(([k]) => k));
  for (const k of ['batray-4', 'plateau-sardines', 'kelp-t1', 'tcoral-1', 'walk-guest-1']) assert.ok(keys.has(k) && !prev.has(k), k);
});

t('the tunnel curves: it is not on one straight line', () => {
  const ys = HABITAT[0].defs.filter(([k]) => /^tunnel-\d+$/.test(k)).map(([, d]) => d.position[1] / 12);
  assert.ok(Math.max(...ys) - Math.min(...ys) > 15);
});

t('scenes.js lists all seven habitat increments and the cutaway', () => {
  const ids = SCENES.map((s) => s.id);
  for (let i = 1; i <= 7; i++) assert.ok(ids.includes(`habitat-aquarium-v0${i}`));
  assert.ok(ids.includes('habitat-aquarium-v07-cutaway'));
});
console.log(`${n} tests passed`);
