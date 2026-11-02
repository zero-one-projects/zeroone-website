const { test, mock } = require('node:test');
const assert = require('node:assert/strict');

test('admin contracts require authorization and mixed POS quotations freeze the saved template', { skip: process.env.RUN_QUOTATION_DB_TESTS !== 'true' }, async () => {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
  const { sequelize } = require('../config/database');
  const { ContractTemplate, Quotation } = require('../models');
  // Keep the administrator's real contract templates untouched.
  const templates = {};
  mock.method(ContractTemplate, 'findAll', async () => Object.entries(templates).map(([quoteType, value]) => ({ quoteType, ...value })));
  mock.method(ContractTemplate, 'findByPk', async (type) => templates[type] ? { quoteType: type, ...templates[type] } : null);
  mock.method(ContractTemplate, 'upsert', async ({ quoteType, terms, format }) => { templates[quoteType] = { terms, format }; });
  sequelize.options.logging = false;
  const app = require('../app');
  const server = await new Promise((resolve) => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  const base = `http://127.0.0.1:${server.address().port}/api/admin`;
  const token = require('jsonwebtoken').sign({ sub: 'contract-test', role: 1 }, process.env.JWT_SECRET, { expiresIn: '1m' });
  const ids = [];
  async function call(path, method = 'GET', body, authenticated = true) {
    const response = await fetch(`${base}${path}`, { method, headers: { ...(authenticated ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() };
  }
  try {
    assert.equal((await call('/contracts', 'GET', null, false)).status, 401);
    const format = { fontFamily: 'Helvetica', blocks: [{ index: 0, text: 'POS terms A', bold: true, color: '#123abc', fontSize: 18 }] };
    assert.equal((await call('/contracts/pos', 'PUT', { terms: 'POS terms A', format })).status, 200);
    assert.deepEqual((await call('/contracts')).body.formats.pos, format);
    assert.equal((await call('/contracts/pos', 'PUT', { terms: 'Bad format', format: { ...format, fontFamily: 'url(https://example.com)' } })).status, 400);
    const input = { quoteType: 'pos', title: 'POS test', clientName: 'Test Client', currency: 'PHP', issuedOn: '2026-10-26', validUntil: '2099-01-01', items: [
      { description: 'Setup', chargeType: 'setup', quantity: 1, unitPrice: 5000 },
      { description: 'Requested feature', chargeType: 'addon', quantity: 1, unitPrice: 1500 },
      { description: 'POS plan', chargeType: 'recurring', quantity: 1, unitPrice: 700 }
    ] };
    const created = await call('/quotations', 'POST', { document: input });
    assert.equal(created.status, 201); ids.push(created.body.quotation.id);
    assert.equal(created.body.quotation.document.total, 6500);
    assert.equal(created.body.quotation.document.recurringTotal, 700);
    assert.equal(created.body.quotation.document.contractText, 'POS terms A');
    assert.deepEqual(created.body.quotation.document.contractStyle, format);
    assert.equal((await call('/contracts/pos', 'PUT', { terms: 'POS terms B' })).status, 200);
    const saved = await call(`/quotations/${created.body.quotation.id}`);
    assert.equal(saved.body.quotation.document.contractText, 'POS terms A');
    assert.deepEqual(saved.body.quotation.document.contractStyle, format);
    const second = await call('/quotations', 'POST', { document: input });
    assert.equal(second.status, 201); ids.push(second.body.quotation.id);
    assert.equal(second.body.quotation.document.contractText, 'POS terms B');
  } finally {
    if (ids.length) await Quotation.destroy({ where: { id: ids }, force: true });
    await new Promise((resolve) => server.close(resolve));
    await sequelize.close(); mock.restoreAll();
  }
});
