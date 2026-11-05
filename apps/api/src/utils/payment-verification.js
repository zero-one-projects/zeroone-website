const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { Quotation, QuotationContract, QuotationPayment } = require('../models');
const { documentHash } = require('./quotation-response');

const manualMethods = ['bank_transfer', 'cash', 'gcash', 'maya', 'cheque', 'other'];
const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }); };
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value, label, maximum) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum || /[\u0000-\u001f\u007f]/.test(value)) fail(400, `Enter a valid ${label}.`);
  return value.trim();
}

function todayInManila() {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = type => parts.find(value => value.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function normalizePayment(input, source = 'manual', today = todayInManila()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail(400, 'Enter the payment details.');
  if (typeof input.documentHash !== 'string' || !/^[a-f0-9]{64}$/i.test(input.documentHash)) fail(400, 'Choose the signed agreement version.');
  const paymentDate = typeof input.paymentDate === 'string' ? input.paymentDate : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate) || Number.isNaN(Date.parse(`${paymentDate}T00:00:00.000Z`)) || new Date(`${paymentDate}T00:00:00.000Z`).toISOString().slice(0, 10) !== paymentDate || paymentDate > today) fail(400, 'Enter a valid payment date that is not in the future.');
  const amount = ['string', 'number'].includes(typeof input.amount) ? String(input.amount) : '';
  if (!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) fail(400, 'Enter a positive payment amount with no more than two decimal places.');
  const referenceNumber = text(input.referenceNumber, 'payment reference number', 180);
  const paymentMethod = text(input.paymentMethod, 'payment method', 80);
  if (source === 'manual' && !manualMethods.includes(paymentMethod)) fail(400, 'Choose a supported payment method.');
  const idempotencyKey = text(input.idempotencyKey, 'payment request identifier', 180);
  if (source === 'manual' && !uuid.test(idempotencyKey)) fail(400, 'Use a valid payment request identifier.');
  if (input.note !== undefined && (typeof input.note !== 'string' || input.note.length > 2000)) fail(400, 'Keep the payment note within 2,000 characters.');
  return { documentHash: input.documentHash.toLowerCase(), paymentDate, amount: Number(amount).toFixed(2), referenceNumber, paymentMethod, idempotencyKey, note: (input.note || '').trim() };
}

function providerContext(context) {
  // This context must be constructed by a future authenticated server-side HitPay
  // adapter after checking its signature and successful transaction state. It is
  // deliberately never accepted from either the client or admin request body.
  const event = context?.verifiedProviderEvent;
  if (context?.source !== 'hitpay' || event?.signatureVerified !== true || event?.status !== 'completed') fail(403, 'A verified successful payment-provider event is required.');
  return {
    source: 'hitpay', providerTransactionId: text(event.transactionId, 'provider transaction identifier', 180),
    providerEventId: text(event.eventId, 'provider event identifier', 180),
    actor: { type: 'payment_provider', name: 'HitPay', action: 'automated_payment_verification' }
  };
}

function assertSignedVersion(row, version) {
  const response = row.clientResponse;
  if (version !== documentHash(row.document)) fail(409, 'The agreement changed. Review the current signed version before verifying payment.');
  if (response?.action !== 'accept' || response.documentHash !== version || !response.signature?.signedAt || response.signature.documentHash !== version || documentHash(response.document || row.document) !== version) fail(409, 'The client must sign this agreement before payment can be verified.');
  return response;
}

function paymentMetadata(record) {
  return {
    id: record.id, quotationId: record.quotationId, documentHash: record.documentHash, status: record.status,
    paymentDate: record.paymentDate, amount: Number(record.amount), currency: record.currency,
    referenceNumber: record.referenceNumber, paymentMethod: record.paymentMethod, source: record.source,
    verifiedBy: { name: record.verifiedBy.name, ...(record.verifiedBy.userId ? { userId: record.verifiedBy.userId } : {}) },
    verifiedAt: record.verifiedAt, note: record.note,
    ...(record.providerTransactionId ? { providerTransactionId: record.providerTransactionId } : {})
  };
}

function publicPaymentState(row) {
  const current = row.paymentState?.documentHash === documentHash(row.document) && row.paymentState?.status === 'paid';
  return { paymentStatus: current ? 'paid' : 'unpaid', paymentState: current ? {
    status: 'paid', documentHash: row.paymentState.documentHash, lastPaymentId: row.paymentState.lastPaymentId,
    lastVerifiedAt: row.paymentState.lastVerifiedAt, totalVerifiedAmount: row.paymentState.totalVerifiedAmount,
    currency: row.paymentState.currency
  } : null };
}

