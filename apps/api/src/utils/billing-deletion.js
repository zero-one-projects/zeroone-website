const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { BillingStatement, BillingDeletionVerification } = require('../models');
const { documentHash, codeHash } = require('./quotation-response');
const { serializeBill } = require('./billing');
const deletionMailbox = 'billing@zerooneitinc.com';
const fail = (statusCode, message) => Object.assign(new Error(message), { statusCode });
function normalizeBillingDeletionIds(value) {
  if (!Array.isArray(value) || !value.length || value.length > 100 || value.some(id => !/^\d+$/.test(String(id)) || !Number.isSafeInteger(Number(id)) || Number(id) < 1)) throw fail(400, 'Select between 1 and 100 valid billing statements.');
  return [...new Set(value.map(Number))].sort((a, b) => a - b);
}
function billingDeletionVersion(rows, adminId) {
  return documentHash({ adminId: String(adminId), statements: rows.map(row => ({ id: row.id, document: row.document, shareToken: row.shareToken, updatedAt: new Date(row.updatedAt).toISOString(), emailSentAt: row.emailSentAt, emailSentTo: row.emailSentTo })) });
}
function billingDeletionMessage({ references, code, expiresAt }) {
  return {
    subject: `Billing deletion code — ${references.length === 1 ? references[0] : `${references.length} statements`}`,
    toRecipients: [{ emailAddress: { address: deletionMailbox } }],
    body: { contentType: 'Text', content: [
      'An administrator requested deletion of these billing statements:', '', ...references, '',
      'Enter this six-digit code in the billing workspace to confirm:', '', code, '',
      `Expires: ${new Date(expiresAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (Manila time). Valid for 10 minutes and up to five attempts.`, '',
      'Deletion permanently removes exactly these statements and disables their client links. Previously downloaded or emailed copies remain.',
      'If you did not request this, do not share the code. Nothing is deleted until the code is confirmed in the admin workspace.', '', 'ZeroOne Billing'
    ].join('\n') }
  };
}
async function sendBillingDeletionCode(message) {
  await require('./quotation-verification-mail').sendGraphMail(message, true, { senderEmail: deletionMailbox, errorMessage: 'Unable to send the deletion code from billing@zerooneitinc.com. Check Mail Config and access to the billing mailbox.' });
}
async function requestBillingDeletion(value, adminId, send = sendBillingDeletionCode) {
  const ids = normalizeBillingDeletionIds(value);
  if (!adminId || String(adminId).length > 180) throw fail(401, 'Please sign in again before deleting billing statements.');
  const prepared = await sequelize.transaction({ logging: false }, async transaction => {
    const rows = await BillingStatement.findAll({ where: { id: ids }, order: [['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE, logging: false });
    if (rows.length !== ids.length) throw fail(404, 'One or more billing statements are unavailable. Refresh the list.');
    const last = await BillingDeletionVerification.findOne({ where: { adminId: String(adminId) }, order: [['createdAt', 'DESC']], transaction, logging: false });
    if (last && Date.now() - new Date(last.createdAt).getTime() < 60000) throw fail(429, 'Wait 60 seconds before requesting another billing deletion code.');
    const recent = await BillingDeletionVerification.count({ where: { createdAt: { [Op.gte]: new Date(Date.now() - 600000) } }, transaction, logging: false });
    if (recent >= 10) throw fail(429, 'Too many billing deletion code requests. Try again in 10 minutes.');
    const id = crypto.randomUUID(), code = String(crypto.randomInt(100000, 1000000)), expiresAt = new Date(Date.now() + 600000);
    const references = rows.map(row => serializeBill(row).reference);
    const challenge = await BillingDeletionVerification.create({ id, adminId: String(adminId), selection: ids, selectionHash: billingDeletionVersion(rows, adminId), codeHash: codeHash(id, code), expiresAt }, { transaction, logging: false });
    return { challenge, code, references };
  });
  try {
    await send(billingDeletionMessage({ references: prepared.references, code: prepared.code, expiresAt: prepared.challenge.expiresAt }));
    await prepared.challenge.update({ deliveredAt: new Date() }, { logging: false });
  } catch (error) {
    await prepared.challenge.destroy({ logging: false });
    throw error;
  }
  return { challengeId: prepared.challenge.id, expiresAt: prepared.challenge.expiresAt, email: deletionMailbox };
}
async function confirmBillingDeletion(value, adminId, challengeId, code) {
  const ids = normalizeBillingDeletionIds(value);
  if (typeof challengeId !== 'string' || !/^[a-f0-9-]{36}$/.test(challengeId) || typeof code !== 'string' || !/^\d{6}$/.test(code)) throw fail(400, 'Enter the six-digit deletion code sent to billing@zerooneitinc.com.');
  const result = await sequelize.transaction({ logging: false }, async transaction => {
    const rows = await BillingStatement.findAll({ where: { id: ids }, order: [['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE, logging: false });
    if (rows.length !== ids.length) return { status: 404, message: 'One or more billing statements are unavailable. Refresh the list.' };
    const challenge = await BillingDeletionVerification.findByPk(challengeId, { transaction, lock: transaction.LOCK.UPDATE, logging: false });
    if (!challenge || !challenge.deliveredAt || challenge.consumedAt || challenge.attempts >= 5 || Date.now() >= new Date(challenge.expiresAt).getTime()) return { status: 400, message: 'This deletion code is invalid or expired. Request a new code.' };
    if (challenge.adminId !== String(adminId) || JSON.stringify(challenge.selection) !== JSON.stringify(ids) || challenge.selectionHash !== billingDeletionVersion(rows, adminId)) return { status: 409, message: 'The selection or a statement changed, or the code belongs to another administrator. Request a new code.' };
    await challenge.update({ attempts: challenge.attempts + 1 }, { transaction, logging: false });
    if (!crypto.timingSafeEqual(Buffer.from(codeHash(challengeId, code), 'hex'), Buffer.from(challenge.codeHash, 'hex'))) return { status: 400, message: 'Incorrect deletion code. Check the billing email and try again.' };
    await BillingStatement.destroy({ where: { id: ids }, transaction, logging: false });
    await challenge.update({ consumedAt: new Date() }, { transaction, logging: false });
    return { status: 200, message: `${ids.length === 1 ? 'Billing statement deleted. Its client link is' : `${ids.length} billing statements deleted. Their client links are`} no longer available.` };
  });
  if (result.status !== 200) throw fail(result.status, result.message);
  return { message: result.message, deletedIds: ids };
}
module.exports = { normalizeBillingDeletionIds, billingDeletionVersion, billingDeletionMessage, requestBillingDeletion, confirmBillingDeletion };
