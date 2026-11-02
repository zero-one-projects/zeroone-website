const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeQuotation } = require('./quotation');

function sample(overrides = {}) {
  return { title: 'Business website', clientName: 'Example Client', currency: 'PHP',
    issuedOn: '2026-10-25', validUntil: '2026-11-25',
    items: [{ description: 'Development', quantity: 2, unitPrice: 12500.25 }],
    discount: 1000, taxRate: 12, ...overrides };
}

test('recalculates totals, applies tax after discount, and ignores supplied totals', () => {
  const q = normalizeQuotation(sample({ total: 1, subtotal: 0 }));
  assert.equal(q.subtotal, 25000.5);
  assert.equal(q.tax, 2880.06);
  assert.equal(q.total, 26880.56);
});

test('rounds fractional quantities and monetary amounts to cents', () => {
  const q = normalizeQuotation(sample({ items: [{ description: 'Service', quantity: 1.5, unitPrice: 10.01 }], discount: 0, taxRate: 0 }));
  assert.equal(q.total, 15.02);
});

test('preserves the detailed scope and project timeline for PDF output', () => {
  const q = normalizeQuotation(sample({ timeline: '10–12 weeks', items: [{
    description: 'E-Commerce Platform', quantity: 1, unitPrice: 218000,
    scope: [{ title: 'Customer Website Pages', details: 'Home, About us, Shop, Shopping Cart' }]
  }] }));
  assert.equal(q.timeline, '10–12 weeks');
  assert.equal(q.items[0].scope[0].details, 'Home, About us, Shop, Shopping Cart');
  assert.throws(() => normalizeQuotation(sample({ items: [{ description: 'Platform', quantity: 1, unitPrice: 1, scope: [{ title: '' }] }] })), { statusCode: 400 });
});

test('rejects invalid dates, missing items, negative prices, and excessive discounts', () => {
  for (const overrides of [
    { clientName: '' }, { items: [] }, { issuedOn: '2026-02-30' },
    { validUntil: '2026-10-01' }, { currency: 'unknown' }, { discount: 30000 },
    { items: [{ description: 'Service', quantity: 0, unitPrice: 10 }] },
    { items: [{ description: 'Service', quantity: 1, unitPrice: -1 }] },
    { taxRate: 'not a number' }
  ]) assert.throws(() => normalizeQuotation(sample(overrides)), { statusCode: 400 });
});

test('POS setup and extra features are one-time; subscription and taxes are calculated separately', () => {
  const q = normalizeQuotation(sample({ quoteType: 'pos', contractText: 'POS-specific terms', discount: 500, items: [
    { description: 'POS setup', chargeType: 'setup', quantity: 1, unitPrice: 10000 },
    { description: 'Extra reports', chargeType: 'addon', quantity: 1, unitPrice: 2000 },
    { description: 'POS plan', chargeType: 'recurring', quantity: 1, unitPrice: 1500 }
  ] }));
  assert.equal(q.subtotal, 12000); assert.equal(q.total, 12880);
  assert.equal(q.recurringSubtotal, 1500); assert.equal(q.recurringTax, 180); assert.equal(q.recurringTotal, 1680);
  assert.equal(q.hasRecurring, true); assert.equal(q.billingPeriod, 'monthly');
  assert.equal(q.contractDetails.billingCommencement, 'After the official system go-live date.');
  assert.equal(q.contractText, 'POS-specific terms');
  assert.throws(() => normalizeQuotation({ ...q, discount: 13000 }));
});

