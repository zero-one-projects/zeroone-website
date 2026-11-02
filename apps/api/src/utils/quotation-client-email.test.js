const { test } = require('node:test');
const assert = require('node:assert/strict');
const { clientQuotationUrl, clientAcceptanceMessage } = require('./quotation-client-email');

test('client receipt links directly to signing and goes only to the verified client', () => {
  const message = clientAcceptanceMessage({ reference: 'ZO-2026-00001', title: '<Website>', clientName: '<Client>', clientEmail: 'client@example.com', currency: 'PHP', total: 5000, respondedAt: '2026-10-25T16:30:00Z', validUntil: '2026-11-09', signaturePending: true, clientUrl: `https://zerooneitinc.com/quotation/${'a'.repeat(64)}?sign=1` });
  assert.deepEqual(message.toRecipients, [{ emailAddress: { address: 'client@example.com' } }]);
  assert(message.body.content.includes('Review &amp; Sign Contract'));
  assert(message.body.content.includes('?sign=1'));
  assert(message.body.content.includes('verify your email'));
  assert(message.body.content.includes('&lt;Client&gt;'));
  assert(!message.body.content.includes('<Website>'));
  assert(message.body.content.includes('2026-11-09'));
});

test('email URL uses trusted configuration and never accepts an invalid scheme or token', () => {
  const previous = process.env.CLIENT_WEB_URL;
  try {
    process.env.CLIENT_WEB_URL = 'https://zerooneitinc.com';
    assert.equal(clientQuotationUrl('a'.repeat(64)), `https://zerooneitinc.com/quotation/${'a'.repeat(64)}?sign=1`);
    process.env.CLIENT_WEB_URL = 'http://localhost:3000';
    assert(clientQuotationUrl('a'.repeat(64)).startsWith('http://localhost:3000/quotation/'));
    process.env.CLIENT_WEB_URL = 'javascript:alert(1)'; assert.throws(() => clientQuotationUrl('a'.repeat(64)));
    process.env.CLIENT_WEB_URL = 'https://zerooneitinc.com'; assert.throws(() => clientQuotationUrl('invalid'));
  } finally { if (previous === undefined) delete process.env.CLIENT_WEB_URL; else process.env.CLIENT_WEB_URL = previous; }
});

test('receipt clearly separates setup and add-ons from the monthly subscription', () => {
  const message = clientAcceptanceMessage({ reference: 'POS-TEST', title: 'POS setup and plan', clientName: 'Client', clientEmail: 'client@example.com', currency: 'PHP', total: 6500, hasRecurring: true, recurringTotal: 700, billingPeriod: 'monthly', billingCommencement: 'After the official system go-live date.', respondedAt: '2026-10-26T01:00:00Z', validUntil: '2026-11-09', signaturePending: true, clientUrl: 'https://zerooneitinc.com/quotation/test?sign=1' });
  assert(message.body.content.includes('One-time charges'));
  assert(message.body.content.includes('6,500.00'));
  assert(message.body.content.includes('700.00 / month'));
  assert(message.body.content.includes('After the official system go-live date.'));
});
