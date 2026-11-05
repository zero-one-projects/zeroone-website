const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { MailConfig } = require('../models');
const { sendBillingEmail, publicBillingUrl, billingCcRecipients } = require('./billing-email');
const { createManualBillingDocument } = require('./billing');
const bill = { reference: 'BILL-2026-00001', sharePath: `/api/billing/${'a'.repeat(64)}/pdf`, document: createManualBillingDocument({ clientName: '<Client>', title: 'Website', advancePayment: 500, issuedOn: '2026-10-30', dueOn: '2026-11-06', items: [{ description: 'Development', quantity: 1, unitPrice: 1699 }], taxRate: 12 }) };
test('billing emails use the billing mailbox, attach the PDF, and escape client text', async () => {
  const previous = process.env.CLIENT_WEB_URL;
  process.env.CLIENT_WEB_URL = 'https://zerooneitinc.com';
  mock.method(MailConfig, 'findOne', async () => ({ tenantId: 'test-tenant', clientId: 'test-client', clientSecret: 'test-secret', senderEmail: 'info@zerooneitinc.com' }));
  const requests = [];
  mock.method(global, 'fetch', async (url, options) => {
    requests.push({ url, options });
    return String(url).includes('oauth2') ? { ok: true, json: async () => ({ access_token: 'test-token' }) } : { ok: true, status: 202 };
  });
  try {
    assert.deepEqual(await sendBillingEmail({ bill, recipient: 'client@example.com', note: '<script>test</script>', cc: 'accounts@example.com; CLIENT@example.com, accounts@example.com' }), { linkIncluded: true });
    assert.match(requests[1].url, /users\/billing%40zerooneitinc.com\/sendMail$/);
    const payload = JSON.parse(requests[1].options.body), message = payload.message;
    assert.equal(payload.saveToSentItems, true);
    assert.equal(message.from.emailAddress.address, 'billing@zerooneitinc.com');
    assert.equal(message.replyTo[0].emailAddress.address, 'billing@zerooneitinc.com');
    assert.equal(message.toRecipients[0].emailAddress.address, 'client@example.com');
    assert.deepEqual(message.ccRecipients, [{ emailAddress: { address: 'billing@zerooneitinc.com', name: 'ZeroOne Billing' } }, { emailAddress: { address: 'accounts@example.com' } }]);
    assert(message.body.content.includes('₱1,402.88')); assert(message.body.content.includes('Advance payment / deduction applied: ₱500.00'));
    assert(message.body.content.includes('&lt;Client&gt;')); assert(!message.body.content.includes('<script>'));
    assert(message.body.content.includes(`https://zerooneitinc.com/billing/${'a'.repeat(64)}`));
    assert.equal(Buffer.from(message.attachments[0].contentBytes, 'base64').subarray(0, 5).toString(), '%PDF-');
  } finally { mock.restoreAll(); if (previous === undefined) delete process.env.CLIENT_WEB_URL; else process.env.CLIENT_WEB_URL = previous; }
});
test('local development omits localhost client links', () => {
  const previous = process.env.CLIENT_WEB_URL;
  try {
    for (const value of ['http://localhost:3000', 'https://localhost', 'javascript:alert(1)']) { process.env.CLIENT_WEB_URL = value; assert.equal(publicBillingUrl(bill.sharePath), null); }
  } finally { if (previous === undefined) delete process.env.CLIENT_WEB_URL; else process.env.CLIENT_WEB_URL = previous; }
});
test('Graph rejection reports a billing send failure', async () => {
  mock.method(MailConfig, 'findOne', async () => ({ tenantId: 'test', clientId: 'test', clientSecret: 'test', senderEmail: 'info@example.com' }));
  mock.method(global, 'fetch', async url => String(url).includes('oauth2') ? { ok: true, json: async () => ({ access_token: 'token' }) } : { ok: false, status: 403 });
  try { await assert.rejects(sendBillingEmail({ bill, recipient: 'client@example.com' }), /billing@zerooneitinc.com/); }
  finally { mock.restoreAll(); }
});

test('CC recipients retain billing, deduplicate recipients, and reject invalid input', () => {
  const addresses = billingCcRecipients('Billing@zerooneitinc.com, team@example.com; TEAM@example.com; client@example.com', 'client@example.com').map(item => item.emailAddress.address);
  assert.deepEqual(addresses, ['billing@zerooneitinc.com', 'team@example.com']);
  assert.deepEqual(billingCcRecipients('', 'billing@zerooneitinc.com'), []);
  for (const value of ['invalid', 'name <person@example.com>', 'person@example.com\r\nBcc:other@example.com', Array(11).fill('person@example.com').join(','), ['person@example.com']]) assert.throws(() => billingCcRecipients(value), /valid CC email/);
});
