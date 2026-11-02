const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

test('billing deletion verifies OTP, exact selection and administrator, limits attempts, and deletes atomically', { skip: process.env.RUN_BILLING_DB_TESTS !== 'true' }, async () => {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
  const { sequelize } = require('../config/database');
  sequelize.options.logging = false;
  const { BillingStatement, BillingDeletionVerification } = require('../models');
  const { requestBillingDeletion, confirmBillingDeletion } = require('./billing-deletion');
  const admin = `billing-delete-test-${crypto.randomUUID()}`, ids = [];
  let server, code;
  const capture = async message => {
    assert.equal(message.toRecipients.length, 1); assert.equal(message.toRecipients[0].emailAddress.address, 'billing@zerooneitinc.com');
    code = message.body.content.split('\n').find(line => /^\d{6}$/.test(line)); assert(code);
  };
  const age = async () => BillingDeletionVerification.update({ createdAt: new Date(Date.now() - 61000) }, { where: { adminId: admin }, silent: true, logging: false });
  try {
    for (let index = 0; index < 4; index++) {
      const row = await BillingStatement.create({ quotationId: null, period: '2026-10', shareToken: crypto.randomBytes(32).toString('hex'), document: { clientName: 'Temporary deletion test', title: `Test billing ${index}` } }, { logging: false }); ids.push(row.id);
    }
    const pair = ids.slice(0, 2), unaffected = ids[2];
    const original = await BillingStatement.findByPk(pair[0], { logging: false });
    server = await new Promise(resolve => { const listener = require('../app').listen(0, '127.0.0.1', () => resolve(listener)); });
    const origin = `http://127.0.0.1:${server.address().port}`, base = `${origin}/api/admin/billing`;
    const token = require('jsonwebtoken').sign({ sub: admin, role: 1 }, process.env.JWT_SECRET, { expiresIn: '5m' });
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const post = (path, body, auth = true) => fetch(`${base}/${path}`, { method: 'POST', headers: auth ? headers : { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await post('delete', { ids: pair }, false)).status, 401);
    assert.equal((await post('delete-verification', { ids: pair }, false)).status, 401);
    assert.equal((await post('delete', { ids: pair })).status, 400);
    mock.method(require('./quotation-verification-mail'), 'sendGraphMail', async (message, save, options) => { assert.equal(options.senderEmail, 'billing@zerooneitinc.com'); await capture(message); });
    const response = await post('delete-verification', { ids: pair }); assert.equal(response.status, 200);
    let challenge = await response.json(); assert(!challenge.code); assert.equal(challenge.email, 'billing@zerooneitinc.com');
    const stored = await BillingDeletionVerification.findByPk(challenge.challengeId, { logging: false }); assert.notEqual(stored.codeHash, code); assert(stored.deliveredAt);
    assert.equal((await post('delete-verification', { ids: pair })).status, 429);
    await assert.rejects(confirmBillingDeletion([pair[0]], admin, challenge.challengeId, code), error => error.statusCode === 409);
    await assert.rejects(confirmBillingDeletion(pair, 'another-admin', challenge.challengeId, code), error => error.statusCode === 409);
    for (let attempt = 0; attempt < 5; attempt++) await assert.rejects(confirmBillingDeletion(pair, admin, challenge.challengeId, '000000'), error => error.statusCode === 400);
    await assert.rejects(confirmBillingDeletion(pair, admin, challenge.challengeId, code), error => error.statusCode === 400);
    assert.equal((await BillingDeletionVerification.findByPk(challenge.challengeId, { logging: false })).attempts, 5);
    assert.equal(await BillingStatement.count({ where: { id: pair }, logging: false }), 2);
    await age(); challenge = await requestBillingDeletion(pair, admin, capture);
    await BillingDeletionVerification.update({ expiresAt: new Date(Date.now() - 1000) }, { where: { id: challenge.challengeId }, logging: false });
    await assert.rejects(confirmBillingDeletion(pair, admin, challenge.challengeId, code), error => error.statusCode === 400);
    await age(); challenge = await requestBillingDeletion(pair, admin, capture);
    await BillingStatement.update({ document: { title: 'Changed during verification' } }, { where: { id: pair[1] }, logging: false });
    await assert.rejects(confirmBillingDeletion(pair, admin, challenge.challengeId, code), error => error.statusCode === 409);
    assert.equal(await BillingStatement.count({ where: { id: pair }, logging: false }), 2);
    await age(); challenge = await requestBillingDeletion(pair, admin, capture);
    const destroyMock = mock.method(BillingStatement, 'destroy', async options => {
      // Delete one row inside the transaction, then fail: the whole operation must roll back.
      await sequelize.query('DELETE FROM billing_statements WHERE id = ?', { replacements: [pair[0]], transaction: options.transaction, logging: false });
      throw new Error('Simulated billing deletion failure');
    });
    try { await assert.rejects(confirmBillingDeletion(pair, admin, challenge.challengeId, code), /Simulated billing deletion failure/); }
    finally { destroyMock.mock.restore(); }
    assert.equal(await BillingStatement.count({ where: { id: pair }, logging: false }), 2);
    assert.equal((await BillingDeletionVerification.findByPk(challenge.challengeId, { logging: false })).consumedAt, null);
    const confirmed = await post('delete', { ids: [...pair].reverse(), challengeId: challenge.challengeId, code }); assert.equal(confirmed.status, 200);
    assert.deepEqual((await confirmed.json()).deletedIds, pair);
    assert.equal(await BillingStatement.count({ where: { id: pair }, logging: false }), 0);
    assert((await BillingDeletionVerification.findByPk(challenge.challengeId, { logging: false })).consumedAt);
    assert.equal((await fetch(`${origin}/api/billing/${original.shareToken}/pdf`)).status, 404);
    await assert.rejects(confirmBillingDeletion(pair, admin, challenge.challengeId, code));
    assert(await BillingStatement.findByPk(unaffected, { logging: false }));
    await age();
    const before = await BillingDeletionVerification.count({ where: { adminId: admin }, logging: false });
    await assert.rejects(requestBillingDeletion([unaffected], admin, async () => { throw new Error('Simulated mail failure'); }), /Simulated mail failure/);
    assert.equal(await BillingDeletionVerification.count({ where: { adminId: admin }, logging: false }), before);
    challenge = await requestBillingDeletion([unaffected], admin, capture);
    await confirmBillingDeletion([unaffected], admin, challenge.challengeId, code);
    assert.equal(await BillingStatement.findByPk(unaffected, { logging: false }), null);
    assert(await BillingStatement.findByPk(ids[3], { logging: false }));
  } finally {
    mock.restoreAll();
    if (server) await new Promise(resolve => server.close(resolve));
    await BillingDeletionVerification.destroy({ where: { adminId: admin }, logging: false });
    if (ids.length) await BillingStatement.destroy({ where: { id: ids }, logging: false });
    await sequelize.close();
  }
});
