const { test } = require('node:test');
const assert = require('node:assert/strict');
const { deletionVersion, deletionMessage, normalizeDeletionIds, deletionGroupVersion } = require('./quotation-deletion');

test('deletion authorization is bound to the administrator and current quotation including its response', () => {
  const row = { document: { title: 'Website' }, clientResponse: null, updatedAt: '2026-10-26T00:00:00Z' };
  assert.notEqual(deletionVersion(row, 1), deletionVersion(row, 2));
  assert.notEqual(deletionVersion(row, 1), deletionVersion({ ...row, document: { title: 'Revised website' } }, 1));
  assert.notEqual(deletionVersion(row, 1), deletionVersion({ ...row, clientResponse: { action: 'accept' } }, 1));
});

test('deletion codes are sent only to the fixed company mailbox and explain the effect', () => {
  const message = deletionMessage({ reference: 'ZO-2026-00001', code: '123456', expiresAt: '2026-10-26T00:10:00Z', email: 'other@example.com' });
  assert.deepEqual(message.toRecipients, [{ emailAddress: { address: 'info@zerooneitinc.com' } }]);
  assert(message.body.content.includes('123456'));
  assert(message.body.content.includes('ZO-2026-00001'));
  assert(message.body.content.includes('Response history will be retained internally'));
});

test('bulk deletion validates and canonicalizes the selected quotation IDs', () => {
  assert.deepEqual(normalizeDeletionIds([3, '1', 3]), [1, 3]);
  for (const value of [[], [0], [1.5], ['bad'], Array(101).fill(1)]) assert.throws(() => normalizeDeletionIds(value));
  const first = { id: 1, document: {}, updatedAt: '2026-10-26T00:00:00Z' };
  const second = { ...first, id: 2 };
  assert.notEqual(deletionGroupVersion([first, second], 1), deletionGroupVersion([first], 1));
  assert.notEqual(deletionGroupVersion([first, second], 1), deletionGroupVersion([first, { ...second, document: { title: 'Changed' } }], 1));
  const message = deletionMessage({ references: ['ZO-2026-00001', 'ZO-2026-00002'], code: '123456', expiresAt: '2026-10-26T00:10:00Z' });
  assert(message.body.content.includes('ZO-2026-00001'));
  assert(message.body.content.includes('ZO-2026-00002'));
});
