// Node tests for true orbits and the one-shot timeline (schematic §17). Run: node tests/test_orbits.js
const assert = require('assert');
const path = require('path');
const M = require(path.join(__dirname, '..', 'js/core/motion.js'));
const T = require(path.join(__dirname, '..', 'tools/solar_true.js'));

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} is not near ${b}`);
const base = { a: 100, e: 0, inc_deg: 0, node_deg: 0, peri_deg: 0, M0_deg: 0, period_days: 360, span_days: 360 };
const len = (p) => Math.hypot(p[0], p[1], p[2]);

t('a circle keeps its radius all the way round', () => {
  for (const u of [0, 0.1, 0.37, 0.5, 0.9]) near(len(M.orbitPosition(base, u)), 100, 1e-6);
});
t('an ellipse: perihelion is a(1-e) and aphelion is a(1+e)', () => {
  const o = { ...base, e: 0.5 };
  near(len(M.orbitPosition(o, 0)), 50, 1e-6);                  // M0 = 0 is perihelion
  near(len(M.orbitPosition({ ...o, M0_deg: 180 }, 0)), 150, 1e-6);  // M0 = 180 is aphelion
});
t('inclination lifts the orbit: height is a sin(i) sin(M) on a circle', () => {
  const o = { ...base, inc_deg: 30, M0_deg: 90 };
  near(M.orbitPosition(o, 0)[2], 50, 1e-6);                    // a * sin(30) at M = 90
});
t('node and perihelion turn the orbit in the plane', () => {
  const p = M.orbitPosition({ ...base, e: 0.3, node_deg: 90, peri_deg: 0 }, 0);
  near(p[0], 0, 1e-6); near(p[1], 70, 1e-6);                   // perihelion is on +y when the node is 90
});
t('one full period brings the body back to its start', () => {
  const o = { ...base, e: 0.3, inc_deg: 20, M0_deg: 33 };
  const a = M.orbitPosition(o, 0), b = M.orbitPosition(o, 1);
  near(a[0], b[0], 1e-6); near(a[1], b[1], 1e-6); near(a[2], b[2], 1e-6);
});
t('an orbit needs a one-shot timeline; a loop is rejected', () => {
  const model = { objects: [{ uuid: 'p' }] };
  const m = { target: 'p', id: 'o', kind: 'orbit', a: 50, e: 0.1, inc_deg: 0, node_deg: 0, peri_deg: 0, M0_deg: 0, period_days: 100, span_days: 1000 };
  assert.strictEqual(M.checkMotion(model, { schema: M.MOTION_SCHEMA, loop_s: 60, loop: false, motions: [m] }).outcome, 'accept');
  assert.strictEqual(M.checkMotion(model, { schema: M.MOTION_SCHEMA, loop_s: 60, motions: [m] }).outcome, 'reject');
});
t('a one-shot spin may use fractions and negative turns; a loop may not', () => {
  const model = { objects: [{ uuid: 'p' }] };
  const spin = { target: 'p', id: 's', kind: 'spin', axis: 'z', pivot: [0, 0, 0], cycles: -3.7 };
  assert.strictEqual(M.checkMotion(model, { schema: M.MOTION_SCHEMA, loop_s: 60, loop: false, motions: [spin] }).outcome, 'accept');
  assert.strictEqual(M.checkMotion(model, { schema: M.MOTION_SCHEMA, loop_s: 60, motions: [spin] }).outcome, 'reject');
});
t('a one-shot timeline holds its last frame (no wrap)', () => {
  const model = { objects: [{ uuid: 'p', position: [0, 0, 0] }] };
  const motion = { schema: M.MOTION_SCHEMA, loop_s: 60, loop: false, motions: [{ target: 'p', id: 'b', kind: 'bob', axis: 'z', amount: 10, cycles: 1 }] };
  const end = M.poseAt(model, motion, 60).p, past = M.poseAt(model, motion, 999).p;
  assert.deepStrictEqual(past, end);
});
t('Earth starts on 2 November 2026 at about 40 degrees of heliocentric longitude', () => {
  const p = T.restPos(T.ELEMENTS.earth);
  const lon = (Math.atan2(p[1], p[0]) * 180 / Math.PI + 360) % 360;
  assert.ok(Math.abs(lon - 40) < 3, `Earth longitude ${lon.toFixed(1)}`);
  near(p[2], 0, 1e-3);
});
t('the timeline is one lap of Pluto, and Pluto is the slowest', () => {
  const periods = Object.values(T.ELEMENTS).map((e) => e.period);
  assert.strictEqual(Math.max(...periods), T.SPAN_DAYS);
  assert.strictEqual(T.ELEMENTS.pluto.period, T.SPAN_DAYS);
});
t('every orbit in the true solar scene is scaled by square root of distance and keeps its shape', () => {
  const o = T.orbitOf(T.ELEMENTS.jupiter);
  near(o.a, 120 * Math.sqrt(5.20288), 0.01);
  assert.strictEqual(o.e, T.ELEMENTS.jupiter.e);
});

t('V07 starts at Explorer 1 (1958-01-31) and Earth is at about 131 degrees then', () => {
  const p = T.restPos(T.ELEMENTS.earth, T.START_V07);
  const lon = (Math.atan2(p[1], p[0]) * 180 / Math.PI + 360) % 360;
  assert.ok(Math.abs(lon - 131) < 3, `Earth longitude ${lon.toFixed(1)}`);
  assert.strictEqual(T.START_V07, '1958-01-31');
});
t('Halley is at perihelion on 1986-02-09, at the expected distance', () => {
  const o = T.cometOrbit(T.COMETS.halley, '1986-02-09');
  near(o.M0_deg, 0, 1e-6);
  near(Math.hypot(...M.orbitPosition(o, 0)), 120 * Math.sqrt(17.834) * (1 - 0.96714), 0.05);
});
t('V06 is unchanged: 2026 start, no comets; V07 adds the three comets', () => {
  assert.strictEqual(T.SOLAR_TRUE.header.name, 'Solar System V06');
  assert.strictEqual(T.SOLAR_TRUE.motion(() => 'x').timeline.start_date, '2026-11-02');
  const v7 = T.SOLAR_TRUE_V07.motion((k) => k);
  assert.strictEqual(v7.timeline.start_date, '1958-01-31');
  assert.strictEqual(v7.motions.filter((m) => /^comet-/.test(m.id)).length, 3);
});

console.log(`\n${n} orbit tests passed`);
