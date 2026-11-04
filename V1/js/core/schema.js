/* Make 3D — schema constants, defaults and shape checks. Pure JS. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.M3D = Object.assign(root.M3D || {}, api);
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const SCHEMA = {
    model: 'make3d.model/0.1',
    history: 'make3d.history/0.1',
    world: 'make3d.world/0.1',
    bundle: 'make3d.bundle/0.1',
  };
  const TYPES = ['group', 'box', 'cylinder', 'sphere', 'cone', 'loft', 'sheet'];
  // loft = closed mesh on a skeleton line; sheet = open double-sided surface on a skeleton line (js/core/mesh.js).
  // Both carry object.shape, and their dimensions are the box that holds the rest mesh (computed, for the rules).
  const SHAPE_TYPES = ['loft', 'sheet'];
  // dimensions per type: box [x, y, z]; cylinder/cone [radius, height]; sphere [radius]; group []
  const DIM_COUNT = { group: 0, box: 3, cylinder: 2, sphere: 1, cone: 2, loft: 3, sheet: 3 };
  // Tags say what a part is for. Objects carry zero or more. Unknown tags are kept, but the viewer shows only these.
  const TAGS = {
    surface: 'Surface',     // what you put things on: table top, counter
    frame: 'Frame',         // legs, rails, beams that carry the surface
    stand: 'Stand',         // pole, base, support that holds up a canopy or shelf
    shade: 'Shade',         // canopy, awning, cover
    ballast: 'Ballast',     // weight that keeps something from moving: sandbags
    plant: 'Plant',         // trunk, branches, leaves
    container: 'Container', // pot, planter, box that holds soil or plants
  };

  function newUuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    let s = '';
    for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-4${s.slice(13, 16)}-a${s.slice(17, 20)}-${s.slice(20)}`;
  }

  // Fill defaults without dropping unknown fields.
  function normaliseObject(o) {
    return Object.assign({
      description: '',
      rotation_y: 0,
      parent: null,
      material: null,
      tags: [],
      allowed_overlap: [],
    }, o);
  }

  // Header fields that are not objects. Kept on history.header and copied into each model.
  function headerFromModel(model) {
    const { objects, version, ...header } = model; // eslint-disable-line no-unused-vars
    return header;
  }

  return { SCHEMA, TYPES, SHAPE_TYPES, DIM_COUNT, TAGS, newUuid, normaliseObject, headerFromModel };
});
