/* Make 3D — major bounding box and origin.
   Rule (convo v0.2 B5 + v0.3 proposals, to confirm):
   - Each object gets a world box from its position (centre), dimensions and rotation_x, rotation_y, rotation_z.
   - An object is an "outlier" when its box volume is under OUTLIER_SHARE (25%) of the full box volume.
   - Major box = union of the non-outlier boxes (groups and empty objects are skipped).
   - If at least REFINE_SHARE (70%) of the objects are outliers, the origin is the volume-weighted
     average of object centres. Otherwise the origin is the centre of the major box.
   Positions are never changed by this; the origin is a reference point for the viewer.
*/
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.M3D = Object.assign(root.M3D || {}, api);
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const OUTLIER_SHARE = 0.25;
  const REFINE_SHARE = 0.70;

  // Half-size of an object's own box in its local axes [x, y(model), z(model)].
  // `up` is the file's vertical axis: 'z' (default) or 'y'. Dimensions are per file axis.
  // Cylinder and cone: [radius, height]; height runs along the vertical axis.
  function halfSize(o, up = 'z') {
    const d = o.dimensions || [];
    const v = up === 'y' ? 1 : 2;
    switch (o.type) {
      case 'box': return [d[0] / 2, d[1] / 2, d[2] / 2];
      case 'cylinder':
      case 'cone': { const h = [d[0], d[0], d[0]]; h[v] = d[1] / 2; return h; }
      case 'sphere': return [d[0], d[0], d[0]];
      case 'loft':
      case 'sheet': return [d[0] / 2, d[1] / 2, d[2] / 2]; // box around the rest mesh; never rotated
      default: return null; // group
    }
  }

  // Rotate a vector about the model axes (degrees): first X, then Y, then Z. Right-handed.
  // The viewer uses the same order, so the box here matches what is drawn.
  function rotateVector(v, rx, ry, rz) {
    const r = (d) => (d || 0) * Math.PI / 180;
    let [x, y, z] = v;
    let c = Math.cos(r(rx)), s = Math.sin(r(rx));
    [y, z] = [y * c - z * s, y * s + z * c];          // about X
    c = Math.cos(r(ry)); s = Math.sin(r(ry));
    [x, z] = [x * c + z * s, -x * s + z * c];         // about Y
    c = Math.cos(r(rz)); s = Math.sin(r(rz));
    [x, y] = [x * c - y * s, x * s + y * c];          // about Z
    return [x, y, z];
  }

  // World AABB of an object, rotated about the model axes (see rotateVector).
  function objectBox(o, up = 'z') {
    const h = halfSize(o, up);
    if (!h || !o.position || h.some((v) => !Number.isFinite(v))) return null;
    const [hx, hy, hz] = h;
    let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const [rx, ry, rz] = rotateVector([sx * hx, sy * hy, sz * hz], o.rotation_x, o.rotation_y, o.rotation_z);
      const p = [o.position[0] + rx, o.position[1] + ry, o.position[2] + rz];
      for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], p[i]); max[i] = Math.max(max[i], p[i]); }
    }
    return { min, max };
  }

  const vol = (b) => (b.max[0] - b.min[0]) * (b.max[1] - b.min[1]) * (b.max[2] - b.min[2]);
  const centre = (b) => [0, 1, 2].map((i) => (b.min[i] + b.max[i]) / 2);
  function union(boxes) {
    return boxes.reduce((u, b) => ({
      min: [0, 1, 2].map((i) => Math.min(u.min[i], b.min[i])),
      max: [0, 1, 2].map((i) => Math.max(u.max[i], b.max[i])),
    }));
  }

  function majorBox(objects, up = 'z') {
    const v = up === 'y' ? 1 : 2;
    const items = objects.map((o) => ({ o, box: objectBox(o, up) })).filter((x) => x.box);
    if (items.length === 0) return { empty: true, origin: [0, 0, 0], method: 'none' };
    const full = union(items.map((x) => x.box));
    const fullVol = vol(full);
    for (const x of items) x.outlier = fullVol > 0 && vol(x.box) < OUTLIER_SHARE * fullVol;
    const outliers = items.filter((x) => x.outlier);
    const bulk = items.filter((x) => !x.outlier);
    const share = outliers.length / items.length;
    const major = bulk.length ? union(bulk.map((x) => x.box)) : full;

    let origin, method;
    if (share >= REFINE_SHARE) {
      const weights = items.map((x) => Math.max(vol(x.box), 1e-9));
      const total = weights.reduce((a, b) => a + b, 0);
      origin = [0, 1, 2].map((i) => items.reduce((acc, x, k) => acc + centre(x.box)[i] * weights[k], 0) / total);
      method = 'weighted';
    } else {
      origin = centre(major);
      method = 'major';
    }
    return {
      empty: false,
      method,
      origin,
      fullBox: full,
      majorBox: major,
      outlierUuids: outliers.map((x) => x.o.uuid),
      outlierShare: share,
      groundZ: major.min[v], // lowest point of the major box, along the file's vertical axis
    };
  }

  return { OUTLIER_SHARE, REFINE_SHARE, objectBox, majorBox, halfSize, rotateVector };
});
