/* Make 3D — IFC export (IFC4, plain STEP text). Pure JS, no libraries.
   Each object (not groups) becomes one IfcBuildingElementProxy with a triangulated mesh
   (IfcTriangulatedFaceSet), placed at its real position and rotation.
   Units: the model is in inches. Every length is converted to metres once, here (0.0254),
   and IFC declares metres, so Revit imports the object at real scale.
   Up: Z, which is up in both IFC and Revit, so nothing is turned.
   Rotation: X, then Y, then Z (same order as origin.rotateVector and the viewer).
   Node: require('js/core/export_ifc.js'). Browser: window.M3D.exportIFC. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.M3D = Object.assign(root.M3D || {}, api);
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const O = (typeof module !== 'undefined' && module.exports)
    ? require('./origin.js')
    : (typeof self !== 'undefined' ? self : globalThis).M3D;

  const SEGMENTS = 24;   // sides around a cylinder, cone and sphere
  const RINGS = 12;      // sphere rings from pole to pole
  const TO_METRES = { in: 0.0254, mm: 0.001, m: 1, ft: 0.3048 };
  const IFC_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';

  // STEP REAL literal: must contain a dot. Tiny values become 0.
  function num(x) {
    return (Math.abs(x) < 5e-8 ? 0 : x).toFixed(7);
  }
  // STEP string literal. Non-ASCII becomes '?' (names are plain text in practice).
  function str(s) {
    const clean = String(s == null ? '' : s).replace(/[^\x20-\x7e]/g, '?').replace(/'/g, "''");
    return `'${clean}'`;
  }

  // Deterministic 32 hex digits from a string (four FNV-1a hashes with different seeds).
  function hexFromString(s) {
    let out = '';
    for (let seed = 0; seed < 4; seed++) {
      let h = (0x811c9dc5 ^ Math.imul(seed + 1, 0x9e3779b9)) >>> 0;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
      }
      out += h.toString(16).padStart(8, '0');
    }
    return out;
  }

  // 32 hex digits (a UUID without dashes) -> 22-character IFC GlobalId.
  function ifcGuid(hex) {
    let n = BigInt('0x' + hex);
    const digits = [];
    for (let i = 0; i < 21; i++) {
      digits.unshift(IFC_CHARS[Number(n & 63n)]);
      n >>= 6n;
    }
    return IFC_CHARS[Number(n)] + digits.join('');
  }
  function guidFor(uuid) {
    const hex = String(uuid).replace(/-/g, '');
    return ifcGuid(/^[0-9a-fA-F]{32}$/.test(hex) ? hex.toLowerCase() : hexFromString(String(uuid)));
  }

  // Triangles in model coordinates (inches), centred on the object's own origin.
  // Returns null for groups and for anything the viewer would also skip.
  function meshFor(o) {
    const d = o.dimensions || [];
    if (!d.every((x) => Number.isFinite(x) && x > 0)) return null;
    const pts = [];
    const tris = [];
    const add = (p) => { pts.push(p); return pts.length - 1; };
    const tri = (a, b, c) => tris.push([a, b, c]);
    const quad = (a, b, c, e) => { tri(a, b, c); tri(a, c, e); };

    switch (o.type) {
      case 'box': {
        const hx = d[0] / 2, hy = d[1] / 2, hz = d[2] / 2;
        const v = [];
        for (let i = 0; i < 8; i++) v.push(add([i & 1 ? hx : -hx, i & 2 ? hy : -hy, i & 4 ? hz : -hz]));
        quad(v[0], v[2], v[6], v[4]);  // -x
        quad(v[1], v[5], v[7], v[3]);  // +x
        quad(v[0], v[4], v[5], v[1]);  // -y
        quad(v[2], v[3], v[7], v[6]);  // +y
        quad(v[0], v[1], v[3], v[2]);  // -z
        quad(v[4], v[6], v[7], v[5]);  // +z
        break;
      }
      case 'cylinder':
      case 'cone': {
        const r = d[0], h = d[1], cone = o.type === 'cone';
        const bottom = [], top = [];
        for (let i = 0; i < SEGMENTS; i++) {
          const a = (2 * Math.PI * i) / SEGMENTS;
          bottom.push(add([r * Math.cos(a), r * Math.sin(a), -h / 2]));
          if (!cone) top.push(add([r * Math.cos(a), r * Math.sin(a), h / 2]));
        }
        const cb = add([0, 0, -h / 2]);
        const apex = cone ? add([0, 0, h / 2]) : -1;
        const ct = cone ? -1 : add([0, 0, h / 2]);
        for (let i = 0; i < SEGMENTS; i++) {
          const j = (i + 1) % SEGMENTS;
          if (cone) tri(bottom[i], bottom[j], apex);
          else quad(bottom[i], bottom[j], top[j], top[i]);
          tri(cb, bottom[j], bottom[i]);
          if (!cone) tri(ct, top[i], top[j]);
        }
        break;
      }
      case 'sphere': {
        const r = d[0];
        const rows = [];
        for (let j = 0; j <= RINGS; j++) {
          const th = (Math.PI * j) / RINGS;
          const row = [];
          for (let k = 0; k < SEGMENTS; k++) {
            const ph = (2 * Math.PI * k) / SEGMENTS;
            row.push(add([r * Math.sin(th) * Math.cos(ph), r * Math.sin(th) * Math.sin(ph), r * Math.cos(th)]));
          }
          rows.push(row);
        }
        for (let j = 0; j < RINGS; j++) {
          for (let k = 0; k < SEGMENTS; k++) {
            const k1 = (k + 1) % SEGMENTS;
            quad(rows[j][k], rows[j][k1], rows[j + 1][k1], rows[j + 1][k]);
          }
        }
        break;
      }
      default: return null;
    }
    return { pts, tris };
  }

  // Model coordinates (inches) -> metres, with the object's rotation and position applied.
  function toWorld(o, p, scale) {
    const q = O.rotateVector(p, o.rotation_x, o.rotation_y, o.rotation_z);
    return [
      (q[0] + o.position[0]) * scale,
      (q[1] + o.position[1]) * scale,
      (q[2] + o.position[2]) * scale,
    ];
  }

  function colourFor(hex) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
    if (!m) return null;
    return m.slice(1).map((h) => parseInt(h, 16) / 255);
  }

  // Export a replayed model (see geometry.replay) as IFC4 text.
  // opts.now: a Date or ISO string for the file header (tests pass a fixed value).
  // Returns { text, elements, skipped } where skipped lists uuids that could not be drawn.
  function exportIFC(model, opts = {}) {
    const units = model.units || 'in';
    const scale = TO_METRES[units];
    if (!scale) throw new Error(`unknown units: ${units}`);
    const name = model.name || model.model_id || 'Make 3D model';
    const stamp = String(opts.now instanceof Date ? opts.now.toISOString() : (opts.now || new Date().toISOString())).slice(0, 19);
    const base = String(model.model_id || name);
    const fixedGuid = (k) => ifcGuid(hexFromString(base + ':' + k));

    const lines = [];
    let n = 0;
    const e = (body) => { n++; lines.push(`#${n}=${body};`); return `#${n}`; };

    // Units, context and placement (metres, Z up)
    const origin = e('IFCCARTESIANPOINT((0.,0.,0.))');
    const zDir = e('IFCDIRECTION((0.,0.,1.))');
    const xDir = e('IFCDIRECTION((1.,0.,0.))');
    const axis = e(`IFCAXIS2PLACEMENT3D(${origin},${zDir},${xDir})`);
    const ctx = e(`IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,${axis},$)`);
    const siUnits = [
      e('IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)'),
      e('IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)'),
      e('IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.)'),
      e('IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.)'),
    ];
    const unitAssign = e(`IFCUNITASSIGNMENT((${siUnits.join(',')}))`);
    const place = e(`IFCLOCALPLACEMENT($,${axis})`);

    // Project > site > building > storey
    const project = e(`IFCPROJECT('${fixedGuid('project')}',$,${str(name)},$,$,$,$,(${ctx}),${unitAssign})`);
    const site = e(`IFCSITE('${fixedGuid('site')}',$,'Site',$,$,${place},$,$,.ELEMENT.,$,$,$,$,$)`);
    const building = e(`IFCBUILDING('${fixedGuid('building')}',$,'Building',$,$,${place},$,$,.ELEMENT.,$,$,$)`);
    const storey = e(`IFCBUILDINGSTOREY('${fixedGuid('storey')}',$,'Ground',$,$,${place},$,$,.ELEMENT.,0.)`);
    e(`IFCRELAGGREGATES('${fixedGuid('rel-project-site')}',$,$,$,${project},(${site}))`);
    e(`IFCRELAGGREGATES('${fixedGuid('rel-site-building')}',$,$,$,${site},(${building}))`);
    e(`IFCRELAGGREGATES('${fixedGuid('rel-building-storey')}',$,$,$,${building},(${storey}))`);

    // One surface style per material colour
    const styles = {};
    const styleFor = (key) => {
      if (key in styles) return styles[key];
      const mat = (model.materials || {})[key];
      const rgb = mat && colourFor(mat.color);
      if (!rgb) return (styles[key] = null);
      const colour = e(`IFCCOLOURRGB($,${rgb.map(num).join(',')})`);
      styles[key] = e(`IFCSURFACESTYLE($,.BOTH.,(${colour}))`);
      return styles[key];
    };

    // Objects
    const elements = [];
    const skipped = [];
    for (const o of model.objects || []) {
      const mesh = meshFor(o);
      const pos = o.position;
      const placeable = Array.isArray(pos) && pos.length === 3 && pos.every(Number.isFinite);
      if (!mesh || !placeable) { if (mesh || o.type !== 'group') skipped.push(o.uuid); continue; }

      const coords = mesh.pts.map((p) => `(${toWorld(o, p, scale).map(num).join(',')})`);
      const pointList = e(`IFCCARTESIANPOINTLIST3D((${coords.join(',')}))`);
      const faces = e(`IFCTRIANGULATEDFACESET(${pointList},.F.,$,(${mesh.tris.map((t) => `(${t.map((i) => i + 1).join(',')})`).join(',')}))`);
      const style = styleFor(o.material);
      if (style) e(`IFCSTYLEDITEM(${faces},(${style}),$)`);
      const shape = e(`IFCSHAPEREPRESENTATION(${ctx},'Body','Tessellation',(${faces}))`);
      const definition = e(`IFCPRODUCTDEFINITIONSHAPE($,$,(${shape}))`);
      const tags = Array.isArray(o.tags) && o.tags.length ? str(o.tags.join(', ')) : '$';
      const desc = o.description ? str(o.description) : '$';
      elements.push(e(`IFCBUILDINGELEMENTPROXY('${guidFor(o.uuid)}',$,${str(o.name || o.uuid)},${desc},${tags},${place},${definition},$,$,.NOTDEFINED.)`));
    }
    if (elements.length) {
      e(`IFCRELCONTAINEDINSPATIALSTRUCTURE('${fixedGuid('rel-storey-elements')}',$,$,$,(${elements.join(',')}),${storey})`);
    }

    const text = [
      'ISO-10303-21;',
      'HEADER;',
      "FILE_DESCRIPTION(('ViewDefinition [DesignTransferView]'),'2;1');",
      `FILE_NAME(${str((opts.filename || name) + '.ifc')},${str(stamp)},(''),(''),'Make 3D','Make 3D','');`,
      "FILE_SCHEMA(('IFC4'));",
      'ENDSEC;',
      'DATA;',
      ...lines,
      'ENDSEC;',
      'END-ISO-10303-21;',
      '',
    ].join('\n');
    return { text, elements: elements.length, skipped };
  }

  return { exportIFC, ifcGuid, hexFromString, meshFor, TO_METRES };
});
