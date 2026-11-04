// Plans and elevations from a model, so the drawings and the 3-D scene cannot drift apart.
// Run: node tools/drawings.js <model id> <output dir>   e.g. node tools/drawings.js living-room-v15 drawings/v15
// Writes plan.svg and one elevation per side of the room (the walls you see when you stand inside facing that side).
// Units: inches in the model; drawings are at 3 px per inch. Dimensions shown as feet and inches.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const [, , modelId, outDir] = process.argv;
if (!modelId || !outDir) { console.error('usage: drawings.js <model id> <output dir>'); process.exit(2); }
const model = JSON.parse(fs.readFileSync(path.join(root, 'models', modelId, 'model.json'), 'utf8'));
const objects = model.objects;
const byId = new Map(objects.map((o) => [o.uuid, o]));
const kids = new Map();
for (const o of objects) if (o.parent) { if (!kids.has(o.parent)) kids.set(o.parent, []); kids.get(o.parent).push(o); }

const S = 3;          // px per inch
const M = 90;         // margin, px
const ftin = (n) => { const f = Math.floor(Math.abs(n) / 12); const i = Math.round(Math.abs(n) % 12); return `${n < 0 ? '-' : ''}${f}′-${i}″`; };
const colorOf = (o) => {
  if (o.material && model.materials && model.materials[o.material]) return model.materials[o.material].color;
  for (const c of kids.get(o.uuid) || []) { const k = colorOf(c); if (k) return k; }
  return null;
};

// Box of one object, [x0,x1,y0,y1,z0,z1].
function leafBox(o) {
  const p = o.position; const d = o.dimensions;
  if (o.type === 'box') return [p[0] - d[0] / 2, p[0] + d[0] / 2, p[1] - d[1] / 2, p[1] + d[1] / 2, p[2] - d[2] / 2, p[2] + d[2] / 2];
  if (o.type === 'cylinder' || o.type === 'cone') return [p[0] - d[0], p[0] + d[0], p[1] - d[0], p[1] + d[0], p[2] - d[1] / 2, p[2] + d[1] / 2];
  if (o.type === 'sphere') return [p[0] - d[0], p[0] + d[0], p[1] - d[0], p[1] + d[0], p[2] - d[0], p[2] + d[0]];
  return null;
}
// Box of an object or a group (union of its descendants).
function boxOf(o) {
  const own = leafBox(o);
  const sub = (kids.get(o.uuid) || []).map(boxOf).filter(Boolean);
  const all = own ? [own, ...sub] : sub;
  if (!all.length) return null;
  return [Math.min(...all.map((b) => b[0])), Math.max(...all.map((b) => b[1])), Math.min(...all.map((b) => b[2])),
    Math.max(...all.map((b) => b[3])), Math.min(...all.map((b) => b[4])), Math.max(...all.map((b) => b[5]))];
}
// Kind by name: shell parts are walls, glass, doors, trim and floor; everything else is furniture or decor.
function kindOf(name) {
  if (/^floor/i.test(name)) return 'floor';
  if (/glass/i.test(name)) return 'glass';
  if (/frame|jamb|head|trim|handle|switch|baseboard/i.test(name)) return 'trim';
  if (/^front door$|^door$|^door, /i.test(name)) return 'door';
  if (/wall|above|below/i.test(name)) return 'wall';
  return 'furn';
}
const SHELL = new Set(['wall', 'glass', 'door', 'trim', 'floor']);

// Units: shell leaves individually; furniture as one unit per top-level object (groups as their union).
const units = [];
for (const o of objects) {
  if (o.parent) continue;
  if (/^ceiling/i.test(o.name)) continue; // the ceiling is not drawn on the plan or the elevations
  const sub = kids.get(o.uuid) || [];
  // Collections of separate items are drawn part by part; a single piece of furniture stays one unit.
  const collection = /(shell|windows|ceiling|things|plants|table and chairs|decor|items)$/i.test(o.name);
  const expand = o.type === 'group' && (collection || sub.some((c) => SHELL.has(kindOf(c.name))));
  if (expand) {
    const stack = [...sub];
    while (stack.length) {
      const c = stack.pop();
      if (c.type === 'group') { stack.push(...(kids.get(c.uuid) || [])); continue; }
      const b = leafBox(c); if (!b) continue;
      units.push({ name: c.name, kind: kindOf(c.name), b, color: colorOf(c) });
    }
    continue;
  }
  const b = boxOf(o); if (!b) continue;
  const k = kindOf(o.name);
  units.push({ name: o.name, kind: o.type === 'group' ? 'furn' : k, b, color: colorOf(o) });
}

