// Headless render by sample id, using the shareable link (index.html?model=<id>). Save screenshots outside the repo.
// Run: node tools/render_models.js <dir> <id>[@t1,t2,...] ...    e.g.  hawk-v03   hawk-v06@0,5,9.5,12
// "@times" pauses the animation, seeks to each time in seconds and takes a frame (frames are named <id>-t<seconds>.png).
// --follow=<part key> keeps that part (for example the hawk group) centred in each frame; --phi=<rad> tilts the camera.
// --target=x,y,z --radius=<in> --azimuth=<deg> --phi=<rad> aim the camera in model coordinates (still scenes).
// An optional  --zoom=<factor>  after the dir scales the camera distance (below 1 = closer), --azimuth=<deg> turns it.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opts = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const [shotDir, ...items] = args.filter((a) => !a.startsWith('--'));
if (!shotDir || !items.length) { console.error('usage: render_models.js <dir> <id>[@t,...]... [--zoom=0.5] [--azimuth=30]'); process.exit(2); }
fs.mkdirSync(shotDir, { recursive: true });
const MO = require(path.join(__dirname, '..', 'js/core/motion.js'));
const base = 'file://' + path.join(__dirname, '..', 'index.html');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('dialog', (d) => d.accept());
  for (const item of items) {
    const [id, times] = item.split('@');
    await page.goto(`${base}?model=${id}`);
    await page.waitForFunction(() => document.querySelectorAll('#objectList li').length > 0);
    await page.waitForTimeout(700);
    if (opts.zoom || opts.azimuth) {
      await page.evaluate(({ z, a }) => { const v = window.__m3dViewer; const s = v.viewState(); v.setView && v.setView({ radius: z ? s.radius * z : undefined, theta: a ? (a * Math.PI) / 180 : undefined }); }, { z: opts.zoom && +opts.zoom, a: opts.azimuth && +opts.azimuth });
    }
    if (opts.target || opts.radius) {
      await page.evaluate(({ tg, r, a, ph }) => window.__m3dViewer.setView({ target: tg, radius: r, theta: a, phi: ph }),
        { tg: opts.target ? opts.target.split(',').map(Number) : undefined, r: opts.radius ? +opts.radius : undefined, a: opts.azimuth ? (+opts.azimuth * Math.PI) / 180 : undefined, ph: opts.phi ? +opts.phi : undefined });
    }
    if (!times) { await page.waitForTimeout(300); await page.screenshot({ path: path.join(shotDir, `${id}.png`) }); console.log('wrote', `${id}.png`); continue; }
    await page.evaluate(() => window.__m3dViewer.pause());
    const dir = path.join(__dirname, '..', 'models', id);
    const model = opts.follow ? JSON.parse(fs.readFileSync(path.join(dir, 'model.json'), 'utf8')) : null;
    const motion = opts.follow ? JSON.parse(fs.readFileSync(path.join(dir, 'motion.json'), 'utf8')) : null;
    for (const t of times.split(',')) {
      await page.evaluate((s) => window.__m3dViewer.seek(+s), t);
      if (opts.follow) {
        // where the followed part is at time t: its rest position moved by its own pose and its parents' poses
        const byId = new Map(model.objects.map((o) => [o.uuid, o]));
        const pose = MO.poseAt(model, motion, +t);
        let o = byId.get(`${id}-${opts.follow}`), p = o.position.slice();
        for (let g = 0; o && g < 8; g++, o = o.parent && byId.get(o.parent)) if (pose[o.uuid]) p = MO.mat4.apply(pose[o.uuid], p);
        await page.evaluate(({ p, r, a, ph }) => window.__m3dViewer.setView({ target: p, radius: r, theta: a, phi: ph }), { p, r: opts.zoom ? +opts.zoom : 60, a: opts.azimuth ? (+opts.azimuth * Math.PI) / 180 : undefined, ph: opts.phi ? +opts.phi : undefined });
      }
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(shotDir, `${id}-t${t}.png`) });
      console.log('wrote', `${id}-t${t}.png`);
    }
  }
  console.log('console errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
