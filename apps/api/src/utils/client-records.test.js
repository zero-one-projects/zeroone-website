const { test } = require('node:test');
const assert = require('node:assert/strict');
const { clientRecords } = require('./client-records');
const { documentHash } = require('./quotation-response');
function row(id, type, email = 'client@example.com', name = 'Example Client') {
  const document = { quoteType: type, clientName: name, clientEmail: email, title: `Project ${id}`, currency: 'PHP', total: 1000, recurringTotal: type === 'subscription' ? 1500 : 0 };
  return { id, createdAt: '2026-10-01', updatedAt: '2026-10-27', document, clientResponse: { action: 'accept', documentHash: documentHash(document), signature: { signedAt: '2026-10-26' } } };
}
test('groups matching clients, separates payment types, and excludes POS', () => {
  const rows = [row(2, 'subscription', 'CLIENT@example.com', ' Example   Client '), row(1, 'subscription'), row(3, 'project'), row(4, 'pos')];
  const subscriptions = clientRecords(rows, 'subscription');
  assert.equal(subscriptions.length, 1); assert.equal(subscriptions[0].quotations.length, 2);
  assert.equal(subscriptions[0].quotations[0].id, 2);
  assert.equal(subscriptions[0].quotations[0].response.signedAt, '2026-10-26');
  assert.equal(clientRecords(rows, 'project').length, 1);
  assert.equal(clientRecords(rows, 'project')[0].quotations[0].id, 3);
});
test('separates distinct client email identities and searches names, projects, and references', () => {
  const rows = [row(1, 'subscription'), row(2, 'subscription', 'other@example.com')];
  assert.equal(clientRecords(rows, 'subscription').length, 2);
  assert.equal(clientRecords(rows, 'subscription', 'other@')[0].quotations[0].id, 2);
  assert.equal(clientRecords(rows, 'subscription', 'zo-2026-00001').length, 1);
  assert.equal(clientRecords(rows, 'subscription', 'Project 2').length, 1);
  assert.equal(clientRecords(rows, 'subscription', 'no match').length, 0);
});
test('legacy one-time quotations and stale acceptance status remain accurate', () => {
  const legacy = row(1, undefined, '');
  legacy.document.title = 'Revised';
  const result = clientRecords([legacy], 'project');
  assert.equal(result.length, 1); assert.equal(result[0].quotations[0].response.current, false);
  assert.match(result[0].id, /^[a-f0-9]{64}$/);
});

test('saved activity status is preserved when clients are grouped with quotations', () => {
  const { clientId } = require('./client-records');
  const id = clientId('subscription', 'Example Client', 'client@example.com');
  const saved = { id, type: 'subscription', clientName: 'Example Client', clientEmail: 'client@example.com', isActive: false };
  const result = clientRecords([row(1, 'subscription')], 'subscription', '', [saved]);
  assert.equal(result.length, 1); assert.equal(result[0].isActive, false); assert.equal(result[0].quotations.length, 1);
  assert.equal(clientRecords([row(1, 'subscription')], 'subscription')[0].isActive, true);
  assert.equal(clientRecords([], 'subscription', '', [{ ...saved, isActive: true }])[0].isActive, true);
});
