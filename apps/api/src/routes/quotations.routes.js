const { defaultPaymentInstructions } = require('../utils/quotation-payment');
const { contractSources } = require('../utils/contract-files');
const express = require('express');
const crypto = require('crypto');
const { Op, literal, where } = require('sequelize');
const { Quotation, QuotationVerification, QuotationResponseHistory, QuotationNotification } = require('../models');
const { documentHash } = require('../utils/quotation-response');
const { sequelize } = require('../config/database');
const { responseHistory } = require('../utils/quotation-history');
const { requestDeletion, confirmDeletion } = require('../utils/quotation-deletion');
const { sendGraphMail } = require('../utils/quotation-verification-mail');
const { queueNotificationDelivery } = require('../utils/quotation-notifications');
const { prepareQuotation, contractDefaults, contractFormats } = require('../utils/contract-templates');
const { requireAuth, requireRole, roles } = require('../middleware/auth');
const { quotationExpired } = require('../utils/quotation-sharing');
const { serializeQuotation } = require('../utils/serialize-quotation');
const router = express.Router();

router.use(requireAuth, requireRole([roles.ADMIN, roles.SUPERADMIN]));
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

router.post('/bulk-delete-verification', async (req, res, next) => {
  try {
    if (!Array.isArray(req.body?.ids)) return res.status(400).json({ message: 'Select the quotations to delete.' });
    return res.json(await requestDeletion(req.body.ids, req.user.sub, sendGraphMail));
  } catch (error) { return next(error); }
});

router.post('/bulk-delete', async (req, res, next) => {
  try {
    if (!Array.isArray(req.body?.ids)) return res.status(400).json({ message: 'Select the quotations to delete.' });
    const result = await confirmDeletion(req.body.ids, req.user.sub, req.body.challengeId, req.body.code, req.user.email);
    queueNotificationDelivery();
    return res.json(result);
  } catch (error) { return next(error); }
});

router.post('/:id/delete-verification', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ message: 'Invalid quotation ID.' });
    return res.json(await requestDeletion(req.params.id, req.user.sub, sendGraphMail));
  } catch (error) { return next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ message: 'Invalid quotation ID.' });
    const result = await confirmDeletion(req.params.id, req.user.sub, req.body?.challengeId, req.body?.code, req.user.email);
    queueNotificationDelivery();
    return res.json(result);
  } catch (error) { return next(error); }
});

function serialize(row) {
  return serializeQuotation(row, true);
}

router.post('/:id/share', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ message: 'Invalid quotation ID.' });
    const result = await sequelize.transaction({ logging: false }, async transaction => {
      const row = await Quotation.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!row) return { status: 404, message: 'Quotation not found.' };
      if (quotationExpired(row.document)) return { status: 400, message: 'Update and save the validity date before sharing this expired quotation.' };
      if (row.clientResponse?.action === 'requote' && row.clientResponse.documentHash === documentHash(row.document)) return { status: 409, message: 'Edit and save the requested quotation changes before generating a new client link.' };
      if (!row.shareToken) await row.update({ shareToken: crypto.randomBytes(32).toString('hex') }, { transaction });
      return { status: 200, quotation: serialize(row) };
    });
    return res.status(result.status).json(result.quotation ? { quotation: result.quotation } : { message: result.message });
  } catch (error) { return next(error); }
});

router.delete('/:id/share', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ message: 'Invalid quotation ID.' });
    const row = await Quotation.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Quotation not found.' });
    await row.update({ shareToken: null });
    await QuotationVerification.destroy({ where: { quotationId: row.id, consumedAt: null } });
    return res.json({ quotation: serialize(row) });
  } catch (error) { return next(error); }
});

router.get('/', async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    if (!Number.isInteger(page) || page < 1 || page > 1000000) return res.status(400).json({ message: 'Invalid page number.' });
    const search = String(req.query.search || '').trim().slice(0, 180);
    let filter;
    if (search) {
      const pattern = `%${search.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
      const matches = ['title', 'clientName', 'clientEmail'].map((field) =>
        // Paths come exclusively from this fixed field list, never from user input.
        where(literal(`LOWER(JSON_UNQUOTE(JSON_EXTRACT(\`document\`, '$.${field}')))`), { [Op.like]: pattern }));
      const reference = search.match(/^(?:ZO-\d{4}-)?(\d+)$/i);
      if (reference) matches.push({ id: Number(reference[1]) });
      filter = { [Op.or]: matches };
    }
    const { rows, count } = await Quotation.findAndCountAll({ where: filter, order: [['id', 'DESC']], limit: 20, offset: (page - 1) * 20 });
    const defaultContractTexts = await contractDefaults();
    res.json({ quotations: rows.map(serialize), total: count, page, pageSize: 20, defaultPaymentInstructions, defaultContractText: defaultContractTexts.project, defaultContractTexts, defaultContractFormats: await contractFormats(), defaultContracts: await contractSources() });
  } catch (error) { next(error); }
});