// Room extent from the floor.
const floor = units.find((u) => u.kind === 'floor');
const [X0, X1, Y0, Y1] = floor ? floor.b : [0, 156, 0, 216];
const W = X1 - X0, L = Y1 - Y0;
const H = 96;

const lineStyle = { wall: '#3d3d3d', trim: '#7a7a7a', glass: '#4a8fc2', door: '#6b4a2e' };
const fillOf = (u) => (u.kind === 'glass' ? '#cfe9f5' : u.kind === 'door' ? '#8a5a3c' : u.color || '#c9c2b4');

// ---------- plan -------------------------------------------------------------
function svgPlan() {
  const w = W * S + 2 * M, h = L * S + 2 * M + 40;
  const px = (x) => M + (x - X0) * S;
  const py = (y) => M + (Y1 - y) * S; // +y is up on the plan, so the far wall is at the top
  let out = [];
  out.push(`<rect x="${M}" y="${M}" width="${W * S}" height="${L * S}" fill="#fbf8f1" stroke="none"/>`);
  // Floor/walls first, then openings, then furniture on top.
  for (const u of units.filter((u) => u.kind === 'wall')) {
    const [x0, x1, y0, y1] = u.b;
    out.push(`<rect x="${px(x0)}" y="${py(y1)}" width="${(x1 - x0) * S}" height="${(y1 - y0) * S}" fill="#4a4540"/>`);
  }
  for (const u of units.filter((u) => u.kind === 'glass')) {
    const [x0, x1, y0, y1] = u.b;
    out.push(`<rect x="${px(x0)}" y="${py(y1)}" width="${(x1 - x0) * S}" height="${Math.max(1.5, (y1 - y0) * S)}" fill="#8cc4e4" stroke="#2f6f9a" stroke-width="0.6"/>`);
  }
  for (const u of units.filter((u) => u.kind === 'door')) {
    const [x0, x1, y0, y1] = u.b;
    out.push(`<rect x="${px(x0)}" y="${py(y1)}" width="${Math.max(1.5, (x1 - x0) * S)}" height="${Math.max(1.5, (y1 - y0) * S)}" fill="#8a5a3c"/>`);
  }
  for (const u of units.filter((u) => u.kind === 'trim')) {
    const [x0, x1, y0, y1] = u.b;
    out.push(`<rect x="${px(x0)}" y="${py(y1)}" width="${Math.max(1, (x1 - x0) * S)}" height="${Math.max(1, (y1 - y0) * S)}" fill="#ffffff" stroke="#7a7a7a" stroke-width="0.4"/>`);
  }
  for (const u of units.filter((u) => u.kind === 'furn')) {
    const [x0, x1, y0, y1, z0, z1] = u.b;
    if (z1 < 3) continue; // rug, mats: shown on plan only when raised
    const big = (x1 - x0) * (y1 - y0) > 60;
    out.push(`<rect x="${px(x0)}" y="${py(y1)}" width="${Math.max(2, (x1 - x0) * S)}" height="${Math.max(2, (y1 - y0) * S)}" fill="${fillOf(u)}" fill-opacity="0.85" stroke="#2a2a2a" stroke-width="0.5"/>`);
    if (big) out.push(`<text x="${px((x0 + x1) / 2)}" y="${py((y0 + y1) / 2) + 3}" font-size="7.5" text-anchor="middle" font-family="sans-serif" fill="#222">${esc(short(u.name))}</text>`);
  }
  // dimensions
  const dimY = M + L * S + 22, dimX = M - 22;
  out.push(`<line x1="${M}" y1="${dimY}" x2="${M + W * S}" y2="${dimY}" stroke="#222" stroke-width="0.6"/>`);
  out.push(`<text x="${M + (W * S) / 2}" y="${dimY + 12}" font-size="10" text-anchor="middle" font-family="sans-serif">${ftin(W)} clear</text>`);
  out.push(`<line x1="${dimX}" y1="${M}" x2="${dimX}" y2="${M + L * S}" stroke="#222" stroke-width="0.6"/>`);
  out.push(`<text x="${dimX - 6}" y="${M + (L * S) / 2}" font-size="10" text-anchor="middle" font-family="sans-serif" transform="rotate(-90 ${dimX - 6} ${M + (L * S) / 2})">${ftin(L)} clear</text>`);
  // north arrow: the camera side is the open near end (y = 0), so "near" is at the bottom of the plan
  out.push(`<text x="${M}" y="${M - 14}" font-size="10" font-family="sans-serif">Plan. Near end (open) at the bottom; far wall at the top.</text>`);
  return svg(w, h, out, `${modelId} · plan · ${ftin(W)} × ${ftin(L)} · scale 3 px = 1 in`);
}

