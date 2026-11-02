const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

test('requote revokes the old link, requires a saved revision, and issues a distinct replacement link', { skip: process.env.RUN_QUOTATION_REQUOTE_DB_TESTS !== 'true' }, async () => {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
  const { sequelize } = require('../config/database');
  const { Quotation, QuotationVerification, QuotationResponseHistory, QuotationNotification } = require('../models');
  const { prepareQuotation } = require('./contract-templates');
  const { codeHash, documentHash } = require('./quotation-response');
  // No email jobs are stored or sent, including by the running development worker.
  const jobs = [];
  let failNotification = false;
  mock.method(QuotationNotification, 'create', async job => { if (failNotification) throw new Error('Simulated queue failure'); jobs.push(job); return job; });
  mock.method(require('./quotation-notifications'), 'queueNotificationDelivery', () => {});
  const app = require('../app');
  const server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const authorization = `Bearer ${require('jsonwebtoken').sign({ sub: 4294967200, role: 1 }, process.env.JWT_SECRET)}`;
  const ids = [];
  sequelize.options.logging = false;
  async function request(path, method = 'GET', body, admin = false) {
    const response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(admin ? { Authorization: authorization } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() };
  }
  try {
    const document = await prepareQuotation({ title: 'Requote lifecycle test', clientFlow: 'quotation_only', clientName: 'Test Client', clientEmail: 'test@example.com', issuedOn: '2026-11-03', validUntil: '2099-01-01', currency: 'PHP', items: [{ description: 'Service', quantity: 1, unitPrice: 1000 }] });
    const oldToken = crypto.randomBytes(32).toString('hex');
    const row = await Quotation.create({ document, shareToken: oldToken }); ids.push(row.id);
    const id = crypto.randomUUID();
    await QuotationVerification.create({ id, quotationId: row.id, email: document.clientEmail, action: 'requote', documentHash: documentHash(document), codeHash: codeHash(id, '123456'), expiresAt: new Date(Date.now() + 600000) });
    const submission = { challengeId: id, code: '123456', action: 'requote', name: 'Test Client', note: 'Please add online ordering.' };
    assert.equal((await request(`/quotations/${oldToken}`)).status, 200);
    assert.equal((await request(`/quotations/${oldToken}/respond`, 'POST', { ...submission, code: '000000' })).status, 400);
    await row.reload(); assert.equal(row.shareToken, oldToken);
    failNotification = true;
    assert.equal((await request(`/quotations/${oldToken}/respond`, 'POST', submission)).status, 500);
    await row.reload(); assert.equal(row.shareToken, oldToken); assert.equal(row.clientResponse, null);
    assert.equal(await QuotationResponseHistory.count({ where: { quotationId: row.id } }), 0);
    assert.equal((await QuotationVerification.findByPk(id)).consumedAt, null);
    failNotification = false;
    const requote = await request(`/quotations/${oldToken}/respond`, 'POST', submission);
    assert.equal(requote.status, 200); assert.equal(requote.body.quotation.clientResponse.action, 'requote');
    await row.reload(); assert.equal(row.shareToken, null);
    assert.equal(jobs.length, 1); assert.equal(jobs[0].payload.action, 'requote');
    assert.equal(await QuotationResponseHistory.count({ where: { quotationId: row.id } }), 1);
    for (const [path, method, body] of [
      [`/quotations/${oldToken}`, 'GET'],
      [`/quotations/${oldToken}/contract-pdf`, 'GET'],
      [`/quotations/${oldToken}/respond`, 'POST', submission],
      [`/quotations/${oldToken}/verification`, 'POST', { email: document.clientEmail, action: 'accept', documentVersion: documentHash(document) }]
    ]) assert.equal((await request(path, method, body)).status, 404);
    assert.equal((await request(`/admin/quotations/${row.id}/share`, 'POST', {}, true)).status, 409);
    await request(`/admin/quotations/${row.id}`, 'PUT', { document }, true);
    assert.equal((await request(`/admin/quotations/${row.id}/share`, 'POST', {}, true)).status, 409);
    const revised = { ...document, title: 'Revised quotation with online ordering' };
    failNotification = true;
    assert.equal((await request(`/admin/quotations/${row.id}`, 'PUT', { document: revised }, true)).status, 500);
    await row.reload(); assert.equal(row.document.title, document.title); assert.equal(row.shareToken, null);
    assert.equal(jobs.length, 1);
    failNotification = false;
    const saved = await request(`/admin/quotations/${row.id}`, 'PUT', { document: revised }, true);
    assert.equal(saved.status, 200); assert.equal(saved.body.quotation.sharePath, null);
    assert.equal(jobs.length, 2); assert.equal(jobs[1].payload.action, 'requote_updated');
    assert.equal(jobs[1].payload.document.title, revised.title);
    assert.equal(jobs[1].payload.note, submission.note);
    assert.equal((await request(`/admin/quotations/${row.id}`, 'PUT', { document: saved.body.quotation.document }, true)).status, 200);
    assert.equal(jobs.length, 2);
    assert.equal(saved.body.quotation.clientResponse.current, false);
    const shared = await request(`/admin/quotations/${row.id}/share`, 'POST', {}, true);
    assert.equal(shared.status, 200); assert(shared.body.quotation.sharePath);
    await row.reload(); assert.notEqual(row.shareToken, oldToken);
    assert.equal((await request(`/quotations/${oldToken}`)).status, 404);
    const newPage = await request(`/quotations/${row.shareToken}`);
    assert.equal(newPage.status, 200); assert.equal(newPage.body.quotation.document.title, revised.title);
    assert.equal(newPage.body.quotation.clientResponse.current, false);
    assert.equal((await request(`/admin/quotations/${row.id}/share`, 'POST', {}, true)).body.quotation.sharePath, shared.body.quotation.sharePath);
  } finally {
    if (ids.length) {
      await QuotationResponseHistory.destroy({ where: { quotationId: ids } });
      await QuotationVerification.destroy({ where: { quotationId: ids } });
      await Quotation.destroy({ where: { id: ids }, force: true });
    }
    await new Promise(resolve => server.close(resolve));
    await sequelize.close(); mock.restoreAll();
  }
});
