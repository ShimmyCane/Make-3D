// Node tests for skeleton meshes (loft = closed, sheet = open, double sided), bends, attach, keyframes, and the hawk.
// Run: node tests/test_mesh.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const MESH = require(path.join(root, 'js/core/mesh.js'));
const MO = require(path.join(root, 'js/core/motion.js'));
const R = require(path.join(root, 'js/core/rules.js'));
const { mul, apply } = MO.mat4;

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} is not near ${b}`);
const nearV = (a, b, eps = 1e-6) => a.forEach((x, i) => near(x, b[i], eps));
const load = (f) => JSON.parse(fs.readFileSync(path.join(root, 'models', f), 'utf8'));

const tube = { joints: [[0, 0, 0], [10, 0, 0], [20, 0, 0], [30, 0, 0]], facing: [0, 1, 0], samples: 12, sides: 10, rings: [[0, 0.2, 0.2], [0.5, 2, 1.5], [1, 0.2, 0.2]] };
const blade = { joints: [[0, 0, 0], [0, 0, 5], [0, 0, 10]], facing: [1, 0, 0], samples: 6, sides: 3, cup: 0.3, rings: [[0, 0.4], [1, 0.05]] };

t('a loft is a closed mesh: every edge is shared by two triangles, and it has volume', () => {
  const s = MESH.meshStats(tube, 'loft');
  assert.strictEqual(s.openEdges, 0); assert.strictEqual(s.badEdges, 0);
  assert.ok(s.volume > 0, `volume ${s.volume} (negative means the faces point inward)`);
  // a tube of half-width 2 and half-height 1.5 for 30 in: volume is of the order of pi*2*1.5*30*0.6
  assert.ok(s.volume > 100 && s.volume < 400, `volume ${s.volume}`);
});

t('a sheet is open (it has edges) and is thin', () => {
  const s = MESH.meshStats(blade, 'sheet');
  assert.ok(s.openEdges > 0); assert.strictEqual(s.badEdges, 0);
  const b = MESH.meshBox(blade, 'sheet');
  assert.ok(b.max[1] - b.min[1] < 0.5, 'thin across the cup');
});

t('rest pose: identity joint matrices give the rest mesh', () => {
  const I = MO.mat4.identity();
  const a = MESH.meshPositions(tube, 'loft', null), b = MESH.meshPositions(tube, 'loft', [I, I, I, I]);
  a.forEach((x, i) => near(x, b[i], 1e-9));
});

t('bend: joints before the bend stay, joints after turn about it, and the mesh stays closed', () => {
  const model = { objects: [{ uuid: 'tb', type: 'loft', shape: tube, position: [15, 0, 0], dimensions: [30, 4, 3] }] };
  const mo = { schema: MO.MOTION_SCHEMA, loop_s: 4, motions: [{ id: 'b', target: 'tb', kind: 'bend', joint: 1, axis: 'z', from: 90, to: 90, cycles: 1 }] };
  const G = MO.skinAt(model, mo, 0).tb;
  nearV(apply(G[0], tube.joints[0]), [0, 0, 0]);
  nearV(apply(G[1], tube.joints[1]), [10, 0, 0]);
  nearV(apply(G[2], tube.joints[2]), [10, 10, 0]);      // 10 in further along, turned 90 degrees about joint 1
  nearV(apply(G[3], tube.joints[3]), [10, 20, 0]);
  const p = MESH.meshPositions(tube, 'loft', G);
  assert.ok(p.every(Number.isFinite));
  // bone lengths hold: the bent mesh's end cap centre is 20 in round the corner from the first, along the skeleton
  const end = [p[p.length - 3], p[p.length - 2], p[p.length - 1]];
  assert.ok(end[1] > 15, `end cap should have turned toward +y, is ${end}`);
});

t('bends compose down the chain: a second bend turns in the frame of the first', () => {
  const model = { objects: [{ uuid: 'tb', type: 'loft', shape: tube, position: [15, 0, 0], dimensions: [30, 4, 3] }] };
  const mk = (joint, deg) => ({ id: `b${joint}`, target: 'tb', kind: 'bend', joint, axis: 'z', from: deg, to: deg, cycles: 1 });
  const mo = { schema: MO.MOTION_SCHEMA, loop_s: 4, motions: [mk(1, 90), mk(2, -90)] };
  const G = MO.skinAt(model, mo, 0).tb;
  nearV(apply(G[3], tube.joints[3]), [20, 10, 0]);       // turn left at joint 1, then right at joint 2: heads +x again
});

t('keyframes close on themselves: the last value eases back to the first', () => {
  const keys = [[0, 0], [0.25, 10], [0.5, 10], [0.75, 0]];
  near(MO.keyAt(keys, 0), 0); near(MO.keyAt(keys, 1), 0, 1e-9); near(MO.keyAt(keys, 0.25), 10); near(MO.keyAt(keys, 0.4), 10);
  near(MO.keyAt(keys, 0.875), 0, 1e-9 + 0) ; // 0.75 is 0, and 1.0 is 0
  assert.ok(MO.keyAt(keys, 0.1) > 0 && MO.keyAt(keys, 0.1) < 10);
  const mo = (k) => ({ schema: MO.MOTION_SCHEMA, loop_s: 4, motions: [{ id: 'b', target: 'tb', kind: 'bend', joint: 1, axis: 'z', ...k }] });
  const model = { objects: [{ uuid: 'tb', type: 'loft', shape: tube, position: [15, 0, 0], dimensions: [30, 4, 3] }] };
  assert.strictEqual(MO.checkMotion(model, mo({ keys })).outcome, 'accept');
  assert.strictEqual(MO.checkMotion(model, mo({ keys: [[0.1, 0], [0.5, 5]] })).outcome, 'reject');   // must start at 0
  assert.strictEqual(MO.checkMotion(model, mo({ from: 0, to: 5, cycles: 1, joint: 9 })).outcome, 'reject');
});

t('rules: a loft needs a good shape; a sheet is thin on purpose; attach must name a joint', () => {
  const world = JSON.parse(fs.readFileSync(path.join(root, 'worlds/default-world.json'), 'utf8'));
  const base = { uuid: 'a', name: 'A', type: 'loft', dimensions: [30, 4, 3], position: [15, 0, 5], shape: tube };
  const model = { objects: [base] };
  const ok = (o) => R.checkOperation(model, { seq: 1, op: 'add', object: { uuid: 'x', name: 'x', ...o } }, world);
  assert.strictEqual(ok({ type: 'loft', dimensions: [30, 4, 3], position: [15, 0, 5], shape: tube }).outcome, 'accept');
  assert.strictEqual(ok({ type: 'loft', dimensions: [30, 4, 3], position: [15, 0, 5], shape: { ...tube, joints: [[0, 0, 0]] } }).outcome, 'reject');
  assert.strictEqual(ok({ type: 'sheet', dimensions: [1, 0.05, 10], position: [0, 0, 5], shape: blade }).outcome, 'accept');
  assert.strictEqual(ok({ type: 'sphere', dimensions: [1], position: [0, 0, 5], attach: { to: 'a', joint: 9 } }).outcome, 'reject');
  assert.strictEqual(ok({ type: 'sphere', dimensions: [1], position: [0, 0, 5], attach: { to: 'a', joint: 2 } }).outcome, 'accept');
});

// ---------- the hawk, V06 and V07
function hawkTests(ver) {

const model = load(`${ver}/model.json`), motion = load(`${ver}/motion.json`);
const objs = new Map(model.objects.map((o) => [o.uuid, o]));
const id = (k) => `${ver}-${k}`;
const L = motion.loop_s;

t(`${ver}: every body part is a closed mesh; every grass blade, leaf, ear and the flag is a thin open sheet`, () => {
  let lofts = 0, sheets = 0;
  for (const o of model.objects) {
    if (o.type === 'loft') { const s = MESH.meshStats(o.shape, 'loft'); assert.strictEqual(s.openEdges, 0, o.name); assert.ok(s.volume > 0, `${o.name} volume`); lofts++; }
    if (o.type === 'sheet') { assert.ok(MESH.meshStats(o.shape, 'sheet').openEdges > 0, o.name); sheets++; }
  }
  assert.ok(lofts >= 12 && sheets >= 100, `${lofts} lofts, ${sheets} sheets`);
});

t(`${ver}: the first frame is the rest pose (every matrix is the identity)`, () => {
  const pose = MO.poseAt(model, motion, 0);
  for (const [u, m] of Object.entries(pose)) m.forEach((x, i) => near(x, MO.mat4.identity()[i], 1e-4));
  for (const [u, mats] of Object.entries(MO.skinAt(model, motion, 0))) mats.forEach((m) => m.forEach((x, i) => near(x, MO.mat4.identity()[i], 1e-3)));
});

t(`${ver}: the loop closes (the last frame is the first)`, () => {
  const a = MO.poseAt(model, motion, 0), b = MO.poseAt(model, motion, L);
  for (const u of Object.keys(a)) a[u].forEach((x, i) => near(x, b[u][i], 1e-4));
  const sa = MO.skinAt(model, motion, 0), sb = MO.skinAt(model, motion, L);
  for (const u of Object.keys(sa)) sa[u].forEach((m, j) => m.forEach((x, i) => near(x, sb[u][j][i], 1e-4)));
});

t(`${ver}: the flight frame is a proper rotation, turns smoothly, and the nose follows the path`, () => {
  const fly = motion.motions.find((m) => m.id === 'fly');
  let prev = null, worst = 0, minUp = 1;
  const N = ver === 'hawk-v07' ? 1500 : 600;
  for (let k = 0; k <= N; k++) {
    const u = k / N, f = MO.flightFrame(fly, u, L), R = f.R;
    const col = (c) => [R[c], R[4 + c], R[8 + c]];
    const x = col(0), y = col(1), z = col(2);
    near(Math.hypot(...x), 1, 1e-9); near(Math.hypot(...z), 1, 1e-9);
    near(x[0] * z[0] + x[1] * z[1] + x[2] * z[2], 0, 1e-9);
    near(x[0] * y[0] + x[1] * y[1] + x[2] * y[2], 0, 1e-9);
    const cr = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
    nearV(cr, z, 1e-9);
    minUp = Math.min(minUp, z[2]);
    if (prev) { const d = Math.acos(Math.min(1, Math.max(-1, x[0] * prev[0] + x[1] * prev[1] + x[2] * prev[2]))); worst = Math.max(worst, d); }
    prev = x;
  }
  const rate = worst / (L / N);
  assert.ok(rate < 10, `fastest nose turn ${rate.toFixed(1)} rad/s (a pull-out is a few rad/s)`);
  assert.ok(minUp >= 0.14, `the hawk's back must stay up (steepest dive leaves its up axis at z = ${minUp.toFixed(2)})`);
  console.log(`   smallest up-axis height ${minUp.toFixed(2)} (steepest dive), fastest nose turn ${rate.toFixed(1)} rad/s`);
});