// ---------- elevation ----------------------------------------------------------
// Standing inside, facing a side: u is the horizontal axis left to right, depth is distance from that side's wall.
const SIDES = {
  'left-wall': { plane: 'x0', u: (b) => [b[2], b[3]], depth: (b) => b[0], title: 'Elevation: left wall (TV wall)' },
  'right-wall': { plane: 'x1', u: (b) => [L - b[3], L - b[2]], depth: (b) => W - b[1], title: 'Elevation: right wall' },
  'near-end': { plane: 'y0', u: (b) => [W - b[1], W - b[0]], depth: (b) => b[2], title: 'Elevation: near end (open end)' },
  'far-wall': { plane: 'y1', u: (b) => [b[0], b[1]], depth: (b) => L - b[3], title: 'Elevation: far wall' },
};
const planeValue = { x0: X0, x1: X1, y0: Y0, y1: Y1 };
function onSide(u, side) {
  const b = u.b;
  if (side === 'x0') return Math.abs(b[0] - X0) < 6 || b[1] - X0 < 6;
  if (side === 'x1') return Math.abs(b[1] - X1) < 6 || X1 - b[0] < 6;
  if (side === 'y0') return Math.abs(b[2] - Y0) < 6 || b[3] - Y0 < 6;
  if (side === 'y1') return Math.abs(b[3] - Y1) < 6 || Y1 - b[2] < 6;
  return false;
}
function svgElevation(name) {
  const cfg = SIDES[name];
  const side = cfg.plane;
  const len = side === 'x0' || side === 'x1' ? L : W;
  const w = len * S + 2 * M, h = H * S + 2 * M + 30;
  const ox = M, oy = M; // origin top left of the wall, z measured up from the floor
  const pz = (z) => oy + (H - z) * S;
  const pu = (u) => ox + u * S;
  const out = [];
  out.push(`<rect x="${ox}" y="${oy}" width="${len * S}" height="${H * S}" fill="#fbf8f1" stroke="#444" stroke-width="0.8"/>`);
  // Walls on this side (background to the openings).
  const shell = units.filter((u) => (u.kind === 'wall') && onSide(u, side));
  for (const u of shell) {
    const [u0, u1] = cfg.u(u.b); const z0 = u.b[4], z1 = u.b[5];
    out.push(`<rect x="${pu(u0)}" y="${pz(z1)}" width="${(u1 - u0) * S}" height="${(z1 - z0) * S}" fill="#d9d2c3" stroke="#555" stroke-width="0.3"/>`);
  }
  // Furniture and decor, farther from the wall first.
  const things = units.filter((u) => u.kind === 'furn' || u.kind === 'trim' || u.kind === 'glass' || u.kind === 'door');
  things.sort((a, b) => cfg.depth(b.b) - cfg.depth(a.b));
  for (const u of things) {
    const [u0, u1] = cfg.u(u.b); const z0 = u.b[4], z1 = u.b[5];
    if (u1 < -1 || u0 > len + 1) continue;
    const onThisWall = (u.kind === 'glass' || u.kind === 'door' || u.kind === 'trim') ? onSide(u, side) : true;
    if (!onThisWall) continue;
    const fill = u.kind === 'glass' ? '#cfe9f5' : u.kind === 'door' ? '#8a5a3c' : u.kind === 'trim' ? '#ffffff' : fillOf(u);
    const stroke = u.kind === 'glass' ? '#2f6f9a' : '#2a2a2a';
    out.push(`<rect x="${pu(u0)}" y="${pz(z1)}" width="${Math.max(1.5, (u1 - u0) * S)}" height="${Math.max(1.5, (z1 - z0) * S)}" fill="${fill}" fill-opacity="${u.kind === 'furn' ? 0.9 : 1}" stroke="${stroke}" stroke-width="0.4"/>`);
  }
  // Labels for the larger furniture units and openings.
  for (const u of things.filter((u) => u.kind === 'furn')) {
    const [u0, u1] = cfg.u(u.b);
    const wu = (u1 - u0);
    if (wu * (u.b[5] - u.b[4]) < 1500 || !onRange(u0, u1, len)) continue;
    out.push(`<text x="${pu((u0 + u1) / 2)}" y="${pz((u.b[4] + u.b[5]) / 2) + 3}" font-size="7.5" text-anchor="middle" font-family="sans-serif" fill="#111">${esc(short(u.name))}</text>`);
  }
  // Openings: dimensions from the sill and head, and the width.
  for (const u of units.filter((u) => u.kind === 'glass' && onSide(u, side))) {
    const [u0, u1] = cfg.u(u.b);
    const sill = u.b[4], head = u.b[5];
    out.push(`<text x="${pu((u0 + u1) / 2)}" y="${pz(head) - 4}" font-size="7.5" text-anchor="middle" font-family="sans-serif" fill="#1f5b80">${ftin(u1 - u0)} wide</text>`);
    out.push(`<text x="${pu(u1) + 3}" y="${pz(sill) + 3}" font-size="7" font-family="sans-serif" fill="#1f5b80">sill ${ftin(sill)}</text>`);
  }
  // Ceiling height and length dimensions.
  out.push(`<line x1="${ox}" y1="${pz(H) - 10}" x2="${ox + len * S}" y2="${pz(H) - 10}" stroke="#222" stroke-width="0.5"/>`);
  out.push(`<text x="${ox + (len * S) / 2}" y="${pz(H) - 13}" font-size="9" text-anchor="middle" font-family="sans-serif">${ftin(len)} wall · ceiling ${ftin(H)}</text>`);
  out.push(`<text x="${ox}" y="${oy - 12}" font-size="10" font-family="sans-serif">${esc(cfg.title)} · ${esc(modelId)}</text>`);
  return svg(w, h, out, cfg.title);
}
function onRange(u0, u1, len) { return u1 > 0 && u0 < len; }

