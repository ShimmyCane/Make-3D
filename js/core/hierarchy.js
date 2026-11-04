/* Make 3D — object hierarchy (the Objects list and the Edit groups view). Pure: no DOM, no Three.js, so tests run in Node.
   An object's parent is a group (type "group") or null (top level). Hiding a group hides its parts (visibility.js),
   so the parent field is what makes "put the foot in the leg group" useful. Moving an object is a normal `modify`
   operation (uuid + set.parent), so it is checked by the rules and kept in the history. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.M3D = Object.assign(root.M3D || {}, api);
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const find = (model, uuid) => ((model && model.objects) || []).find((o) => o.uuid === uuid) || null;

  // The parent uuid of an object if it exists in the model, else null (a missing parent counts as top level).
  function parentOf(model, obj) {
    return obj && obj.parent && find(model, obj.parent) ? obj.parent : null;
  }

  // Rows for the Objects list and the Edit view, depth-first in model order.
  // collapsed: a Set of group uuids whose parts are folded away (their rows are left out, the group row stays).
  // Each row: { o, depth, hasChildren, collapsed }. A cycle in the parent field cannot loop forever.
  function treeRows(model, collapsed) {
    const objs = (model && model.objects) || [];
    const kids = new Map();
    for (const o of objs) {
      const p = parentOf(model, o);
      if (!kids.has(p)) kids.set(p, []);
      kids.get(p).push(o);
    }
    // reachable from the top level, ignoring folding: objects in a parent loop are not, and are listed at the top
    const reach = new Set();
    const mark = (o) => {
      if (reach.has(o.uuid)) return;
      reach.add(o.uuid);
      for (const c of kids.get(o.uuid) || []) mark(c);
    };
    for (const o of kids.get(null) || []) mark(o);
    const rows = [];
    const seen = new Set();
    const walk = (o, depth) => {
      if (seen.has(o.uuid)) return;
      seen.add(o.uuid);
      const ch = kids.get(o.uuid) || [];
      const folded = !!(collapsed && collapsed.has(o.uuid)) && ch.length > 0;
      rows.push({ o, depth, hasChildren: ch.length > 0, collapsed: folded });
      if (!folded) for (const c of ch) walk(c, depth + 1);
    };
    for (const o of kids.get(null) || []) walk(o, 0);
    for (const o of objs) if (!reach.has(o.uuid)) walk(o, 0);
    return rows;
  }

  // Can this object sit inside parentUuid (null = top level)? Returns { ok, reason }.
  function canBeParent(model, uuid, parentUuid) {
    const obj = find(model, uuid);
    if (!obj) return { ok: false, reason: 'no such object' };
    const want = parentUuid || null;
    if (obj.attach) {
      // a part attached to a skeleton stays in the skeleton's group
      const sk = find(model, obj.attach.to);
      const home = sk ? sk.parent || null : null;
      if (want !== home) return { ok: false, reason: 'attached to a skeleton: it stays in the skeleton’s group' };
      return { ok: true, reason: '' };
    }
    if (want === null) return { ok: true, reason: '' };
    if (want === uuid) return { ok: false, reason: 'an object cannot be inside itself' };
    const p = find(model, want);
    if (!p) return { ok: false, reason: 'no such group' };
    if (p.type !== 'group') return { ok: false, reason: 'only a group can hold parts' };
    // the group must not be inside this object (that would be a loop)
    for (let q = p, n = 0; q && n < 1000; n++) {
      if (q.uuid === uuid) return { ok: false, reason: `${p.name} is inside ${obj.name}` };
      q = q.parent ? find(model, q.parent) : null;
    }
    return { ok: true, reason: '' };
  }

  // The operation that moves an object into a group (or to the top level). A normal modify step.
  function moveOp(uuid, parentUuid) {
    return { op: 'modify', uuid, set: { parent: parentUuid || null } };
  }

  // The groups an object may move into, as [{ uuid, label }] with the path to each group (e.g. "Leg › Foot").
  function groupOptions(model, uuid) {
    const out = [];
    for (const o of (model && model.objects) || []) {
      if (o.type !== 'group' || o.uuid === uuid) continue;
      if (!canBeParent(model, uuid, o.uuid).ok) continue;
      out.push({ uuid: o.uuid, label: pathOf(model, o) });
    }
    return out;
  }

  // "Body › Leg › Foot" for an object: its name with each ancestor's name in front.
  function pathOf(model, obj) {
    const names = [obj.name];
    let p = parentOf(model, obj);
    for (let n = 0; p && n < 1000; n++) {
      const g = find(model, p);
      names.unshift(g.name);
      p = parentOf(model, g);
    }
    return names.join(' › ');
  }

  return { parentOf, treeRows, canBeParent, moveOp, groupOptions, pathOf };
});