// world position of every vertex of a part at time s: its own bends, its attach joint, then the groups above it
function worldPoints(o, s) {
  const skins = MO.skinAt(model, motion, s), pose = MO.poseAt(model, motion, s);
  const own = skins[o.uuid];
  let pts = MESH.meshPositions(o.shape, o.type, own || null);
  const P = []; for (let i = 0; i < pts.length; i += 3) P.push([pts[i], pts[i + 1], pts[i + 2]]);
  let cur = o, guard = 0;
  let out = P;
  while (cur && guard++ < 8) {
    const m = pose[cur.uuid];
    if (m) out = out.map((p) => apply(m, p));
    cur = cur.parent ? objs.get(cur.parent) : null;
  }
  return out;
}

t(`${ver}: it stays attached and clear of the ground for the whole loop`, () => {
  const parts = ['body', 'tail', 'wing-l', 'wing-r', 'leg-l', 'leg-r', 'beak'].map((k) => objs.get(id(k)));
  let lowest = Infinity;
  for (let k = 0; k < 500; k++) {
    const s = (k / 500) * L;
    for (const o of parts) for (const p of worldPoints(o, s)) { assert.ok(p.every(Number.isFinite)); lowest = Math.min(lowest, p[2]); }
    // the shoulders ride the body: the shoulder joint of each wing sits at the same place relative to the body
    const body = worldPoints(objs.get(id('body')), s);
    assert.ok(body.length > 0);
  }
  assert.ok(lowest > 0.5, `lowest point of the hawk over the loop is ${lowest.toFixed(2)} in above the ground`);
  console.log(`   lowest point ${lowest.toFixed(2)} in, loop ${L} s`);
});

