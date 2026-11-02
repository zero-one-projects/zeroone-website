const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { QuotationNotification } = require('../models');
const { acceptanceMessage, requoteMessage } = require('./quotation-verification-mail');
const { processQuotationNotifications } = require('./quotation-notifications');

test('acceptance email goes to billing and sales with verified client details', () => {
  const message = acceptanceMessage({ reference: 'ZO-2026-00001', title: 'Business website',
    clientCompany: 'Example Company', clientName: 'Verified Client', clientEmail: 'client@gmail.com',
    currency: 'PHP', total: 15000, acceptedAt: '2026-10-25T10:30:00Z', validUntil: '2026-11-09',
    documentVersion: 'accepted-version', note: 'Approved scope.' });
  assert.deepEqual(message.toRecipients.map((recipient) => recipient.emailAddress.address), ['billing@zerooneitinc.com', 'sales@zerooneitinc.com']);
  assert.equal(message.replyTo[0].emailAddress.address, 'client@gmail.com');
  for (const text of ['ZO-2026-00001', 'Business website', 'Example Company', 'Verified Client', 'client@gmail.com', '15,000', 'Asia/Manila', 'Approved scope.']) assert(message.body.content.includes(text));
});

test('requote notification goes only to sales and includes the requested changes', () => {
  const message = requoteMessage({ reference: 'ZO-2026-00002', title: 'Business website',
    clientCompany: 'Example Company', clientName: 'Verified Client', clientEmail: 'client@gmail.com',
    currency: 'PHP', total: 15000, respondedAt: '2026-10-25T10:30:00Z',
    documentVersion: 'reviewed-version', note: 'Please include mobile support.' });
  assert.deepEqual(message.toRecipients.map((recipient) => recipient.emailAddress.address), ['sales@zerooneitinc.com']);
  assert.match(message.subject, /Requote requested/);
  assert(message.body.content.includes('Please include mobile support.'));
  assert(message.body.content.includes('client@gmail.com'));
  assert.equal(message.replyTo[0].emailAddress.address, 'client@gmail.com');
});

test('failed notification remains queued and is sent on a later retry', async () => {
  const updates = [];
  const row = { id: 'test-job', attempts: 0, payload: { reference: 'test-reference' },
    reload: async () => { row.status = 'sending'; row.attempts += 1; },
    update: async (values) => { updates.push(values); Object.assign(row, values); } };
  const find = mock.method(QuotationNotification, 'findAll', async () => [row]);
  mock.method(QuotationNotification, 'update', async () => [1]);
  mock.method(console, 'warn', () => {});
  try {
    const now = new Date('2026-10-25T10:00:00Z');
    await processQuotationNotifications({ now, send: async () => { throw new Error('Temporary mail failure'); } });
    assert.equal(updates[0].status, 'pending');
    assert.equal(updates[0].attempts, 1);
    assert.equal(updates[0].nextAttemptAt.toISOString(), '2026-10-25T10:00:30.000Z');
    let sent = 0;
    await processQuotationNotifications({ now: new Date('2026-10-25T10:00:31Z'), send: async () => { sent += 1; } });
    assert.equal(sent, 1);
    assert.equal(row.status, 'sent');
    assert.equal(row.attempts, 2);
    find.mock.mockImplementation(async () => []);
    await processQuotationNotifications({ send: async () => { sent += 1; } });
    assert.equal(sent, 1);
  } finally { mock.restoreAll(); }
});

test('a job claimed by another worker is not sent again', async () => {
  mock.method(QuotationNotification, 'findAll', async () => [{ id: 'claimed', attempts: 0 }]);
  mock.method(QuotationNotification, 'update', async () => [0]);
  try {
    let sent = false;
    await processQuotationNotifications({ send: async () => { sent = true; } });
    assert.equal(sent, false);
  } finally { mock.restoreAll(); }
});
