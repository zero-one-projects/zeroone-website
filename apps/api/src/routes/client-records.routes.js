const router = require('express').Router();
const { Op } = require('sequelize');
const { Quotation, BillingStatement, Client } = require('../models');
const { requireAuth, requireRole, roles } = require('../middleware/auth');
const { clientRecords, clientId } = require('../utils/client-records');
const { serializeBill } = require('../utils/billing');
router.use(requireAuth, requireRole([roles.ADMIN, roles.SUPERADMIN]));
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
async function records(req) {
  const type = req.query.type || 'subscription';
  if (!['subscription', 'project'].includes(type)) throw Object.assign(new Error('Choose Custom Subscriptions or Custom One-time Payment.'), { statusCode: 400 });
  const rows = await Quotation.findAll({ order: [['updatedAt', 'DESC'], ['id', 'DESC']], logging: false });
  const clients = await Client.findAll({ where: { type }, order: [['createdAt', 'DESC']], logging: false });
  const status = req.query.status || 'all';
  if (!['all', 'active', 'inactive'].includes(status)) throw Object.assign(new Error('Choose All, Active, or Inactive clients.'), { statusCode: 400 });
  return clientRecords(rows, type, String(req.query.search || '').slice(0, 180), clients).filter(client => status === 'all' || client.isActive === (status === 'active'));
}
router.post('/', async (req, res, next) => {
  try {
    const type = req.body?.type;
    if (!['subscription', 'project'].includes(type)) return res.status(400).json({ message: 'Choose Custom Subscriptions or Custom One-time Payment.' });
    const details = {};
    for (const [key, max] of [['clientName', 180], ['clientEmail', 180], ['contactPerson', 180], ['clientAddress', 2000]]) {
      if (req.body[key] != null && typeof req.body[key] !== 'string') return res.status(400).json({ message: 'Client details must be text.' });
      details[key] = (req.body[key] || '').trim();
      if (details[key].length > max) return res.status(400).json({ message: `${key} exceeds ${max} characters.` });
    }
    if (req.body.isActive !== undefined && typeof req.body.isActive !== 'boolean') return res.status(400).json({ message: 'Client status must be Active or Inactive.' });
    details.isActive = req.body.isActive ?? true;
    details.clientEmail = details.clientEmail.toLowerCase();
    if (!details.clientName || !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(details.clientEmail)) return res.status(400).json({ message: 'Enter a client name and valid email address.' });
    const id = clientId(type, details.clientName, details.clientEmail);
    const existing = await records({ query: { type } });
    if (existing.some(client => client.id === id)) return res.status(409).json({ message: 'This client already exists for the selected payment type.' });
    const [client, created] = await Client.findOrCreate({ where: { id }, defaults: { type, ...details }, logging: false });
    if (!created) return res.status(409).json({ message: 'This client already exists for the selected payment type.' });
    return res.status(201).json({ client, message: 'Client added successfully.' });
  } catch (error) { return next(error); }
});
router.get('/', async (req, res, next) => {
  try {
    const groups = await records(req);
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    return res.json({ clients: groups.slice((page - 1) * 20, page * 20).map(({ quotations, ...group }) => ({ ...group, quotationCount: quotations.length, acceptedCount: quotations.filter(q => q.response?.current && q.response.action === 'accept').length, signedCount: quotations.filter(q => q.response?.current && q.response.signedAt).length, latestProject: quotations[0]?.title })), total: groups.length, page });
  } catch (error) { return next(error); }
});
router.patch('/:id/status', async (req, res, next) => {
  try {
    if (!/^[a-f0-9]{64}$/.test(req.params.id)) return res.status(404).json({ message: 'Client record not found.' });
    if (typeof req.body?.isActive !== 'boolean') return res.status(400).json({ message: 'Choose Active or Inactive.' });
    const type = req.body?.type;
    if (!['subscription', 'project'].includes(type)) return res.status(400).json({ message: 'Choose a valid client payment type.' });
    const group = (await records({ query: { type } })).find(row => row.id === req.params.id);
    if (!group) return res.status(404).json({ message: 'Client record not found.' });
    const [client] = await Client.findOrCreate({ where: { id: group.id }, defaults: { type, clientName: group.clientName, clientEmail: group.clientEmail, contactPerson: group.contactPerson, clientAddress: group.clientAddress, isActive: req.body.isActive }, logging: false });
    await client.update({ isActive: req.body.isActive }, { logging: false });
    return res.json({ client: { ...group, isActive: client.isActive }, message: `Client marked ${client.isActive ? 'Active' : 'Inactive'}.` });
  } catch (error) { return next(error); }
});
router.get('/:id', async (req, res, next) => {
  try {
    if (!/^[a-f0-9]{64}$/.test(req.params.id)) return res.status(404).json({ message: 'Client record not found.' });
    const group = (await records(req)).find(row => row.id === req.params.id);
    if (!group) return res.status(404).json({ message: 'Client record not found.' });
    const bills = group.type === 'subscription' && group.quotations.length ? await BillingStatement.findAll({ where: { quotationId: { [Op.in]: group.quotations.map(q => q.id) } }, order: [['id', 'DESC']], logging: false }) : [];
    return res.json({ client: group, statements: bills.map(serializeBill) });
  } catch (error) { return next(error); }
});
module.exports = router;
