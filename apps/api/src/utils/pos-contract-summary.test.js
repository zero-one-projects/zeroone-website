const { test } = require('node:test');
const assert = require('node:assert/strict');
const { posContractRows } = require('./pos-contract-summary');
const document = { clientName: 'Approved Client', title: 'Cloud-Based POS System', currency: 'PHP', taxRate: 12, discount: 1000, items: [
  { description: 'Setup', chargeType: 'setup', quantity: 2, unitPrice: 15000 },
  { description: 'Extra feature', chargeType: 'addon', quantity: 1, unitPrice: 2500 },
  { description: 'Printer', chargeType: 'hardware', quantity: 1, unitPrice: 8000 },
  { description: 'Subscription', chargeType: 'recurring', quantity: 1, unitPrice: 1200 }
], contractDetails: { effectiveDate: '2026-12-01', minimumPeriod: 'Agreed twelve months' } };

test('POS signed summary uses the snapshot line items with the same setup and recurring calculations as the review', () => {
  const before = JSON.stringify(document);
  const rows = Object.fromEntries(posContractRows(document, 'APPROVED-REF'));
  assert.equal(rows['Quotation Reference'], 'APPROVED-REF');
  assert.equal(rows['One-Time Setup & Implementation Fee'], 'PHP 30,000.00');
  assert.equal(rows['Monthly Subscription Fee'], 'PHP 1,344.00');
  assert.equal(rows['Additional Features'], 'Extra feature — PHP 2,500.00');
  assert.equal(rows['Subscription Effective Date'], '2026-12-01');
  assert.equal(rows['Minimum Subscription Period'], 'Agreed twelve months');
  assert.equal(JSON.stringify(document), before);
});

test('yearly, empty, and template summaries do not assume monthly prices or commitment periods', () => {
  const yearly = Object.fromEntries(posContractRows({ ...document, billingPeriod: 'yearly' }, 'YEARLY'));
  assert.equal(yearly['Yearly Subscription Fee'], 'PHP 1,344.00');
  assert.equal(yearly['Monthly Subscription Fee'], undefined);
  const empty = Object.fromEntries(posContractRows({ ...document, items: [], contractDetails: {} }, 'EMPTY'));
  assert.equal(empty['Monthly Subscription Fee'], 'No recurring subscription quoted');
  assert.equal(empty['Minimum Subscription Period'], 'Based on agreed terms');
  assert(posContractRows(document, 'PREVIEW', true).every(([, value]) => value === ''));
});
