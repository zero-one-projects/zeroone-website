const crypto = require('crypto');
const { QuotationContract, QuotationNotification, User } = require('../models');
const { documentHash } = require('./quotation-response');
const acceptancePolicy = { version: 2, confirmationTiming: 'after_client_signing', title: 'Electronic Acceptance and Confirmation', terms: 'The Client may electronically sign this Agreement and proceed with payment using the provided instructions. This Agreement shall become binding upon confirmation by an authorized representative of Zero One Information Technology Inc. Payment verification and confirmation shall be recorded by the Provider.' };
const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }); };
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
function usesConfirmation(document) { return document?.quoteType === 'pos' && document.clientFlow !== 'quotation_only' && [1, 2].includes(document.acceptancePolicy?.version); }
function locked(row) {
  const version = documentHash(row.document);
  return Boolean((row.clientResponse?.documentHash === version && row.clientResponse.signature?.signedAt) || (row.contractState?.documentHash === version && row.contractState.clientSignedAt));
}
function state(record) {
  return { recordId: record.id, documentHash: record.documentHash, status: record.finalPdf ? 'finalized' : record.signature ? 'pending_admin_confirmation' : 'draft', statusLabel: record.finalPdf ? 'Confirmed' : record.signature ? 'Pending Admin Confirmation' : 'Awaiting Client Signing', locked: Boolean(record.signature),
    clientSignedAt: record.signature?.signedAt || null, providerAcceptance: record.providerAcceptance || null, priorProviderAcceptance: record.priorProviderAcceptance || null, finalizedAt: record.finalizedAt || null, pdfSha256: record.finalPdfSha256 || record.clientPdfSha256 || null, clientPdfSha256: record.clientPdfSha256 || null };
}
function publicState(row, admin = false) {
  const value = row.contractState?.documentHash === documentHash(row.document) ? row.contractState : null;
  if (!value) return { status: locked(row) ? 'signed' : 'draft', locked: locked(row) };
  return { ...value, ...(value.status === 'signed_pending_confirmation' ? { status: 'pending_admin_confirmation', statusLabel: 'Pending Admin Confirmation' } : {}),
    ...(value.providerAcceptance && !admin ? { providerAcceptance: { name: value.providerAcceptance.name, confirmedAt: value.providerAcceptance.confirmedAt } } : {}),
    ...(value.priorProviderAcceptance && !admin ? { priorProviderAcceptance: { name: value.priorProviderAcceptance.name, confirmedAt: value.priorProviderAcceptance.confirmedAt } } : {}) };
}
async function authorizedActor(req, transaction) {
  if (!/^\d+$/.test(String(req.user?.sub || ''))) fail(403, 'An active authorized staff account is required.');
  const user = await User.findByPk(req.user.sub, { transaction, logging: false, attributes: ['id', 'name', 'email', 'role', 'isActive'] });
  if (!user?.isActive || ![0, 1].includes(user.role)) fail(403, 'An active authorized staff account is required.');
  return { userId: user.id, name: user.name, email: user.email, role: user.role, ipAddress: req.ip, userAgent: String(req.get('user-agent') || '').slice(0, 500) };
}
async function contractRecord(row, transaction) {
  const version = documentHash(row.document);
  const [record] = await QuotationContract.findOrCreate({ where: { quotationId: row.id, documentHash: version }, defaults: { id: crypto.randomUUID(), document: row.document }, transaction, logging: false });
  return record;
}
function reference(row) { return `ZO-${new Date(row.createdAt).getUTCFullYear()}-${String(row.id).padStart(5, '0')}`; }
async function finalize(row, record, transaction) {
  if (!record.signature || !record.providerAcceptance || record.finalPdf) return false;
  const pdf = await require('./signed-contract-pdf').renderSignedContractPdf({ document: record.document, signature: record.signature, reference: reference(row), providerAcceptance: record.providerAcceptance, transaction });
  await record.update({ finalPdf: pdf, finalPdfSha256: sha(pdf), finalizedAt: new Date() }, { transaction, logging: false });
  return true;
}
async function recordClientSignature(row, response, transaction) {
  if (!usesConfirmation(response.document || row.document)) return null;
  if (response.action !== 'accept' || !response.signature?.signedAt || response.documentHash !== documentHash(row.document) || documentHash(response.document || row.document) !== response.documentHash || response.signature.documentHash !== response.documentHash) fail(409, 'The signed agreement does not match the accepted document version. Refresh and review it again.');
  await require('./pos-subscriptions').validateLinkedSubscription(response.document || row.document, transaction, row.id);
  const record = await contractRecord(row, transaction);
  if (record.signature) fail(409, 'This agreement is already signed and locked.');
  const clientPdf = await require('./signed-contract-pdf').renderSignedContractPdf({ document: response.document || row.document, signature: response.signature, reference: reference(row), transaction });
  await record.update({ signature: response.signature, clientPdf, clientPdfSha256: sha(clientPdf), priorProviderAcceptance: record.providerAcceptance || record.priorProviderAcceptance || null, providerAcceptance: null }, { transaction, logging: false });
  await row.update({ contractState: state(record) }, { transaction, logging: false });
  return record;
}
async function confirmProvider(row, actor, transaction, review = {}) {
  if (!usesConfirmation(row.document)) fail(400, 'This quotation does not use provider contract confirmation.');
  require('./contract-autofill').assertContractReady(row.document);
  const record = await contractRecord(row, transaction);
  if (!record.signature || !record.clientPdf) fail(409, 'The client must sign before an administrator can confirm the agreement.');
  if (record.finalPdf && record.providerAcceptance) return record;
  if (review.reviewedClientPdfSha256 !== record.clientPdfSha256) fail(409, 'Review the current client-signed PDF before confirming this agreement.');
  storedPdf(record, 'client');
  if (!record.providerAcceptance) await record.update({ providerAcceptance: { ...actor, confirmedAt: new Date().toISOString(), documentHash: record.documentHash, reviewedClientPdfSha256: record.clientPdfSha256, action: 'admin_agreement_confirmation' } }, { transaction, logging: false });
  const finalized = await finalize(row, record, transaction);
  if (finalized) await require('./pos-subscriptions').recordSignedPos(row, { ...row.clientResponse, providerAcceptance: record.providerAcceptance }, transaction);
  if (finalized) {
    const eventHash = crypto.createHash('sha256').update(`client-contract-confirmed:${record.id}`).digest('hex');
    const id = `${eventHash.slice(0, 8)}-${eventHash.slice(8, 12)}-4${eventHash.slice(13, 16)}-a${eventHash.slice(17, 20)}-${eventHash.slice(20, 32)}`;
    await QuotationNotification.findOrCreate({ where: { id }, defaults: { quotationId: row.id, payload: { action: 'client_contract_confirmed', reference: reference(row), title: record.document.title, clientName: record.signature.signerName || record.document.clientName, clientEmail: record.signature.email, confirmedAt: record.providerAcceptance.confirmedAt, confirmedBy: record.providerAcceptance.name, signedAt: record.signature.signedAt,
      signedContract: { recordId: record.id, documentHash: record.documentHash, copy: 'final' } } }, transaction, logging: false });
  }
  await row.update({ contractState: state(record) }, { transaction, logging: false });
  return record;
}
function storedPdf(record, copy) {
  const bytes = copy === 'client' ? record.clientPdf : record.finalPdf || record.clientPdf, hash = copy === 'client' ? record.clientPdfSha256 : record.finalPdfSha256 || record.clientPdfSha256;
  if (!bytes || !hash || sha(bytes) !== hash) throw new Error('The recorded signed contract failed its integrity check.');
  return Buffer.from(bytes);
}
async function recordedPdf(recordId, version, copy) {
  const record = await QuotationContract.findByPk(recordId, { logging: false });
  if (!record || record.documentHash !== version) fail(404, 'Recorded signed contract not found.');
  return storedPdf(record, copy);
}
async function signedCopy(row, response, copy) {
  const record = await QuotationContract.findOne({ where: { quotationId: row.id, documentHash: response.documentHash }, logging: false });
  if (record?.signature) return storedPdf(record, copy);
  return require('./signed-contract-pdf').renderSignedContractPdf({ reference: reference(row), document: response.document || row.document, signature: response.signature });
}
module.exports = { acceptancePolicy, usesConfirmation, locked, state, publicState, authorizedActor, recordClientSignature, confirmProvider, recordedPdf, signedCopy };
