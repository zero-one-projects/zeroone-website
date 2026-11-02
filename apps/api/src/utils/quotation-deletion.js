const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { Quotation, QuotationVerification, QuotationNotification } = require('../models');
const { documentHash, codeHash } = require('./quotation-response');
const { serializeQuotation } = require('./serialize-quotation');

const deletionMailbox = 'info@zerooneitinc.com';
const fail = (statusCode, message) => Object.assign(new Error(message), { statusCode });

function deletionVersion(row, adminId) {
  return documentHash({ document: row.document, response: row.clientResponse || null, updatedAt: new Date(row.updatedAt).toISOString(), adminId: String(adminId) });
}

function normalizeDeletionIds(value) {
  const values = Array.isArray(value) ? value : [value];
  if (!values.length || values.length > 100 || values.some((id) => !/^\d+$/.test(String(id)) || !Number.isSafeInteger(Number(id)) || Number(id) < 1)) throw fail(400, 'Select between 1 and 100 valid quotations.');
  return [...new Set(values.map(Number))].sort((a, b) => a - b);
}

function deletionGroupVersion(rows, adminId) {
  return rows.length === 1 ? deletionVersion(rows[0], adminId) : documentHash(rows.map((row) => ({ id: row.id, version: deletionVersion(row, adminId) })));
}

function deletionMessage({ reference, references = [reference], code, expiresAt }) {
  return {
    subject: `Delete quotation verification code: ${references.length === 1 ? references[0] : `${references.length} quotations`}`,
    toRecipients: [{ emailAddress: { address: deletionMailbox } }],
    body: { contentType: 'Text', content: [
      'Hello!', '', `An administrator requested deletion of ${references.length === 1 ? 'quotation' : `${references.length} quotations`}:`, ...references, '',
      'Use this code in the admin quotation list to confirm deletion:', '', code, '',
      `This code expires at ${new Date(expiresAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Manila time), in up to 10 minutes.`,
      'Selected quotations will be removed from the list and their client links will stop working. Response history will be retained internally.', '',
      'If you did not request this, do not share the code. No quotation is deleted unless the code is confirmed in the admin workspace.', '',
      'Zero One Information Technology Inc.'
    ].join('\n') }
  };
}

async function requestDeletion(id, adminId, send) {
  const ids = normalizeDeletionIds(id);
  const prepared = await sequelize.transaction({ logging: false }, async (transaction) => {
    const rows = await Quotation.findAll({ where: { id: ids }, order: [['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE, logging: false });
    if (rows.length !== ids.length) throw fail(404, 'One or more quotations are no longer available. Refresh the list.');
    const last = await QuotationVerification.findOne({ where: { quotationId: ids, action: 'delete' }, order: [['createdAt', 'DESC']], transaction, logging: false });
    if (last && Date.now() - new Date(last.createdAt).getTime() < 60000) throw fail(429, 'Wait 60 seconds before requesting another deletion code.');
    const recent = await QuotationVerification.count({ where: { action: 'delete', createdAt: { [Op.gte]: new Date(Date.now() - 600000) } }, transaction, logging: false });
    if (recent >= 10) throw fail(429, 'Too many deletion code requests. Please try again in 10 minutes.');
    const challengeId = crypto.randomUUID();
    const code = String(crypto.randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 600000);
    const challenge = await QuotationVerification.create({ id: challengeId, quotationId: rows[0].id, email: deletionMailbox,
      action: 'delete', documentHash: deletionGroupVersion(rows, adminId), codeHash: codeHash(challengeId, code), expiresAt
    }, { transaction, logging: false });
    return { challenge, code, references: rows.map((row) => serializeQuotation(row).reference) };
  });
  try { await send(deletionMessage({ references: prepared.references, code: prepared.code, expiresAt: prepared.challenge.expiresAt })); }
  catch (error) { await prepared.challenge.destroy({ logging: false }); throw error; }
  return { challengeId: prepared.challenge.id, expiresAt: prepared.challenge.expiresAt, email: deletionMailbox };
}

async function confirmDeletion(id, adminId, challengeId, code, adminEmail) {
  const ids = normalizeDeletionIds(id);
  if (typeof challengeId !== 'string' || !/^[a-f0-9-]{36}$/.test(challengeId) || typeof code !== 'string' || !/^\d{6}$/.test(code)) throw fail(400, 'Enter the six-digit deletion code sent to info@zerooneitinc.com.');
  const result = await sequelize.transaction({ logging: false }, async (transaction) => {
    const rows = await Quotation.findAll({ where: { id: ids }, order: [['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE, logging: false });
    if (rows.length !== ids.length) return { status: 404, message: 'One or more quotations are no longer available. Refresh the list.' };
    const challenge = await QuotationVerification.findByPk(challengeId, { transaction, lock: transaction.LOCK.UPDATE, logging: false });
    if (!challenge || challenge.quotationId !== rows[0].id || challenge.action !== 'delete' || challenge.email !== deletionMailbox || challenge.consumedAt || challenge.attempts >= 5 || Date.now() >= new Date(challenge.expiresAt).getTime()) return { status: 400, message: 'This deletion code is invalid or expired. Request a new code.' };
    if (challenge.documentHash !== deletionGroupVersion(rows, adminId)) return { status: 409, message: 'The selection or quotation changed, or this code belongs to another administrator. Request a new deletion code.' };
    await challenge.update({ attempts: challenge.attempts + 1 }, { transaction, logging: false });
    if (!crypto.timingSafeEqual(Buffer.from(codeHash(challengeId, code), 'hex'), Buffer.from(challenge.codeHash, 'hex'))) return { status: 400, message: 'Incorrect deletion code. Check the email and try again.' };
    await QuotationNotification.create({ id: crypto.randomUUID(), quotationId: rows[0].id, payload: {
      action: 'delete', deletedAt: new Date().toISOString(), adminId, adminEmail,
      quotations: rows.map((row) => ({ reference: serializeQuotation(row).reference, title: row.document.title, clientCompany: row.document.clientName }))
    } }, { transaction, logging: false });
    await Quotation.update({ shareToken: null }, { where: { id: ids }, transaction, logging: false });
    await Quotation.destroy({ where: { id: ids }, transaction, logging: false });
    await QuotationVerification.update({ consumedAt: new Date() }, { where: { quotationId: ids, consumedAt: null }, transaction, logging: false });
    return { status: 200, message: `${ids.length === 1 ? 'Quotation deleted. Its client link is' : `${ids.length} quotations deleted. Their client links are`} no longer available.` };
  });
  if (result.status !== 200) throw fail(result.status, result.message);
  return { message: result.message };
}

module.exports = { deletionVersion, deletionGroupVersion, normalizeDeletionIds, deletionMessage, requestDeletion, confirmDeletion };
