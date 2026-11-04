/* Make 3D — clash check: finds solids that pass into each other.
   Sample points are taken through each solid's volume (along the axis, across each cross-section,
   and inside boxes and spheres). A clash is a sample point of one solid that lies deeper than
   TOL inside the other, measured from the other's real surfaces. Surfaces that only touch do not
   count. Parts of the same top-level group are not compared (joints touch by design).
   Pure JS. Node: require('js/core/clash.js'). Browser: window.M3D.findClashes. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.M3D = Object.assign(root.M3D || {}, api);
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const O = (typeof module !== 'undefined' && module.exports)
    ? require('./origin.js')
    : (typeof self !== 'undefined' ? self : globalThis).M3D;

  const STEP = 2;     // sample spacing, inches
  const TOL = 0.5;    // how far inside (inches) a point must be to count; touching is 0

  // values from -a to a in steps, always including 0 and both ends
  function grid(a, step) {
    const out = [0];
    for (let v = step; v < a - 1e-9; v += step) { out.push(v); out.push(-v); }
    out.push(a, -a);
    return out;
  }
  function span(a, b, step) {
    const out = [];
    const n = Math.max(1, Math.ceil((b - a) / step));
    for (let i = 0; i <= n; i++) out.push(a + ((b - a) * i) / n);
    return out;
  }

  // Local frame: rotate a world offset back into the object's own axes (undo Z, then Y, then X).
  function toLocal(o, v) {
    let p = [v[0], v[1], v[2]];
    p = O.rotateVector(p, 0, 0, -(o.rotation_z || 0));
    p = O.rotateVector(p, 0, -(o.rotation_y || 0), 0);
    p = O.rotateVector(p, -(o.rotation_x || 0), 0, 0);
    return p;
  }

  // Signed depth of a local point inside the solid: positive inside, negative outside.
  function depthIn(o, p) {
    const d = o.dimensions || [];
    switch (o.type) {
      case 'box': return Math.min(d[0] / 2 - Math.abs(p[0]), d[1] / 2 - Math.abs(p[1]), d[2] / 2 - Math.abs(p[2]));
      case 'cylinder': {
        const rho = Math.hypot(p[0], p[1]);
        return Math.min(d[0] - rho, d[1] / 2 - Math.abs(p[2]));
      }
      case 'cone': {
        const rho = Math.hypot(p[0], p[1]);
        const R = (d[0] * (d[1] / 2 - p[2])) / d[1];
        return Math.min(R - rho, d[1] / 2 - Math.abs(p[2]));
      }
      case 'sphere': return d[0] - Math.hypot(p[0], p[1], p[2]);
      default: return -Infinity;
    }
  }

  // Sample points (world coordinates) through the volume of a solid.
  function samplePoints(o) {
    if (!o.position || o.type === 'group') return [];
    const d = o.dimensions || [];
    const local = [];
    if (o.type === 'box') {
      for (const x of span(-d[0] / 2, d[0] / 2, STEP)) for (const y of span(-d[1] / 2, d[1] / 2, STEP)) for (const z of span(-d[2] / 2, d[2] / 2, STEP)) local.push([x, y, z]);
    } else if (o.type === 'cylinder' || o.type === 'cone') {
      const h = d[1];
      for (const z of span(-h / 2, h / 2, STEP)) {
        const R = o.type === 'cone' ? (d[0] * (h / 2 - z)) / h : d[0];
        for (const x of grid(R, STEP)) for (const y of grid(R, STEP)) if (x * x + y * y <= R * R + 1e-9) local.push([x, y, z]);
      }
    } else if (o.type === 'sphere') {
      const R = d[0];
      for (const x of grid(R, STEP)) for (const y of grid(R, STEP)) for (const z of grid(R, STEP)) if (x * x + y * y + z * z <= R * R + 1e-9) local.push([x, y, z]);
    }
    const rx = o.rotation_x || 0, ry = o.rotation_y || 0, rz = o.rotation_z || 0;
    return local.map((p) => {
      const v = O.rotateVector(p, rx, ry, rz);
      return [o.position[0] + v[0], o.position[1] + v[1], o.position[2] + v[2]];
    });
  }

  function topGroup(model, o) {
    const byId = new Map(model.objects.map((x) => [x.uuid, x]));
    let cur = o;
    const seen = new Set();
    while (cur.parent && byId.has(cur.parent) && !seen.has(cur.uuid)) { seen.add(cur.uuid); cur = byId.get(cur.parent); }
    return cur.uuid;
  }

  // Deepest sample point of `from` inside `into`.
  function deepest(from, into) {
    let worst = -Infinity;
    for (const p of from.points) {
      const d = depthIn(into.o, toLocal(into.o, [p[0] - into.o.position[0], p[1] - into.o.position[1], p[2] - into.o.position[2]]));
      if (d > worst) worst = d;
    }
    return worst;
  }

  // Returns [{ a, b, depth }] for solids that pass into each other by more than TOL inches.
  function findClashes(model, opts = {}) {
    const tol = opts.tol === undefined ? TOL : opts.tol;
    const solids = model.objects
      .filter((o) => o.type !== 'group' && o.position && o.dimensions)
      .map((o) => ({ o, top: topGroup(model, o), points: samplePoints(o) }))
      .filter((x) => x.points.length);
    const out = [];
    for (let i = 0; i < solids.length; i++) {
      for (let j = i + 1; j < solids.length; j++) {
        const A = solids[i], B = solids[j];
        if (A.top === B.top) continue;
        const depth = Math.max(deepest(A, B), deepest(B, A));
        if (depth > tol) out.push({ a: A.o.name, b: B.o.name, depth: +depth.toFixed(2) });
      }
    }
    return out;
  }

  return { findClashes, CLASH_TOL: TOL };
});
