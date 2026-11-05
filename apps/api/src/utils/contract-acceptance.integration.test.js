const { test, mock } = require('node:test');
const assert = require('node:assert/strict');

test('post-sign admin confirmation preserves the signed original, records one notification, and stays separate from payment review', { skip: process.env.RUN_CONTRACT_ACCEPTANCE_DB_TESTS !== 'true' }, async () => {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
  const crypto = require('crypto'); const jwt = require('jsonwebtoken');
  const { PDFDocument } = require('pdf-lib');
  const { sequelize } = require('../config/database');
  const { User, Quotation, QuotationContract, QuotationVerification, QuotationResponseHistory, QuotationNotification, QuotationPaymentProof, PosSubscription } = require('../models');
  const { documentHash, codeHash } = require('./quotation-response');
  const quoteIds = [], userIds = []; let server;
  sequelize.options.logging = false;
  mock.method(require('./quotation-notifications'), 'queueNotificationDelivery', () => {});
  const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  try {
    const user = await User.create({ name: 'Authorized staff fixture', email: `contract-test-${crypto.randomUUID()}@example.com`, passwordHash: crypto.randomBytes(32).toString('hex'), passwordSalt: crypto.randomBytes(16).toString('hex'), role: 1, isActive: true }, { logging: false }); userIds.push(user.id);
    const inactive = await User.create({ name: 'Inactive staff fixture', email: `inactive-${crypto.randomUUID()}@example.com`, passwordHash: crypto.randomBytes(32).toString('hex'), passwordSalt: crypto.randomBytes(16).toString('hex'), role: 1, isActive: false }, { logging: false }); userIds.push(inactive.id);
    const token = jwt.sign({ sub: user.id, email: user.email, role: 1 }, process.env.JWT_SECRET, { expiresIn: '10m' });
    const inactiveToken = jwt.sign({ sub: inactive.id, role: 1 }, process.env.JWT_SECRET, { expiresIn: '10m' });
    server = await new Promise(resolve => { const instance = require('../app').listen(0, '127.0.0.1', () => resolve(instance)); });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    async function request(path, body, method, authorization = token) {
      return fetch(base + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    }
    async function json(path, body, method, authorization) { const response = await request(path, body, method, authorization); return { status: response.status, body: await response.json() }; }
    const input = { quoteType: 'pos', posPurpose: 'new', clientFlow: 'full', title: 'Contract lifecycle fixture', clientName: 'Temporary Client', clientAddress: '123 Test Street, Pagadian City', clientEmail: 'client@example.com', currency: 'PHP', issuedOn: '2026-01-01', validUntil: '2099-01-01', contractSource: 'default', contractText: 'Original saved contract terms.', contractDetails: { agreementDateRule: 'signing' }, items: [{ description: 'Setup fee', chargeType: 'setup', quantity: 1, unitPrice: 5000 }, { description: 'Monthly plan', chargeType: 'recurring', quantity: 1, unitPrice: 1000 }] };
    async function create(extra = {}) {
      const created = await json('/admin/quotations', { document: { ...input, ...extra } }); assert.equal(created.status, 201); quoteIds.push(created.body.quotation.id);
      return Quotation.findByPk(created.body.quotation.id, { logging: false });
    }
    async function approve(row, authorization = token, version = documentHash(row.document), reviewHash) {
      const record = await QuotationContract.findOne({ where: { quotationId: row.id, documentHash: documentHash(row.document) }, logging: false });
      return json(`/admin/quotations/${row.id}/confirm-contract`, { documentVersion: version, reviewedClientPdfSha256: reviewHash ?? record?.clientPdfSha256 }, 'POST', authorization);
    }
    async function confirmationJobs(row) {
      return (await QuotationNotification.findAll({ where: { quotationId: row.id }, logging: false })).filter(job => job.payload.action === 'client_contract_confirmed');
    }
    async function historicalApproval(row) {
      const acceptance = { userId: user.id, name: user.name, email: user.email, role: user.role, ipAddress: '127.0.0.1', userAgent: 'historical-preapproval-fixture', confirmedAt: '2026-01-01T01:00:00.000Z', documentHash: documentHash(row.document), action: 'provider_contract_confirmation' };
      const record = await QuotationContract.create({ id: crypto.randomUUID(), quotationId: row.id, documentHash: documentHash(row.document), document: row.document, providerAcceptance: acceptance }, { logging: false });
      await row.update({ contractState: { recordId: record.id, documentHash: record.documentHash, status: 'provider_confirmed', locked: false, clientSignedAt: null, providerAcceptance: acceptance } }, { logging: false });
      return { record, acceptance };
    }
    async function sign(row) {
      const challengeId = crypto.randomUUID();
      await QuotationVerification.create({ id: challengeId, quotationId: row.id, email: input.clientEmail, action: 'accept', documentHash: documentHash(row.document), codeHash: codeHash(challengeId, '123456'), expiresAt: new Date(Date.now() + 600000) }, { logging: false });
      const verified = await json(`/quotations/${row.shareToken}/verify`, { challengeId, code: '123456' }, 'POST', null); assert.equal(verified.status, 200);
      const accepted = await json(`/quotations/${row.shareToken}/respond`, { challengeId, action: 'accept', name: 'Client Representative', verificationProof: verified.body.verificationProof }, 'POST', null); assert.equal(accepted.status, 200);
      const signed = await json(`/quotations/${row.shareToken}/sign`, { challengeId, name: 'Client Representative', verificationProof: accepted.body.signingSession.verificationProof, signature: { type: 'typed', typedName: 'Client Representative', agreed: true } }, 'POST', null); assert.equal(signed.status, 200);
      await row.reload({ logging: false }); return signed.body;
    }
    async function pdf(row, copy) { const result = await request('/admin/contracts/signed-copy', { quotationId: row.id, documentHash: documentHash(row.document), copy }); assert.equal(result.status, 200); return Buffer.from(await result.arrayBuffer()); }
    const first = await create();
    assert.equal((await approve(first, null)).status, 401);
    assert.equal((await approve(first, inactiveToken)).status, 403);
    assert.equal((await approve(first, token, 'wrong-version')).status, 409);
    assert.equal((await approve(first)).status, 409);
    assert.equal((await confirmationJobs(first)).length, 0);
    const noChange = await json(`/admin/quotations/${first.id}`, { document: first.document }, 'PUT'); assert.equal(noChange.status, 200);
    const signedFirst = await sign(first); assert.equal(signedFirst.quotation.contractState.status, 'pending_admin_confirmation'); assert.equal(signedFirst.quotation.contractState.locked, true);
    assert.equal(signedFirst.quotation.contractState.providerAcceptance, null);
    assert(signedFirst.quotation.paymentInstructions.trim());
    assert.equal(await PosSubscription.findByPk(first.id, { logging: false }), null);
    let record = await QuotationContract.findOne({ where: { quotationId: first.id }, logging: false });
    assert.equal(record.finalPdf, null); assert.equal(hash(record.clientPdf), record.clientPdfSha256);
    assert.equal(record.signature.signedAt, signedFirst.quotation.contractState.clientSignedAt);
    assert(Number.isFinite(Date.parse(record.signature.signedAt)));
    assert.equal(record.signature.email, input.clientEmail);
    const firstOriginalPdf = await pdf(first, 'client');
    assert.deepEqual(firstOriginalPdf, record.clientPdf);
    assert.equal((await json(`/admin/quotations/${first.id}/confirm-contract`, { documentVersion: documentHash(first.document) })).status, 409);
    assert.equal((await approve(first, token, documentHash(first.document), '0'.repeat(64))).status, 409);
    assert.equal((await confirmationJobs(first)).length, 0);
    const confirmations = await Promise.all([approve(first), approve(first)]);
    for (const confirmed of confirmations) { assert.equal(confirmed.status, 200); assert.equal(confirmed.body.quotation.contractState.status, 'finalized'); }
    const approvedAt = confirmations[0].body.quotation.contractState.providerAcceptance.confirmedAt;
    assert.equal(confirmations[1].body.quotation.contractState.providerAcceptance.confirmedAt, approvedAt);
    assert.equal(confirmations[0].body.quotation.contractState.providerAcceptance.name, user.name);
    assert(Date.parse(approvedAt) >= Date.parse(record.signature.signedAt));
    await record.reload({ logging: false });
    assert.equal(record.providerAcceptance.userId, user.id);
    assert.equal(record.providerAcceptance.reviewedClientPdfSha256, record.clientPdfSha256);
    assert.equal(hash(record.finalPdf), record.finalPdfSha256); assert.equal(hash(record.clientPdf), record.clientPdfSha256);
    assert.deepEqual(record.clientPdf, firstOriginalPdf);
    const jobs = await confirmationJobs(first); assert.equal(jobs.length, 1); assert.equal(jobs[0].status, 'pending');
    assert.equal(jobs[0].payload.clientEmail, input.clientEmail); assert.equal(jobs[0].payload.signedContract.recordId, record.id); assert.equal(jobs[0].payload.signedContract.copy, 'final');
    assert.equal((await approve(first)).body.quotation.contractState.providerAcceptance.confirmedAt, approvedAt);
    assert.equal((await confirmationJobs(first)).length, 1);
    const savedFinal = await pdf(first); assert.deepEqual(savedFinal, record.finalPdf); assert.deepEqual(await pdf(first), savedFinal);
    const clientCopy = await request(`/quotations/${first.shareToken}/signed-contract`, signedFirst.signingSession, 'POST', null); assert.equal(clientCopy.status, 200); assert.deepEqual(Buffer.from(await clientCopy.arrayBuffer()), savedFinal);
    const blockedEdit = await json(`/admin/quotations/${first.id}`, { document: { ...first.document, title: 'Forbidden edit' }, contractState: null }, 'PUT'); assert.equal(blockedEdit.status, 409);
    await first.reload({ logging: false }); assert.equal(first.document.title, input.title);
    assert(await PosSubscription.findByPk(first.id, { logging: false }));
    const second = await create({ title: 'Provider confirmation after signing' });
    const signedSecond = await sign(second); assert.equal(signedSecond.quotation.contractState.status, 'pending_admin_confirmation');
    assert.equal(await PosSubscription.findByPk(second.id, { logging: false }), null);
    assert.equal((await json('/admin/billing', { quotationId: second.id, period: '2026-11', issuedOn: '2026-11-05', dueOn: '2026-11-12', goLiveOn: '2026-01-01' })).status, 400);
    const originalClientPdf = await pdf(second);
    record = await QuotationContract.findOne({ where: { quotationId: second.id }, logging: false }); assert.equal(record.finalPdf, null);
    const receipt = await PDFDocument.create(); receipt.addPage().drawText('Temporary receipt fixture'); const receiptData = Buffer.from(await receipt.save());
    const proof = await QuotationPaymentProof.create({ id: crypto.randomUUID(), quotationId: second.id, documentHash: documentHash(second.document), clientEmail: input.clientEmail, amountPaid: 1000, paidOn: '2026-01-01', transactionReference: 'TEMP-RECEIPT', note: '', fileName: 'receipt.pdf', mimeType: 'application/pdf', sha256: hash(receiptData), data: receiptData, snapshot: { clientName: 'Client Representative', document: second.document } }, { logging: false });
    const reviewPath = `/admin/quotations/${second.id}/payment-proofs/${proof.id}/verify`;
    assert.equal((await json(reviewPath, { status: 'verified', confirmedAmount: 1000, documentHash: proof.documentHash }, 'POST', inactiveToken)).status, 403);
    assert.equal((await json(reviewPath, { status: 'verified', confirmedAmount: 0, documentHash: proof.documentHash })).status, 400);
    const reviewed = await json(reviewPath, { status: 'verified', confirmedAmount: 950, documentHash: proof.documentHash, note: 'Confirmed receipt fixture amount.' }); assert.equal(reviewed.status, 200);
    assert.equal(reviewed.body.proof.status, 'verified'); assert.equal(reviewed.body.proof.verification.confirmedAmount, 950);
    assert.equal((await json(reviewPath, { status: 'verified', confirmedAmount: 950, documentHash: proof.documentHash })).status, 409);
    await second.reload({ logging: false }); assert.equal(second.contractState.status, 'pending_admin_confirmation');
    await proof.reload({ logging: false }); assert.equal(Number(proof.amountPaid), 1000); assert.equal(proof.verification.userId, user.id); assert.equal(proof.verification.proofSha256, proof.sha256);
    const rejectedProof = await QuotationPaymentProof.create({ ...proof.get({ plain: true }), id: crypto.randomUUID(), verification: null }, { logging: false });
    const rejected = await json(`/admin/quotations/${second.id}/payment-proofs/${rejectedProof.id}/verify`, { status: 'rejected', note: 'Receipt does not match bank records.', documentHash: rejectedProof.documentHash }); assert.equal(rejected.status, 200); assert.equal(rejected.body.proof.status, 'rejected');
    const confirmed = await approve(second); assert.equal(confirmed.status, 200); assert.equal(confirmed.body.quotation.contractState.status, 'finalized');
    await record.reload({ logging: false }); assert.deepEqual(record.clientPdf, originalClientPdf); assert.deepEqual(await pdf(second, 'client'), originalClientPdf);
    assert.deepEqual(await pdf(second), record.finalPdf); assert(await PosSubscription.findByPk(second.id, { logging: false }));
    assert.equal((await confirmationJobs(second)).length, 1);
    const third = await create({ title: 'Approval must match the exact saved version' });
    const { record: originalApproval } = await historicalApproval(third);
    const oldVersion = documentHash(third.document);
    const edited = await json(`/admin/quotations/${third.id}`, { document: { ...third.document, contractText: 'Explicit revised terms before client signing.' } }, 'PUT'); assert.equal(edited.status, 200); assert.equal(edited.body.quotation.contractState.status, 'draft');
    await third.reload({ logging: false }); assert.notEqual(documentHash(third.document), oldVersion);
    assert.equal((await sign(third)).quotation.contractState.status, 'pending_admin_confirmation');
    assert.equal((await approve(third, token, oldVersion)).status, 409);
    await originalApproval.reload({ logging: false }); assert.equal(originalApproval.providerAcceptance.userId, user.id); assert.equal(originalApproval.signature, null);
    const currentThirdRecord = await QuotationContract.findOne({ where: { quotationId: third.id, documentHash: documentHash(third.document) }, logging: false });
    const validThirdOriginal = Buffer.from(currentThirdRecord.clientPdf);
    await currentThirdRecord.update({ clientPdf: Buffer.from('tampered original fixture') }, { logging: false });
    assert.equal((await approve(third)).status, 500);
    await currentThirdRecord.reload({ logging: false }); assert.equal(currentThirdRecord.providerAcceptance, null); assert.equal(currentThirdRecord.finalPdf, null);
    assert.equal((await confirmationJobs(third)).length, 0);
    await currentThirdRecord.update({ clientPdf: validThirdOriginal }, { logging: false });
    const fourth = await create({ title: 'Old preapproval does not confirm a later client signature' });
    const { record: preapprovedRecord, acceptance: priorAcceptance } = await historicalApproval(fourth);
    const signedFourth = await sign(fourth);
    assert.equal(signedFourth.quotation.contractState.status, 'pending_admin_confirmation');
    assert.equal(signedFourth.quotation.contractState.providerAcceptance, null);
    assert.deepEqual(signedFourth.quotation.contractState.priorProviderAcceptance, { name: priorAcceptance.name, confirmedAt: priorAcceptance.confirmedAt });
    await preapprovedRecord.reload({ logging: false });
    assert.deepEqual(preapprovedRecord.priorProviderAcceptance, priorAcceptance);
    assert.equal(preapprovedRecord.providerAcceptance, null); assert.equal(preapprovedRecord.finalPdf, null);
    assert.equal(await PosSubscription.findByPk(fourth.id, { logging: false }), null);
    assert.equal((await confirmationJobs(fourth)).length, 0);
    const archivedOriginalPdf = await pdf(fourth, 'client');
    assert.equal((await approve(fourth)).status, 200);
    await preapprovedRecord.reload({ logging: false });
    assert.deepEqual(preapprovedRecord.priorProviderAcceptance, priorAcceptance);
    assert(Date.parse(preapprovedRecord.providerAcceptance.confirmedAt) >= Date.parse(preapprovedRecord.signature.signedAt));
    assert.deepEqual(preapprovedRecord.clientPdf, archivedOriginalPdf); assert.equal((await confirmationJobs(fourth)).length, 1);
    const validFinal = Buffer.from(record.finalPdf); await record.update({ finalPdf: Buffer.from('tampered fixture') }, { logging: false });
    assert.equal((await request('/admin/contracts/signed-copy', { quotationId: second.id, documentHash: documentHash(second.document) })).status, 500);
    await record.update({ finalPdf: validFinal }, { logging: false });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (quoteIds.length) { for (const model of [QuotationPaymentProof, QuotationContract, QuotationNotification, QuotationResponseHistory, QuotationVerification]) await model.destroy({ where: { quotationId: quoteIds }, logging: false }); await PosSubscription.destroy({ where: { quotationId: quoteIds }, logging: false }); await Quotation.destroy({ where: { id: quoteIds }, force: true, logging: false }); }
    if (userIds.length) await User.destroy({ where: { id: userIds }, logging: false });
    mock.restoreAll(); await sequelize.close();
  }
});