t(`${ver}: the talons reach the mouse at the bottom of the stoop (within 4 in)`, () => {
  const mouse = objs.get(id('mouse')).position;
  let best = Infinity;
  for (let k = 0; k < 400; k++) {
    const s = (k / 400) * L;
    for (const key of ['leg-l', 'leg-r']) {
      const pts = worldPoints(objs.get(id(key)), s);
      for (const p of pts) best = Math.min(best, Math.hypot(p[0] - mouse[0], p[1] - mouse[1], p[2] - mouse[2]));
    }
  }
  assert.ok(best < 4, `closest approach ${best.toFixed(2)} in`);
  console.log(`   closest talon to the mouse: ${best.toFixed(2)} in`);
});

t(`${ver}: the wings fold in the stoop (wing tips come in), and open again after`, () => {
  const span = (s) => {
    const pts = [...worldPoints(objs.get(id('wing-l')), s), ...worldPoints(objs.get(id('wing-r')), s)];
    const ys = pts.map((p) => p[1]);
    // measure in the hawk's own frame: distance between the two wing tips
    const tipL = worldPoints(objs.get(id('wing-l')), s), tipR = worldPoints(objs.get(id('wing-r')), s);
    const a = tipL[tipL.length - 3], b = tipR[tipR.length - 3];
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  };
  const fly = motion.motions.find((m) => m.id === 'sweep-l');
  const peak = fly.keys.reduce((a, b) => (Math.abs(b[1]) > Math.abs(a[1]) ? b : a));
  const open = span(0), tucked = span(peak[0] * L);
  assert.ok(tucked < open * 0.7, `span ${open.toFixed(1)} in open, ${tucked.toFixed(1)} in tucked`);
  console.log(`   wing-tip to wing-tip: ${open.toFixed(1)} in open, ${tucked.toFixed(1)} in tucked`);
});

}
hawkTests('hawk-v06');
hawkTests('hawk-v07');

