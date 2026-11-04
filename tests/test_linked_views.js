// Node tests for linked views (schematic §16). Run: node tests/test_linked_views.js
const assert = require('assert');
const path = require('path');
const LV = require(path.join(__dirname, '..', 'js/core/linked_views.js'));
const { SOLAR_SYSTEM, PLANET_VIEWS } = require(path.join(__dirname, '..', 'tools/solar_system.js'));
const G = require(path.join(__dirname, '..', 'js/core/geometry.js'));
const { SCENES } = require(path.join(__dirname, '..', 'tools/scenes.js'));
const fs = require('fs');

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('parses a plain link as a fade', () => {
  assert.deepStrictEqual(LV.parseLinkTag('link:planet-earth'), { target: 'planet-earth', transition: 'fade' });
});
t('parses an explicit zoom and fade', () => {
  assert.deepStrictEqual(LV.parseLinkTag('link:planet-earth:zoom'), { target: 'planet-earth', transition: 'zoom' });
  assert.deepStrictEqual(LV.parseLinkTag('link:solar-system-v05:fade'), { target: 'solar-system-v05', transition: 'fade' });
});
t('ignores tags that are not links, and bad links', () => {
  for (const bad of ['sun', 'link:', 'link:a b', 'link:x:spin', 'link:x:zoom:more', 'LINK:x', null, 3]) {
    assert.strictEqual(LV.parseLinkTag(bad), null, String(bad));
  }
});
t('reads the first valid link on an object', () => {
  assert.deepStrictEqual(LV.linkOf({ tags: ['moon', 'link:a:zoom'] }), { target: 'a', transition: 'zoom' });
  assert.strictEqual(LV.linkOf({ tags: ['moon'] }), null);
  assert.strictEqual(LV.linkOf({}), null);
});
t('lists every linked object in a model', () => {
  const model = { objects: [
    { uuid: 'u1', name: 'Earth', tags: ['link:planet-earth:zoom'] },
    { uuid: 'u2', name: 'Sun', tags: [] },
    { uuid: 'u3', name: 'Back', tags: ['link:solar-system-v05:fade'] },
  ] };
  assert.deepStrictEqual(LV.linksIn(model), [
    { uuid: 'u1', name: 'Earth', target: 'planet-earth', transition: 'zoom' },
    { uuid: 'u3', name: 'Back', target: 'solar-system-v05', transition: 'fade' },
  ]);
});
t('zoom only when asked, and never with reduced motion', () => {
  assert.strictEqual(LV.transitionFor({ target: 'x', transition: 'zoom' }, false), 'zoom');
  assert.strictEqual(LV.transitionFor({ target: 'x', transition: 'zoom' }, true), 'fade');
  assert.strictEqual(LV.transitionFor({ target: 'x', transition: 'fade' }, false), 'fade');
  assert.strictEqual(LV.transitionFor(null, false), 'fade');
});
t('every link in the solar scenes points at a scene that exists', () => {
  const ids = new Set(SCENES.map((s) => s.id));
  const TV = require(path.join(__dirname, '..', 'tools/solar_true.js')), PV2 = require(path.join(__dirname, '..', 'tools/planet_views.js'));
  const scenes = [...SOLAR_SYSTEM, ...PLANET_VIEWS, TV.SOLAR_TRUE, ...PV2.PLANET_VIEWS_V2V3, ...PV2.EARTH_VIEWS];
  let links = 0;
  for (const s of scenes) {
    for (const d of s.defs) {
      const obj = d[1];
      const l = LV.linkOf({ tags: obj.tags || [] });
      if (l) { links++; assert.ok(ids.has(l.target), `${s.id}: ${obj.name} links to missing ${l.target}`); }
    }
  }
  assert.ok(links >= 9 + 9 + 1, `expected planet links and a way back, got ${links}`);
});
t('the true solar system links every planet to its newest view, and the planet views link back by a button', () => {
  const s6 = require(path.join(__dirname, '..', 'tools/solar_true.js')).SOLAR_TRUE;
  const toPlanets = s6.defs.map((d) => LV.linkOf({ tags: d[1].tags || [] })).filter(Boolean).map((l) => l.target);
  const want = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  assert.deepStrictEqual(toPlanets.sort(), want.map((k) => (k === 'earth' ? 'planet-earth-v10' : `planet-${k}-v03`)).sort());
  // the way back is a page button (header.links), not an object in 3-D space
  const { EARTH_VIEWS, PLANET_VIEWS_V2V3 } = require(path.join(__dirname, '..', 'tools/planet_views.js'));
  for (const sc of [...EARTH_VIEWS, ...PLANET_VIEWS_V2V3]) {
    const objectBack = sc.defs.map((d) => LV.linkOf({ tags: d[1].tags || [] })).filter(Boolean);
    assert.strictEqual(objectBack.length, 0, `${sc.id} has no 3-D link back`);
    assert.strictEqual(sc.header.links[0].target, 'solar-system-v06', sc.id);
  }
});
t('a linked object is picked from the built model (uuid in the replayed model)', () => {
  const scene = SOLAR_SYSTEM[4];
  const history = { schema: 'make3d.history/0.1', model_id: scene.id, header: scene.header, operations: scene.defs.map((d, i) => ({
    seq: i + 1, op: 'add', time: '2026-11-01T10:00:00Z', author: 'test', note: 'add',
    object: { uuid: `${scene.id}-${d[0]}`, name: d[1].name, description: '', type: d[1].type, dimensions: d[1].dimensions || [],
      position: d[1].position || [0, 0, 0], rotation_y: 0, parent: d[1].parent ? `${scene.id}-${d[1].parent}` : null,
      material: d[1].material || null, tags: d[1].tags || [] } })) };
  const model = G.replay(history);
  const links = LV.linksIn(model);
  assert.strictEqual(links.length, 9, 'nine planets link out of the solar system');
  assert.ok(links.every((l) => l.uuid.startsWith(scene.id)), 'uuids are the scene-prefixed ones');
});

console.log(`\n${n} linked-view tests passed`);
