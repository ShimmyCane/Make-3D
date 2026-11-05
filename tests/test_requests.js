// Node tests for new requests (cleanRequest in js/cloud/cloud.js). Run: node tests/test_requests.js
const assert = require('assert');
const path = require('path');
const C = require(path.join(__dirname, '..', 'js/cloud/cloud.js'));

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('a request needs one of the five categories and a description', () => {
  assert.deepStrictEqual(C.REQUEST_CATEGORIES, ['science', 'tests', 'architecture', 'fun', 'unsorted']);
  assert.ok(C.cleanRequest({ category: 'nope', body: 'x' }).error);
  assert.ok(C.cleanRequest({ category: null, body: 'x' }).error);
  assert.ok(C.cleanRequest({ category: 'fun', body: '   ' }).error);
  assert.ok(C.cleanRequest({ category: 'fun' }).error);
  assert.ok(C.cleanRequest(undefined).error);
});

t('a good request is trimmed and keeps only category and body', () => {
  const r = C.cleanRequest({ category: 'tests', body: '  a robot with a hat  ', extra: 1 });
  assert.deepStrictEqual(r.row, { category: 'tests', body: 'a robot with a hat' });
});

t('a description over 2,000 characters is refused', () => {
  assert.ok(C.cleanRequest({ category: 'fun', body: 'x'.repeat(2001) }).error);
  assert.ok(!C.cleanRequest({ category: 'fun', body: 'x'.repeat(2000) }).error);
});

console.log(`${n} request tests passed`);
