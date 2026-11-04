/* Make 3D V2 (P4): staged passes. structure -> shape -> material.
   Each stage is cached under a hash of the part of the history it depends on, so an edit reruns only the
   stages downstream of it: a material change reruns the material stage; an object change reruns all three.
   Pure JS, no DOM. The viewer still tessellates the shape itself; this module gives it the inputs. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.M3D = Object.assign(root.M3D || {}, api);
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const isNode = typeof module !== 'undefined' && module.exports;
  const G = isNode ? { ...require('./geometry.js'), ...require('./schema.js') } : (typeof self !== 'undefined' ? self : globalThis).M3D;
  const P = isNode ? require('./patterns.js') : (typeof self !== 'undefined' ? self : globalThis).M3D;

  // Ops that change which objects exist or where they are (structure and shape depend on these only).
  const STRUCTURE_OPS = ['add', 'modify', 'rename', 'delete'];
  // The material stage also reads the objects (their material id) and the material table.
  const MATERIAL_OPS = ['set_material'];
  const STAGES = ['structure', 'shape', 'material'];

  // FNV-1a, 32 bit: small, deterministic, good enough to tell two histories apart in a cache.
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  // The keys: each stage's key covers the header and the operations that stage reads, up to step n.
  function stageKeys(history, n) {
    const upTo = n === undefined ? history.operations.length : n;
    const ops = history.operations.slice(0, upTo);
    const head = JSON.stringify(history.header || {});
    const structOps = JSON.stringify(ops.filter((o) => STRUCTURE_OPS.includes(o.op)));
    const matOps = JSON.stringify(ops.filter((o) => STRUCTURE_OPS.includes(o.op) || MATERIAL_OPS.includes(o.op)));
    return {
      structure: hash(head + structOps),
      shape: hash(head + structOps),
      material: hash(head + matOps),
    };
  }

  // Stage 1: which objects exist and where (from the structure operations only).
  function structureStage(history, n) {
    const upTo = n === undefined ? history.operations.length : n;
    let m = G.emptyModel(history.header);
    for (const op of history.operations.slice(0, upTo)) {
      if (STRUCTURE_OPS.includes(op.op)) m = G.applyOperation(m, op);
    }
    return { objects: m.objects };
  }

  // Stage 2: the inputs the viewer tessellates each object from. Geometry itself is built in the viewer.
  function shapeStage(structure) {
    return structure.objects.map((o) => ({
      uuid: o.uuid, type: o.type, dimensions: o.dimensions, position: o.position,
      rotation_y: o.rotation_y || 0, rotation: o.rotation, shape: o.shape, parent: o.parent || null,
    }));
  }

  // Stage 3: each object's resolved surface (colour, PBR channels, pattern key), read from the full table.
  function materialStage(history, n) {
    const upTo = n === undefined ? history.operations.length : n;
    let m = G.emptyModel(history.header);
    for (const op of history.operations.slice(0, upTo)) {
      if (STRUCTURE_OPS.includes(op.op) || MATERIAL_OPS.includes(op.op)) m = G.applyOperation(m, op);
    }
    const table = m.materials || {};
    return m.objects.map((o) => {
      const e = table[o.material] || {};
      const spec = P.patternSpec(e);
      return {
        uuid: o.uuid,
        material: o.material || null,
        color: e.color || G.MATERIAL_DEFAULTS.color,
        opacity: e.opacity ?? 1,
        roughness: e.roughness ?? G.MATERIAL_DEFAULTS.roughness,
        metalness: e.metalness ?? G.MATERIAL_DEFAULTS.metalness,
        pattern_key: spec ? P.patternKey(spec) : null,
      };
    });
  }

  // Runs the three stages up to step n. `cache` (a Map) and `counts` (an object) persist between calls
  // so the caller can see which stages were recomputed. Returns the three outputs.
  function runStages(history, n, cache = new Map(), counts = {}) {
    const keys = stageKeys(history, n);
    const compute = (stage, fn) => {
      const k = `${stage}:${keys[stage]}`;
      if (!cache.has(k)) { counts[stage] = (counts[stage] || 0) + 1; cache.set(k, fn()); }
      return cache.get(k);
    };
    const structure = compute('structure', () => structureStage(history, n));
    const shape = compute('shape', () => shapeStage(structure));
    const material = compute('material', () => materialStage(history, n));
    return { keys, structure, shape, material };
  }

  return { STAGES, stageKeys, structureStage, shapeStage, materialStage, runStages };
});
