/* Make 3D — geometry engine: apply operations and replay history. No DOM. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.M3D = Object.assign(root.M3D || {}, api);
})(typeof self !== 'undefined' ? self : globalThis, function () {
  // In Node, load schema.js directly. In the browser, schema.js is already on the global M3D.
  const S = (typeof module !== 'undefined' && module.exports)
    ? require('./schema.js')
    : (typeof self !== 'undefined' ? self : globalThis).M3D;

  const clone = (x) => JSON.parse(JSON.stringify(x));

  function emptyModel(header) {
    return Object.assign({}, clone(header), { objects: [], version: 0 });
  }

  function descendants(objects, uuid) {
    const out = new Set([uuid]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const o of objects) {
        if (o.parent && out.has(o.parent) && !out.has(o.uuid)) { out.add(o.uuid); grew = true; }
      }
    }
    return out;
  }

  // Returns a new model. Throws on structural errors (rules check these first).
  function applyOperation(model, op) {
    const m = clone(model);
    switch (op.op) {
      case 'add': {
        const obj = S.normaliseObject(clone(op.object));
        if (!obj.uuid) throw new Error('add: missing uuid');
        if (m.objects.some((o) => o.uuid === obj.uuid)) throw new Error(`add: duplicate uuid ${obj.uuid}`);
        m.objects.push(obj);
        break;
      }
      case 'modify':
      case 'rename': {
        const idx = m.objects.findIndex((o) => o.uuid === op.uuid);
        if (idx < 0) throw new Error(`modify: unknown uuid ${op.uuid}`);
        const set = op.op === 'rename' ? { name: op.name } : clone(op.set || {});
        if ('uuid' in set && set.uuid !== op.uuid) throw new Error('modify: uuid cannot change');
        delete set.uuid;
        m.objects[idx] = Object.assign({}, m.objects[idx], set); // unknown fields are kept
        break;
      }
      case 'set_header': {
        // Name and description of the model. Recorded as an operation so history keeps the change.
        for (const k of ['name', 'description']) if (k in (op.set || {})) m[k] = op.set[k];
        break;
      }
      case 'delete': {
        if (!m.objects.some((o) => o.uuid === op.uuid)) throw new Error(`delete: unknown uuid ${op.uuid}`);
        const gone = descendants(m.objects, op.uuid);
        m.objects = m.objects.filter((o) => !gone.has(o.uuid));
        break;
      }
      default:
        throw new Error(`unknown op: ${op.op}`);
    }
    m.version = (model.version || 0) + 1;
    return m;
  }

  function checkSequence(history) {
    history.operations.forEach((op, i) => {
      if (op.seq !== i + 1) throw new Error(`history seq ${op.seq} at position ${i + 1}`);
    });
  }

  // Replay the first `upTo` operations (default: all). Model version = operations applied.
  function replay(history, upTo) {
    checkSequence(history);
    const n = upTo === undefined ? history.operations.length : upTo;
    let model = emptyModel(history.header);
    for (let i = 0; i < n; i++) model = applyOperation(model, history.operations[i]);
    return model;
  }

  // Build a history from a plain model snapshot (used when importing a model with no history).
  function historyFromModel(model, author = 'import') {
    const header = S.headerFromModel(model);
    const operations = (model.objects || []).map((o, i) => ({
      seq: i + 1, op: 'add', time: new Date(0).toISOString(), author, note: 'imported from model',
      object: clone(o),
    }));
    return { schema: S.SCHEMA.history, model_id: model.model_id, header, operations };
  }

  return { applyOperation, replay, emptyModel, descendants, historyFromModel, clone };
});
