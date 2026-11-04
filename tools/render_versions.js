// Headless render of library scenes, one screenshot per version. Save screenshots outside the repo.
// Run: node tools/render_versions.js <screenshotDir> "Living room V01" ["Living room V02" ...]
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const [shotDir, ...names] = process.argv.slice(2);
if (!shotDir || !names.length) { console.error('usage: render_versions.js <dir> <name>...'); process.exit(2); }
fs.mkdirSync(shotDir, { recursive: true });
const url = 'file://' + path.join(__dirname, '..', 'index.html');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('dialog', (d) => d.accept());
  await page.goto(url);
  await page.waitForFunction(() => document.querySelectorAll('#objectList li').length > 0);
  for (const name of names) {
    if (await page.isHidden('#libPanel')) await page.click('#libBtn');
    await page.locator('#builtinList li', { hasText: name }).locator('button').first().click();
    await page.waitForTimeout(600);
    const title = await page.textContent('#modelTitle');
    const count = await page.locator('#objectList li').count();
    if (await page.isVisible('#libPanel')) await page.click('#libBtn');
    await page.waitForTimeout(300);
    const base = path.join(shotDir, name.toLowerCase().replace(/\s+/g, '-'));
    await page.screenshot({ path: base + '.png' });
    // Zoomed out, so parts cut off at the bottom of the default view (for example a door) show too.
    await page.mouse.move(840, 420);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(400);
    await page.screenshot({ path: base + '-zoomed-out.png' });
    console.log(`${title}: ${count} objects -> ${base}.png and -zoomed-out.png`);
  }
  console.log('console errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
