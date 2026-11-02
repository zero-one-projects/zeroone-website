const { test } = require('node:test');
const assert = require('node:assert/strict');
const { recordResponse, responseHistory } = require('./quotation-history');
const { serializeQuotation } = require('./serialize-quotation');

test('successive revisions preserve the old requote and acceptance snapshots in the response transaction', async () => {
  const records = [];
  const transaction = {};
  const History = { async findOrCreate(options) {
    assert.equal(options.transaction, transaction);
    if (!records.some((row) => row.response.documentHash === options.where.documentHash)) records.push(options.defaults);
  } };
  const first = { action: 'requote', note: 'Reduce the scope', email: 'client@example.com', documentHash: 'first', respondedAt: '2026-10-25T10:00:00Z', document: { title: 'Original scope' } };
  const second = { action: 'accept', documentHash: 'second', respondedAt: '2026-10-26T10:00:00Z', document: { title: 'Reduced scope' } };
  await recordResponse(History, { id: 1, clientResponse: first }, second, transaction);
  await recordResponse(History, { id: 1, clientResponse: first }, second, transaction);
  const history = responseHistory({ clientResponse: second }, records);
  assert.equal(history.length, 2);
  assert.equal(history[0].action, 'accept');
  assert.equal(history[1].note, 'Reduce the scope');
  assert.equal(history[1].document.title, 'Original scope');
});

test('existing response appears before any history has been recorded, and stays private on public quotations', () => {
  const row = { id: 1, createdAt: '2026-10-25T00:00:00Z', document: { validUntil: '2026-11-09' }, clientResponse: { action: 'requote', email: 'client@example.com', note: 'Private', documentHash: 'first', respondedAt: '2026-10-25T10:00:00Z' } };
  assert.equal(responseHistory(row, []).length, 1);
  assert.equal(responseHistory(row, [{ response: row.clientResponse }]).length, 1);
  assert.equal(serializeQuotation(row).history, undefined);
  assert.equal(serializeQuotation(row).clientResponse.note, undefined);
});