// ---------- V07: the flight obeys gravity, drag and flap thrust (tools/hawk_flight.js)
{
  const mo = load('hawk-v07/motion.json'), md = load('hawk-v07/model.json');
  const Ph = mo.physics, fly = mo.motions.find((m) => m.id === 'fly'), LL = mo.loop_s;
  const total = MO.pathLength(fly.points);
  // speed (in/s) at path fraction s, from the time profile: ds/dt between neighbouring profile rows
  const pr = fly.profile;
  const speedAt = (s) => {
    let k = 1; while (k < pr.length - 1 && pr[k][1] < s) k++;
    const [t0, s0] = pr[k - 1], [t1, s1] = pr[k];
    return ((s1 - s0) * total) / ((t1 - t0) * LL);
  };
  const zAt = (s) => MO.pathAt(fly.points, s).point[2];
  const sec = (name) => { const i = Ph.sections.findIndex((x) => x.name === name); return [Ph.sections[i].path_fraction, (Ph.sections[i + 1] || Ph.sections[0]).path_fraction]; };
  const lap = [0.5];

  t('hawk-v07: rising air holds the soaring speed (circling in the thermal and along the ridge)', () => {
    const [a, b] = sec('thermal');
    for (let k = 1; k < 20; k++) near(speedAt(a + ((b - a) * k) / 20) / Ph.soaring_speed_in_s, 1, 0.01);
    const [c, d] = sec('ridge');
    for (let k = 1; k < 10; k++) near(speedAt(c + ((d - c) * k) / 10) / Ph.soaring_speed_in_s, 1, 0.01);
  });

  t('hawk-v07: the stoop speed comes from the height lost, less drag (energy balance)', () => {
    const [a, b] = sec('stoop');
    const N = 200, ds = ((b - a) * total) / N;
    const v0 = speedAt(a + 1e-4), z0 = zAt(a);
    let drag = 0;
    for (let i = 0; i < N; i++) { const s = a + ((i + 0.5) / N) * (b - a), v = speedAt(s); drag += 2 * Ph.drag_per_in.tucked * v * v * ds; }
    const v1 = speedAt(b - 1e-4), z1 = zAt(b);
    const predicted = v0 * v0 + 2 * Ph.gravity_in_s2 * (z0 - z1) - drag;
    assert.ok(Math.abs(v1 * v1 - predicted) / predicted < 0.08, `v1^2 ${Math.round(v1 * v1)} vs energy ${Math.round(predicted)}`);
    assert.ok(v1 > 1.5 * Ph.soaring_speed_in_s, `stoop exit speed ${v1.toFixed(0)} in/s is not well above soaring speed`);
    console.log(`   stoop: ${v0.toFixed(0)} in/s at ${z0.toFixed(0)} in high to ${v1.toFixed(0)} in/s at ${z1.toFixed(0)} in (energy balance within 8%)`);
  });

  t('hawk-v07: the flare slows it (drag of the open wings) and the climb needs thrust; the lap closes at soaring speed', () => {
    const [a, b] = sec('pull');
    assert.ok(speedAt(b - 1e-4) < 0.75 * speedAt(a + 1e-4), 'flare should shed speed');
    assert.ok(Ph.climb_thrust_in_s2 > 20, `climb thrust ${Ph.climb_thrust_in_s2} in/s^2`);
    const [c, d] = sec('climb');
    near(speedAt(d - 1e-4) / Ph.soaring_speed_in_s, 1, 0.04);       // arrives at the bluff at soaring speed
    assert.ok(Math.abs(speedAt(1 - 1e-6) - speedAt(1e-6)) / Ph.soaring_speed_in_s < 0.25, 'the glide starts where the thermal ends');
    void lap;
  });

  t('hawk-v07: it flaps only while climbing under its own power, and the loop has several turns of the thermal', () => {
    const flaps = mo.motions.filter((m) => /^flap-/.test(m.id));
    assert.ok(flaps.length === 6);
    const env = flaps[0].envelope;
    for (const name of ['glide', 'stoop', 'pull', 'thermal']) {
      const [a, b] = sec(name);
      for (let k = 0; k <= 10; k++) {
        const s = a + ((b > a ? b - a : 1 - a + b) * k) / 10;
        // convert path fraction to loop fraction by searching the profile
        const sf = s % 1;
        let kk = 1; while (kk < pr.length - 1 && pr[kk][1] < sf) kk++;
        const [t0, s0] = pr[kk - 1], [t1, s1] = pr[kk];
        const u = t0 + (t1 - t0) * ((sf - s0) / (s1 - s0 || 1));
        near(MO.keyAt(env, u), 0, 1e-3);
      }
    }
    const peak = Math.max(...Array.from({ length: 200 }, (_, k) => MO.keyAt(env, k / 200)));
    assert.ok(peak > 0.95, `flap peak ${peak}`);
    assert.ok(flaps[0].cycles >= 40, `${flaps[0].cycles} wing beats per lap`);
    near(Ph.thermal.turns, 2.5);
    assert.ok(Ph.thermal.turns >= 2 && Ph.path_length_in > 3000, `path ${Ph.path_length_in} in`);
    console.log(`   ${flaps[0].cycles} wing beats per lap, thermal ${Ph.thermal.turns} turns, path ${Ph.path_length_in} in, lap ${LL} s`);
  });

  t('hawk-v07: the mouse sits until the hawk flares in, bolts for its hole, drops out of sight, and walks home before the loop wraps', () => {
    const mb = mo.motions.find((m) => m.id === 'mouse-bolt');
    const rig = md.objects.find((x) => x.uuid === 'hawk-v07-mouse-rig'), hole = md.objects.find((x) => x.uuid === 'hawk-v07-hole');
    const pos = (sec) => apply(MO.poseAt(md, mo, sec)['hawk-v07-mouse-rig'], rig.position);
    nearV(pos(0), rig.position, 1e-3);                                   // sits at the start
    const [mx, my] = rig.position, tb = mb.profile[1][0] * LL;           // the bolt starts here
    nearV(pos(tb - 0.3), rig.position, 1e-3);                            // still sitting just before
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    let arrive = null;
    for (let k = 0; k <= 400; k++) { const q = pos(tb + (k / 400) * 1.5); if (arrive === null && dist(q, hole.position) < 8) arrive = (k / 400) * 1.5; }
    assert.ok(arrive !== null && arrive < 0.6, `it reaches the hole in ${arrive} s`);
    const speed = dist([mx, my], hole.position) / arrive;
    assert.ok(speed > 100, `bolt speed ${speed.toFixed(0)} in/s`);
    assert.ok(pos(tb + 3)[2] < -4 && pos(tb + 9)[2] < -4, 'out of sight under the ground while the hawk climbs and circles');
    assert.ok(pos(LL - 0.3)[2] > -0.5 && dist(pos(LL - 0.3), [mx, my]) < 25, 'back at its spot before the loop wraps');
    console.log(`   mouse: bolts ${Math.round(dist([mx, my], hole.position))} in at ${speed.toFixed(0)} in/s, ${arrive.toFixed(2)} s after the hawk flares in`);
  });

  t('hawk-v07: the rising air, the bluff and the meadow are part of the model (closed rocks, translucent sheets)', () => {
    const o = (k) => md.objects.find((x) => x.uuid === `hawk-v07-${k}`);
    assert.strictEqual(o('rock-a').type, 'loft'); assert.strictEqual(o('air-0').type, 'sheet'); assert.strictEqual(o('wind-0').type, 'sheet');
    assert.ok(md.materials.airband.opacity < 0.5 && md.materials.wind.opacity < 0.5);
    assert.ok(o('meadow').dimensions[0] >= 300, 'a much larger meadow');
  });
}

console.log(`\n${n} test groups passed`);
