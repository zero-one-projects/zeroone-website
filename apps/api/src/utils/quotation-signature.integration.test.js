const { test, mock } = require('node:test');
const assert = require('node:assert/strict');

test('verified acceptance supports immediate or deferred signing while preserving agreed terms and preventing replay', { skip: process.env.RUN_QUOTATION_DB_TESTS !== 'true' }, async () => {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
  const { sequelize } = require('../config/database');
  const { Quotation, QuotationVerification, QuotationResponseHistory, QuotationNotification } = require('../models');
  const { codeHash, documentHash } = require('./quotation-response');
  const { normalizeQuotation } = require('./quotation');
  // Tests never deliver notifications or verification email.
  mock.method(require('./quotation-notifications'), 'queueNotificationDelivery', () => {});
  let deliveredCode;
  mock.method(require('./quotation-verification-mail'), 'sendQuotationCode', async (payload) => { deliveredCode = payload; });
  const app = require('../app');
  sequelize.options.logging = false;
  const server = await new Promise((resolve) => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  const base = `http://127.0.0.1:${server.address().port}/api/quotations`;
  const ids = [];
  async function post(token, route, body) {
    const response = await fetch(`${base}/${token}/${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }
  try {
    const crypto = require('crypto');
    const document = normalizeQuotation({ title: 'Signature integration test', clientName: 'Test Client', clientEmail: 'client@example.com', issuedOn: '2026-10-26', validUntil: '2099-01-01', currency: 'PHP', items: [{ description: 'Test service', quantity: 1, unitPrice: 5000 }], contractText: 'Original agreed terms' });
    const row = await Quotation.create({ document, shareToken: crypto.randomBytes(32).toString('hex') }); ids.push(row.id);
    const challengeId = crypto.randomUUID();
    const challenge = await QuotationVerification.create({ id: challengeId, quotationId: row.id, email: document.clientEmail, action: 'accept', documentHash: documentHash(document), codeHash: codeHash(challengeId, '123456'), expiresAt: new Date(Date.now() + 600000), attempts: 3 });
    const signature = { type: 'typed', agreed: true, typedName: 'Client Name' };
    const body = { challengeId, action: 'accept', name: 'Client Name', signature };
    assert.equal((await post(row.shareToken, 'respond', { ...body, code: '123456' })).status, 400);
    assert.equal((await post(row.shareToken, 'verify', { challengeId, code: '000000' })).status, 400);
    const verified = await post(row.shareToken, 'verify', { challengeId, code: '123456' });
    assert.equal(verified.status, 200); assert.equal(verified.body.contractText, 'Original agreed terms');
    await challenge.reload(); assert.equal(challenge.attempts, 5);
    assert.equal((await post(row.shareToken, 'verify', { challengeId, code: '123456' })).status, 400);
    const signedBody = { ...body, verificationProof: verified.body.verificationProof };
    assert.equal((await post(row.shareToken, 'respond', { ...signedBody, signature: { ...signature, agreed: false } })).status, 400);
    const accepted = await post(row.shareToken, 'respond', signedBody);
    assert.equal(accepted.status, 200); assert(accepted.body.quotation.clientResponse.signedAt);
    assert.equal(accepted.body.quotation.clientResponse.signature, undefined);
    await row.reload(); assert.equal(row.clientResponse.signature.contractText, 'Original agreed terms');
    assert.equal(row.clientResponse.signature.email, 'client@example.com');
    assert.equal(row.clientResponse.signature.typedName, 'Client Name');
    assert.equal((await post(row.shareToken, 'respond', signedBody)).status, 400);
    assert.equal(await QuotationResponseHistory.count({ where: { quotationId: row.id } }), 1);
    const notification = await QuotationNotification.findOne({ where: { quotationId: row.id } });
    assert(notification.payload.signedAt);
    const receipts = await QuotationNotification.findAll({ where: { quotationId: row.id } });
    const clientReceipt = receipts.find((job) => job.payload.action === 'client_accept');
    assert(clientReceipt); assert.equal(clientReceipt.payload.clientEmail, 'client@example.com');
    assert(clientReceipt.payload.clientUrl.endsWith('?sign=1'));
    await row.update({ document: { ...row.document, contractText: 'Later revision' } });
    const record = await QuotationResponseHistory.findOne({ where: { quotationId: row.id } });
    assert.equal(record.response.signature.contractText, 'Original agreed terms');

    const changed = await Quotation.create({ document, shareToken: crypto.randomBytes(32).toString('hex') }); ids.push(changed.id);
    const secondId = crypto.randomUUID();
    await QuotationVerification.create({ id: secondId, quotationId: changed.id, email: document.clientEmail, action: 'accept', documentHash: documentHash(document), codeHash: codeHash(secondId, '654321'), expiresAt: new Date(Date.now() + 600000) });
    const second = await post(changed.shareToken, 'verify', { challengeId: secondId, code: '654321' }); assert.equal(second.status, 200);
    await changed.update({ document: { ...document, contractText: 'Changed contract' } });
    assert.equal((await post(changed.shareToken, 'respond', { ...body, challengeId: secondId, verificationProof: second.body.verificationProof })).status, 400);
    await changed.reload(); assert.equal(changed.clientResponse, null);
    assert.equal(await QuotationNotification.count({ where: { quotationId: changed.id } }), 0);

    const later = await Quotation.create({ document, shareToken: crypto.randomBytes(32).toString('hex') }); ids.push(later.id);
    const laterId = crypto.randomUUID();
    const laterChallenge = await QuotationVerification.create({ id: laterId, quotationId: later.id, email: document.clientEmail, action: 'accept', documentHash: documentHash(document), codeHash: codeHash(laterId, '112233'), expiresAt: new Date(Date.now() + 600000) });
    const laterVerified = await post(later.shareToken, 'verify', { challengeId: laterId, code: '112233' }); assert.equal(laterVerified.status, 200);
    const unsigned = await post(later.shareToken, 'respond', { challengeId: laterId, verificationProof: laterVerified.body.verificationProof, name: 'Client Name', action: 'accept' });
    assert.equal(unsigned.status, 200); assert.equal(unsigned.body.quotation.clientResponse.signaturePending, true);
    await later.reload(); const acceptedAt = later.clientResponse.respondedAt;
    assert.equal(later.clientResponse.contractText, 'Original agreed terms');
    assert.equal((await QuotationNotification.findOne({ where: { quotationId: later.id } })).payload.signaturePending, true);
    await QuotationVerification.update({ createdAt: new Date(Date.now() - 61000) }, { where: { id: laterChallenge.id }, silent: true });
    assert.equal((await post(later.shareToken, 'verification', { email: 'other@example.com', action: 'accept', documentVersion: documentHash(document) })).status, 403);
    const fresh = await post(later.shareToken, 'verification', { email: document.clientEmail, action: 'accept', documentVersion: documentHash(document) }); assert.equal(fresh.status, 200);
    assert.equal(deliveredCode.action, 'sign');
    const proof = await post(later.shareToken, 'verify', { challengeId: fresh.body.challengeId, code: deliveredCode.code }); assert.equal(proof.status, 200);
    const signBody = { challengeId: fresh.body.challengeId, verificationProof: proof.body.verificationProof, name: 'Client Name', signature };
    assert.equal((await post(later.shareToken, 'sign', { ...signBody, signature: { ...signature, agreed: false } })).status, 400);
    const completed = await post(later.shareToken, 'sign', signBody); assert.equal(completed.status, 200);
    assert(completed.body.quotation.clientResponse.signedAt); assert.equal(completed.body.quotation.clientResponse.signaturePending, false);
    await later.reload(); assert.equal(later.clientResponse.respondedAt, acceptedAt);
    assert.equal(later.clientResponse.signature.contractText, 'Original agreed terms');
    assert.equal(await QuotationResponseHistory.count({ where: { quotationId: later.id } }), 1);
    assert.equal((await QuotationResponseHistory.findOne({ where: { quotationId: later.id } })).response.signature.typedName, 'Client Name');
    assert.equal(await QuotationNotification.count({ where: { quotationId: later.id } }), 4);
    const signedJobs = await QuotationNotification.findAll({ where: { quotationId: later.id } });
    assert(signedJobs.some(job => job.payload.action === 'client_signed' && job.payload.clientEmail === document.clientEmail));
    assert.equal(signedJobs.find(job => job.payload.action === 'signed').payload.signedContract.signature.typedName, 'Client Name');
    assert.equal((await post(later.shareToken, 'sign', signBody)).status, 409);

    const immediate = await Quotation.create({ document, shareToken: crypto.randomBytes(32).toString('hex') }); ids.push(immediate.id);
    const immediateId = crypto.randomUUID();
    await QuotationVerification.create({ id: immediateId, quotationId: immediate.id, email: document.clientEmail, action: 'accept', documentHash: documentHash(document), codeHash: codeHash(immediateId, '334455'), expiresAt: new Date(Date.now() + 600000) });
    const immediateProof = await post(immediate.shareToken, 'verify', { challengeId: immediateId, code: '334455' });
    const immediateBody = { challengeId: immediateId, verificationProof: immediateProof.body.verificationProof, name: 'Client Name', action: 'accept' };
    const acceptance = await post(immediate.shareToken, 'respond', immediateBody);
    assert.equal(acceptance.status, 200); assert(acceptance.body.signingSession);
    await QuotationVerification.update({ expiresAt: new Date(Date.now() - 1000) }, { where: { id: immediateId } });
    assert.equal((await post(immediate.shareToken, 'sign', { ...immediateBody, signature })).status, 400);
    const openPageBody = { ...immediateBody, signature, verificationProof: acceptance.body.signingSession.verificationProof };
    const signedResult = await post(immediate.shareToken, 'sign', openPageBody);
    assert.equal(signedResult.status, 200); assert(signedResult.body.signingSession);
    const download = await fetch(`${base}/${immediate.shareToken}/signed-contract`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(openPageBody) });
    assert.equal(download.status, 200); assert.equal(download.headers.get('content-type'), 'application/pdf');
    const pdf = Buffer.from(await download.arrayBuffer()); assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.equal((await post(immediate.shareToken, 'signed-contract', { ...openPageBody, verificationProof: 'forged' })).status, 403);
    const anonymous = await fetch(`${base}/${immediate.shareToken}`); const anonymousBody = await anonymous.json();
    assert.equal(anonymousBody.signingSession, undefined); assert.equal(anonymousBody.quotation.clientResponse.signature, undefined);
    assert.equal(await QuotationResponseHistory.count({ where: { quotationId: immediate.id } }), 1);
  } finally {
    if (ids.length) {
      await QuotationNotification.destroy({ where: { quotationId: ids } });
      await QuotationResponseHistory.destroy({ where: { quotationId: ids } });
      await QuotationVerification.destroy({ where: { quotationId: ids } });
      await Quotation.destroy({ where: { id: ids }, force: true });
    }
    await new Promise((resolve) => server.close(resolve));
    await sequelize.close(); mock.restoreAll();
  }
});
