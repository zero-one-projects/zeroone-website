const { defaultPaymentInstructions } = require('../utils/quotation-payment');
const { contractSources } = require('../utils/contract-files');
const express = require('express');
const crypto = require('crypto');
const { Op, literal, where } = require('sequelize');
const { Quotation, QuotationVerification, QuotationResponseHistory } = require('../models');
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
    const row = await Quotation.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Quotation not found.' });
    if (quotationExpired(row.document)) return res.status(400).json({ message: 'Update and save the validity date before sharing this expired quotation.' });
    if (!row.shareToken) {
      await Quotation.update({ shareToken: crypto.randomBytes(32).toString('hex') }, { where: { id: row.id, shareToken: null } });
      await row.reload();
    }
    return res.json({ quotation: serialize(row) });
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
    const row = await Quotation.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Quotation not found.' });
    await row.update({ document });
    return res.json({ quotation: serialize(row) });
  } catch (error) { return next(error); }
});

module.exports = router;