function short(n) { return n.replace(/, leaf cluster.*$/, '').replace(/ \d+$/, '').slice(0, 26); }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function svg(w, h, body, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w)}" height="${Math.round(h)}" viewBox="0 0 ${Math.round(w)} ${Math.round(h)}">
<title>${esc(title)}</title>
<rect width="100%" height="100%" fill="#ffffff"/>
${body.join('\n')}
</svg>
`;
}

// Stitch: put the plan and the four elevations on one sheet, one above the other (the sheet the drawings print from).
function stitch(parts, title) {
  const sizes = parts.map((p) => [Number(p.match(/width="(\d+)"/)[1]), Number(p.match(/height="(\d+)"/)[1])]);
  const W = Math.max(...sizes.map((z) => z[0]));
  let y = 0; const body = [];
  parts.forEach((p, i) => {
    const inner = p.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    body.push(`<g transform="translate(0,${y})">${inner}</g>`);
    y += sizes[i][1] + 20;
  });
  return svg(W, y, body, title);
}

fs.mkdirSync(outDir, { recursive: true });
const plan = svgPlan();
const elevs = Object.keys(SIDES).map((name) => svgElevation(name));
fs.writeFileSync(path.join(outDir, 'plan.svg'), plan);
Object.keys(SIDES).forEach((name, i) => fs.writeFileSync(path.join(outDir, `elev-${name}.svg`), elevs[i]));
fs.writeFileSync(path.join(outDir, 'sheet.svg'), stitch([plan, ...elevs], `${modelId} · plan and elevations`));
console.log(`wrote plan and ${Object.keys(SIDES).length} elevations for ${modelId} to ${outDir} (room ${ftin(W)} × ${ftin(L)} × ${ftin(H)})`);
