const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { ContractTemplate } = require('../models');
const { prepareQuotation } = require('./contract-templates');

test('each quotation snapshots its matching template and remains unchanged after template edits', async () => {
  const template = { quoteType: 'pos', terms: 'Original POS agreement' };
  mock.method(ContractTemplate, 'findAll', async () => [template]);
  const input = { title: 'POS', clientName: 'Client', quoteType: 'pos', currency: 'PHP', issuedOn: '2026-10-26', validUntil: '2026-11-26', items: [{ description: 'Setup', chargeType: 'setup', quantity: 1, unitPrice: 5000 }] };
  try {
    const first = await prepareQuotation(input);
    template.terms = 'New POS agreement';
    const second = await prepareQuotation(input);
    assert.equal(first.contractText, 'Original POS agreement');
    assert.equal(second.contractText, 'New POS agreement');
    assert.equal((await prepareQuotation({ ...input, contractText: 'Client-specific terms' })).contractText, 'Client-specific terms');
  } finally { mock.restoreAll(); }
});

test('template formatting is frozen with the quotation and custom snapshots retain their own styles', async () => {
  const format = { fontFamily: 'Helvetica', blocks: [{ index: 0, text: 'POS TERMS', bold: true, color: '#514568', fontSize: 18 }] };
  const template = { quoteType: 'pos', terms: 'POS TERMS', format };
  mock.method(ContractTemplate, 'findAll', async () => [template]);
  const input = { title: 'POS', clientName: 'Client', quoteType: 'pos', currency: 'PHP', issuedOn: '2026-10-26', validUntil: '2026-11-26', items: [{ description: 'Setup', chargeType: 'setup', quantity: 1, unitPrice: 5000 }] };
  try {
    const first = await prepareQuotation(input);
    assert.deepEqual(first.contractStyle, format);
    template.format = { fontFamily: 'Georgia', blocks: [] };
    assert.equal((await prepareQuotation(first)).contractStyle.fontFamily, 'Helvetica');
    assert.equal((await prepareQuotation(input)).contractStyle.fontFamily, 'Georgia');
    assert.equal((await prepareQuotation({ ...input, contractText: 'Different text' })).contractStyle, undefined);
  } finally { mock.restoreAll(); }
});
