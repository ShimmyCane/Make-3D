/* Make 3D — linked views. Pure data: no DOM, no Three.js, so it runs in Node tests and in the page.
   A linked view is a model object whose tag points at another model:
     tag "link:<model_id>"           -> a fade transition (the default)
     tag "link:<model_id>:zoom"      -> a zoom into the object, then the new model
     tag "link:<model_id>:fade"      -> a fade
   Tags are plain strings on the object (schema keeps unknown tags), so no model format change is needed.
   See schematic §16. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.M3D = Object.assign(root.M3D || {}, api);
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const PREFIX = 'link:';
  const TRANSITIONS = ['fade', 'zoom'];
  const ID = /^[a-z0-9][a-z0-9_-]*$/i;

  // "link:planet-earth:zoom" -> { target: "planet-earth", transition: "zoom" }; anything else -> null.
  function parseLinkTag(tag) {
    if (typeof tag !== 'string' || !tag.startsWith(PREFIX)) return null;
    const parts = tag.slice(PREFIX.length).split(':');
    const target = parts[0];
    if (!ID.test(target || '')) return null;
    let transition = 'fade';
    if (parts.length > 1) {
      if (parts.length > 2 || !TRANSITIONS.includes(parts[1])) return null;
      transition = parts[1];
    }
    return { target, transition };
  }

  // The first valid link on an object, or null.
  function linkOf(obj) {
    for (const t of (obj && obj.tags) || []) {
      const l = parseLinkTag(t);
      if (l) return l;
    }
    return null;
  }

  // Every linked object in a model: [{ uuid, name, target, transition }].
  function linksIn(model) {
    const out = [];
    for (const o of (model && model.objects) || []) {
      const l = linkOf(o);
      if (l) out.push({ uuid: o.uuid, name: o.name, target: l.target, transition: l.transition });
    }
    return out;
  }

  // Which way a hop goes: 'zoom' only when the link asks for it; otherwise a fade. Reduced motion always fades.
  function transitionFor(link, reducedMotion) {
    if (!link) return 'fade';
    if (reducedMotion) return 'fade';
    return link.transition === 'zoom' ? 'zoom' : 'fade';
  }

  // Milliseconds each transition takes (the page reads these so CSS and JS agree).
  const DURATION_MS = { fade: 380, zoom: 620 };

  return { PREFIX, parseLinkTag, linkOf, linksIn, transitionFor, DURATION_MS };
});
