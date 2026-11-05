const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeQuotation } = require('./quotation');
const { latestRate, terms } = require('./pos-upgrade');
const { validateUpgrade, billingSource } = require('./pos-subscriptions');
const input = { quoteType: 'pos', posPurpose: 'upgrade', baseQuotationId: 1, title: 'POS upgrade', clientName: 'Client', clientEmail: 'client@example.com', issuedOn: '2026-11-05', validUntil: '2099-01-01', currency: 'PHP', billingPeriod: 'monthly', clientFlow: 'full', contractText: 'Saved client agreement', monthlySubscription: { currentAmount: 1699, additionalAmount: 2000, systemName: 'POS' }, contractDetails: { effectiveDate: '2026-12-01' }, items: [
  { description: 'Additional features', chargeType: 'addon', quantity: 1, unitPrice: 5000 },
  { description: 'Current rate', chargeType: 'recurring', subscriptionRole: 'current', quantity: 1, unitPrice: 1699 },
  { description: 'Upgrade', chargeType: 'recurring', subscriptionRole: 'additional', quantity: 1, unitPrice: 2000 }
] };
test('upgrades snapshot the permanent-rate clause, approved calculation, and effective date without changing one-time fees', () => {
  const d = normalizeQuotation(input);
  assert.equal(d.recurringTotal, 3699); assert.equal(d.total, 5000);
  assert.equal(d.posUpgradeTerms, terms); assert.equal(d.baseQuotationId, 1);
  assert.match(d.monthlySubscription.notice, /permanent rate/);
  assert.match(d.contractDetails.billingCommencement, /2026-12-01/);
  for (const patch of [{ baseQuotationId: undefined }, { clientFlow: 'quotation_only' }, { billingPeriod: 'yearly' }, { contractDetails: { effectiveDate: '2026-02-30' } }, { contractDetails: {} }]) assert.throws(() => normalizeQuotation({ ...input, ...patch }));
});
test('new subscriptions accept an entered base monthly fee and one-time customizations cannot change recurring prices', () => {
  const initial = normalizeQuotation({ ...input, posPurpose: 'new' });
  assert.equal(initial.monthlySubscription.currentAmount, 1699);
  assert.equal(initial.recurringTotal, 3699);
  assert.throws(() => normalizeQuotation({ ...input, posPurpose: 'customization' }), /cannot contain recurring/);
  const custom = normalizeQuotation({ ...input, posPurpose: 'customization', monthlySubscription: undefined, items: [input.items[0]] });
  assert.equal(custom.recurringTotal, 0); assert.equal(custom.posUpgradeTerms, undefined);
  const legacy = normalizeQuotation({ ...input, posPurpose: undefined });
  assert.equal(legacy.posUpgradeTerms, undefined);
});
test('signed rate schedules persist through renewals, preserve prior periods, and ignore one-time customizations', () => {
  const revised = normalizeQuotation(input);
  const old = { ...revised, recurringSubtotal: 1699, recurringTotal: 1699, posPurpose: 'new' };
  const revisions = [
    { sequence: 0, kind: 'new', effectiveOn: '2026-01-01', document: old },
    { sequence: 1, kind: 'upgrade', effectiveOn: '2026-12-01', document: revised },
    { sequence: 2, kind: 'customization', effectiveOn: '2027-01-01', document: { recurringTotal: 0 } }
  ];
  assert.equal(latestRate(revisions, '2026-11-30').document.recurringTotal, 1699);
  assert.equal(latestRate(revisions, '2028-05-01').document.recurringTotal, 3699);
  assert.equal(billingSource(revisions, { period: '2026-11', issuedOn: '2026-12-02' }).document.recurringTotal, 1699);
  assert.equal(billingSource(revisions, { period: '2026-12', issuedOn: '2026-12-02' }).document.recurringTotal, 3699);
  assert.throws(() => billingSource(revisions, { period: 'invalid', issuedOn: '' }));
  assert.throws(() => validateUpgrade(revised, revisions), /rate has changed/);
  assert.throws(() => validateUpgrade({ ...revised, clientEmail: 'other@example.com' }, [revisions[0]]), /existing subscription client/);
});
