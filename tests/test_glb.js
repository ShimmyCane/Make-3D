// Node tests for the GLB writer (js/core/glb.js, P5). Run: node tests/test_glb.js
const assert = require('assert');
const path = require('path');
const zlib = require('zlib');
const GLB = require(path.join(root(), 'js/core/glb.js'));
function root() { return path.join(__dirname, '..'); }

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };

// read a GLB back: returns { json, bin }
function readGlb(bytes) {
  const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.strictEqual(buf.toString('latin1', 0, 4), 'glTF');
  assert.strictEqual(buf.readUInt32LE(4), 2, 'glTF version 2');
  assert.strictEqual(buf.readUInt32LE(8), buf.length, 'total length in header');
  const jLen = buf.readUInt32LE(12);
  assert.strictEqual(buf.readUInt32LE(16), 0x4e4f534a, 'JSON chunk');
  const json = JSON.parse(buf.toString('utf8', 20, 20 + jLen));
  const bStart = 20 + jLen;
  const bLen = buf.readUInt32LE(bStart);
  assert.strictEqual(buf.readUInt32LE(bStart + 4), 0x004e4942, 'BIN chunk');
  return { json, bin: buf.subarray(bStart + 8, bStart + 8 + bLen) };
}
const view = (json, bin, accessorIndex) => {
  const a = json.accessors[accessorIndex], v = json.bufferViews[a.bufferView];
  return { a, bytes: bin.subarray(v.byteOffset, v.byteOffset + v.byteLength) };
};

// a unit quad (two triangles) with a 2 by 2 texture
const quad = {
  name: 'quad',
  positions: new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]),
  normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
  uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
  indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
  material: { color: [0.5, 0.25, 0.125], opacity: 1, metallic: 0.5, roughness: 0.2,
    texture: { width: 2, height: 2, rgba: new Uint8Array([255,0,0,255, 0,255,0,255, 0,0,255,255, 9,9,9,255]) } },
};

t('glb: header, JSON and BIN chunks are well formed', () => {
  const { json, bin } = readGlb(GLB.buildGlb([quad]));
  assert.strictEqual(json.asset.version, '2.0');
  assert.strictEqual(json.meshes.length, 1);
  assert.strictEqual(json.buffers[0].byteLength, bin.length);
});

t('glb: positions, normals and indices read back exactly', () => {
  const { json, bin } = readGlb(GLB.buildGlb([quad]));
  const prim = json.meshes[0].primitives[0];
  const pos = view(json, bin, prim.attributes.POSITION);
  assert.deepStrictEqual(Array.from(new Float32Array(pos.bytes.buffer.slice(pos.bytes.byteOffset, pos.bytes.byteOffset + pos.bytes.length))), Array.from(quad.positions));
  assert.deepStrictEqual(pos.a.min, [0, 0, 0]);
  assert.deepStrictEqual(pos.a.max, [1, 1, 0]);
  const idx = view(json, bin, prim.indices);
  assert.deepStrictEqual(Array.from(new Uint32Array(idx.bytes.buffer.slice(idx.bytes.byteOffset, idx.bytes.byteOffset + idx.bytes.length))), Array.from(quad.indices));
  assert.strictEqual(idx.a.count, 6);
  assert.ok(prim.attributes.TEXCOORD_0 !== undefined, 'uvs written');
});

t('glb: material carries colour, metallic, roughness and the texture', () => {
  const { json } = readGlb(GLB.buildGlb([quad]));
  const m = json.materials[0].pbrMetallicRoughness;
  assert.deepStrictEqual(m.baseColorFactor, [0.5, 0.25, 0.125, 1]);
  assert.strictEqual(m.metallicFactor, 0.5);
  assert.strictEqual(m.roughnessFactor, 0.2);
  assert.strictEqual(json.images[0].mimeType, 'image/png');
  assert.strictEqual(json.textures[m.baseColorTexture.index].source, 0);
});

t('glb: the embedded PNG decodes to the same pixels (checked with zlib and its CRCs)', () => {
  const { json, bin } = readGlb(GLB.buildGlb([quad]));
  const v = json.bufferViews[json.images[0].bufferView];
  const png = bin.subarray(v.byteOffset, v.byteOffset + v.byteLength);
  assert.deepStrictEqual(Array.from(png.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
  // walk the chunks: each CRC must match the chunk's type and data
  let p = 8, idat = null, ihdrW = 0, ihdrH = 0;
  while (p < png.length) {
    const len = png.readUInt32BE(p), type = png.toString('latin1', p + 4, p + 8);
    const data = png.subarray(p + 8, p + 8 + len);
    assert.strictEqual(png.readUInt32BE(p + 8 + len), zlib.crc32(png.subarray(p + 4, p + 8 + len)) >>> 0, `CRC of ${type}`);
    if (type === 'IHDR') { ihdrW = data.readUInt32BE(0); ihdrH = data.readUInt32BE(4); }
    if (type === 'IDAT') idat = data;
    p += 12 + len;
  }
  assert.strictEqual(ihdrW, 2); assert.strictEqual(ihdrH, 2);
  const raw = zlib.inflateSync(idat);
  const rows = [];
  for (let y = 0; y < 2; y++) {
    assert.strictEqual(raw[y * 9], 0, 'filter byte');
    rows.push(Array.from(raw.subarray(y * 9 + 1, y * 9 + 9)));
  }
  assert.deepStrictEqual(rows.flat(), Array.from(quad.material.texture.rgba));
});

t('glb: a larger texture (more than one stored block) still decodes', () => {
  const W = 128, rgba = new Uint8Array(W * W * 4);
  for (let i = 0; i < rgba.length; i++) rgba[i] = (i * 31) & 0xff;
  const png = GLB.encodePng(W, W, rgba);
  // find IDAT and inflate
  let p = 8, idat = null;
  while (p < png.length) {
    const len = Buffer.from(png).readUInt32BE(p), type = Buffer.from(png).toString('latin1', p + 4, p + 8);
    if (type === 'IDAT') idat = Buffer.from(png.subarray(p + 8, p + 8 + len));
    p += 12 + len;
  }
  const raw = zlib.inflateSync(idat);
  assert.strictEqual(raw.length, W * (W * 4 + 1));
  for (let y = 0; y < W; y++) assert.deepStrictEqual(Array.from(raw.subarray(y * (W * 4 + 1) + 1, (y + 1) * (W * 4 + 1))), Array.from(rgba.subarray(y * W * 4, (y + 1) * W * 4)));
});

t('glb: a part without a texture or uvs still writes, and two parts give two nodes', () => {
  const plain = { name: 'plain', positions: quad.positions, normals: quad.normals, indices: quad.indices, material: { color: [1, 1, 1] } };
  const { json } = readGlb(GLB.buildGlb([quad, plain]));
  assert.strictEqual(json.nodes.length, 2);
  assert.strictEqual(json.scenes[0].nodes.length, 2);
  assert.strictEqual(json.textures.length, 1, 'only the first part has a texture');
  assert.strictEqual(json.materials[1].pbrMetallicRoughness.baseColorTexture, undefined);
});

t('glb: translucent materials are marked as blended', () => {
  const glass = Object.assign({}, quad, { material: { color: [0.8, 0.9, 1], opacity: 0.3 } });
  const { json } = readGlb(GLB.buildGlb([glass]));
  assert.strictEqual(json.materials[0].alphaMode, 'BLEND');
});

console.log(`\n${n} test groups passed`);
