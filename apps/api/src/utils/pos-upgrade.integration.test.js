const { test, mock } = require('node:test');
const assert = require('node:assert/strict');

test('signed POS upgrades persist rates, reject stale approvals, preserve bills, and keep customizations one-time', { skip: process.env.RUN_POS_DB_TESTS !== 'true' }, async () => {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
  const { sequelize } = require('../config/database');
  const { Quotation, PosSubscription, QuotationContract, User, QuotationVerification, QuotationResponseHistory, QuotationNotification, BillingStatement } = require('../models');
  const { normalizeQuotation } = require('./quotation');
  const { documentHash, codeHash } = require('./quotation-response');
  const { createSigningSession } = require('./quotation-signature');
  const crypto = require('crypto');
  sequelize.options.logging = false;
  mock.method(require('./quotation-notifications'), 'queueNotificationDelivery', () => {});
  const ids = []; let root, server, staff;
  const common = { quoteType: 'pos', title: 'Temporary POS upgrade test', clientName: 'Temporary POS integration client', clientAddress: '123 Test Street, Pagadian City', clientEmail: 'pos-integration@example.com', clientFlow: 'full', currency: 'PHP', issuedOn: '2026-01-01', validUntil: '2099-01-01', contractText: 'Original fixture terms', billingPeriod: 'monthly' };
  const items = (current, additional) => [{ description: 'Feature work', chargeType: 'addon', quantity: 1, unitPrice: 5000 }, { description: 'Current', chargeType: 'recurring', subscriptionRole: 'current', quantity: 1, unitPrice: current }, { description: 'Additional', chargeType: 'recurring', subscriptionRole: 'additional', quantity: 1, unitPrice: additional }];
  async function pending(document) {
    const row = await Quotation.create({ document, shareToken: crypto.randomBytes(32).toString('hex') }, { logging: false }); ids.push(row.id);
    const id = crypto.randomUUID();
    const challenge = await QuotationVerification.create({ id, quotationId: row.id, email: common.clientEmail, action: 'accept', documentHash: documentHash(document), codeHash: codeHash(id, '123456'), expiresAt: new Date(Date.now() + 600000), consumedAt: new Date() }, { logging: false });
    await row.update({ clientResponse: { action: 'accept', email: common.clientEmail, name: 'Client', documentHash: documentHash(document), document, contractText: document.contractText, verificationChallengeId: id, respondedAt: new Date().toISOString() } }, { logging: false });
    return { row, body: { challengeId: id, verificationProof: createSigningSession(challenge, row, document.contractText), name: 'Client', signature: { type: 'typed', typedName: 'Client', agreed: true } } };
  }
  try {
    staff = await User.create({ name: 'POS approval fixture', email: `pos-approval-${crypto.randomUUID()}@example.com`, passwordHash: crypto.randomBytes(32).toString('hex'), passwordSalt: crypto.randomBytes(16).toString('hex'), role: 1, isActive: true }, { logging: false });
    const document = normalizeQuotation({ ...common, posPurpose: 'new', contractDetails: { effectiveDate: '2026-01-01' }, monthlySubscription: { currentAmount: 0, additionalAmount: 1699, systemName: 'POS' }, items: items(0, 1699) });
    root = await Quotation.create({ document, shareToken: crypto.randomBytes(32).toString('hex'), clientResponse: { action: 'accept', document, documentHash: documentHash(document), email: common.clientEmail, signature: { type: 'typed', typedName: 'Client', signerName: 'Client', signedAt: '2026-01-01T00:00:00Z', email: common.clientEmail, contractText: document.contractText, documentHash: documentHash(document) } } }, { logging: false }); ids.push(root.id);
    await sequelize.transaction({ logging: false }, async transaction => { const lifecycle = require('./contract-acceptance'); const record = await lifecycle.recordClientSignature(root, root.clientResponse, transaction); await lifecycle.confirmProvider(root, { userId: staff.id, name: staff.name, email: staff.email, role: 1 }, transaction, { reviewedClientPdfSha256: record.clientPdfSha256 }); });
    server = await new Promise(resolve => { const app = require('../app').listen(0, '127.0.0.1', () => resolve(app)); });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const admin = require('jsonwebtoken').sign({ sub: staff.id, email: staff.email, role: 1 }, process.env.JWT_SECRET, { expiresIn: '5m' });
    async function request(path, body, authenticated = true) {
      const response = await fetch(`${base}${path}`, { method: body ? 'POST' : 'GET', headers: { ...(authenticated ? { Authorization: `Bearer ${admin}` } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const payload = await response.json(); return { status: response.status, payload };
    }
    const billInput = { quotationId: root.id, period: '2026-10', issuedOn: '2026-10-01', dueOn: '2026-10-08', goLiveOn: '2026-01-01' };
    const old = await request('/admin/billing', billInput); assert.equal(old.status, 201); assert.equal(old.payload.statement.document.total, 1699);
    const upgrade = normalizeQuotation({ ...common, posPurpose: 'upgrade', baseQuotationId: root.id, contractDetails: { effectiveDate: '2026-11-01' }, monthlySubscription: { currentAmount: 1699, additionalAmount: 2000, systemName: 'POS' }, items: items(1699, 2000) });
    const draft = await request('/admin/quotations', { document: upgrade });
    assert.equal(draft.status, 201); ids.push(draft.payload.quotation.id);
    assert.equal(draft.payload.quotation.document.baseQuotationReference, `ZO-${new Date(root.createdAt).getUTCFullYear()}-${String(root.id).padStart(5, '0')}`);
    assert.equal((await request('/admin/quotations', { document: { ...upgrade, clientEmail: 'different@example.com' } })).status, 400);
    const first = await pending(upgrade), stale = await pending({ ...upgrade, title: 'Stale concurrent upgrade' });
    const before = await request('/admin/quotations/pos-subscriptions');
    assert.equal(before.payload.subscriptions.find(row => row.id === root.id).latestRecurringTotal, 1699);
    assert.equal((await request(`/quotations/${first.row.shareToken}/sign`, { ...first.body, signature: { ...first.body.signature, agreed: false } }, false)).status, 400);
    assert.equal((await request(`/quotations/${first.row.shareToken}/sign`, first.body, false)).status, 200);
    await first.row.reload({ logging: false });
    const confirmation = await request(`/admin/quotations/${first.row.id}/confirm-contract`, { documentVersion: documentHash(upgrade), reviewedClientPdfSha256: first.row.contractState.clientPdfSha256 });
    assert.equal(confirmation.status, 200, JSON.stringify(confirmation.payload));
    assert.equal((await request(`/quotations/${stale.row.shareToken}/sign`, stale.body, false)).status, 400);
    assert.equal((await request('/admin/billing', { ...billInput, quotationId: first.row.id })).status, 400);
    const revised = await request('/admin/billing', { ...billInput, period: '2026-11', issuedOn: '2026-11-05', dueOn: '2026-11-12' });
    assert.equal(revised.status, 201); assert.equal(revised.payload.statement.document.total, 3699); assert.equal(revised.payload.statement.document.rateQuotationId, first.row.id);
    assert.equal((await request('/admin/billing', { ...billInput, period: '2026-11' })).status, 409);
    const copy = await fetch(`${base}/admin/contracts/signed-copy`, { method: 'POST', headers: { Authorization: `Bearer ${admin}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ quotationId: first.row.id, documentHash: documentHash(upgrade) }) });
    assert.equal(copy.status, 200); assert.equal(Buffer.from(await copy.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
    const custom = await pending(normalizeQuotation({ ...common, posPurpose: 'customization', baseQuotationId: root.id, items: [items(0, 0)[0]] }));
    assert.equal((await request(`/quotations/${custom.row.shareToken}/sign`, custom.body, false)).status, 200);
    await custom.row.reload({ logging: false });
    assert.equal((await request(`/admin/quotations/${custom.row.id}/confirm-contract`, { documentVersion: documentHash(custom.row.document), reviewedClientPdfSha256: custom.row.contractState.clientPdfSha256 })).status, 200);
    await root.update({ document: { ...document, title: 'Later edit must not change the active signed rate', recurringTotal: 0, items: document.items.map(item => ({ ...item, unitPrice: 0 })) } }, { logging: false });
    const renewal = await request('/admin/billing', { ...billInput, period: '2027-01', issuedOn: '2027-01-01', dueOn: '2027-01-08' });
    assert.equal(renewal.status, 201); assert.equal(renewal.payload.statement.document.total, 3699);
    assert.equal((await BillingStatement.findByPk(old.payload.statement.id, { logging: false })).document.total, 1699);
    const saved = await PosSubscription.findByPk(root.id, { logging: false }); assert.equal(saved.revisions.length, 3);
    assert.equal(saved.revisions[0].document.recurringTotal, 1699); assert.equal(saved.revisions[1].document.recurringTotal, 3699); assert.equal(saved.revisions[2].kind, 'customization');
    await stale.row.reload({ logging: false }); assert.equal(stale.row.clientResponse.signature, undefined);
    assert.equal(await QuotationNotification.count({ where: { quotationId: stale.row.id }, logging: false }), 0);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (root) { await BillingStatement.destroy({ where: { quotationId: root.id }, logging: false }); await PosSubscription.destroy({ where: { quotationId: root.id }, logging: false }); }
    if (ids.length) { for (const model of [QuotationContract, QuotationNotification, QuotationResponseHistory, QuotationVerification]) await model.destroy({ where: { quotationId: ids }, logging: false }); await Quotation.destroy({ where: { id: ids }, force: true, logging: false }); }
    if (staff) await User.destroy({ where: { id: staff.id }, logging: false });
    mock.restoreAll(); await sequelize.close();
  }
});
