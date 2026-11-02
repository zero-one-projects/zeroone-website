const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeBillingDeletionIds, billingDeletionMessage } = require('./billing-deletion');
test('billing deletion accepts exact selections of up to 100 valid IDs', () => {
  assert.deepEqual(normalizeBillingDeletionIds(['2', 1, 2]), [1, 2]);
  for (const value of [undefined, [], 1, [0], [-1], ['x'], [Number.MAX_SAFE_INTEGER + 1], Array(101).fill(1)]) assert.throws(() => normalizeBillingDeletionIds(value));
});
test('billing deletion OTP is addressed only to billing and lists the full selection', () => {
  const message = billingDeletionMessage({ references: ['BILL-A', 'BILL-B'], code: '123456', expiresAt: '2026-10-30T08:00:00Z' });
  assert.deepEqual(message.toRecipients, [{ emailAddress: { address: 'billing@zerooneitinc.com' } }]);
  assert(message.body.content.includes('BILL-A')); assert(message.body.content.includes('BILL-B')); assert(message.body.content.includes('123456'));
  assert(message.body.content.includes('Manila time'));
});
