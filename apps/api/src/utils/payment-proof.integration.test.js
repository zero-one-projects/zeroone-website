const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { PDFDocument } = require('pdf-lib');

test('payment proof requires the signed verified session, stores privately, queues once, rolls back failures, and supports returning clients', { skip: process.env.RUN_PAYMENT_PROOF_DB_TESTS !== 'true' }, async () => {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
  const { sequelize } = require('../config/database');
  const { Quotation, QuotationVerification, QuotationPaymentProof, QuotationNotification } = require('../models');
  const { normalizeQuotation } = require('./quotation');
  const { documentHash } = require('./quotation-response');
  const { createSigningSession } = require('./quotation-signature');
  const jobs = []; let failQueue = false; let deliveredCode;
  mock.method(QuotationNotification, 'create', async job => { if (failQueue) throw new Error('Simulated mail queue failure'); jobs.push(job); return job; });
  mock.method(require('./quotation-notifications'), 'queueNotificationDelivery', () => {});
  mock.method(require('./quotation-verification-mail'), 'sendQuotationCode', async payload => { deliveredCode = payload; });
  const app = require('../app');
  const server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const admin = `Bearer ${require('jsonwebtoken').sign({ sub: 4294967200, role: 1, email: 'admin@example.com' }, process.env.JWT_SECRET)}`;
  const ids = []; let requestCount = 0;
  sequelize.options.logging = false;
  const pdf = await PDFDocument.create(); pdf.addPage(); const data = Buffer.from(await pdf.save());
  async function upload(token, values, file = data) {
    const body = new FormData(); for (const [key, value] of Object.entries(values)) body.append(key, String(value));
    body.append('proof', new Blob([file], { type: 'application/pdf' }), 'receipt.pdf');
    const response = await fetch(`${base}/quotations/${token}/payment-proofs`, { method: 'POST', headers: { 'X-Forwarded-For': `192.0.2.${++requestCount}` }, body });
    return { status: response.status, body: await response.json() };
  }
  async function post(token, path, body) {
    const response = await fetch(`${base}/quotations/${token}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `192.0.2.${++requestCount}` }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }
  try {
    await QuotationPaymentProof.sync();
    const document = normalizeQuotation({ title: 'Payment proof test', clientName: 'Test Company', clientEmail: 'client@example.com', clientAddress: 'Test address', initialPaymentPercent: 50, issuedOn: '2026-01-01', validUntil: '2099-01-01', currency: 'PHP', contractText: 'Agreed contract terms', items: [{ description: 'Project', quantity: 1, unitPrice: 30000 }] });
    const row = await Quotation.create({ document, shareToken: crypto.randomBytes(32).toString('hex') }); ids.push(row.id);
    const hash = documentHash(document);
    const challenge = await QuotationVerification.create({ id: crypto.randomUUID(), quotationId: row.id, email: document.clientEmail, action: 'accept', documentHash: hash, codeHash: '0'.repeat(64), expiresAt: new Date(Date.now() + 600000), consumedAt: new Date() });
    const response = { action: 'accept', name: 'Test Signer', email: document.clientEmail, documentHash: hash, contractText: document.contractText, document, respondedAt: new Date().toISOString(), signature: { signerName: 'Test Signer', signedAt: new Date().toISOString(), type: 'typed', typedName: 'Test Signer' } };
    await row.update({ clientResponse: response });
    const values = { id: crypto.randomUUID(), challengeId: challenge.id, verificationProof: createSigningSession(challenge, row, document.contractText), amountPaid: '15000', paidOn: '2026-01-01', transactionReference: 'BANK-123', note: 'Down payment' };
    assert.equal((await upload(row.shareToken, { ...values, verificationProof: 'forged' })).status, 403);
    assert.equal((await upload(row.shareToken, values, Buffer.from('not a PDF'))).status, 400);
    assert.equal((await upload(row.shareToken, values, Buffer.alloc(2 * 1024 * 1024 + 1))).status, 413);
    await row.update({ clientResponse: { ...response, signature: undefined } });
    assert.equal((await upload(row.shareToken, values)).status, 403);
    await row.update({ clientResponse: response });
    failQueue = true;
    assert.equal((await upload(row.shareToken, values)).status, 500);
    assert.equal(await QuotationPaymentProof.count({ where: { quotationId: row.id } }), 0);
    failQueue = false;
    const created = await upload(row.shareToken, values);
    assert.equal(created.status, 201); assert.equal(created.body.proof.status, 'pending_verification');
    assert.equal(created.body.proof.data, undefined); assert.equal(created.body.proof.snapshot, undefined);
    assert.equal(jobs.length, 1); assert.equal(jobs[0].payload.action, 'payment_proof');
    assert.equal((await upload(row.shareToken, values)).status, 200); assert.equal(jobs.length, 1);
    assert.equal((await upload(row.shareToken, { ...values, amountPaid: '1' })).status, 409);
    assert.equal((await upload(row.shareToken, { ...values, id: crypto.randomUUID() })).status, 429);
    const stored = await QuotationPaymentProof.findByPk(values.id);
    assert.equal(Number(stored.amountPaid), 15000); assert.equal(stored.clientEmail, document.clientEmail);
    assert.equal(stored.snapshot.document.total, 30000); assert.equal(stored.snapshot.clientName, 'Test Signer');
    await row.reload(); assert.deepEqual(row.clientResponse, response);
    const adminPath = `${base}/admin/quotations/${row.id}/payment-proofs`;
    assert.equal((await fetch(adminPath)).status, 401);
    const listed = await (await fetch(adminPath, { headers: { Authorization: admin } })).json();
    assert.equal(listed.proofs.length, 1); assert.equal(listed.proofs[0].data, undefined);
    const download = await fetch(`${adminPath}/${values.id}`, { headers: { Authorization: admin } });
    assert.equal(download.status, 200); assert.equal(download.headers.get('content-type'), 'application/pdf');
    assert.equal(Buffer.from(await download.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
    const anonymous = await (await fetch(`${base}/quotations/${row.shareToken}`)).json();
    assert.equal(anonymous.quotation.paymentProofs, undefined);
    assert.equal(anonymous.quotation.paymentSummary.amountDue, 15000);
    await QuotationVerification.update({ createdAt: new Date(Date.now() - 61000) }, { where: { id: challenge.id }, silent: true });
    assert.equal((await post(row.shareToken, 'verification', { email: 'other@example.com', action: 'payment', documentVersion: hash })).status, 403);
    const fresh = await post(row.shareToken, 'verification', { email: document.clientEmail, action: 'payment', documentVersion: hash });
    assert.equal(fresh.status, 200); assert.equal(deliveredCode.action, 'payment');
    const verified = await post(row.shareToken, 'verify', { challengeId: fresh.body.challengeId, code: deliveredCode.code });
    assert.equal(verified.status, 200); assert(verified.body.signingSession);
    assert.equal((await post(row.shareToken, 'verify', { challengeId: fresh.body.challengeId, code: deliveredCode.code })).status, 400);
    await row.update({ document: { ...document, title: 'Changed terms' } });
    assert.equal((await upload(row.shareToken, { ...values, id: crypto.randomUUID() })).status, 403);
    await row.update({ document, shareToken: crypto.randomBytes(32).toString('hex') });
    assert.equal((await upload(row.shareToken, { ...values, id: crypto.randomUUID() })).status, 403);
    await row.update({ shareToken: null });
    assert.equal((await upload('a'.repeat(64), values)).status, 404);
  } finally {
    if (ids.length) {
      await QuotationPaymentProof.destroy({ where: { quotationId: ids } });
      await QuotationVerification.destroy({ where: { quotationId: ids } });
      await Quotation.destroy({ where: { id: ids }, force: true });
    }
    await new Promise(resolve => server.close(resolve));
    await sequelize.close(); mock.restoreAll();
  }
});
