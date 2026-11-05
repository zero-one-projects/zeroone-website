const { test, mock } = require('node:test');
const assert = require('node:assert/strict');

test('manual verification commits separate immutable payment records and supports provider idempotency', { skip: process.env.RUN_PAYMENT_VERIFICATION_DB_TESTS !== 'true' }, async () => {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
  const crypto = require('crypto');
  const jwt = require('jsonwebtoken');
  const { sequelize } = require('../config/database');
  const { Quotation, QuotationContract, QuotationPayment, User } = require('../models');
  const { documentHash } = require('./quotation-response');
  const { recordVerifiedPayment } = require('./payment-verification');
  const quoteIds = [], userIds = []; let server;
  sequelize.options.logging = false;
  mock.method(require('./quotation-notifications'), 'queueNotificationDelivery', () => {});
  const fixture = crypto.randomUUID();
  try {
    await QuotationPayment.sync();
    const user = await User.create({ name: 'Manual payment verifier fixture', email: `payment-${fixture}@example.com`, passwordHash: crypto.randomBytes(32).toString('hex'), passwordSalt: crypto.randomBytes(16).toString('hex'), role: 1, isActive: true }, { logging: false }); userIds.push(user.id);
    const inactive = await User.create({ name: 'Inactive payment verifier fixture', email: `inactive-payment-${fixture}@example.com`, passwordHash: 'fixture', passwordSalt: 'fixture', role: 1, isActive: false }, { logging: false }); userIds.push(inactive.id);
    const token = jwt.sign({ sub: user.id, role: 1 }, process.env.JWT_SECRET, { expiresIn: '10m' });
    const inactiveToken = jwt.sign({ sub: inactive.id, role: 1 }, process.env.JWT_SECRET, { expiresIn: '10m' });
    server = await new Promise(resolve => { const instance = require('../app').listen(0, '127.0.0.1', () => resolve(instance)); });
    const base = `http://127.0.0.1:${server.address().port}/api/admin/quotations`;
    async function request(path, body, authorization = token, method = body ? 'POST' : 'GET') {
      const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: response.status, body: await response.json() };
    }
    async function create(signed = true) {
      const document = { title: `Payment fixture ${crypto.randomUUID()}`, quoteType: 'pos', clientFlow: 'full', acceptancePolicy: { version: 2 }, currency: 'PHP', clientName: 'Temporary Client', total: 5000 };
      const version = documentHash(document);
      const signature = { signedAt: '2026-01-01T00:00:00.000Z', signerName: 'Client fixture', documentHash: version };
      const row = await Quotation.create({ document, clientResponse: signed ? { action: 'accept', name: 'Client fixture', document, documentHash: version, signature } : null, contractState: signed ? { documentHash: version, clientSignedAt: signature.signedAt, locked: true, status: 'pending_admin_confirmation' } : null }, { logging: false }); quoteIds.push(row.id);
      const bytes = Buffer.from('%PDF-fixture immutable original');
      if (signed) await QuotationContract.create({ id: crypto.randomUUID(), quotationId: row.id, documentHash: version, document, signature, clientPdf: bytes, clientPdfSha256: crypto.createHash('sha256').update(bytes).digest('hex') }, { logging: false });
      return row;
    }
    const row = await create();
    const version = documentHash(row.document), path = `/${row.id}/verify-payment`;
    const body = { documentHash: version, paymentDate: '2026-01-01', amount: '1699.50', referenceNumber: `BANK-${fixture}`, paymentMethod: 'bank_transfer', idempotencyKey: crypto.randomUUID(), note: 'Confirmed from bank records.' };
    assert.equal((await request(path, body, null)).status, 401);
    assert.equal((await request(path, body, inactiveToken)).status, 403);
    assert.equal((await request(`/${row.id}/payments`, null, inactiveToken)).status, 403);
    assert.equal((await request(path, { ...body, documentHash: 'b'.repeat(64) })).status, 409);
    assert.equal((await request(path, { ...body, amount: 0 })).status, 400);
    const unsigned = await create(false);
    assert.equal((await request(`/${unsigned.id}/verify-payment`, { ...body, documentHash: documentHash(unsigned.document) })).status, 409);
    assert.deepEqual((await request(`/${row.id}/payments`)).body, { payments: [], paymentStatus: 'unpaid' });
    await row.reload({ logging: false }); assert.equal(row.paymentState, null);
    const signedBefore = await QuotationContract.findOne({ where: { quotationId: row.id }, logging: false });
    const original = Buffer.from(signedBefore.clientPdf);
    const result = await request(path, { ...body, source: 'hitpay', status: 'paid', verifiedBy: { name: 'Spoofed' } });
    assert.equal(result.status, 201); assert.equal(result.body.paymentStatus, 'paid'); assert.equal(result.body.replayed, false);
    assert.equal(result.body.payment.source, 'manual'); assert.equal(result.body.payment.verifiedBy.name, user.name); assert.equal(result.body.payment.amount, 1699.5);
    assert.equal(result.body.payment.paymentDate, body.paymentDate); assert.equal(result.body.payment.referenceNumber, body.referenceNumber); assert.equal(result.body.payment.paymentMethod, body.paymentMethod);
    await row.reload({ logging: false }); assert.equal(row.paymentState.status, 'paid'); assert.equal(row.paymentState.documentHash, version);
    assert.equal(row.contractState.status, 'pending_admin_confirmation');
    const serialized = await request(`/${row.id}`); assert.equal(serialized.status, 200); assert.equal(serialized.body.quotation.paymentStatus, 'paid');
    const repeated = await request(path, body); assert.equal(repeated.status, 200); assert.equal(repeated.body.replayed, true); assert.equal(repeated.body.payment.id, result.body.payment.id);
    const sameReference = await request(path, { ...body, idempotencyKey: crypto.randomUUID() }); assert.equal(sameReference.status, 200); assert.equal(sameReference.body.payment.id, result.body.payment.id);
    assert.equal((await request(path, { ...body, amount: 2000 })).status, 409);
    assert.equal((await request(path, { ...body, idempotencyKey: crypto.randomUUID(), amount: 2000 })).status, 409);
    assert.equal(await QuotationPayment.count({ where: { quotationId: row.id }, logging: false }), 1);
    const stored = await QuotationPayment.findByPk(result.body.payment.id, { logging: false });
    assert.equal(stored.verifiedBy.userId, user.id); assert.equal(stored.verifiedBy.action, 'manual_payment_verification'); assert.equal(stored.agreement.clientPdfSha256, signedBefore.clientPdfSha256);
    await assert.rejects(() => stored.update({ amount: 1 }, { logging: false }), /immutable/);
    const different = { ...body, referenceNumber: `CASH-${fixture}`, paymentMethod: 'cash', idempotencyKey: crypto.randomUUID(), amount: '50.00' };
    const parallel = await Promise.all([request(path, different), request(path, different)]);
    assert.deepEqual(parallel.map(value => value.status).sort(), [200, 201]);
    assert.equal(parallel[0].body.payment.id, parallel[1].body.payment.id);
    const listed = await request(`/${row.id}/payments`); assert.equal(listed.body.payments.length, 2); assert.equal(listed.body.paymentStatus, 'paid');
    await row.reload({ logging: false }); assert.equal(row.paymentState.totalVerifiedAmount, 1749.5);
    // A failed cache write rolls back the payment insert instead of exposing Paid.
    const rollbackRow = await create();
    const update = Quotation.prototype.update;
    mock.method(Quotation.prototype, 'update', async function(values, options) { if (values.paymentState && this.id === rollbackRow.id) throw new Error('Temporary cache write failure'); return update.call(this, values, options); });
    const failed = await request(`/${rollbackRow.id}/verify-payment`, { ...body, documentHash: documentHash(rollbackRow.document), idempotencyKey: crypto.randomUUID() });
    assert.equal(failed.status, 500); assert.equal(await QuotationPayment.count({ where: { quotationId: rollbackRow.id }, logging: false }), 0);
    await rollbackRow.reload({ logging: false }); assert.equal(rollbackRow.paymentState, null);
    mock.restoreAll(); mock.method(require('./quotation-notifications'), 'queueNotificationDelivery', () => {});
    // The same ledger supports a future verified provider adapter, without a public endpoint.
    const providerInput = { ...body, referenceNumber: `HP-${fixture}`, paymentMethod: 'card', idempotencyKey: `hitpay-event-${fixture}` };
    const provider = { source: 'hitpay', verifiedProviderEvent: { signatureVerified: true, status: 'completed', transactionId: `hp-payment-${fixture}`, eventId: `hp-event-${fixture}` } };
    await assert.rejects(() => recordVerifiedPayment({ quotationId: row.id, input: providerInput, context: { source: 'hitpay' } }), { statusCode: 403 });
    const automated = await recordVerifiedPayment({ quotationId: row.id, input: providerInput, context: provider }); assert.equal(automated.payment.source, 'hitpay'); assert.equal(automated.payment.verifiedBy.name, 'HitPay');
    const providerReplay = await recordVerifiedPayment({ quotationId: row.id, input: { ...providerInput, idempotencyKey: `different-event-${fixture}` }, context: { ...provider, verifiedProviderEvent: { ...provider.verifiedProviderEvent, eventId: 'another-delivery' } } });
    assert.equal(providerReplay.replayed, true); assert.equal(providerReplay.payment.id, automated.payment.id);
    const other = await create();
    await assert.rejects(() => recordVerifiedPayment({ quotationId: other.id, input: { ...providerInput, documentHash: documentHash(other.document), idempotencyKey: `second-quotation-${fixture}` }, context: provider }), { statusCode: 409 });
    await signedBefore.reload({ logging: false }); assert.deepEqual(signedBefore.clientPdf, original); assert.equal(signedBefore.providerAcceptance, null);
    assert.equal((await request(path, body, token, 'PUT')).status, 404);
    assert.equal((await request('/invalid/payments')).status, 400);
    assert.equal((await request('/999999999/payments')).status, 404);
  } finally {
    mock.restoreAll();
    if (server) await new Promise(resolve => server.close(resolve));
    if (quoteIds.length) {
      for (const model of [QuotationPayment, QuotationContract]) await model.destroy({ where: { quotationId: quoteIds }, logging: false });
      await Quotation.destroy({ where: { id: quoteIds }, force: true, logging: false });
    }
    if (userIds.length) await User.destroy({ where: { id: userIds }, logging: false });
    await sequelize.close();
  }
});
