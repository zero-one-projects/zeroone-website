const { test } = require('node:test');
const assert = require('node:assert/strict');
const { documentHash, codeHash, responseSummary } = require('./quotation-response');

test('quotation versions survive MySQL JSON key reordering but detect edits', () => {
  assert.equal(documentHash({ title: 'Web', items: [{ price: 5, quantity: 1 }] }), documentHash({ items: [{ quantity: 1, price: 5 }], title: 'Web' }));
  assert.notEqual(documentHash({ title: 'Web' }), documentHash({ title: 'Updated' }));
});

test('verification hashes are bound to the challenge and signing secret', () => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-secret';
  assert.notEqual(codeHash('first', '123456'), codeHash('second', '123456'));
  assert.notEqual(codeHash('first', '123456'), codeHash('first', '654321'));
  if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous;
});

test('public summaries hide private client details and flag stale responses', () => {
  const document = { title: 'Web' };
  const row = { document, clientResponse: { action: 'accept', email: 'client@example.com', name: 'Client', note: 'Private message', documentHash: documentHash(document), respondedAt: '2026-10-25T10:00:00Z' } };
  assert.equal(responseSummary(row).email, undefined);
  assert.equal(responseSummary(row).current, true);
  assert.equal(responseSummary(row, true).email, 'client@example.com');
  row.document = { title: 'Revised website' };
  assert.equal(responseSummary(row).current, false);
});
