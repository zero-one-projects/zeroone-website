const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
test('billing API authenticates, saves monthly snapshots, rejects duplicates, and downloads PDFs', { skip: process.env.RUN_BILLING_DB_TESTS !== 'true' }, async () => {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
  const { sequelize } = require('../config/database');
  sequelize.options.logging = false;
  const { BillingStatement, Quotation } = require('../models');
  const { documentHash } = require('./quotation-response');
  const document = { quoteType: 'subscription', billingPeriod: 'monthly', title: 'Billing integration fixture', clientName: 'Temporary billing test', currency: 'PHP', taxRate: 12, recurringTotal: 1680, items: [ { description: 'Setup', chargeType: 'setup', quantity: 1, unitPrice: 10000 }, { description: 'Monthly plan', chargeType: 'recurring', quantity: 1, unitPrice: 1500 } ] };
  let quotation, server, manualId;
  try {
    quotation = await Quotation.create({ document, clientResponse: { action: 'accept', documentHash: documentHash(document), document, signature: { signedAt: '2026-01-01' } } }, { logging: false });
    server = await new Promise(resolve => { const app = require('../app').listen(0, '127.0.0.1', () => resolve(app)); });
    const base = `http://127.0.0.1:${server.address().port}/api/admin/billing`;
    const token = require('jsonwebtoken').sign({ sub: 'billing-integration', role: 1 }, process.env.JWT_SECRET, { expiresIn: '2m' });
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    assert.equal((await fetch(base)).status, 401);
    const subscriptions = await (await fetch(`${base}/subscriptions`, { headers })).json();
    assert(subscriptions.subscriptions.some(row => row.id === quotation.id));
    const body = { quotationId: quotation.id, period: '2026-10', issuedOn: '2026-10-01', dueOn: '2026-10-08', goLiveOn: '2026-09-01' };
    const response = await fetch(base, { method: 'POST', headers, body: JSON.stringify(body) });
    assert.equal(response.status, 201); const { statement } = await response.json();
    assert.equal(statement.document.total, 1680); assert.equal(statement.document.items.length, 1);
    assert.equal((await fetch(base, { method: 'POST', headers, body: JSON.stringify(body) })).status, 409);
    assert.equal((await fetch(base, { method: 'POST', headers, body: JSON.stringify({ ...body, period: '2026-11', goLiveOn: '2026-09-02' }) })).status, 400);
    const pdf = await fetch(`${base}/${statement.id}/pdf`, { headers }); assert.equal(pdf.status, 200);
    assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
    assert.equal((await fetch(`${base}/${statement.id}/pdf`)).status, 401);
    await quotation.update({ document: { ...document, clientName: 'Changed after billing' } }, { logging: false });
    const listed = await (await fetch(`${base}?search=Temporary%20billing%20test`, { headers })).json();
    assert(listed.statements.some(row => row.id === statement.id && row.document.clientName === 'Temporary billing test'));
    const manualInput = { kind: 'manual', clientName: 'Manual test client', title: 'Manual statement fixture', advancePayment: 1250, deductionNote: 'Advance received', taxTreatment: 'non_vat', issuedOn: '2026-10-30', dueOn: '2026-11-06', items: [{ description: 'Project payment', quantity: 1, unitPrice: 5000 }] };
    assert.equal((await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(manualInput) })).status, 401);
    const created = await fetch(base, { method: 'POST', headers, body: JSON.stringify(manualInput) });
    assert.equal(created.status, 201);
    const manual = (await created.json()).statement; manualId = manual.id;
    assert.equal(manual.quotationId, null); assert.equal(manual.document.total, 5000); assert.equal(manual.document.amountDue, 3750); assert.equal(manual.document.advancePayment, 1250); assert.equal(manual.sharePath, null);
    const share = await fetch(`${base}/${manualId}/share`, { method: 'POST', headers });
    assert.equal(share.status, 200); const shared = (await share.json()).statement;
    assert.match(shared.sharePath, /^\/api\/billing\/[a-f0-9]{64}\/pdf$/);
    const publicUrl = `http://127.0.0.1:${server.address().port}${shared.sharePath}`;
    const publicPdf = await fetch(publicUrl);
    assert.equal(publicPdf.status, 200); assert.match(publicPdf.headers.get('content-disposition'), /^inline;/);
    assert.equal(publicPdf.headers.get('cache-control'), 'no-store');
    assert.equal(Buffer.from(await publicPdf.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
    assert.equal((await fetch(publicUrl.replace(/billing\/[a-f0-9]+/, 'billing/' + '0'.repeat(64)))).status, 404);
    assert.equal((await fetch(`${base}/${manualId}/share`, { method: 'DELETE' })).status, 401);
    const mailer = require('./billing-email'); let sends = 0;
    const deliveryMock = mock.method(mailer, 'sendBillingEmail', async ({ recipient }) => { assert.equal(recipient, 'client@example.com'); sends++; return { linkIncluded: false }; });
    try {
      const send = body => fetch(`${base}/${manualId}/send`, { method: 'POST', headers, body: JSON.stringify(body) });
      assert.equal((await fetch(`${base}/${manualId}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipient: 'client@example.com' }) })).status, 401);
      assert.equal((await send({ recipient: 'invalid' })).status, 400);
      const accepted = await send({ recipient: 'client@example.com', previousSentAt: null }); assert.equal(accepted.status, 200);
      const emailed = (await accepted.json()).statement; assert(emailed.emailSentAt); assert.equal(emailed.emailSentTo, 'client@example.com');
      assert.equal((await send({ recipient: 'client@example.com', previousSentAt: null })).status, 409); assert.equal(sends, 1);
      assert.equal((await send({ recipient: 'client@example.com', previousSentAt: emailed.emailSentAt })).status, 200); assert.equal(sends, 2);
      deliveryMock.mock.restore();
      mock.method(mailer, 'sendBillingEmail', async () => { throw Object.assign(new Error('Billing mailbox unavailable.'), { statusCode: 503 }); });
      const latest = await BillingStatement.findByPk(manualId, { logging: false });
      assert.equal((await send({ recipient: 'client@example.com', previousSentAt: latest.emailSentAt.toISOString() })).status, 503);
      const unchanged = await BillingStatement.findByPk(manualId, { logging: false }); assert.equal(unchanged.emailSentAt.toISOString(), latest.emailSentAt.toISOString());
    } finally { mock.restoreAll(); }
    assert.equal((await fetch(`${base}/${manualId}/share`, { method: 'DELETE', headers })).status, 200);
    assert.equal((await fetch(publicUrl)).status, 404);
  } finally {
    if (manualId) await BillingStatement.destroy({ where: { id: manualId }, logging: false });
    if (quotation) { await BillingStatement.destroy({ where: { quotationId: quotation.id }, logging: false }); await quotation.destroy({ force: true, logging: false }); }
    if (server) await new Promise(resolve => server.close(resolve));
    await sequelize.close();
  }
});
