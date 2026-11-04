// Node tests for the Grand Ocean Aquarium scenes. Run: node tests/test_aquarium.js
const assert = require('assert');
const path = require('path');
const root = path.join(__dirname, '..');
const G = require(path.join(root, 'js/core/geometry.js'));
const MO = require(path.join(root, 'js/core/motion.js'));
const { AQUARIUM, COUNTS } = require(path.join(root, 'tools/aquarium.js'));
const { SCENES } = require(path.join(root, 'tools/scenes.js'));
const { apply } = MO.mat4;
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };

// Replay a scene the way build_samples does (without the rules, which the build already checks).
function modelOf(scene) {
  const ops = scene.defs.map(([key, d], i) => ({ seq: i + 1, op: 'add', time: '2026-11-02T00:00:00Z', author: 'test', note: '',
    object: { uuid: `${scene.id}-${key}`, name: d.name, description: d.description || '', type: d.type, dimensions: d.dimensions,
      position: d.position, rotation_y: d.rotation_y || 0, parent: d.parent ? `${scene.id}-${d.parent}` : null, material: d.material || null } }));
  return G.replay({ schema: 'make3d.history/0.1', model_id: scene.id, header: scene.header, operations: ops });
}

t('six increments, with rough object counts near 100, 150, 200, 500, 1000, 1200', () => {
  assert.strictEqual(AQUARIUM.length, 6);
  AQUARIUM.forEach((s, i) => {
    const n = s.defs.length, want = COUNTS[i];
    assert.ok(n >= want * 0.9 && n <= want * 1.35, `V${i + 1} has ${n}, wanted about ${want}`);
  });
});

t('every key is unique, and each version contains the one before it (nothing deleted)', () => {
  let prev = null;
  for (const s of AQUARIUM) {
    const keys = s.defs.map((d) => d[0]);
    assert.strictEqual(new Set(keys).size, keys.length, `${s.id} has duplicate keys`);
    if (prev) for (const k of prev) assert.ok(keys.includes(k), `${s.id} lost ${k}`);
    prev = keys;
  }
});

t('animals have names and descriptions to read when tapped', () => {
  for (const s of AQUARIUM) {
    for (const [k, d] of s.defs) {
      assert.ok(d.name && d.name.length > 2, `${s.id} ${k} has no name`);
      if (/-body$/.test(k) && !/guest|walker|diver/.test(k)) assert.ok(d.description && d.description.length > 20, `${s.id} ${k} has no description`);
    }
  }
});

t('motion: V01 is still; V02 to V05 pass the check, the first frame is the rest pose, and the loop closes', () => {
  assert.ok(!AQUARIUM[0].motion);
  AQUARIUM.slice(1).forEach((s) => {
    const model = modelOf(s), uuid = (k) => `${s.id}-${k}`, mo = s.motion(uuid);
    assert.strictEqual(MO.checkMotion(model, mo).outcome, 'accept', s.id);
    const p0 = MO.poseAt(model, mo, 0), pL = MO.poseAt(model, mo, mo.loop_s);
    for (const id of Object.keys(p0)) {
      p0[id].forEach((x, i) => assert.ok(Math.abs(x - MO.mat4.identity()[i]) < 1e-2, `${s.id} ${id} first frame is not the rest pose`));
      p0[id].forEach((x, i) => assert.ok(Math.abs(x - pL[id][i]) < 1e-2, `${s.id} ${id} loop does not close`));
    }
    mo.motions.forEach((m) => assert.ok(Number.isInteger(m.cycles) && m.cycles >= 1, `${m.id} cycles`));
  });
});

t('swimmers stay inside the water, off the floor, and out of the tunnel at every time (V06)', () => {
  const s = AQUARIUM[5], model = modelOf(s), uuid = (k) => `${s.id}-${k}`, mo = s.motion(uuid);
  const byId = new Map(model.objects.map((o) => [o.uuid, o]));
  const bad = [];
  for (let k = 0; k < 90; k++) {
    const pose = MO.poseAt(model, mo, (k / 90) * mo.loop_s);
    for (const o of model.objects) {
      if (o.type === 'group' || !pose[o.uuid] && !pose[o.parent]) continue;
      if (/walker|ribs|rib-|-bell|^.*-vent|bubble-\d|minray|sunlight|-sun$|sunbeam/.test(o.uuid)) continue;
      let q = o.position;
      for (let u = o.uuid, g = 0; u && g < 64; u = (byId.get(u) || {}).parent, g++) if (pose[u]) q = apply(pose[u], q);
      const [x, y, z] = q.map((v) => v / 12);
      const inTank = Math.abs(x) <= 49.5 && Math.abs(y) <= 29.5 && z >= 1 && z <= 27.6;
      const inTunnel = Math.abs(y) < 5.6 && z < 11.8;
      const domes = [22, 28, 34].some((dx) => Math.hypot(x - dx, y - 28.3, z - 3.4) < 2.7);
      if (domes && !/kelp|grass|moray|jelly/.test(o.uuid)) bad.push(`${o.uuid} inside a bubble dome at t=${k}`);
      if ((!inTank || inTunnel) && !/kelp|grass|moray|jelly/.test(o.uuid)) bad.push(`${o.uuid} at t=${k} (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`);
    }
  }
  assert.strictEqual(bad.length, 0, bad.slice(0, 8).join('\n'));
});

t('touch pool rays stay inside the touch pool basin', () => {
  const s = AQUARIUM[5], model = modelOf(s), mo = s.motion((k) => `${s.id}-${k}`), byId = new Map(model.objects.map((o) => [o.uuid, o]));
  for (let k = 0; k < 60; k++) {
    const pose = MO.poseAt(model, mo, (k / 60) * mo.loop_s);
    for (const o of model.objects) {
      if (!/minray-\d-body$/.test(o.uuid)) continue;
      let q = o.position;
      for (let u = o.uuid, g = 0; u && g < 64; u = (byId.get(u) || {}).parent, g++) if (pose[u]) q = apply(pose[u], q);
      const [x, y] = q.map((v) => v / 12);
      assert.ok(x > 18.4 && x < 25.6 && y > 39 && y < 43, `${o.uuid} at (${x.toFixed(1)}, ${y.toFixed(1)})`);
    }
  }
});

t('scenes.js lists all six aquarium increments', () => {
  const ids = SCENES.map((s) => s.id);
  for (let i = 1; i <= 6; i++) assert.ok(ids.includes(`aquarium-v0${i}`));
});

console.log(`${n} tests passed`);