test('subscriptions require a recurring item and their own agreement; legacy one-time quotes still work', () => {
  assert.throws(() => normalizeQuotation(sample({ quoteType: 'subscription', contractText: 'Subscription terms' })));
  assert.throws(() => normalizeQuotation(sample({ quoteType: 'subscription' })));
  assert(normalizeQuotation(sample({ quoteType: 'pos' })).quoteType === 'pos');
  assert.throws(() => normalizeQuotation(sample({ quoteType: 'subscription', contractText: 'Subscription terms', discount: 0, items: [{ description: 'Plan', chargeType: 'recurring', quantity: 1, unitPrice: 1000 }] })));
  const q = normalizeQuotation(sample({ quoteType: 'subscription', billingPeriod: 'yearly', contractText: 'Annual license terms', discount: 0, taxRate: 0, items: [{ description: 'One-time setup', chargeType: 'setup', quantity: 1, unitPrice: 1000 }, { description: 'Annual plan', chargeType: 'recurring', quantity: 1, unitPrice: 12000 }] }));
  assert.equal(q.total, 1000); assert.equal(q.recurringTotal, 12000); assert.equal(q.billingPeriod, 'yearly');
  assert.equal(normalizeQuotation(sample()).quoteType, 'project');
});

test('contract payment details are retained with the quotation and reject oversized values', () => {
  const q = normalizeQuotation(sample({ contractDetails: { minimumPeriod: 'As agreed', paymentTerms: 'Due under the client billing statement', gracePeriod: 'Client-specific grace period' } }));
  assert.equal(q.contractDetails.minimumPeriod, 'As agreed');
  assert.equal(q.contractDetails.gracePeriod, 'Client-specific grace period');
  assert.throws(() => normalizeQuotation(sample({ contractDetails: { branches: 'x'.repeat(501) } })));
  assert.throws(() => normalizeQuotation(sample({ contractDetails: [] })));
});

test('go-live commencement defaults only for recurring charges and preserves explicit saved terms', () => {
  const input = sample({ quoteType: 'subscription', contractText: 'Subscription agreement', discount: 0, items: [{ description: 'Setup', chargeType: 'setup', quantity: 1, unitPrice: 5000 }, { description: 'Monthly plan', chargeType: 'recurring', quantity: 1, unitPrice: 1500 }] });
  assert.equal(normalizeQuotation(input).contractDetails.billingCommencement, 'After the official system go-live date.');
  assert.equal(normalizeQuotation({ ...input, contractDetails: { billingCommencement: 'After confirmed go-live on the agreed date' } }).contractDetails.billingCommencement, 'After confirmed go-live on the agreed date');
  assert.equal(normalizeQuotation(sample()).contractDetails.billingCommencement, '');
});

test('payment instructions and initial percentage are saved without changing legacy documents', () => {
  const document = normalizeQuotation(sample({ paymentInstructions: 'Example Bank\nAccount name: Example Company\nSend proof to billing@example.com', initialPaymentPercent: 20 }));
  assert.equal(document.initialPaymentPercent, 20);
  assert(document.paymentInstructions.includes('Example Bank'));
  const legacy = normalizeQuotation(sample());
  assert.equal(legacy.paymentInstructions, undefined); assert.equal(legacy.initialPaymentPercent, undefined);
  for (const value of [-1, 101, 'invalid']) assert.throws(() => normalizeQuotation(sample({ initialPaymentPercent: value })), { statusCode: 400 });
  assert.throws(() => normalizeQuotation(sample({ paymentInstructions: 'x'.repeat(5001) })), { statusCode: 400 });
});


test('milestone payments are saved and totalled as non-recurring charges', () => {
  const q = normalizeQuotation(sample({ discount: 0, taxRate: 0, items: [
    { description: '20% down payment', chargeType: 'milestone', quantity: 1, unitPrice: 2000 },
    { description: '70% development completion', chargeType: 'milestone', quantity: 1, unitPrice: 7000 },
    { description: '10% go-live', chargeType: 'milestone', quantity: 1, unitPrice: 1000 }
  ] }));
  assert.equal(q.total, 10000);
  assert.equal(q.hasRecurring, false);
  assert.equal(q.recurringTotal, 0);
  assert(q.items.every(item => item.chargeType === 'milestone'));
});

