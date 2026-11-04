// Headless browser run of index.html from file://. Needs Playwright with Chromium.
// Run: node tools/smoke.js [screenshotDir]   (save screenshots outside the repo)
const path = require('path');
const { chromium } = require('playwright');
const shotDir = process.argv[2];
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
  const count = await page.locator('#objectList li').count();
  const title = await page.textContent('#modelTitle');
  console.log(`loaded "${title}" with ${count} objects in the list`);
  if (shotDir) await page.screenshot({ path: path.join(shotDir, '1-loaded.png') });

  // select an object from the list
  await page.click('#objectList li >> nth=0');
  console.log('selected:', await page.textContent('#selFacts'));

  // a valid add through the form (Add tab; paste is the default now)
  await page.click('#tabAdd');
  await page.fill('#fName', 'Stone marker');
  await page.fill('#fX', "2' 6\"");
  await page.fill('#fZ', '6');
  await page.selectOption('#fType', 'box');
  await page.click('#addForm button[type=submit]');
  const after = await page.locator('#objectList li').count();
  console.log(`after add: ${after} objects, scrubber at ${await page.inputValue('#scrub')} of ${await page.getAttribute('#scrub', 'max')}`);

  await page.click('#tabPaste');
  // a paste that the rules reject (bad coordinates), then preview it
  await page.click('#tabPaste');
  await page.fill('#pasteBox', JSON.stringify({ op: 'add', object: { name: 'Bad', type: 'box', dimensions: [4, 4, 4], position: ['x', 0, 0] } }));
  await page.click('#pasteApply');
  console.log('reject panel visible:', await page.isVisible('#rejectCard'));
  if (shotDir) await page.screenshot({ path: path.join(shotDir, '2-rejected.png') });
  await page.click('#rejectPreview');
  console.log('preview banner visible:', await page.isVisible('#previewBanner'));
  await page.click('#previewDiscard');

  // settings drawer: Y-up, ground on and slider, feet and inches vs inches
  await page.click('#gearBtn');
  await page.selectOption('#displaySel', 'edges');
  await page.check('#groundOn');
  await page.click('#checkBtn');
  await page.check('#showErrors');
  console.log('bottom errors visible:', await page.isVisible('#errorsArea'));
  if (shotDir) await page.screenshot({ path: path.join(shotDir, '3-settings.png') });
  await page.selectOption('#upSel', 'y');
  await page.selectOption('#upSel', 'z');
  await page.click('#closeGear');

  // history scrubber back to step 0, then back to latest
  await page.fill('#scrub', '0');
  await page.dispatchEvent('#scrub', 'input');
  console.log('scrubbed to:', await page.inputValue('#scrub'), 'objects shown:', await page.locator('#objectList li').count());
  await page.click('#latestBtn');
  console.log('back at:', await page.inputValue('#scrub'));
  if (shotDir) await page.screenshot({ path: path.join(shotDir, '4-latest.png') });

  // view interaction: drag to orbit, wheel to zoom, no crash
  await page.mouse.move(640, 400); await page.mouse.down(); await page.mouse.move(700, 380, { steps: 5 }); await page.mouse.up();
  await page.mouse.wheel(0, -300);

  // reload keeps the saved model
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#objectList li').length > 0);
  console.log('after reload objects:', await page.locator('#objectList li').count());

  // iPad portrait: the layout stacks and the view still draws
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.waitForTimeout(300);
  if (shotDir) await page.screenshot({ path: path.join(shotDir, '5-ipad-portrait.png') });

  // Library: built-in scenes, sign-in box (offline here), Quick Detail references note
  await page.click('#libBtn');
  console.log('library projects listed:', await page.locator('#builtinList > li.proj').count(),
    '| scenes:', await page.evaluate(() => Object.keys(window.M3D_SAMPLES).length),
    '| sign-in box visible:', await page.isVisible('#signInBox'));
  console.log('library order:', await page.$$eval('#builtinList > li.proj .proj-open', (b) => b.map((x) => x.firstChild.textContent).join(' · ')));
  // Open a scene from the library: the project's newest version, or an older one after unfolding.
  const openFromLibrary = async (project, version) => {
    if (await page.isHidden('#libPanel')) await page.click('#libBtn');
    const ok = await page.evaluate(([project, version]) => {
      const li = [...document.querySelectorAll('#builtinList > li.proj')].find((l) => l.querySelector('.proj-open').firstChild.textContent === project);
      if (!li) return false;
      if (!version) { li.querySelector('.proj-open').click(); return true; }
      const more = li.querySelector('.proj-more');
      if (more && more.getAttribute('aria-expanded') !== 'true') more.click();
      const li2 = [...document.querySelectorAll('#builtinList > li.proj')].find((l) => l.querySelector('.proj-open').firstChild.textContent === project);
      const b = [...li2.querySelectorAll('.versions button')].find((x) => x.firstChild.textContent === version);
      if (!b) return false;
      b.click(); return true;
    }, [project, version]);
    if (!ok) throw new Error(`library: ${project} ${version || ''} not found`);
  };
  if (shotDir) await page.screenshot({ path: path.join(shotDir, '6-library.png') });
  for (const [name, project, version] of [['outdoor table', 'Outdoor table with parasol', 'V1'],
    ['outdoor table V2', 'Outdoor table with parasol'], ['kitchen', 'Kitchen']]) {
    await openFromLibrary(project, version);
    await page.waitForTimeout(400);
    console.log(`opened ${name}: ${await page.textContent('#modelTitle')} with ${await page.locator('#objectList li').count()} objects`);
    if (shotDir) await page.screenshot({ path: path.join(shotDir, `7-${name.replace(/ /g, '-')}.png`) });
    if (name === 'outdoor table V2') {
      // tags in the objects list, and the purpose line next to Check model
      await page.click('#objectList li:has-text("Parasol pole") button');
      console.log('status line:', (await page.textContent('#selInfo')).replace(/\s+/g, ' ').trim());
      console.log('tags shown in list:', await page.locator('#objectList .tag').count());
      if (shotDir) await page.screenshot({ path: path.join(shotDir, '8-v2-pole-selected.png') });
    }
  }
  // back to the planter for the rest of the run
  await openFromLibrary('Garden planter');

  console.log('console errors:', errors.length ? errors : 'none');
  await browser.close();
  if (errors.length) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
