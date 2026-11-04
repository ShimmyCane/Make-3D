/* Make 3D V2 (P5): GLB writer. Pure JS, no three.js and no addon: the viewer hands it plain typed arrays.
   parts: [{ name, positions: Float32Array xyz, normals: Float32Array xyz, uvs?: Float32Array uv, indices: Uint32Array,
             material: { color: [r, g, b] (0 to 1), opacity, metallic, roughness,
                         texture?: { width, height, rgba: Uint8Array } } }]
   Output: Uint8Array of a binary glTF 2.0 file (.glb). Y is up, as in the viewer scene.
   Patterns are written as PNG, stored without compression (no zlib needed in the browser). */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.M3D = Object.assign(root.M3D || {}, api);
})(typeof self !== 'undefined' ? self : globalThis, function () {
  // ---- checksums and PNG (stored deflate blocks) ----
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function adler32(bytes) {
    let a = 1, b = 0;
    for (let i = 0; i < bytes.length; i++) { a = (a + bytes[i]) % 65521; b = (b + a) % 65521; }
    return ((b << 16) | a) >>> 0;
  }
  function be32(v) { return [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff]; }
  function concat(parts) {
    const len = parts.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(len);
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  }
  function pngChunk(type, data) {
    const typeBytes = Array.from(type, (c) => c.charCodeAt(0));
    const body = concat([Uint8Array.from(typeBytes), data]);
    return concat([Uint8Array.from(be32(data.length)), body, Uint8Array.from(be32(crc32(body)))]);
  }
  // rgba: width * height * 4 bytes, top row first. Each row starts with filter byte 0 (none).
  function encodePng(width, height, rgba) {
    const raw = new Uint8Array(height * (width * 4 + 1));
    for (let y = 0; y < height; y++) {
      raw[y * (width * 4 + 1)] = 0;
      raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
    }
    // zlib stream: header, stored blocks of up to 65535 bytes, Adler-32 trailer
    const blocks = [Uint8Array.from([0x78, 0x01])];
    for (let pos = 0; pos < raw.length || pos === 0; pos += 65535) {
      const len = Math.min(65535, raw.length - pos);
      const last = pos + len >= raw.length ? 1 : 0;
      blocks.push(Uint8Array.from([last, len & 0xff, len >>> 8, (~len) & 0xff, ((~len) >>> 8) & 0xff]));
      blocks.push(raw.subarray(pos, pos + len));
      if (last) break;
    }
    blocks.push(Uint8Array.from(be32(adler32(raw))));
    const ihdr = Uint8Array.from([...be32(width), ...be32(height), 8, 6, 0, 0, 0]); // 8-bit RGBA
    return concat([
      Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
      pngChunk('IHDR', ihdr),
      pngChunk('IDAT', concat(blocks)),
      pngChunk('IEND', new Uint8Array(0)),
    ]);
  }

  // ---- GLB ----
  const pad4 = (n) => (n + 3) & ~3;
  function minMax(arr, n) {
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < arr.length; i += n) for (let k = 0; k < n; k++) {
      mn[k] = Math.min(mn[k], arr[i + k]); mx[k] = Math.max(mx[k], arr[i + k]);
    }
    return { min: mn, max: mx };
  }

  function buildGlb(parts, { generator = 'Make 3D V2' } = {}) {
    const json = { asset: { version: '2.0', generator }, scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [],
      materials: [], textures: [], images: [], accessors: [], bufferViews: [], buffers: [] };
    const bin = [];
    let byteLength = 0;
    const addView = (bytes, target) => {
      const offset = byteLength;
      bin.push(bytes);
      const padded = pad4(bytes.length);
      if (padded > bytes.length) bin.push(new Uint8Array(padded - bytes.length));
      byteLength += padded;
      const view = { buffer: 0, byteOffset: offset, byteLength: bytes.length };
      if (target) view.target = target;
      json.bufferViews.push(view);
      return json.bufferViews.length - 1;
    };
    const addAccessor = (view, type, componentType, count, extra = {}) => {
      json.accessors.push({ bufferView: view, componentType, count, type, ...extra });
      return json.accessors.length - 1;
    };
    const f32 = (a) => new Uint8Array(new Float32Array(a).buffer);
    const u32 = (a) => new Uint8Array(new Uint32Array(a).buffer);

    parts.forEach((part, i) => {
      const mat = part.material || {};
      const color = mat.color || [0.8, 0.8, 0.8];
      const material = {
        pbrMetallicRoughness: {
          baseColorFactor: [color[0], color[1], color[2], mat.opacity ?? 1],
          metallicFactor: mat.metallic ?? 0,
          roughnessFactor: mat.roughness ?? 0.75,
        },
        doubleSided: true,
      };
      if ((mat.opacity ?? 1) < 1) material.alphaMode = 'BLEND';
      if (mat.texture) {
        json.images.push({ bufferView: addView(encodePng(mat.texture.width, mat.texture.height, mat.texture.rgba)), mimeType: 'image/png' });
        json.textures.push({ source: json.images.length - 1 });
        material.pbrMetallicRoughness.baseColorTexture = { index: json.textures.length - 1 };
      }
      json.materials.push(material);
      const posVals = part.positions, count = posVals.length / 3;
      const pos = addAccessor(addView(f32(posVals), 34962), 'VEC3', 5126, count, minMax(posVals, 3));
      const nor = addAccessor(addView(f32(part.normals), 34962), 'VEC3', 5126, count);
      const attributes = { POSITION: pos, NORMAL: nor };
      if (part.uvs) attributes.TEXCOORD_0 = addAccessor(addView(f32(part.uvs), 34962), 'VEC2', 5126, count);
      const idx = addAccessor(addView(u32(part.indices), 34963), 'SCALAR', 5125, part.indices.length);
      json.meshes.push({ name: part.name || `part ${i + 1}`, primitives: [{ attributes, indices: idx, material: i, mode: 4 }] });
      json.nodes.push({ name: part.name || `part ${i + 1}`, mesh: i });
      json.scenes[0].nodes.push(i);
    });
    json.buffers.push({ byteLength });

    let jsonBytes = new TextEncoder().encode(JSON.stringify(json));
    const jsonPad = pad4(jsonBytes.length) - jsonBytes.length;
    jsonBytes = concat([jsonBytes, new Uint8Array(jsonPad).fill(0x20)]);
    const binBytes = concat(bin);
    const total = 12 + 8 + jsonBytes.length + 8 + binBytes.length;
    const header = new DataView(new ArrayBuffer(12));
    header.setUint32(0, 0x46546c67, true);  // 'glTF'
    header.setUint32(4, 2, true);
    header.setUint32(8, total, true);
    const jsonHead = new DataView(new ArrayBuffer(8));
    jsonHead.setUint32(0, jsonBytes.length, true); jsonHead.setUint32(4, 0x4e4f534a, true);   // 'JSON'
    const binHead = new DataView(new ArrayBuffer(8));
    binHead.setUint32(0, binBytes.length, true); binHead.setUint32(4, 0x004e4942, true);      // 'BIN'
    return concat([new Uint8Array(header.buffer), new Uint8Array(jsonHead.buffer), jsonBytes,
      new Uint8Array(binHead.buffer), binBytes]);
  }

  return { buildGlb, encodePng, crc32, adler32 };
});
