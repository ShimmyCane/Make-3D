/* Make 3D — skeleton meshes. Pure JS, no DOM, no Three.js.

   Two part types are built from a skeleton line (a chain of joints) plus cross-sections along it:
     loft   a CLOSED mesh: a smooth tube with end caps. Solid, watertight, outward normals.
     sheet  an OPEN thin surface (leaf, blade of grass, flag). Drawn double sided.

   object.shape = {
     joints:  [[x, y, z], ...]   the skeleton line at rest, absolute model coordinates (inches), 2 or more
     facing:  [x, y, z]          which way the wide side of the cross-section points (loft and sheet)
     rings:   loft  [[t, w, h], ...]   t = 0..1 along the line (by length), w = half width, h = half height
              sheet [[t, w], ...]      w = half width
     samples: how many cross-sections are cut along the line (default 14)
     sides:   loft: points round each cross-section (default 12). sheet: points across the width, odd (default 5)
     cup:     sheet only: how far the middle lifts, as a fraction of the half width (default 0)
   }

   The vertex layout depends only on the shape, never on the pose, so a viewer builds the triangles once and
   only moves the vertices. A pose is one 4x4 matrix per joint (row-major, from js/core/motion.js skinAt):
   the joint moves with it, and the cross-sections between joints follow a smooth curve through the posed joints. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.M3D = Object.assign(root.M3D || {}, api);
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const TAU = Math.PI * 2;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  const unit = (a) => { const l = len(a); return l > 1e-12 ? mul(a, 1 / l) : [0, 0, 0]; };
  const point = (m, p) => [0, 1, 2].map((r) => m[r * 4] * p[0] + m[r * 4 + 1] * p[1] + m[r * 4 + 2] * p[2] + m[r * 4 + 3]);
  const dir = (m, v) => [0, 1, 2].map((r) => m[r * 4] * v[0] + m[r * 4 + 1] * v[1] + m[r * 4 + 2] * v[2]);
  const ease = (s) => s * s * (3 - 2 * s);

  // A vector that is not parallel to t (for a frame when the facing is missing or along the line).
  function anyPerp(t) {
    const a = Math.abs(t[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    return unit(sub(a, mul(t, dot(a, t))));
  }

  // Uniform Catmull-Rom through the joints: point and tangent on segment k at s (0..1).
  function curve(P, k, s) {
    const n = P.length;
    const p1 = P[k], p2 = P[k + 1];
    const p0 = k > 0 ? P[k - 1] : sub(mul(p1, 2), p2);
    const p3 = k + 2 < n ? P[k + 2] : sub(mul(p2, 2), p1);
    const s2 = s * s, s3 = s2 * s;
    const pt = [0, 1, 2].map((i) => 0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * s + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * s2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * s3));
    const tg = [0, 1, 2].map((i) => 0.5 * ((-p0[i] + p2[i]) + 2 * (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * s + 3 * (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * s2));
    return { pt, tg };
  }

  // Everything that depends on the rest shape only: where the cross-sections sit and how big each one is.
  const planCache = new WeakMap();
  function plan(shape, type) {
    if (planCache.has(shape)) return planCache.get(shape);
    const J = shape.joints, nSeg = J.length - 1;
    const seg = [];
    let total = 0;
    for (let k = 0; k < nSeg; k++) { const l = len(sub(J[k + 1], J[k])); seg.push(l); total += l; }
    const cum = [0];
    for (let k = 0; k < nSeg; k++) cum.push(cum[k] + seg[k]);
    const rings = (shape.rings || []).slice().sort((a, b) => a[0] - b[0]);
    const prof = (t, c) => {                      // eased blend between neighbouring control rings
      if (!rings.length) return 1;
      if (t <= rings[0][0]) return rings[0][c];
      for (let i = 0; i < rings.length - 1; i++) {
        if (t <= rings[i + 1][0]) {
          const s = (t - rings[i][0]) / ((rings[i + 1][0] - rings[i][0]) || 1);
          return rings[i][c] + (rings[i + 1][c] - rings[i][c]) * ease(s);
        }
      }
      return rings[rings.length - 1][c];
    };
    const n = Math.max(2, shape.samples || 14);
    const cuts = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1) * total;
      let k = 0;
      while (k < nSeg - 1 && cum[k + 1] < t - 1e-9) k++;
      const s = seg[k] > 0 ? Math.min(1, Math.max(0, (t - cum[k]) / seg[k])) : 0;
      const f = total > 0 ? t / total : 0;
      cuts.push({ k, s, w: prof(f, 1), h: type === 'loft' ? prof(f, 2) : 0 });
    }
    const sides = type === 'loft' ? Math.max(3, shape.sides || 12) : Math.max(3, (shape.sides || 5) | 1);
    // triangles
    const idx = [];
    if (type === 'loft') {
      // vertices: ring i, side j -> i * sides + j; then two cap centres
      const c0 = n * sides, c1 = n * sides + 1;
      for (let i = 0; i < n - 1; i++) for (let j = 0; j < sides; j++) {
        const j2 = (j + 1) % sides;
        const a = i * sides + j, b = i * sides + j2, c = (i + 1) * sides + j, d = (i + 1) * sides + j2;
        idx.push(a, b, c, b, d, c);
      }
      for (let j = 0; j < sides; j++) {
        const j2 = (j + 1) % sides;
        idx.push(c0, j2, j);                                           // start cap faces backwards
        idx.push(c1, (n - 1) * sides + j, (n - 1) * sides + j2);       // end cap faces forwards
      }
    } else {
      for (let i = 0; i < n - 1; i++) for (let j = 0; j < sides - 1; j++) {
        const a = i * sides + j, b = a + 1, c = (i + 1) * sides + j, d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    }
    const vertexCount = type === 'loft' ? n * sides + 2 : n * sides;
    const out = { cuts, sides, n, idx, vertexCount, nSeg };
    planCache.set(shape, out);
    return out;
  }

  // Vertex positions (flat array) for the shape, in the rest pose or in a pose (one matrix per joint).
  function positions(shape, type, pose) {
    const pl = plan(shape, type);
    const J = pose ? shape.joints.map((p, i) => point(pose[i], p)) : shape.joints;
    const f0 = unit(shape.facing || [0, 1, 0]);
    const F = pose ? pose.map((m) => dir(m, f0)) : null;
    const out = new Array(pl.vertexCount * 3);
    const put = (i, p) => { out[i * 3] = p[0]; out[i * 3 + 1] = p[1]; out[i * 3 + 2] = p[2]; };
    const cup = shape.cup || 0;
    let prevS = null;
    const centres = [];
    pl.cuts.forEach((cut, i) => {
      const { pt, tg } = curve(J, cut.k, cut.s);
      let T = unit(tg);
      if (!len(T)) T = unit(sub(J[J.length - 1], J[0]));
      const f = F ? add(mul(F[cut.k], 1 - cut.s), mul(F[cut.k + 1], cut.s)) : f0;
      let S = unit(sub(f, mul(T, dot(f, T))));
      if (!len(S)) S = prevS || anyPerp(T);
      prevS = S;
      const N = cross(T, S);
      centres.push(pt);
      if (type === 'loft') {
        for (let j = 0; j < pl.sides; j++) {
          const a = (j / pl.sides) * TAU;
          put(i * pl.sides + j, add(pt, add(mul(S, cut.w * Math.cos(a)), mul(N, cut.h * Math.sin(a)))));
        }
      } else {
        for (let j = 0; j < pl.sides; j++) {
          const u = (j / (pl.sides - 1)) * 2 - 1;
          put(i * pl.sides + j, add(pt, add(mul(S, cut.w * u), mul(N, cup * cut.w * (1 - u * u)))));
        }
      }
    });
    if (type === 'loft') { put(pl.n * pl.sides, centres[0]); put(pl.n * pl.sides + 1, centres[centres.length - 1]); }
    return out;
  }

  function build(shape, type, pose) {
    return { positions: positions(shape, type, pose), indices: plan(shape, type).idx };
  }

  // Box that holds the rest mesh: { min, max }.
  function restBox(shape, type) {
    const p = positions(shape, type, null);
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], p[i + k]); max[k] = Math.max(max[k], p[i + k]); }
    return { min, max };
  }

  // Edge and volume facts for tests: closed means every edge is shared by exactly two triangles.
  function stats(shape, type) {
    const { positions: P, indices } = build(shape, type, null);
    const edges = new Map();
    let volume = 0;
    for (let t = 0; t < indices.length; t += 3) {
      const [a, b, c] = [indices[t], indices[t + 1], indices[t + 2]];
      for (const [u, v] of [[a, b], [b, c], [c, a]]) {
        const key = u < v ? `${u}-${v}` : `${v}-${u}`;
        edges.set(key, (edges.get(key) || 0) + 1);
      }
      const A = [P[a * 3], P[a * 3 + 1], P[a * 3 + 2]], B = [P[b * 3], P[b * 3 + 1], P[b * 3 + 2]], C = [P[c * 3], P[c * 3 + 1], P[c * 3 + 2]];
      volume += dot(A, cross(B, C)) / 6;
    }
    let open = 0, bad = 0;
    for (const n of edges.values()) { if (n === 1) open++; else if (n !== 2) bad++; }
    return { triangles: indices.length / 3, vertices: P.length / 3, openEdges: open, badEdges: bad, volume };
  }

  // Shape problems, as a list of messages (empty when fine). Used by the rules and the build.
  function shapeIssues(o) {
    const out = [];
    const s = o.shape;
    const fin = (v) => Number.isFinite(v);
    const vec = (v) => Array.isArray(v) && v.length === 3 && v.every(fin);
    if (!s || typeof s !== 'object') return ['needs a shape'];
    if (!Array.isArray(s.joints) || s.joints.length < 2 || !s.joints.every(vec)) out.push('shape.joints needs 2 or more [x, y, z] points');
    else if (s.joints.some((p, i) => i > 0 && len(sub(p, s.joints[i - 1])) < 1e-6)) out.push('two joints sit at the same point');
    if (s.facing !== undefined && !vec(s.facing)) out.push('shape.facing must be [x, y, z]');
    const want = o.type === 'loft' ? 3 : 2;
    if (!Array.isArray(s.rings) || s.rings.length < 2 || !s.rings.every((r) => Array.isArray(r) && r.length === want && r.every(fin) && r[0] >= 0 && r[0] <= 1 && r.slice(1).every((v) => v >= 0))) {
      out.push(`shape.rings needs 2 or more [${o.type === 'loft' ? 't, w, h' : 't, w'}] rows, t from 0 to 1`);
    }
    if (s.samples !== undefined && !(Number.isInteger(s.samples) && s.samples >= 2)) out.push('shape.samples must be a whole number, 2 or more');
    if (s.sides !== undefined && !(Number.isInteger(s.sides) && s.sides >= 3)) out.push('shape.sides must be a whole number, 3 or more');
    return out;
  }

  return { buildMesh: build, meshPositions: positions, meshBox: restBox, meshStats: stats, shapeIssues };
});