async function recordsFor(row, transaction) {
  return QuotationPayment.findAll({ where: { quotationId: row.id, documentHash: documentHash(row.document), status: 'paid' }, order: [['verifiedAt', 'DESC'], ['id', 'ASC']], transaction, logging: false });
}

async function paymentList(row, transaction) {
  const records = await recordsFor(row, transaction);
  return { payments: records.map(paymentMetadata), paymentStatus: records.length ? 'paid' : 'unpaid' };
}

async function updatePaymentState(row, transaction) {
  const records = await recordsFor(row, transaction);
  const last = records[0];
  const totalCents = records.reduce((total, record) => total + Math.round(Number(record.amount) * 100), 0);
  await row.update({ paymentState: { documentHash: documentHash(row.document), status: 'paid', lastPaymentId: last.id, lastVerifiedAt: new Date(last.verifiedAt).toISOString(), totalVerifiedAmount: totalCents / 100, currency: last.currency } }, { transaction, logging: false });
  return { payments: records.map(paymentMetadata), paymentStatus: 'paid' };
}

async function recordVerifiedPayment({ quotationId, input, context }) {
  if (!/^\d+$/.test(String(quotationId || ''))) fail(400, 'Choose a saved quotation.');
  const source = context?.source === 'manual' ? { source: 'manual', providerTransactionId: null, providerEventId: null } : providerContext(context);
  const payment = normalizePayment(input, source.source);
  return sequelize.transaction({ logging: false }, async transaction => {
    // The quotation lock serializes manual retries, ledger insertion, and the
    // version-bound status cache. A response is returned only after this commits.
    const row = await Quotation.findByPk(quotationId, { transaction, lock: transaction.LOCK.UPDATE, logging: false });
    if (!row) fail(404, 'Quotation not found.');
    const actor = source.source === 'manual' ? await require('./contract-acceptance').authorizedActor(context.request, transaction) : source.actor;
    const response = assertSignedVersion(row, payment.documentHash);
    const currency = String(row.document.currency || 'PHP').toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) fail(400, 'The agreement currency is invalid.');
    const contract = await QuotationContract.findOne({ where: { quotationId: row.id, documentHash: payment.documentHash }, attributes: ['id', 'documentHash', 'signature', 'clientPdfSha256'], transaction, logging: false });
    if (require('./contract-acceptance').usesConfirmation(row.document) && (!contract?.signature || contract.signature.documentHash !== payment.documentHash || contract.signature.signedAt !== response.signature.signedAt || !contract.clientPdfSha256)) fail(409, 'The original signed agreement must be recorded before verifying payment.');
    const deduplicationKey = hash(JSON.stringify(source.source === 'manual'
      ? ['manual', row.id, payment.documentHash, payment.paymentMethod, payment.referenceNumber.toLowerCase()]
      : ['hitpay', source.providerTransactionId]));
    const payloadHash = hash(JSON.stringify({ quotationId: row.id, ...payment, idempotencyKey: undefined, currency, source: source.source, providerTransactionId: source.providerTransactionId }));
    const existing = await QuotationPayment.findOne({ where: { [Op.or]: [{ idempotencyKey: payment.idempotencyKey }, { deduplicationKey }] }, transaction, logging: false });
    if (existing) {
      if (existing.payloadHash !== payloadHash) fail(409, 'This payment request or transaction reference already has different verified details.');
      return { payment: paymentMetadata(existing), ...await updatePaymentState(row, transaction), replayed: true };
    }
    let record;
    try {
      record = await QuotationPayment.create({
        id: crypto.randomUUID(), quotationId: row.id, ...payment, currency, source: source.source,
        status: 'paid', providerTransactionId: source.providerTransactionId, providerEventId: source.providerEventId,
        deduplicationKey, payloadHash, verifiedBy: { ...actor, action: source.source === 'manual' ? 'manual_payment_verification' : actor.action }, verifiedAt: new Date(),
        agreement: { documentHash: payment.documentHash, signedAt: response.signature.signedAt, signerName: response.signature.signerName || response.name, contractRecordId: contract?.id || null, clientPdfSha256: contract?.clientPdfSha256 || null }
      }, { transaction, logging: false });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') fail(409, 'This payment request or provider transaction has already been verified.');
      throw error;
    }
    return { payment: paymentMetadata(record), ...await updatePaymentState(row, transaction), replayed: false };
  });
}

module.exports = { manualMethods, normalizePayment, providerContext, assertSignedVersion, paymentMetadata, publicPaymentState, paymentList, recordVerifiedPayment };