router.get('/:id/payment-proofs', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ message: 'Invalid quotation ID.' });
    if (!await Quotation.findByPk(req.params.id)) return res.status(404).json({ message: 'Quotation not found.' });
    const proofs = await require('../models').QuotationPaymentProof.findAll({ where: { quotationId: req.params.id }, attributes: { exclude: ['data'] }, order: [['createdAt', 'DESC']], logging: false });
    return res.json({ proofs: proofs.map(require('../utils/payment-proof').proofMetadata) });
  } catch (error) { return next(error); }
});
router.get('/:id/payment-proofs/:proofId', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id) || !require('../utils/payment-proof').uuid(req.params.proofId)) return res.status(400).json({ message: 'Invalid payment proof.' });
    if (!await Quotation.findByPk(req.params.id)) return res.status(404).json({ message: 'Quotation not found.' });
    const proof = await require('../models').QuotationPaymentProof.findOne({ where: { id: req.params.proofId, quotationId: req.params.id }, logging: false });
    if (!proof) return res.status(404).json({ message: 'Payment proof not found.' });
    if (crypto.createHash('sha256').update(proof.data).digest('hex') !== proof.sha256) throw new Error('Payment proof integrity check failed.');
    return res.set({ 'Content-Type': proof.mimeType, 'Content-Disposition': `attachment; filename="${proof.fileName}"`, 'X-Content-Type-Options': 'nosniff' }).send(proof.data);
  } catch (error) { return next(error); }
});

router.get('/:id/history', async (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ message: 'Invalid quotation ID.' });
    const row = await Quotation.findByPk(req.params.id, { logging: false });
    if (!row) return res.status(404).json({ message: 'Quotation not found.' });
    const records = await QuotationResponseHistory.findAll({ where: { quotationId: row.id }, logging: false });
    return res.json({ history: responseHistory(row, records) });
  } catch (error) { return next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ message: 'Invalid quotation ID.' });
    const row = await Quotation.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Quotation not found.' });
    return res.json({ quotation: serialize(row) });
  } catch (error) { return next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const row = await Quotation.create({
      document: await prepareQuotation(req.body?.document),
      shareToken: crypto.randomBytes(32).toString('hex')
    });
    res.status(201).json({ quotation: serialize(row) });
  } catch (error) { next(error); }
});

router.put('/:id', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ message: 'Invalid quotation ID.' });
    const document = await prepareQuotation(req.body?.document);
    const result = await sequelize.transaction({ logging: false }, async transaction => {
      const row = await Quotation.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!row) return { status: 404, message: 'Quotation not found.' };
      const needsRevision = row.clientResponse?.action === 'requote' && row.clientResponse.documentHash === documentHash(row.document);
      const notifyRevision = row.clientResponse?.action === 'requote' && documentHash(row.document) !== documentHash(document);
      await row.update({ document, ...(needsRevision ? { shareToken: null } : {}) }, { transaction });
      if (notifyRevision) await QuotationNotification.create({ id: crypto.randomUUID(), quotationId: row.id, payload: {
        action: 'requote_updated', reference: serialize(row).reference, document,
        clientName: row.clientResponse.name, clientEmail: row.clientResponse.email, note: row.clientResponse.note,
        updatedBy: req.user.email || 'Administrator', updatedAt: new Date().toISOString(), documentVersion: documentHash(document)
      } }, { transaction, logging: false });
      return { status: 200, quotation: serialize(row), notifyRevision };

    });
    if (result.notifyRevision) queueNotificationDelivery();
    return res.status(result.status).json(result.quotation ? { quotation: result.quotation } : { message: result.message });
  } catch (error) { return next(error); }
});

module.exports = router;
