const router = require('express').Router();
const { Op } = require('sequelize');
const { BillingStatement, Quotation } = require('../models');
const { sequelize } = require('../config/database');
const { requireAuth, requireRole, roles } = require('../middleware/auth');
const { subscriptionDocument, createBillingDocument, createManualBillingDocument, serializeBill } = require('../utils/billing');
const { renderBillingPdf } = require('../utils/billing-pdf');
router.use(requireAuth, requireRole([roles.ADMIN, roles.SUPERADMIN]));
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.post('/delete-verification', async (req, res, next) => {
  try { return res.json(await require('../utils/billing-deletion').requestBillingDeletion(req.body?.ids, req.user.sub)); }
  catch (error) { return next(error); }
});
router.post('/delete', async (req, res, next) => {
  try { return res.json(await require('../utils/billing-deletion').confirmBillingDeletion(req.body?.ids, req.user.sub, req.body?.challengeId, req.body?.code)); }
  catch (error) { return next(error); }
});
router.get('/subscriptions', async (req, res, next) => {
  try {
    const rows = await Quotation.findAll({ order: [['id', 'DESC']], logging: false });
    const subscriptions = [];
    for (const row of rows) {
      let document; try { document = subscriptionDocument(row); } catch { continue; }
      const previous = await BillingStatement.findOne({ where: { quotationId: row.id }, order: [['period', 'DESC']], logging: false });
      subscriptions.push({ id: row.id, reference: `ZO-${new Date(row.createdAt).getUTCFullYear()}-${String(row.id).padStart(5, '0')}`, clientName: document.clientName, clientEmail: document.clientEmail, title: document.title, currency: document.currency, recurringTotal: document.recurringTotal, goLiveOn: previous?.document.goLiveOn || '', lastBilledPeriod: previous?.period || '' });
    }
    return res.json({ subscriptions });
  } catch (error) { return next(error); }
});
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const search = String(req.query.search || '').trim().slice(0, 180);
    const where = search ? { [Op.or]: [{ 'document.clientName': { [Op.like]: `%${search}%` } }, { period: { [Op.like]: `%${search}%` } }, { 'document.title': { [Op.like]: `%${search}%` } }] } : {};
    const { rows, count } = await BillingStatement.findAndCountAll({ where, order: [['id', 'DESC']], limit: 20, offset: (page - 1) * 20, logging: false });
    return res.json({ statements: rows.map(serializeBill), total: count, page });
  } catch (error) { return next(error); }
});
router.post('/', async (req, res, next) => {
  try {
    if (req.body?.kind === 'manual') {
      const row = await BillingStatement.create({ quotationId: null, period: req.body.period || req.body.issuedOn?.slice(0, 7), document: createManualBillingDocument(req.body) }, { logging: false });
      return res.status(201).json({ statement: serializeBill(row), message: 'Manual billing statement saved. Preview the PDF or create a client link.' });
    }
    if (!Number.isSafeInteger(Number(req.body?.quotationId)) || Number(req.body.quotationId) < 1) return res.status(400).json({ message: 'Select a subscription.' });
    const row = await sequelize.transaction({ logging: false }, async transaction => {
      const quotation = await Quotation.findByPk(req.body.quotationId, { transaction, lock: transaction.LOCK.UPDATE, logging: false });
      if (!quotation) throw Object.assign(new Error('Subscription quotation not found.'), { statusCode: 404 });
      const document = createBillingDocument(quotation, req.body);
      const previous = await BillingStatement.findOne({ where: { quotationId: quotation.id }, transaction, logging: false });
      if (previous && previous.document.goLiveOn !== document.goLiveOn) throw Object.assign(new Error('Use the system go-live date recorded on the first billing statement.'), { statusCode: 400 });
      return BillingStatement.create({ quotationId: quotation.id, period: document.period, document }, { transaction, logging: false });
    });
    return res.status(201).json({ statement: serializeBill(row), message: 'Billing statement saved. Download the PDF to send it to your client.' });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ message: 'A bill already exists for this subscription and month. Download it from the saved billing list.' });
    return next(error);
  }
});
router.post('/:id/share', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ message: 'Choose a saved billing statement.' });
    const bill = await sequelize.transaction({ logging: false }, async transaction => {
      const row = await BillingStatement.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE, logging: false });
      if (!row) throw Object.assign(new Error('Billing statement not found.'), { statusCode: 404 });
      if (!row.shareToken) await row.update({ shareToken: require('crypto').randomBytes(32).toString('hex') }, { transaction, logging: false });
      return serializeBill(row);
    });
    return res.json({ statement: bill });
  } catch (error) { return next(error); }
});
router.delete('/:id/share', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ message: 'Choose a saved billing statement.' });
    const row = await BillingStatement.findByPk(req.params.id, { logging: false });
    if (!row) return res.status(404).json({ message: 'Billing statement not found.' });
    await row.update({ shareToken: null }, { logging: false });
    return res.json({ statement: serializeBill(row), message: 'Client link disabled.' });
  } catch (error) { return next(error); }
});
router.post('/:id/send', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ message: 'Choose a saved billing statement.' });
    const recipient = typeof req.body?.recipient === 'string' ? req.body.recipient.trim() : '';
    if (recipient.length > 180 || !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(recipient)) return res.status(400).json({ message: 'Enter one valid client email address.' });
    const cc = req.body?.cc;
    require('../utils/billing-email').billingCcRecipients(cc, recipient);
    const note = req.body?.note || '';
    if (typeof note !== 'string' || note.length > 5000) return res.status(400).json({ message: 'Your message must be up to 5,000 characters.' });
    // Commit a stable client link before calling the mail service.
    await sequelize.transaction({ logging: false }, async transaction => {
      const row = await BillingStatement.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE, logging: false });
      if (!row) throw Object.assign(new Error('Billing statement not found.'), { statusCode: 404 });
      if (!row.shareToken) await row.update({ shareToken: require('crypto').randomBytes(32).toString('hex') }, { transaction, logging: false });
    });
    const result = await sequelize.transaction({ logging: false }, async transaction => {
      const row = await BillingStatement.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE, logging: false });
      if (!row) throw Object.assign(new Error('Billing statement not found.'), { statusCode: 404 });
      const sentAt = row.emailSentAt ? new Date(row.emailSentAt).toISOString() : null;
      if ((req.body.previousSentAt || null) !== sentAt) throw Object.assign(new Error('This statement was already submitted for email. Reopen Send to Client to review and send again.'), { statusCode: 409 });
      const delivery = await require('../utils/billing-email').sendBillingEmail({ bill: serializeBill(row), recipient, note: note.trim(), cc });
      await row.update({ emailSentAt: new Date(Math.max(Date.now(), (row.emailSentAt ? new Date(row.emailSentAt).getTime() : 0) + 1)), emailSentTo: recipient }, { transaction, logging: false });
      return { statement: serializeBill(row), ...delivery };
    });
    return res.json({ ...result, message: `Billing statement submitted to Microsoft 365 for ${recipient} from billing@zerooneitinc.com.` });
  } catch (error) { return next(error); }
});
router.get('/:id/pdf', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ message: 'Choose a saved billing statement.' });
    const row = await BillingStatement.findByPk(req.params.id, { logging: false });
    if (!row) return res.status(404).json({ message: 'Billing statement not found.' });
    const bill = serializeBill(row), pdf = await renderBillingPdf(bill);
    return res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${bill.reference}.pdf"` }).send(pdf);
  } catch (error) { return next(error); }
});
module.exports = router;