test('monthly adjustment snapshots the revised recurring price and mandatory Go-Live notice', () => {
  const input = sample({ quoteType: 'pos', billingPeriod: 'monthly', discount: 0, taxRate: 0, contractText: 'POS agreement', monthlySubscription: { currentAmount: 1699, additionalAmount: 2000, systemName: 'POS System', notice: 'Untrusted notice' }, items: [
    { description: 'POS setup', chargeType: 'setup', quantity: 1, unitPrice: 5000 },
    { description: 'Current subscription', chargeType: 'recurring', subscriptionRole: 'current', quantity: 1, unitPrice: 1699 },
    { description: 'Additional monthly charge', chargeType: 'recurring', subscriptionRole: 'additional', quantity: 1, unitPrice: 2000 }
  ] });
  const result = normalizeQuotation(input);
  assert.equal(result.total, 5000); assert.equal(result.recurringTotal, 3699);
  assert.equal(result.monthlySubscription.currentAmount, 1699); assert.equal(result.monthlySubscription.additionalAmount, 2000);
  assert.match(result.monthlySubscription.notice, /additional monthly charge of ₱2,000\.00/);
  assert.match(result.monthlySubscription.notice, /from ₱1,699\.00 to ₱3,699\.00 per month/);
  assert.match(result.monthlySubscription.notice, /only commence after the official Go-Live of your POS System/);
  assert.match(result.contractDetails.billingCommencement, /only commence after the official Go-Live/);
  assert.match(result.contractDetails.billingCommencement, /revised monthly subscription/);
  const unchanged = normalizeQuotation({ ...input, monthlySubscription: { ...input.monthlySubscription, additionalAmount: 0 }, items: input.items.map(item => item.subscriptionRole === 'additional' ? { ...item, unitPrice: 0 } : item) });
  assert.equal(unchanged.recurringTotal, 1699);
  assert.equal(unchanged.contractDetails.billingCommencement, 'The monthly subscription will only commence after the official Go-Live of your POS System.');
  assert.doesNotMatch(unchanged.monthlySubscription.notice, /revised|additional monthly charge/);
  assert.equal(result.items[2].subscriptionRole, 'additional');
  assert.deepEqual(normalizeQuotation(JSON.parse(JSON.stringify(result))), result);
  for (const changes of [{ billingPeriod: 'yearly' }, { monthlySubscription: { ...input.monthlySubscription, additionalAmount: -1 } }, { monthlySubscription: { ...input.monthlySubscription, currentAmount: 1 } }, { monthlySubscription: { ...input.monthlySubscription, systemName: '' } }]) assert.throws(() => normalizeQuotation({ ...input, ...changes }));
  assert.throws(() => normalizeQuotation({ ...input, items: [...input.items, { description: 'Another recurring charge', chargeType: 'recurring', quantity: 1, unitPrice: 1 }] }));
  const taxable = normalizeQuotation({ ...input, taxRate: 12 });
  const summary = require('./quotation-pricing').monthlySubscriptionSummary(taxable);
  assert.equal(summary.revisedAmount, taxable.recurringTotal); assert.equal(summary.currentAmount + summary.additionalAmount, summary.revisedAmount);
});

test('quotation-only subscriptions save without contract terms and validate the response mode', () => {
  const input = sample({ clientFlow: 'quotation_only', quoteType: 'subscription', discount: 0, items: [
    { description: 'Setup', chargeType: 'setup', quantity: 1, unitPrice: 0 },
    { description: 'Plan', chargeType: 'recurring', quantity: 1, unitPrice: 1000 }
  ] });
  assert.equal(normalizeQuotation(input).clientFlow, 'quotation_only');
  assert.throws(() => normalizeQuotation({ ...input, clientFlow: 'full' }), { statusCode: 400 });
  assert.throws(() => normalizeQuotation({ ...input, clientFlow: 'unknown' }), { statusCode: 400 });
  assert.equal(normalizeQuotation(sample()).clientFlow, undefined);
});
