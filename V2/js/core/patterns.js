/* Make 3D — canvas-free pattern textures (V2, P2). Pure JS: no DOM, no canvas, no image files.
   A material entry may set pattern ('none' | 'wood' | 'tile' | 'stripe'), pattern_color and pattern_scale.
   patternPixels() returns one seamless tile as RGBA bytes; the viewer wraps it in a THREE.DataTexture.
   Every frequency is a whole number of periods per tile, so the tile repeats without a seam. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.M3D = Object.assign(root.M3D || {}, api);
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const S = (typeof module !== 'undefined' && module.exports)
    ? require('./schema.js')
    : (typeof self !== 'undefined' ? self : globalThis).M3D;

  const TILE = 64; // pixels per side of one pattern tile

  const hexToRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgbToHex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const darker = (hex) => rgbToHex(mix(hexToRgb(hex), [0, 0, 0], 0.35));

  // The pattern spec for one material entry, or null when the material is flat.
  function patternSpec(m) {
    if (!m || !m.pattern || m.pattern === 'none') return null;
    if (!S.PATTERN_NAMES.includes(m.pattern)) return null;
    const color = m.color || S.MATERIAL_DEFAULTS.color;
    return {
      pattern: m.pattern,
      color,
      pattern_color: m.pattern_color || darker(color),
      scale: Number.isInteger(m.pattern_scale) ? m.pattern_scale : 1,
    };
  }

  // Cache key: two materials with the same key share one texture.
  const patternKey = (spec) => [spec.pattern, spec.color, spec.pattern_color, spec.scale].join('|');

  // One tile as RGBA. u and v run 0 to 1 across the tile; sines of whole periods are seamless at the edges.
  function patternPixels(spec, size = TILE) {
    const base = hexToRgb(spec.color), second = hexToRgb(spec.pattern_color);
    const out = new Uint8ClampedArray(size * size * 4);
    const TAU = Math.PI * 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size, v = y / size;
        let c;
        if (spec.pattern === 'wood') {
          // long rings (4 per tile across v, wobbling with u) plus fine grain (24 per tile across u)
          const ring = 0.5 + 0.5 * Math.sin(TAU * (4 * v + 0.8 * Math.sin(TAU * u)));
          const grain = 0.5 + 0.5 * Math.sin(TAU * (24 * u + 0.3 * Math.sin(TAU * 2 * v)));
          c = mix(second, base, 0.6 * ring + 0.4 * grain);
        } else if (spec.pattern === 'tile') {
          // 2 by 2 tiles with grout lines; every other tile is a touch lighter
          const half = size / 2, grout = Math.max(1, Math.round(size / 32));
          const tx = x % half, ty = y % half;
          if (tx < grout || ty < grout) c = second;
          else c = ((Math.floor(x / half) + Math.floor(y / half)) % 2) ? base : mix(base, [255, 255, 255], 0.08);
        } else if (spec.pattern === 'stripe') {
          // stripes running along v: eight bands per tile
          c = (Math.floor(x / (size / 8)) % 2) ? second : base;
        } else if (spec.pattern === 'leaf') {
          // thin veins on a diagonal (abs of a whole-period sine is seamless), with soft shading from a 6 by 6 grid
          const vein = Math.abs(Math.sin(Math.PI * (4 * u + v)));
          const spot = 0.5 + 0.5 * Math.sin(TAU * 6 * u) * Math.sin(TAU * 6 * v);
          c = vein < 0.12 ? second : mix(second, base, 0.55 + 0.45 * spot);
        } else {
          c = base;
        }
        const i = (y * size + x) * 4;
        out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; out[i + 3] = 255;
      }
    }
    return out;
  }

  return { TILE, patternSpec, patternKey, patternPixels };
});
