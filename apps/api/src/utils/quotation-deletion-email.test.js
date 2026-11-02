const { test } = require('node:test');
const assert = require('node:assert/strict');
const { deletionConfirmationMessage } = require('./quotation-deletion-email');

const payload = { deletedAt: '2026-10-25T16:30:00Z', adminId: 1, adminEmail: 'admin@example.com', quotations: [{ reference: 'ZO-2026-00001', title: 'Company website', clientCompany: 'Example Co.' }] };
test('successful deletion confirmation goes to info with the reference, project, administrator and Manila time', () => {
  const message = deletionConfirmationMessage(payload);
  assert.deepEqual(message.toRecipients, [{ emailAddress: { address: 'info@zerooneitinc.com' } }]);
  assert.match(message.subject, /Quotation successfully removed: ZO-2026-00001/);
  for (const text of ['Company website', 'Example Co.', 'admin@example.com', 'October 26, 2026', '12:30:00 AM', 'client links are disabled', 'Response history is retained internally']) assert(message.body.content.includes(text));
});
test('bulk deletion sends one confirmation containing every removed quotation', () => {
  const message = deletionConfirmationMessage({ ...payload, quotations: [...payload.quotations, { reference: 'ZO-2026-00002', title: 'Mobile app' }] });
  assert.match(message.subject, /2 quotations successfully removed/);
  assert(message.body.content.includes('ZO-2026-00001'));
  assert(message.body.content.includes('ZO-2026-00002'));
  assert(message.body.content.includes('Mobile app'));
});
