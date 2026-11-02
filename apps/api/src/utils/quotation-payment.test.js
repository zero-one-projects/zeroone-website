const test = require('node:test');
const assert = require('node:assert/strict');
const { serializeQuotation } = require('./serialize-quotation');
const { documentHash } = require('./quotation-response');
const { defaultPaymentInstructions } = require('./quotation-payment');

test('legacy payment details use AUB without changing a signed document or its hash', () => {
  const document = { title: 'Project', validUntil: '2026-12-01', paymentInstructions: '' };
  const hash = documentHash(document);
  const row = { id: 1, createdAt: '2026-10-26', document, clientResponse: { action: 'accept', documentHash: hash, contractText: 'Agreed terms', signature: { signedAt: '2026-10-26' } } };
  const result = serializeQuotation(row);
  assert.equal(result.paymentInstructions, defaultPaymentInstructions);
  assert.match(result.paymentInstructions, /310-11-003883-1/);
  assert.match(result.paymentInstructions, /Zero One Information Technology Inc\./);
  assert.equal(document.paymentInstructions, '');
  assert.equal(result.documentVersion, hash);
  assert.equal(result.clientResponse.current, true);
});

test('custom quotation payment instructions take precedence', () => {
  const result = serializeQuotation({ id: 2, createdAt: '2026-10-26', document: { paymentInstructions: 'Custom payment instructions' } });
  assert.equal(result.paymentInstructions, 'Custom payment instructions');
});

test('payment summary separates total, current milestone, and scheduled balance using integer cents', () => {
  const { paymentSummary } = require('./quotation-payment');
  assert.deepEqual(paymentSummary({ total: 30000, initialPaymentPercent: 50 }), { contractTotal: 30000, initialPercent: 50, amountDue: 15000, scheduledRemaining: 15000 });
  assert.deepEqual(paymentSummary({ total: 100.01, initialPaymentPercent: 50 }), { contractTotal: 100.01, initialPercent: 50, amountDue: 50.01, scheduledRemaining: 50 });
  assert.equal(paymentSummary({ total: 30000, quoteType: 'project' }, '**20% Down Payment**').amountDue, 6000);
  assert.equal(paymentSummary({ total: 30000, quoteType: 'pos' }).amountDue, null);
  assert.equal(paymentSummary({ total: 30000, quoteType: 'pos', initialPaymentPercent: 0 }).amountDue, 0);
  assert.equal(paymentSummary({ total: 30000, initialPaymentPercent: 101 }).amountDue, null);
});
