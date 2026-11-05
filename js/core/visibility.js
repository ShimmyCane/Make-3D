/* Make 3D — group visibility (the upper-right dropdown). Pure: no DOM, no Three.js, so tests run in Node.
   A group is any object whose tags include show:<label>, e.g. show:banana. The label is what the dropdown shows.
   Showing or hiding a group hides its whole branch (its children go with it). Tags are plain strings, so the
   model format does not change. Two objects with the same label form one control. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.M3D = Object.assign(root.M3D || {}, api);
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const PREFIX = 'show:';

  // 'show:banana' -> 'banana'. Anything else (or an empty label) -> null.
  function parseShowTag(tag) {
    if (typeof tag !== 'string' || !tag.startsWith(PREFIX)) return null;
    const label = tag.slice(PREFIX.length).trim();
    return label ? label : null;
  }

  // The first show: label on an object, or null.
  function labelOf(obj) {
    for (const t of (obj && obj.tags) || []) {
      const l = parseShowTag(t);
      if (l) return l;
    }
    return null;
  }

  // Every visibility control in a model, in the order its first object appears:
  // [{ label, uuids: [uuid, ...] }]. An empty list means the model has no controls (the dropdown stays hidden).
  function groupsIn(model) {
    const order = [], byLabel = new Map();
    for (const o of (model && model.objects) || []) {
      const label = labelOf(o);
      if (!label || !o.uuid) continue;
      if (!byLabel.has(label)) { byLabel.set(label, []); order.push(label); }
      byLabel.get(label).push(o.uuid);
    }
    return order.map((label) => ({ label, uuids: byLabel.get(label) }));
  }

  // The uuids to hide, given the labels the user has turned off.
  function hiddenUuids(groups, hiddenLabels) {
    const off = new Set(hiddenLabels || []);
    const out = [];
    for (const g of groups || []) if (off.has(g.label)) out.push(...g.uuids);
    return out;
  }

  // Objects that start with their eye shut: hidden_at_start true in the model. Used when a model is opened.
  function startHiddenUuids(model) {
    return ((model && model.objects) || []).filter((o) => o.hidden_at_start === true && o.uuid).map((o) => o.uuid);
  }

  return { PREFIX, parseShowTag, labelOf, groupsIn, hiddenUuids, startHiddenUuids };
});
