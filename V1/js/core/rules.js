/* Make 3D — rules engine. Checks operations before they are applied, and whole models on demand.
   Outcomes: accept | accept_with_warnings | reject. Pure JS. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.M3D = Object.assign(root.M3D || {}, api);
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const G = (typeof module !== 'undefined' && module.exports)
    ? { ...require('./schema.js'), ...require('./geometry.js'), ...require('./origin.js'), ...require('./mesh.js') }
    : (typeof self !== 'undefined' ? self : globalThis).M3D;

  const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
  const numArr = (v, n) => Array.isArray(v) && v.length === n && v.every(isNum);

  // --- individual rule checks. Each returns an array of issues {rule, severity, message, uuid}.
  const CHECKS = {
    valid_coordinates(o, model, world, rule) {
      const out = [];
      if (!numArr(o.position, 3)) out.push('position must be three finite numbers');
      for (const k of ['rotation_x', 'rotation_y', 'rotation_z']) {
        if (!isNum(o[k] ?? 0)) out.push(`${k} must be a finite number`);
      }
      return out.map((message) => ({ message }));
    },
    valid_geometry(o, model, world, rule) {
      const out = [];
      if (!G.TYPES.includes(o.type)) return [{ message: `unknown type "${o.type}"` }];
      const n = G.DIM_COUNT[o.type];
      if (o.type !== 'group') {
        if (!Array.isArray(o.dimensions) || o.dimensions.length !== n) out.push(`${o.type} needs ${n} dimension(s)`);
        else if (!o.dimensions.every((d) => isNum(d) && d > 0)) out.push('dimensions must be positive numbers');
      }
      if (G.SHAPE_TYPES.includes(o.type)) {
        out.push(...G.shapeIssues(o));
      }
      if (o.attach) {
        const t = model.objects.find((x) => x.uuid === o.attach.to);
        if (!t || !t.shape) out.push('attach.to must be a loft or sheet');
        else if (!(Number.isInteger(o.attach.joint) && o.attach.joint >= 0 && o.attach.joint < t.shape.joints.length)) out.push('attach.joint is not a joint of that skeleton');
        else if ((t.parent || null) !== (o.parent || null)) out.push('an attached part must sit in the same group as its skeleton');
      }
      if (o.parent) {
        const p = model.objects.find((x) => x.uuid === o.parent);
        if (!p) out.push('parent does not exist');
        else if (p.type !== 'group') out.push('parent must be a group');
      }
      return out.map((message) => ({ message }));
    },
    minimum_dimension(o, model, world, rule) {
      if (o.type === 'sheet') return [];   // a sheet is thin on purpose
      const d = Array.isArray(o.dimensions) ? o.dimensions : [];
      const min = rule.value ?? 1;
      if (!d.every((x) => isNum(x) && x >= min)) return [{ message: `every dimension must be at least ${min} in` }];
      return [];
    },
    within_bounds(o, model, world) {
      const b = world.bounds;
      if (!b || !o.position) return [];
      const box = G.objectBox(o, model.up);
      if (!box) return [];
      const bad = [0, 1, 2].some((i) => box.min[i] < b.min[i] || box.max[i] > b.max[i]);
      return bad ? [{ message: 'object is outside the world bounds' }] : [];
    },
  };

  // Structural check for an op against the current model (before any geometry rule).
  function structureIssues(model, op) {
    const has = (u) => model.objects.some((o) => o.uuid === u);
    switch (op.op) {
      case 'add':
        if (!op.object) return [{ message: 'add needs an object' }];
        if (!op.object.uuid) return [{ message: 'add needs a uuid' }];
        if (has(op.object.uuid)) return [{ message: `uuid ${op.object.uuid} already exists` }];
        return [];
      case 'modify':
      case 'rename':
      case 'delete':
        if (!has(op.uuid)) return [{ message: `no object with uuid ${op.uuid}` }];
        return [];
      case 'set_header':
        if (!op.set || !Object.keys(op.set).every((k) => k === 'name' || k === 'description')) {
          return [{ message: 'set_header may only change name and description' }];
        }
        return [];
      default:
        return [{ message: `unknown operation "${op.op}"` }];
    }
  }

  function runRule(ruleDef, o, model, world) {
    const fn = CHECKS[ruleDef.type];
    if (!fn) return [];
    return fn(o, model, world, ruleDef).map((i) => ({
      rule: ruleDef.id || ruleDef.type,
      type: ruleDef.type,
      severity: ruleDef.severity || 'warning',
      message: i.message,
      uuid: o.uuid,
    }));
  }

  // Per-operation check. Geometry rules run on the touched object; overlap only runs in model checks.
  function checkOperation(model, op, world) {
    const structural = structureIssues(model, op);
    if (structural.length) {
      return { outcome: 'reject', issues: structural.map((i) => ({ ...i, rule: 'structure', type: 'structure', severity: 'reject' })) };
    }
    if (op.op === 'delete') return { outcome: 'accept', issues: [] };
    if (op.op === 'set_header') {
      const next = G.applyOperation(model, op);  // only name and description may change (see structureIssues)
      return { outcome: 'accept', issues: [], next };
    }
    let next;
    try { next = G.applyOperation(model, op); } catch (e) {
      return { outcome: 'reject', issues: [{ rule: 'structure', type: 'structure', severity: 'reject', message: e.message }] };
    }
    const touched = next.objects.find((o) => o.uuid === (op.uuid || (op.object && op.object.uuid)));
    if (!touched) return { outcome: 'accept', issues: [], next };
    const issues = [];
    for (const r of world.rules || []) {
      if (r.type === 'object_overlap') continue;
      issues.push(...runRule(r, touched, next, world));
    }
    return { outcome: outcomeOf(issues), issues, next };
  }

  // Whole-model check (button). Includes overlap in flag mode.
  function checkModel(model, world) {
    const issues = [];
    for (const o of model.objects) {
      for (const r of world.rules || []) {
        if (r.type === 'object_overlap') continue;
        issues.push(...runRule(r, o, model, world));
      }
    }
    for (const r of world.rules || []) {
      if (r.type !== 'object_overlap' || r.mode !== 'flag') continue;
      issues.push(...overlapIssues(model, r));
    }
    return { outcome: outcomeOf(issues), issues };
  }

  function overlapIssues(model, rule) {
    const out = [];
    const objs = model.objects.filter((o) => G.objectBox(o, model.up));
    for (let i = 0; i < objs.length; i++) for (let j = i + 1; j < objs.length; j++) {
      const a = objs[i], b = objs[j];
      if (a.parent === b.uuid || b.parent === a.uuid) continue;          // parent and child
      if ((a.allowed_overlap || []).includes(b.uuid) || (b.allowed_overlap || []).includes(a.uuid)) continue;
      const A = G.objectBox(a, model.up), B = G.objectBox(b, model.up);
      const hit = [0, 1, 2].every((k) => A.min[k] < B.max[k] && B.min[k] < A.max[k]);
      if (hit) out.push({
        rule: rule.id || 'overlap', type: 'object_overlap', severity: rule.severity || 'review',
        message: `overlaps "${b.name}"`, uuid: a.uuid,
      });
    }
    return out;
  }

  function outcomeOf(issues) {
    if (issues.some((i) => i.severity === 'reject')) return 'reject';
    if (issues.length) return 'accept_with_warnings';
    return 'accept';
  }

  return { checkOperation, checkModel, outcomeOf, CHECKS };
});
