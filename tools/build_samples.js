// Builds every sample scene from tools/scenes.js: operation list -> replay -> model check.
// Writes models/<id>/{history,model}.json and js/samples.bundle.js.
// Run: node tools/build_samples.js   (from the project folder). Never hand-edit the generated files.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const G = require(path.join(root, 'js/core/geometry.js'));
const R = require(path.join(root, 'js/core/rules.js'));
const S = require(path.join(root, 'js/core/schema.js'));
const MO = require(path.join(root, 'js/core/motion.js'));
const { SCENES } = require(path.join(__dirname, 'scenes.js'));
const worldFor = (id) => JSON.parse(fs.readFileSync(path.join(root, 'worlds', `${id}.json`), 'utf8'));
const crypto = require('crypto');
const { execFileSync } = require('child_process');

// Library order: when each scene was created and last changed. Kept in models/scene_dates.json so the
// build is repeatable. A scene seen for the first time takes its dates from git (or now, if not committed).
// When a scene's history or motion changes, its "updated" becomes now, so its project jumps to the top.
const DATES_FILE = path.join(root, 'models', 'scene_dates.json');
const dates = fs.existsSync(DATES_FILE) ? JSON.parse(fs.readFileSync(DATES_FILE, 'utf8')) : {};
const iso = (d) => new Date(d).toISOString().replace(/\.\d{3}Z$/, 'Z');
function gitDates(rel) {
  try {
    const out = execFileSync('git', ['log', '--format=%cI', '--', rel], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    return out.length ? { created: iso(out[out.length - 1]), updated: iso(out[0]) } : null;
  } catch (e) { return null; }
}
const nowIso = iso(Date.now());
// "Living room V2.5" -> "Living room"; a scene can name its project instead.
const projectOf = (scene) => scene.project || scene.header.name.replace(/\s+V\d+(\.\d+)?$/i, '').trim();

const bundles = {};
for (const scene of SCENES) {
  const world = worldFor(scene.header.world);
  const uuid = (key) => `${scene.id}-${key}`;
  const t0 = Date.parse('2026-11-01T10:00:00Z');
  const ops = [];
  let seq = 0;
  const stamp = () => new Date(t0 + seq * 60000).toISOString();

  for (const [key, d] of scene.defs) {
    seq++;
    ops.push({ seq, op: 'add', time: stamp(), author: 'jimmy', note: `add ${d.name}`,
      object: { uuid: uuid(key), name: d.name, description: d.description || '', type: d.type,
        dimensions: d.dimensions, position: d.position, rotation_y: d.rotation_y || 0,
        ...(d.rotation_x ? { rotation_x: d.rotation_x } : {}), ...(d.rotation_z ? { rotation_z: d.rotation_z } : {}),
        parent: d.parent ? uuid(d.parent) : null, material: d.material || null, ...(d.tags ? { tags: d.tags } : {}),
        ...(d.shape ? { shape: d.shape } : {}), ...(d.attach ? { attach: { to: uuid(d.attach.to), joint: d.attach.joint } } : {}),
        ...(d.hidden_at_start ? { hidden_at_start: true } : {}) } });
  }
  for (const m of scene.modify || []) {
    seq++;
    ops.push({ seq, op: 'modify', time: stamp(), author: 'chat', note: m.note, uuid: uuid(m.key), set: m.set });
  }

  const history = { schema: S.SCHEMA.history, model_id: scene.header.model_id, header: scene.header, operations: ops };
  // Every step must pass the per-operation rules, or the sample is wrong.
  let model = G.emptyModel(scene.header);
  for (const op of ops) {
    const r = R.checkOperation(model, op, world);
    if (r.outcome === 'reject') throw new Error(`${scene.id} op ${op.seq} rejected: ${JSON.stringify(r.issues)}`);
    model = G.applyOperation(model, op);
  }
  const check = R.checkModel(model, world);
  console.log(`${scene.id}: ${model.objects.length} objects, version ${model.version}, model check: ${check.outcome} (${check.issues.length} issue(s))`);
  for (const i of check.issues) console.log('  -', i.severity, i.message, i.uuid);

  const dir = path.join(root, 'models', scene.id);
  fs.mkdirSync(dir, { recursive: true });
  const replayed = G.replay(history);
  fs.writeFileSync(path.join(dir, 'history.json'), JSON.stringify(history, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'model.json'), JSON.stringify(replayed, null, 2) + '\n');
  const bundle = { schema: S.SCHEMA.bundle, model: replayed, history, world };
  // Motion is a separate file (make3d.motion/0.1). It must pass its check, or the sample is wrong.
  const motionPath = path.join(dir, 'motion.json');
  if (scene.motion) {
    const motion = scene.motion(uuid);
    const mc = MO.checkMotion(replayed, motion);
    if (mc.outcome !== 'accept') throw new Error(`${scene.id} motion: ${JSON.stringify(mc.issues)}`);
    fs.writeFileSync(motionPath, JSON.stringify(motion, null, 2) + '\n');
    bundle.motion = motion;
    console.log(`  motion: ${motion.motions.length} motions, loop ${motion.loop_s} s`);
  } else if (fs.existsSync(motionPath)) fs.unlinkSync(motionPath);
  const hash = crypto.createHash('sha1').update(JSON.stringify(history) + JSON.stringify(bundle.motion || null)).digest('hex').slice(0, 16);
  let d = dates[scene.id];
  if (!d) d = Object.assign({}, gitDates(`models/${scene.id}/history.json`) || { created: nowIso, updated: nowIso }, { hash });
  else if (d.hash !== hash) d = Object.assign({}, d, { updated: nowIso, hash });
  dates[scene.id] = d;
  bundle.listing = { project: projectOf(scene), created: d.created, updated: d.updated };
  bundles[scene.id] = bundle;
}

for (const id of Object.keys(dates)) if (!bundles[id]) delete dates[id];
const sorted = Object.fromEntries(Object.keys(dates).sort().map((k) => [k, dates[k]]));
fs.writeFileSync(DATES_FILE, JSON.stringify(sorted, null, 2) + '\n');

const js = '/* Generated by tools/build_samples.js. Do not edit by hand. */\n' +
  'window.M3D_SAMPLES = ' + JSON.stringify(bundles) + ';\n';
fs.writeFileSync(path.join(root, 'js/samples.bundle.js'), js);
console.log(`wrote ${SCENES.length} scenes to models/ and js/samples.bundle.js`);
