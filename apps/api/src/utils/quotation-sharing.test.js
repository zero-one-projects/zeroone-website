const { test } = require('node:test');
const assert = require('node:assert/strict');
const { quotationExpiresAt, quotationExpired } = require('./quotation-sharing');

test('links remain valid throughout the validity date in Manila', () => {
  assert.equal(quotationExpiresAt('2026-11-09').toISOString(), '2026-11-09T16:00:00.000Z');
  assert.equal(quotationExpired({ validUntil: '2026-11-09' }, Date.parse('2026-11-09T15:59:59.999Z')), false);
  assert.equal(quotationExpired({ validUntil: '2026-11-09' }, Date.parse('2026-11-09T16:00:00.000Z')), true);
});

test('a saved change to validity extends or shortens client access', () => {
  const now = Date.parse('2026-11-10T02:00:00Z');
  assert.equal(quotationExpired({ validUntil: '2026-11-09' }, now), true);
  assert.equal(quotationExpired({ validUntil: '2026-11-15' }, now), false);
  assert.equal(quotationExpired({ validUntil: '2026-11-01' }, now), true);
});

test('missing and malformed validity dates never grant access', () => {
  for (const validUntil of [null, '', 'bad date', '2026-02-30']) {
    assert.equal(quotationExpired({ validUntil }), true);
  }
});
