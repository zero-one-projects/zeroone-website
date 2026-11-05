const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { documentHash } = require('./quotation-response');
const { normalizePayment, providerContext, assertSignedVersion, paymentMetadata, publicPaymentState } = require('./payment-verification');

const input = () => ({ documentHash: 'a'.repeat(64), paymentDate: '2026-01-01', amount: '1699.50', referenceNumber: ' BANK-123 ', paymentMethod: 'bank_transfer', idempotencyKey: crypto.randomUUID(), note: ' Confirmed in bank records. ' });

test('manual payment details require an exact amount, real payment date, reference, method, and retry identifier', () => {
  const value = normalizePayment(input(), 'manual', '2026-11-05');
  assert.equal(value.amount, '1699.50');
  assert.equal(value.referenceNumber, 'BANK-123');
  assert.equal(value.note, 'Confirmed in bank records.');
  assert.equal(normalizePayment({ ...input(), amount: 0.01 }, 'manual', '2026-11-05').amount, '0.01');
  for (const change of [
    { amount: 0 }, { amount: -1 }, { amount: '1.001' }, { amount: '1e3' }, { amount: '100,000' }, { amount: '100000000' },
    { paymentDate: '2026-02-30' }, { paymentDate: '2028-01-01' }, { paymentDate: 'not a date' },
    { referenceNumber: '' }, { referenceNumber: 'x'.repeat(181) }, { referenceNumber: 'BANK\n123' },
    { paymentMethod: 'unsupported' }, { idempotencyKey: 'retry-me' }, { documentHash: 'changed' }, { documentHash: ['a'.repeat(64)] }, { amount: [1699] }, { paymentDate: ['2026-01-01'] }, { note: 'x'.repeat(2001) }
  ]) assert.throws(() => normalizePayment({ ...input(), ...change }, 'manual', '2026-11-05'), { statusCode: 400 });
});

test('future provider payments require trusted server context identifying a successfully verified event', () => {
  for (const context of [{}, { source: 'client' }, { source: 'hitpay' }, { source: 'hitpay', verifiedProviderEvent: { signatureVerified: true, status: 'pending' } }]) assert.throws(() => providerContext(context), { statusCode: 403 });
  const value = providerContext({ source: 'hitpay', verifiedProviderEvent: { signatureVerified: true, status: 'completed', transactionId: 'hp-payment-1', eventId: 'hp-event-1' } });
  assert.equal(value.source, 'hitpay'); assert.equal(value.providerTransactionId, 'hp-payment-1'); assert.equal(value.actor.name, 'HitPay');
  assert.throws(() => providerContext({ source: 'hitpay', verifiedProviderEvent: { signatureVerified: true, status: 'completed', transactionId: '', eventId: 'evt' } }), { statusCode: 400 });
});

test('payment verification requires the client signature to match the current frozen agreement', () => {
  const document = { title: 'Frozen agreement', currency: 'PHP' }, version = documentHash(document);
  const row = { document, clientResponse: { action: 'accept', document, documentHash: version, signature: { signedAt: '2026-01-01T00:00:00.000Z', documentHash: version } } };
  assert.equal(assertSignedVersion(row, version), row.clientResponse);
  assert.throws(() => assertSignedVersion(row, 'b'.repeat(64)), { statusCode: 409 });
  for (const response of [{ ...row.clientResponse, signature: null }, { ...row.clientResponse, action: 'requote' }, { ...row.clientResponse, document: { ...document, title: 'Changed snapshot' } }, { ...row.clientResponse, signature: { ...row.clientResponse.signature, documentHash: 'b'.repeat(64) } }]) assert.throws(() => assertSignedVersion({ ...row, clientResponse: response }, version), { statusCode: 409 });
});

test('public paid status uses only a version-bound verified ledger cache and hides staff identity', () => {
  const document = { title: 'Signed agreement' }, version = documentHash(document);
  const row = { document, paymentState: { documentHash: version, status: 'paid', lastPaymentId: 'id', lastVerifiedAt: '2026-01-01', totalVerifiedAmount: 1699, currency: 'PHP', verifiedBy: { email: 'private@example.com' } } };
  assert.deepEqual(publicPaymentState(row), { paymentStatus: 'paid', paymentState: { documentHash: version, status: 'paid', lastPaymentId: 'id', lastVerifiedAt: '2026-01-01', totalVerifiedAmount: 1699, currency: 'PHP' } });
  assert.deepEqual(publicPaymentState({ ...row, document: { title: 'Different agreement' } }), { paymentStatus: 'unpaid', paymentState: null });
  assert.deepEqual(publicPaymentState({ document, paymentState: null }), { paymentStatus: 'unpaid', paymentState: null });
  const metadata = paymentMetadata({ id: 'id', status: 'paid', amount: '1699.50', verifiedBy: { userId: 1, name: 'Admin', email: 'private@example.com', ipAddress: '127.0.0.1' } });
  assert.equal(metadata.amount, 1699.5); assert.deepEqual(metadata.verifiedBy, { userId: 1, name: 'Admin' });
});

test('verified ledger records reject both instance edits and bulk updates', async () => {
  const { QuotationPayment } = require('../models');
  await assert.rejects(() => QuotationPayment.runHooks('beforeUpdate', {}), /immutable/);
  await assert.rejects(() => QuotationPayment.runHooks('beforeBulkUpdate', {}), /immutable/);
});
