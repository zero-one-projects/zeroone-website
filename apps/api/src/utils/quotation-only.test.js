const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { documentHash, codeHash } = require('./quotation-response');
const { serializeQuotation } = require('./serialize-quotation');

test('quotation-only API verifies acceptance, records history, queues follow-up messaging and blocks signing', async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'quotation-only-test-secret';
  const { sequelize } = require('../config/database');
  const { Quotation, QuotationVerification, QuotationResponseHistory, QuotationNotification } = require('../models');
  const document = { clientFlow: 'quotation_only', clientName: 'Client', clientEmail: 'client@example.com', title: 'Website', currency: 'PHP', total: 100, validUntil: '2099-01-01', contractText: 'Private draft', contractSource: 'pdf', contractPdf: { id: 'private-file' }, contractDetails: { paymentTerms: 'Private terms' }, paymentInstructions: 'Private bank details', initialPaymentPercent: 20 };
  const row = { id: 1, createdAt: new Date(), shareToken: 'a'.repeat(64), document, clientResponse: null, async update(values) { Object.assign(this, values); } };
  let challenge;
  function newChallenge(action = 'accept') {
    const id = crypto.randomUUID();
    challenge = { id, quotationId: 1, action, email: document.clientEmail, documentHash: documentHash(document), codeHash: codeHash(id, '123456'), expiresAt: new Date(Date.now() + 600000), attempts: 0, async update(values) { Object.assign(this, values); } };
  }
  const jobs = [], history = [];
  mock.method(sequelize, 'transaction', async (_, fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  mock.method(Quotation, 'findOne', async () => row);
  mock.method(QuotationVerification, 'findByPk', async () => challenge);
  mock.method(QuotationResponseHistory, 'findOrCreate', async (query) => { history.push(query.defaults.response); return [{}]; });
  mock.method(QuotationNotification, 'create', async (job) => { jobs.push(job.payload); });
  mock.method(require('./quotation-notifications'), 'queueNotificationDelivery', () => {});
  const router = require('../routes/public-quotations.routes');
  async function request(method, path, body = {}) {
    const route = router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route;
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
    await route.stack[0].handle({ params: { token: row.shareToken }, body, ip: '127.0.0.1' }, res, error => { throw error; });
    return res;
  }
  try {
    const publicRow = serializeQuotation(row);
    for (const field of ['contractText', 'contractSource', 'contractPdf', 'contractDetails', 'paymentInstructions', 'initialPaymentPercent']) assert.equal(publicRow.document[field], undefined);
    assert.equal(publicRow.contractText, ''); assert.equal(publicRow.paymentInstructions, '');
    assert.equal(serializeQuotation(row, true).document.paymentInstructions, 'Private bank details');
    newChallenge();
    const verified = await request('post', '/:token/verify', { challengeId: challenge.id, code: '123456' });
    assert.equal(verified.statusCode, 200); assert.equal(verified.body.contractText, '');
    const body = { challengeId: challenge.id, verificationProof: verified.body.verificationProof, action: 'accept', name: 'Client' };
    const signature = { type: 'typed', typedName: 'Client', agreed: true };
    assert.equal((await request('post', '/:token/respond', { ...body, signature })).statusCode, 400);
    assert.equal(row.clientResponse, null);
    const accepted = await request('post', '/:token/respond', body);
    assert.equal(accepted.statusCode, 200);
    assert.equal(accepted.body.signingSession, undefined);
    assert.equal(accepted.body.quotation.clientResponse.signaturePending, false);
    assert.equal(history.length, 1); assert(challenge.consumedAt);
    assert.equal(jobs.length, 2);
    for (const job of jobs) { assert.equal(job.clientFlow, 'quotation_only'); assert.equal(job.signaturePending, false); assert.equal(job.signedContract, undefined); }
    assert(!jobs.find(job => job.action === 'client_accept').clientUrl.includes('?sign=1'));
    assert.equal((await request('post', '/:token/sign', { ...body, signature })).statusCode, 409);
    assert.equal((await request('get', '/:token/contract-pdf')).statusCode, 404);
    assert.equal((await request('post', '/:token/respond', body)).statusCode, 400);
    assert.equal((await request('post', '/:token/verification', { email: document.clientEmail, action: 'accept', documentVersion: documentHash(document) })).statusCode, 409);
    row.clientResponse = null; newChallenge('requote');
    const requote = await request('post', '/:token/respond', { challengeId: challenge.id, code: '123456', action: 'requote', name: 'Client', note: 'Please revise the scope.' });
    assert.equal(requote.statusCode, 200); assert.equal(row.clientResponse.action, 'requote');
    assert.equal(jobs.length, 3);
    assert.equal(row.shareToken, null);
  } finally {
    mock.restoreAll();
    if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
  }
});
