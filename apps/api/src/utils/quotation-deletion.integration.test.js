const { test } = require('node:test');
const assert = require('node:assert/strict');

test('database deletion requires a valid bound code, limits attempts, disables access, and retains history', { skip: process.env.RUN_QUOTATION_DB_TESTS !== 'true' }, async () => {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
  const { sequelize } = require('../config/database');
  const { Quotation, QuotationVerification, QuotationResponseHistory, QuotationNotification } = require('../models');
  const { requestDeletion, confirmDeletion } = require('./quotation-deletion');
  const { documentHash } = require('./quotation-response');
  sequelize.options.logging = false;
  const ids = [];
  try {
    const row = await Quotation.create({ document: { title: 'Deletion integration test', validUntil: '2099-01-01' }, shareToken: require('crypto').randomBytes(32).toString('hex') });
    ids.push(row.id);
    const other = await Quotation.create({ document: { title: 'Deletion isolation test', validUntil: '2099-01-01' } });
    ids.push(other.id);
    await QuotationResponseHistory.create({ quotationId: row.id, documentHash: documentHash(row.document), response: { note: 'Retain this history' } });
    let code;
    const send = async (message) => { assert.equal(message.toRecipients[0].emailAddress.address, 'info@zerooneitinc.com'); code = message.body.content.split('\n').find((line) => /^\d{6}$/.test(line)); };
    let challenge = await requestDeletion(row.id, 123, send);
    await assert.rejects(requestDeletion(row.id, 123, send), (error) => error.statusCode === 429);
    await assert.rejects(confirmDeletion(other.id, 123, challenge.challengeId, code), (error) => error.statusCode === 400);
    await assert.rejects(confirmDeletion(row.id, 456, challenge.challengeId, code), (error) => error.statusCode === 409);
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i += 1) await assert.rejects(confirmDeletion(row.id, 123, challenge.challengeId, wrong), (error) => error.statusCode === 400);
    await assert.rejects(confirmDeletion(row.id, 123, challenge.challengeId, code), (error) => error.statusCode === 400);
    assert.equal((await QuotationVerification.findByPk(challenge.challengeId)).attempts, 5);
    assert.equal(await QuotationNotification.count({ where: { quotationId: row.id } }), 0);
    await QuotationVerification.update({ createdAt: new Date(Date.now() - 61000) }, { where: { id: challenge.challengeId }, silent: true });
    challenge = await requestDeletion(row.id, 123, send);
    await QuotationVerification.update({ expiresAt: new Date(Date.now() - 1000) }, { where: { id: challenge.challengeId } });
    await assert.rejects(confirmDeletion(row.id, 123, challenge.challengeId, code), (error) => error.statusCode === 400);
    await QuotationVerification.update({ expiresAt: new Date(Date.now() + 600000) }, { where: { id: challenge.challengeId } });
    await row.update({ document: { ...row.document, title: 'Changed during verification' } });
    await assert.rejects(confirmDeletion(row.id, 123, challenge.challengeId, code), (error) => error.statusCode === 409);
    await QuotationVerification.update({ createdAt: new Date(Date.now() - 61000) }, { where: { id: challenge.challengeId }, silent: true });
    challenge = await requestDeletion(row.id, 123, send);
    await confirmDeletion(row.id, 123, challenge.challengeId, code, 'admin@example.com');
    const confirmation = await QuotationNotification.findOne({ where: { quotationId: row.id } });
    assert.equal(confirmation.payload.action, 'delete');
    assert.equal(confirmation.payload.adminEmail, 'admin@example.com');
    assert.equal(confirmation.payload.quotations.length, 1);
    assert.equal(await Quotation.findByPk(row.id), null);
    const archived = await Quotation.findByPk(row.id, { paranoid: false });
    assert(archived.deletedAt);
    assert.equal(archived.shareToken, null);
    assert.equal(await QuotationResponseHistory.count({ where: { quotationId: row.id } }), 1);
    await assert.rejects(confirmDeletion(row.id, 123, challenge.challengeId, code), (error) => error.statusCode === 404);
    assert.equal(await QuotationNotification.count({ where: { quotationId: row.id } }), 1);
    assert(await Quotation.findByPk(other.id));
    const bulk = [];
    for (let index = 0; index < 2; index += 1) {
      const quote = await Quotation.create({ document: { title: `Bulk deletion test ${index}`, validUntil: '2099-01-01' }, shareToken: require('crypto').randomBytes(32).toString('hex') });
      bulk.push(quote); ids.push(quote.id);
    }
    const bulkIds = bulk.map((quote) => quote.id);
    challenge = await requestDeletion([...bulkIds].reverse(), 123, send);
    await assert.rejects(confirmDeletion([bulkIds[0]], 123, challenge.challengeId, code), (error) => error.statusCode === 409);
    await assert.rejects(confirmDeletion([...bulkIds, other.id], 123, challenge.challengeId, code));
    await bulk[1].update({ document: { ...bulk[1].document, title: 'Revised bulk quote' } });
    await assert.rejects(confirmDeletion(bulkIds, 123, challenge.challengeId, code), (error) => error.statusCode === 409);
    assert.equal(await Quotation.count({ where: { id: bulkIds } }), 2);
    await QuotationVerification.update({ createdAt: new Date(Date.now() - 61000) }, { where: { id: challenge.challengeId }, silent: true });
    challenge = await requestDeletion(bulkIds, 123, send);
    const destroy = Quotation.destroy;
    try {
      Quotation.destroy = async () => { throw new Error('Simulated database failure'); };
      await assert.rejects(confirmDeletion(bulkIds, 123, challenge.challengeId, code), /Simulated database failure/);
    } finally { Quotation.destroy = destroy; }
    assert.equal(await QuotationNotification.count({ where: { quotationId: bulkIds } }), 0);
    for (const quote of bulk) { await quote.reload(); assert(quote.shareToken); }
    await confirmDeletion([...bulkIds].reverse(), 123, challenge.challengeId, code);
    const bulkConfirmation = await QuotationNotification.findAll({ where: { quotationId: bulkIds } });
    assert.equal(bulkConfirmation.length, 1);
    assert.equal(bulkConfirmation[0].payload.quotations.length, 2);
    assert.equal(await Quotation.count({ where: { id: bulkIds } }), 0);
    assert(await Quotation.findByPk(other.id));
  } finally {
    if (ids.length) {
      await QuotationNotification.destroy({ where: { quotationId: ids } });
      await QuotationVerification.destroy({ where: { quotationId: ids } });
      await QuotationResponseHistory.destroy({ where: { quotationId: ids } });
      await Quotation.destroy({ where: { id: ids }, force: true });
    }
    await sequelize.close();
  }
});
