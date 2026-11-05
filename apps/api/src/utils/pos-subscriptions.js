const { Quotation, PosSubscription } = require('../models');
const { documentHash } = require('./quotation-response');
const { latestRate, fail } = require('./pos-upgrade');
const day = value => new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
const reference = row => `ZO-${new Date(row.createdAt).getUTCFullYear()}-${String(row.id).padStart(5, '0')}`;
function baseline(row) {
  const response = row?.clientResponse;
  const document = response?.document || row?.document;
  if (document?.acceptancePolicy && row.contractState?.status !== 'finalized') fail('ZeroOne confirmation is required before activating this POS subscription.');
  if (!row || response?.action !== 'accept' || !response.signature?.signedAt || response.documentHash !== documentHash(row.document) || document?.quoteType !== 'pos' || (document.billingPeriod || 'monthly') !== 'monthly' || ['upgrade', 'customization'].includes(document.posPurpose) || !document.hasRecurring || document.recurringTotal <= 0) fail('Select an existing signed monthly POS subscription.');
  const savedDate = document.contractDetails?.effectiveDate;
  const effectiveOn = /^\d{4}-\d{2}-\d{2}$/.test(savedDate || '') && Number.isFinite(Date.parse(savedDate)) && new Date(savedDate).toISOString().slice(0, 10) === savedDate ? savedDate : day(response.signature.signedAt);
  return { sequence: 0, kind: 'new', quotationId: row.id, reference: reference(row), documentHash: response.documentHash, signedAt: response.signature.signedAt, effectiveOn, document, signature: response.signature };
}
async function loadSubscription(id, transaction, lock = false) {
  const options = { transaction, logging: false, ...(lock ? { lock: transaction.LOCK.UPDATE } : {}) };
  // The original quotation is the stable lock for every upgrade and billing operation.
  const root = await Quotation.findByPk(id, { ...options, paranoid: false });
  const saved = await PosSubscription.findByPk(id, options);
  if (!root) fail('The original POS subscription is unavailable.');
  if (root.deletedAt && !saved) fail('The original POS subscription is unavailable.');
  return { root, saved, revisions: saved?.revisions || [baseline(root)] };
}
function validateUpgrade(document, revisions) {
  const current = latestRate(revisions);
  const source = current.document;
  const normalize = value => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  if (normalize(source.clientName) !== normalize(document.clientName) || normalize(source.clientEmail) !== normalize(document.clientEmail) || source.currency !== document.currency) fail('Use the existing subscription client name, email, and currency.');
  if (document.posPurpose === 'upgrade') {
    if (document.contractDetails.effectiveDate < current.effectiveOn) fail('The upgrade effective date cannot precede the latest agreed rate.');
    if (Math.round(Number(document.monthlySubscription.currentAmount) * 100) !== Math.round(Number(source.recurringSubtotal) * 100) || Number(source.taxRate || 0) !== Number(document.taxRate || 0)) fail('The subscription rate has changed. Reload the existing subscription and review the upgrade before signing.');
  }
}
async function validateLinkedSubscription(document, transaction, ownId) {
  if (document.quoteType !== 'pos' || !document.baseQuotationId) return;
  if (Number(ownId) === document.baseQuotationId) fail('An upgrade must be a separate quotation linked to the original subscription.');
  const subscription = await loadSubscription(document.baseQuotationId, transaction);
  validateUpgrade(document, subscription.revisions);
  return reference(subscription.root);
}
async function recordSignedPos(row, response, transaction) {
  const document = response.document || row.document;
  if (document.quoteType !== 'pos' || !document.posPurpose) return;
  if (response.action !== 'accept' || !response.signature?.signedAt || response.documentHash !== documentHash(document)) fail('A verified signed quotation snapshot is required to change a POS subscription.');
  const id = document.baseQuotationId || row.id;
  if (document.posPurpose === 'new' && (document.billingPeriod !== 'monthly' || !document.hasRecurring || document.recurringTotal <= 0)) return;
  let saved, revisions;
  if (document.posPurpose === 'new') {
    saved = await PosSubscription.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE, logging: false });
    // Signing an edited original must never overwrite an already active subscription.
    if (saved) fail('This subscription is already active. Create a separate upgrade quotation.');
    revisions = [];
  } else {
    ({ saved, revisions } = await loadSubscription(id, transaction, true));
    validateUpgrade(document, revisions);
  }
  if (revisions.some(event => event.quotationId === row.id && event.documentHash === response.documentHash)) return;
  const event = { sequence: revisions.length, kind: document.posPurpose, quotationId: row.id, reference: reference(row), documentHash: response.documentHash, signedAt: response.signature.signedAt,
    effectiveOn: document.contractDetails?.effectiveDate || day(response.signature.signedAt), document, signature: response.signature };
  const next = [...revisions, event];
  if (saved) await saved.update({ revisions: next }, { transaction, logging: false });
  else await PosSubscription.create({ quotationId: id, revisions: next }, { transaction, logging: false });
}
function summarize(root, revisions) {
  const latest = latestRate(revisions);
  const active = latestRate(revisions, day(new Date()));
  const d = latest.document;
  return { id: root.id, quoteType: 'pos', reference: reference(root), clientName: d.clientName, clientEmail: d.clientEmail, clientAddress: d.clientAddress, title: d.title, currency: d.currency, taxRate: d.taxRate || 0,
    currentAmount: d.recurringSubtotal, recurringTotal: active?.document.recurringTotal || 0, latestRecurringTotal: d.recurringTotal, effectiveOn: latest.effectiveOn,
    rateHistory: revisions.map(event => ({ quotationId: event.quotationId, reference: event.reference, documentHash: event.documentHash, kind: event.kind, effectiveOn: event.effectiveOn, signedAt: event.signedAt, recurringTotal: event.kind === 'customization' ? null : event.document.recurringTotal })) };
}
async function listPosSubscriptions() {
  const saved = await PosSubscription.findAll({ logging: false });
  const roots = await Quotation.findAll({ order: [['id', 'DESC']], logging: false, paranoid: false });
  const result = [];
  for (const root of roots) {
    const record = saved.find(value => value.quotationId === root.id);
    if (record) result.push(summarize(root, record.revisions));
    else if (!root.deletedAt) { try { result.push(summarize(root, [baseline(root)])); } catch { /* Unaccepted quotes are not active subscriptions. */ } }
  }
  return result;
}
function billingSource(revisions, input) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input?.period) || !/^\d{4}-\d{2}-\d{2}$/.test(input?.issuedOn) || !Number.isFinite(Date.parse(`${input.period}-01`))) fail('Choose a valid billing month and issue date.');
  const monthEnd = new Date(`${input.period}-01T00:00:00Z`);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1, 0);
  const cutoff = [input.issuedOn, `${input.period}-01`].sort().at(-1);
  const on = cutoff < monthEnd.toISOString().slice(0, 10) ? cutoff : monthEnd.toISOString().slice(0, 10);
  const event = latestRate(revisions, on);
  if (!event) fail('No signed POS rate is effective for this billing month.');
  return event;
}
module.exports = { baseline, validateUpgrade, validateLinkedSubscription, recordSignedPos, loadSubscription, listPosSubscriptions, billingSource };
