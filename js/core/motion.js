/* Make 3D — motion engine. Reads a model and a motion file; returns poses. No DOM, no Three.js.
   Motion is its own file (make3d.motion/0.1), separate from the model. It never changes the model.

   Every animation is a loop: time t runs from 0 to loop_s and wraps. Each motion repeats a whole
   number of times per loop (`cycles`), so the end of the loop is the same pose as the start.

   A pose is a 4x4 matrix (row-major array of 16) per target uuid, in model coordinates (inches, Z up),
   relative to the target's parent. The viewer applies it on top of the rest pose. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.M3D = Object.assign(root.M3D || {}, api);
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const SCHEMA = 'make3d.motion/0.1';
  const KINDS = ['path', 'swing', 'bob', 'slide', 'spin', 'bend', 'orbit'];
  const AXES = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
  const TAU = Math.PI * 2;

  // ---------- 4x4 matrices, row-major
  const I = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  function mul(a, b) {
    const o = new Array(16);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[r * 4 + k] * b[k * 4 + c];
        o[r * 4 + c] = s;
      }
    }
    return o;
  }
  const translate = (x, y, z) => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1];
  function rotate(axis, rad) {
    const [x, y, z] = axis, c = Math.cos(rad), s = Math.sin(rad), t = 1 - c;
    return [
      t * x * x + c, t * x * y - s * z, t * x * z + s * y, 0,
      t * x * y + s * z, t * y * y + c, t * y * z - s * x, 0,
      t * x * z - s * y, t * y * z + s * x, t * z * z + c, 0,
      0, 0, 0, 1,
    ];
  }
  // Rotation about a pivot point: move the pivot to the origin, turn, move back.
  const about = (pivot, axis, rad) =>
    mul(translate(pivot[0], pivot[1], pivot[2]), mul(rotate(axis, rad), translate(-pivot[0], -pivot[1], -pivot[2])));
  function apply(m, p) {
    return [0, 1, 2].map((r) => m[r * 4] * p[0] + m[r * 4 + 1] * p[1] + m[r * 4 + 2] * p[2] + m[r * 4 + 3]);
  }

  // ---------- closed path: smooth curve through the points (centripetal-free uniform Catmull-Rom), constant speed
  function catmull(p0, p1, p2, p3, s) {
    const s2 = s * s, s3 = s2 * s;
    return [0, 1, 2].map((i) => 0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * s +
      (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * s2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * s3));
  }
  const pathCache = new WeakMap();
  // Samples the closed curve; returns { pts, len (cumulative), total }.
  function samplePath(points) {
    if (pathCache.has(points)) return pathCache.get(points);
    const P = points.map((p) => [p[0], p[1], p[2] || 0]);
    const n = P.length, per = 64, pts = [];
    for (let i = 0; i < n; i++) {
      const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
      for (let k = 0; k < per; k++) pts.push(catmull(p0, p1, p2, p3, k / per));
    }
    pts.push(pts[0].slice());
    const len = [0];
    for (let i = 1; i < pts.length; i++) {
      len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
    }
    const out = { pts, len, total: len[len.length - 1] };
    pathCache.set(points, out);
    return out;
  }
  // Point and heading (radians, about Z) at fraction u of the way round, by distance walked.
  // The heading is taken across a short chord centred on the point, so it is smooth and exact at the start.
  function pathAt(points, u) {
    const { pts, len, total } = samplePath(points);
    const at = (dist) => {
      const d = ((dist % total) + total) % total;
      let lo = 0, hi = len.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (len[mid] <= d) lo = mid; else hi = mid; }
      const f = (d - len[lo]) / (len[hi] - len[lo] || 1), a = pts[lo], b = pts[hi];
      return [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * f);
    };
    const d = (((u % 1) + 1) % 1) * total, h = Math.min(1, total / 1000);
    const ahead = at(d + h), behind = at(d - h);
    return { point: at(d), heading: Math.atan2(ahead[1] - behind[1], ahead[0] - behind[0]) };
  }
  const pathLength = (points) => samplePath(points).total;

  // ---------- time profile (optional): maps loop time to distance along a path.
  // profile = [[t, s], ...] from [0, 0] to [1, 1], both non-decreasing. t is the fraction of the loop, s the fraction
  // of the path's length. Missing profile = constant speed. Lets a path speed up and slow down (gravity, drag).
  function warpTime(profile, x) {
    if (!Array.isArray(profile) || profile.length < 2) return x;
    const whole = Math.floor(x), f = x - whole;
    let i = 0;
    while (i < profile.length - 2 && profile[i + 1][0] < f) i++;
    const [t0, s0] = profile[i], [t1, s1] = profile[i + 1];
    const k = t1 > t0 ? (f - t0) / (t1 - t0) : 0;
    return whole + s0 + (s1 - s0) * k;
  }

  // 3-D tangent of a closed path at fraction u, from a short chord. Used to pitch things along a slope.
  function tangentAt(points, u) {
    const { total } = samplePath(points);
    const h = Math.min(1, total / 1000) / total;
    const a = pathAt(points, u - h).point, b = pathAt(points, u + h).point;
    return [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  }
  // Rotation part of a 4x4 matrix, transposed (its inverse, since it is a rotation).
  function transposeRot(m) {
    const o = I();
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 4 + c] = m[c * 4 + r];
    return o;
  }

  // Distance fraction (0..1) at which each waypoint of a closed path sits.
  function pathMarks(points) {
    const { len, total } = samplePath(points);
    return points.map((_, i) => len[i * 64] / total);
  }

  // ---------- keyframes (optional): [[t, value], ...] with t from 0 up to (not including) 1. The list closes on
  // itself: after the last key the value eases back to the first key's value at t = 1. Eased, so it rests at each key.
  function keyAt(keys, u) {
    const n = keys.length;
    const f = ((u % 1) + 1) % 1;
    let i = n - 1;
    for (let k = 0; k < n; k++) if (keys[k][0] <= f) i = k;
    const t0 = keys[i][0], v0 = keys[i][1];
    const nxt = keys[(i + 1) % n], t1 = i + 1 < n ? nxt[0] : 1 + nxt[0], v1 = nxt[1];
    const x = (f < t0 ? f + 1 : f), s = t1 > t0 ? (x - t0) / (t1 - t0) : 0;
    return v0 + (v1 - v0) * s * s * (3 - 2 * s);
  }
  // Angle (degrees) of a swing or bend at loop fraction u: keyframes if given, else a sine between from and to.
  // `envelope` (keyframes, 0..1) scales the whole angle, so a flap can start, build and stop.
  function angleOf(m, u) {
    if (m.keys) return keyAt(m.keys, u);
    const c = m.cycles || 1, ph = m.phase || 0;
    const wave = Math.sin(TAU * (c * u + ph));
    const mid = ((m.from || 0) + (m.to || 0)) / 2, amp = ((m.to || 0) - (m.from || 0)) / 2;
    return (mid + amp * wave) * (m.envelope ? keyAt(m.envelope, u) : 1);
  }

  // Flight frame for a path: x along the way of travel, z toward the lift (up, leaning into turns and pulls),
  // so a bird banks in a turn and pitches with the climb and dive. u is the loop fraction, L the loop in seconds.
  function flightFrame(m, u, L) {
    const c = m.cycles || 1, ph = m.phase || 0;
    const at = (x) => pathAt(m.points, warpTime(m.profile, c * x + ph)).point;
    const h = m.step || Math.min(0.004, 0.5 / (c * 60));      // chord half-length, as a fraction of the loop
    const a = at(u - h), b = at(u), d = at(u + h);
    const T = norm3([d[0] - a[0], d[1] - a[1], d[2] - a[2]]);
    // gravity of the model's world (in/s^2): with the speed it sets how hard a turn banks. bank_gain 1 = a coordinated turn.
    const dt = (h * L) * (h * L), G = m.gravity || 386.1, k = m.bank_gain === undefined ? 4 : m.bank_gain;
    const acc = [0, 1, 2].map((i) => (a[i] - 2 * b[i] + d[i]) / dt);
    // lift = up plus the pull of the turn; the up part is kept above 0.4 so the bird never rolls onto its back
    let lift = [k * acc[0] / G, k * acc[1] / G, 1 + Math.max(k * acc[2] / G, -0.6)];
    const dd = lift[0] * T[0] + lift[1] * T[1] + lift[2] * T[2];
    lift = [lift[0] - dd * T[0], lift[1] - dd * T[1], lift[2] - dd * T[2]];
    // a hard sideways pull in a steep dive can still tip the up axis past the horizontal: lean it back toward the sky
    // (along the part of "up" that is square to the path) until its height is at least 0.15
    const zn = [-T[2] * T[0], -T[2] * T[1], 1 - T[2] * T[2]], mag = Math.hypot(...lift);
    if (lift[2] < 0.15 * mag && zn[2] > 0.05) { const c = (0.15 * mag - lift[2]) / zn[2]; lift = [lift[0] + c * zn[0], lift[1] + c * zn[1], lift[2] + c * zn[2]]; }
    lift = norm3(lift);
    // optional cap on the roll (degrees)
    if (m.max_bank_deg) {
      // near the ground (ground_z, default 0) the roll is also limited so the lower wing tip (half_span) stays off it
      const room = m.half_span ? Math.max(0, Math.min(1, (b[2] - (m.ground_z || 0) - 2.5) / m.half_span)) : 1;
      const zu = norm3(zn), cosA = lift[0] * zu[0] + lift[1] * zu[1] + lift[2] * zu[2];
      const lim = Math.min((m.max_bank_deg * Math.PI) / 180, Math.asin(room));
      if (Math.acos(Math.min(1, cosA)) > lim && zn[2] > 0.05) {
        const side = norm3([lift[0] - cosA * zu[0], lift[1] - cosA * zu[1], lift[2] - cosA * zu[2]]);
        lift = [zu[0] * Math.cos(lim) + side[0] * Math.sin(lim), zu[1] * Math.cos(lim) + side[1] * Math.sin(lim), zu[2] * Math.cos(lim) + side[2] * Math.sin(lim)];
      }
    }
    const Y = [lift[1] * T[2] - lift[2] * T[1], lift[2] * T[0] - lift[0] * T[2], lift[0] * T[1] - lift[1] * T[0]];
    return { point: b, R: [T[0], Y[0], lift[0], 0, T[1], Y[1], lift[1], 0, T[2], Y[2], lift[2], 0, 0, 0, 0, 1] };
  }
  const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

  // ---------- Keplerian orbit: where a body is, from its elements (degrees, inches, z up = orbit normal).
  // m: { a, e, inc_deg, node_deg, peri_deg, M0_deg, period_days, span_days }. days = u * span_days from the start.
  // Standard two-body formulas; M0 is the mean anomaly at the start of the timeline.
  function orbitPosition(m, u) {
    const days = u * m.span_days;
    const M = (((m.M0_deg + (360 * days) / m.period_days) % 360) + 360) % 360 * Math.PI / 180;
    const e = m.e;
    let E = e > 0.8 ? Math.PI : M;
    for (let k = 0; k < 50; k++) { const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); E -= d; if (Math.abs(d) < 1e-12) break; }
    const xp = m.a * (Math.cos(E) - e), yp = m.a * Math.sqrt(1 - e * e) * Math.sin(E);
    const O = m.node_deg * Math.PI / 180, w = m.peri_deg * Math.PI / 180, i = m.inc_deg * Math.PI / 180;
    const cO = Math.cos(O), sO = Math.sin(O), cw = Math.cos(w), sw = Math.sin(w), ci = Math.cos(i), si = Math.sin(i);
    return [
      (cO * cw - sO * sw * ci) * xp + (-cO * sw - sO * cw * ci) * yp,
      (sO * cw + cO * sw * ci) * xp + (-sO * sw + cO * cw * ci) * yp,
      (sw * si) * xp + (cw * si) * yp,
    ];
  }

  // ---------- one motion -> matrix at loop fraction u (0..1)
  const deg = (d) => (d * Math.PI) / 180;
  function matrixFor(m, u, L) {
    const c = m.cycles || 1, ph = m.phase || 0;
    const wave = Math.sin(TAU * (c * u + ph));                  // -1..1, smooth
    const rise = (1 - Math.cos(TAU * (c * u + ph))) / 2;        // 0..1, smooth
    const axis = AXES[m.axis || 'z'];
    const pivot = m.pivot || [0, 0, 0];
    switch (m.kind) {
      case 'swing': {
        return about(pivot, axis, deg(angleOf(m, u)));
      }
      case 'spin': return about(pivot, axis, TAU * c * u + deg(m.start_deg || 0));
      case 'orbit': {
        const p = orbitPosition(m, u), p0 = orbitPosition(m, 0);
        return translate(p[0] - p0[0], p[1] - p0[1], p[2] - p0[2]);
      }
      case 'bob': { const a = (m.amount || 0) * rise; return translate(axis[0] * a, axis[1] * a, axis[2] * a); }
      case 'slide': { const a = (m.distance || 0) * rise; return translate(axis[0] * a, axis[1] * a, axis[2] * a); }
      case 'path': {
        if (m.face === 'flight') {
          // The frame at the start of the path is the rest pose, so the first frame is the identity.
          const now = flightFrame(m, u, L), start = flightFrame(m, 0, L);
          return mul(translate(now.point[0], now.point[1], now.point[2]),
            mul(mul(now.R, transposeRot(start.R)), translate(-pivot[0], -pivot[1], -pivot[2])));
        }
        if (m.face === 'tangent3d') {
          // Yaw and pitch: the target turns to the 3-D direction of travel (a car climbs with the track).
          // rest_yaw_deg and rest_pitch_deg are the orientation it has in the model (its rest pose), so the pose is the
          // difference from that. Pitch is positive uphill; the model's rotation_y is -pitch.
          const w = warpTime(m.profile, c * u + ph);
          const { point } = pathAt(m.points, w);
          const [dx, dy, dz] = tangentAt(m.points, w);
          const yaw = Math.atan2(dy, dx), pitch = Math.atan2(dz, Math.hypot(dx, dy));
          const R0 = mul(rotate(AXES.z, deg(m.rest_yaw_deg || 0)), rotate(AXES.y, -deg(m.rest_pitch_deg || 0)));
          const Rt = mul(rotate(AXES.z, yaw), rotate(AXES.y, -pitch));
          return mul(translate(point[0], point[1], point[2]),
            mul(mul(Rt, transposeRot(R0)), translate(-pivot[0], -pivot[1], -pivot[2])));
        }
        // The target's pivot travels along the path. Facing 'tangent' turns it to face the way it goes;
        // rest_heading_deg is the way it faces in the model (0 = +X).
        const { point, heading } = pathAt(m.points, warpTime(m.profile, c * u + ph));
        const turn = m.face === 'tangent' ? heading - deg(m.rest_heading_deg || 0) : 0;
        return mul(translate(point[0], point[1], point[2]),
          mul(rotate(AXES.z, turn), translate(-pivot[0], -pivot[1], -pivot[2])));
      }
      default: return I();
    }
  }

  // Pose at time t (seconds). Returns { [uuid]: matrix }. Motions on the same target apply in file order.
  // Targets missing from the model are skipped (checkMotion warns about them).
  function poseAt(model, motion, t) {
    const out = {};
    if (!motion || !Array.isArray(motion.motions)) return out;
    const have = new Set((model && model.objects || []).map((o) => o.uuid));
    const L = motion.loop_s > 0 ? motion.loop_s : 1;
    const u = motion.loop === false ? Math.max(0, Math.min(1, t / L)) : (((t / L) % 1) + 1) % 1;
    for (const m of motion.motions) {
      if (!have.has(m.target) || !KINDS.includes(m.kind) || m.kind === 'bend') continue;
      if (m.start && m.start !== 'auto') continue; // tap and chained starts are future
      out[m.target] = mul(matrixFor(m, u, L), out[m.target] || I());
    }
    // A part attached to a joint of a skeleton mesh rides that joint (eyes on a head, a tail on a rump).
    const skins = skinAt(model, motion, t);
    for (const o of (model && model.objects) || []) {
      if (!o.attach || !skins[o.attach.to]) continue;
      const G = skins[o.attach.to][o.attach.joint];
      if (G) out[o.uuid] = mul(G, out[o.uuid] || I());
    }
    return out;
  }

  // Joint matrices for every skeleton mesh that bends: { [uuid]: [4x4 per joint] }. Bends apply down the chain:
  // joint k turns everything after it about joint k's rest position, in the frame of the joints before it.
  function skinAt(model, motion, t) {
    const out = {};
    if (!motion || !Array.isArray(motion.motions)) return out;
    const L = motion.loop_s > 0 ? motion.loop_s : 1;
    const u = motion.loop === false ? Math.max(0, Math.min(1, t / L)) : (((t / L) % 1) + 1) % 1;
    const byId = new Map(((model && model.objects) || []).map((o) => [o.uuid, o]));
    const bends = {};
    for (const m of motion.motions) {
      if (m.kind !== 'bend' || !byId.has(m.target) || (m.start && m.start !== 'auto')) continue;
      (bends[m.target] = bends[m.target] || []).push(m);
    }
    for (const uuid of Object.keys(bends)) {
      const o = byId.get(uuid);
      const J = o.shape && o.shape.joints;
      if (!J) continue;
      let G = I();
      const mats = [];
      for (let k = 0; k < J.length; k++) {
        for (const m of bends[uuid]) {
          if ((m.joint || 0) !== k) continue;
          G = mul(G, about(J[k], AXES[m.axis || 'z'], deg(angleOf(m, u))));
        }
        mats.push(G);
      }
      out[uuid] = mats;
    }
    return out;
  }

  // Box that holds every part's centre over the whole loop, plus a margin (for fitting the camera).
  // Returns { min, max } in model coordinates, or null when nothing moves.
  function motionBox(model, motion, samples = 32, margin = 12) {
    if (!motion || !Array.isArray(motion.motions) || !motion.motions.length) return null;
    const objs = (model && model.objects || []).filter((o) => o.type !== 'group' && Array.isArray(o.position));
    const byId = new Map((model.objects || []).map((o) => [o.uuid, o]));
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    const L = motion.loop_s > 0 ? motion.loop_s : 1;
    for (let k = 0; k < samples; k++) {
      const pose = poseAt(model, motion, (k / samples) * L);
      for (const o of objs) {
        let q = o.position, guard = 0;
        for (let u = o.uuid; u && guard < 64; u = (byId.get(u) || {}).parent, guard++) if (pose[u]) q = apply(pose[u], q);
        for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], q[i]); max[i] = Math.max(max[i], q[i]); }
      }
    }
    if (!Number.isFinite(min[0])) return null;
    return { min: min.map((v) => v - margin), max: max.map((v) => v + margin) };
  }

  // ---------- checks: issues {severity, message, motion}
  function checkMotion(model, motion) {
    const issues = [];
    const bad = (message, id) => issues.push({ severity: 'reject', message, motion: id || null });
    const warn = (message, id) => issues.push({ severity: 'warning', message, motion: id || null });
    if (!motion || typeof motion !== 'object') { bad('motion is not an object'); return { outcome: 'reject', issues }; }
    if (motion.schema !== SCHEMA) warn(`schema is ${motion.schema}, expected ${SCHEMA}`);
    if (!(motion.loop_s > 0)) bad('loop_s must be a number above 0');
    if (!Array.isArray(motion.motions)) bad('motions must be a list');
    const objects = new Map((model && model.objects || []).map((o) => [o.uuid, o]));
    const ids = new Set();
    const finite = (v) => Number.isFinite(v);
    const vec = (v) => Array.isArray(v) && v.length === 3 && v.every(finite);
    for (const m of motion.motions || []) {
      const id = m && m.id;
      if (!id) bad('a motion has no id');
      else if (ids.has(id)) bad(`duplicate motion id ${id}`, id);
      ids.add(id);
      if (!KINDS.includes(m.kind)) { bad(`unknown kind "${m.kind}"`, id); continue; }
      if (!objects.has(m.target)) warn(`target ${m.target} is not in the model, so it will not move`, id);
      if (m.cycles !== undefined && motion.loop !== false && !(Number.isInteger(m.cycles) && m.cycles >= 1)) bad('cycles must be a whole number, 1 or more, so the loop closes', id);
      if (m.cycles !== undefined && motion.loop === false && !(Number.isFinite(m.cycles) && m.cycles !== 0)) bad('cycles must be a number other than 0 (negative turns the other way)', id);
      if (m.kind === 'orbit') {
        if (!(finite(m.a) && m.a > 0)) bad('orbit needs a above 0, in inches', id);
        if (!(finite(m.e) && m.e >= 0 && m.e < 1)) bad('orbit e must be from 0 up to below 1', id);
        if (!(finite(m.period_days) && m.period_days > 0 && finite(m.span_days) && m.span_days > 0)) bad('orbit needs period_days and span_days above 0', id);
        if (!(finite(m.M0_deg) && finite(m.inc_deg) && finite(m.node_deg) && finite(m.peri_deg))) bad('orbit needs M0_deg, inc_deg, node_deg and peri_deg', id);
        if (motion.loop !== false) bad('orbit needs a one-shot timeline (loop: false)', id);
      }
      if (m.axis !== undefined && !AXES[m.axis]) bad('axis must be x, y or z', id);
      if (m.pivot !== undefined && !vec(m.pivot)) bad('pivot must be [x, y, z] in inches', id);
      if (m.phase !== undefined && !finite(m.phase)) bad('phase must be a number', id);
      const keyed = (kk) => Array.isArray(kk) && kk.length >= 2 && kk.every((q, i) => Array.isArray(q) && q.length === 2 && q.every(finite) && q[0] >= 0 && q[0] < 1 && (i === 0 ? q[0] === 0 : q[0] > kk[i - 1][0]));
      if (m.keys !== undefined && !keyed(m.keys)) bad('keys must be [[t, value], ...] with t rising from 0 and below 1; the list closes back to the first value', id);
      if (m.envelope !== undefined && !keyed(m.envelope)) bad('envelope must be [[t, 0..1], ...] with t rising from 0 and below 1', id);
      if ((m.kind === 'swing' || m.kind === 'bend') && m.keys === undefined && !(finite(m.from) && finite(m.to))) bad(`${m.kind} needs from and to, or keys, in degrees`, id);
      if (m.kind === 'bend') {
        const tgt = objects.get(m.target);
        const nj = tgt && tgt.shape && Array.isArray(tgt.shape.joints) ? tgt.shape.joints.length : 0;
        if (tgt && !nj) bad('bend needs a target with a skeleton (a loft or a sheet)', id);
        else if (tgt && !(Number.isInteger(m.joint) && m.joint >= 0 && m.joint < nj)) bad(`bend joint must be a whole number from 0 to ${nj - 1}`, id);
        if (m.axis === undefined) warn('bend has no axis; z is used', id);
      }
      if (m.kind === 'bob' && !finite(m.amount)) bad('bob needs amount, in inches', id);
      if (m.kind === 'slide' && !finite(m.distance)) bad('slide needs distance, in inches', id);
      if (m.kind === 'path') {
        if (!Array.isArray(m.points) || m.points.length < 3 || !m.points.every((p) => Array.isArray(p) && p.length >= 2 && p.every(finite))) {
          bad('path needs 3 or more points [x, y] or [x, y, z]; the path always closes on itself', id);
        }
        if (m.face !== undefined && !['tangent', 'tangent3d', 'flight'].includes(m.face)) bad('face must be "tangent", "tangent3d", "flight" or left out', id);
        if (m.profile !== undefined) {
          const pr = m.profile;
          const okPair = (q) => Array.isArray(q) && q.length === 2 && q.every((v) => finite(v) && v >= 0 && v <= 1);
          const mono = Array.isArray(pr) && pr.every((q, i) => okPair(q) && (i === 0 || (q[0] >= pr[i - 1][0] && q[1] >= pr[i - 1][1])));
          if (!mono || pr.length < 2 || pr[0][0] !== 0 || pr[0][1] !== 0 || pr[pr.length - 1][0] !== 1 || pr[pr.length - 1][1] !== 1) {
            bad('profile must be [[t, s], ...] from [0, 0] to [1, 1], both values non-decreasing', id);
          }
        }
      }
      if (m.start && m.start !== 'auto') warn(`start "${m.start}" is not built yet; this motion does not play`, id);
    }
    const outcome = issues.some((i) => i.severity === 'reject') ? 'reject' : issues.length ? 'warn' : 'accept';
    return { outcome, issues };
  }

  return {
    MOTION_SCHEMA: SCHEMA, MOTION_KINDS: KINDS,
    poseAt, skinAt, checkMotion, orbitPosition, pathAt, pathLength, pathMarks, motionBox, warpTime, tangentAt, keyAt, flightFrame,
    mat4: { identity: I, mul, translate, rotate, about, apply },
  };
});
