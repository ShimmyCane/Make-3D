// Browser check for animation and touch: the robot-with-banana scene autoplays, the play bar works, it stops
// after two plays, two-finger pinch zooms in and out, one finger orbits, and the page itself never zooms.
// Run: node tools/anim_check.js <screenshotDir>   (save screenshots outside the repo)
const path = require('path'); const fs = require('fs');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
const out = process.argv[2];
if (!out) { console.error('usage: anim_check.js <screenshotDir>'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('dialog', (d) => d.accept());
  await page.goto('file://' + path.join(root, 'viewer.html'));
  await page.waitForTimeout(800);
  console.log('planter anim bar hidden:', await page.$eval('#animBar', (e) => e.hidden));
  // open the robot from the gear sample picker
  await page.evaluate(() => { document.getElementById('sampleSel').value = 'robot-banana'; });
  await page.evaluate(() => document.getElementById('loadSample').click());
  await page.waitForTimeout(1500);
  console.log('robot anim bar hidden:', await page.$eval('#animBar', (e) => e.hidden), 'play label:', await page.$eval('#animPlay', (e) => e.textContent));
  const slider1 = await page.$eval('#animTime', (e) => Number(e.value));
  await page.screenshot({ path: path.join(out, 'robot_a.png') });
  await page.waitForTimeout(3000);
  const slider2 = await page.$eval('#animTime', (e) => Number(e.value));
  console.log('autoplay moves the slider:', slider1, '->', slider2);
  await page.screenshot({ path: path.join(out, 'robot_b.png') });
  // pause, scrub to 40%
  await page.click('#animPlay');
  console.log('after pause label:', await page.$eval('#animPlay', (e) => e.textContent));
  await page.$eval('#animTime', (e) => { e.value = '400'; e.dispatchEvent(new Event('input')); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, 'robot_c_40pct.png') });
  // pinch: two fingers moving apart should zoom in (radius gets smaller)
  const box = await (await page.$('#view')).boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const cdp = await ctx.newCDPSession(page);
  const radius = () => page.evaluate(() => window.__m3dViewer ? window.__m3dViewer.viewState().radius : null);
  const before = await radius();
  const tp = (d) => [{ x: cx - d, y: cy, id: 1 }, { x: cx + d, y: cy, id: 2 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(40) });
  for (let d = 50; d <= 160; d += 10) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(d) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const afterIn = await radius();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(160) });
  for (let d = 150; d >= 20; d -= 10) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(d) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const afterOut = await radius();
  console.log('pinch radius: start', before && before.toFixed(1), 'apart ->', afterIn && afterIn.toFixed(1), 'together ->', afterOut && afterOut.toFixed(1));
  // one-finger orbit still works
  const th0 = await page.evaluate(() => window.__m3dViewer.viewState().theta);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy, id: 3 }] });
  for (let k = 1; k <= 8; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + k * 10, y: cy, id: 3 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  console.log('one-finger orbit changes theta:', (await page.evaluate(() => window.__m3dViewer.viewState().theta)) !== th0);
  // page zoom unchanged
  console.log('page scale:', await page.evaluate(() => window.visualViewport ? window.visualViewport.scale : 1));
  // autoplay stops after two plays (run at 8x so the check is quick)
  await page.evaluate(() => { const v = window.__m3dViewer; v.setOptions({ speed: 8 }); v.play(2); });
  await page.waitForTimeout(6000);
  console.log('after 2 plays at 8x:', JSON.stringify(await page.evaluate(() => window.__m3dViewer.animState())));
  await page.screenshot({ path: path.join(out, 'robot_d_end.png') });
  console.log('console errors:', errors.length ? errors : 'none');
  await browser.close();
  const fail = errors.length || !(afterIn < before && afterOut > afterIn) || slider2 <= slider1;
  if (fail) { console.error('FAILED'); process.exit(1); }
})();
