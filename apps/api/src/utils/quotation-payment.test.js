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
