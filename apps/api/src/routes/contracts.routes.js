const router = require('express').Router();
const multer = require('multer');
const crypto = require('crypto');
const { ContractTemplate, ContractFile } = require('../models');
const { sequelize } = require('../config/database');
const { requireAuth, requireRole, roles } = require('../middleware/auth');
const { normalizeContractStyle } = require('../utils/contract-formatting');
const { contractDefaults, contractFormats } = require('../utils/contract-templates');
const { defaultContractTexts } = require('../utils/quotation-contract');
const { maxPdfBytes, validatePdf, contractSources, getContractFile } = require('../utils/contract-files');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxPdfBytes, files: 1, fields: 0 } });
const validType = (type) => ['project', 'subscription', 'pos', 'sync_court'].includes(type);
async function result(message) { return { templates: await contractDefaults(), formats: await contractFormats(), contracts: await contractSources(), ...(message ? { message } : {}) }; }
router.use(requireAuth, requireRole([roles.ADMIN, roles.SUPERADMIN]));
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.get('/', async (req, res, next) => {
  try { return res.json(await result()); } catch (error) { return next(error); }
});
router.get('/:type/default-pdf', async (req, res, next) => {
  try {
    if (!validType(req.params.type)) return res.status(400).json({ message: 'Invalid contract type.' });
    const terms = (await contractDefaults())[req.params.type];
    if (!terms?.trim()) return res.status(404).json({ message: 'No default contract is saved for this payment type.' });
    const format = (await contractFormats())[req.params.type];
    const pdf = await require('../utils/signed-contract-pdf').renderDefaultContractPdf({ quoteType: req.params.type, contractText: terms, contractStyle: format });
    return res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="Default-Contract-${req.params.type}.pdf"` }).send(pdf);
  } catch (error) { return next(error); }
});
router.get('/files/:id', async (req, res, next) => {
  try {
    const file = await getContractFile({ id: req.params.id }, true);
    return res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="contract.pdf"' }).send(file.data);
  } catch (error) { return next(error); }
});
router.get('/quotations/:id/pdf', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ message: 'Choose a saved quotation.' });
    const row = await require('../models').Quotation.findByPk(req.params.id, { logging: false });
    if (!row || row.document.contractSource !== 'pdf') return res.status(404).json({ message: 'Quotation PDF contract not found.' });
    const file = await getContractFile(row.document.contractPdf, true);
    const bytes = await require('../utils/signed-contract-pdf').renderContractReviewPdf({ bytes: file.data, document: row.document, providerAcceptance: row.contractState?.documentHash === require('../utils/quotation-response').documentHash(row.document) ? row.contractState.providerAcceptance : undefined });
    return res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="contract.pdf"' }).send(bytes);
  } catch (error) { return next(error); }
});
router.post('/signed-copy', async (req, res, next) => {
  try {
    const { quotationId, documentHash } = req.body || {};
    if (!Number.isInteger(Number(quotationId)) || Number(quotationId) < 1 || !/^[a-f0-9]{64}$/.test(documentHash || '')) return res.status(400).json({ message: 'Choose a recorded signed contract.' });
    const { Quotation, QuotationResponseHistory } = require('../models');
    const row = await Quotation.findByPk(quotationId, { paranoid: false, logging: false });
    if (!row) return res.status(404).json({ message: 'Quotation not found.' });
    const history = await QuotationResponseHistory.findOne({ where: { quotationId, documentHash }, logging: false });
    const response = history?.response || (row.clientResponse?.documentHash === documentHash ? row.clientResponse : null);
    if (!response?.signature || !response.document) return res.status(404).json({ message: 'Signed contract snapshot not found.' });
    const reference = `ZO-${new Date(row.createdAt).getUTCFullYear()}-${String(row.id).padStart(5, '0')}`;
    const pdf = await require('../utils/contract-acceptance').signedCopy(row, response, req.body.copy === 'client' ? 'client' : undefined);
    return res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="Signed-Contract-${reference}.pdf"` }).send(pdf);
  } catch (error) { return next(error); }
});
router.post('/:type/pdf', (req, res, next) => {
  if (!validType(req.params.type)) return res.status(400).json({ message: 'Invalid contract type.' });
  return upload.single('file')(req, res, async (error) => {
    if (error) return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'PDF contracts must be 2 MB or smaller.' : 'Upload one PDF file.' });
    try {
      const pdf = await validatePdf(req.file);
      await sequelize.transaction({ logging: false }, async (transaction) => {
        const file = await ContractFile.create({ id: crypto.randomUUID(), quoteType: req.params.type, ...pdf }, { transaction, logging: false });
        const [template] = await ContractTemplate.findOrCreate({ where: { quoteType: req.params.type }, defaults: { terms: defaultContractTexts[req.params.type] || '' }, transaction, logging: false });
        // Change only the selected source. The administrator's existing default text and style remain intact.
        await template.update({ pdfId: file.id, source: 'pdf' }, { transaction, logging: false });
      });
      return res.status(201).json(await result('PDF uploaded and selected for new quotations. Your default contract has been kept.'));
    } catch (failure) { return next(failure); }
  });
});
router.put('/:type', async (req, res, next) => {
  try {
    if (!validType(req.params.type)) return res.status(400).json({ message: 'Invalid contract type.' });
    const existing = await ContractTemplate.findByPk(req.params.type, { logging: false });
    const source = req.body?.source || existing?.source || 'default';
    if (!['default','pdf'].includes(source)) return res.status(400).json({ message: 'Choose Default Contract or Uploaded PDF.' });
    const terms = req.body?.terms ?? existing?.terms ?? defaultContractTexts[req.params.type] ?? '';
    if (typeof terms !== 'string' || terms.trim().length > 30000 || (!terms.trim() && source === 'default')) return res.status(400).json({ message: 'Enter contract terms of up to 30,000 characters.' });
    if (source === 'pdf') {
      if (!existing?.pdfId) return res.status(400).json({ message: 'Upload a PDF contract first.' });
      await getContractFile({ id: existing.pdfId });
    }
    const format = req.body?.terms !== undefined || Object.hasOwn(req.body || {}, 'format') ? normalizeContractStyle(req.body.format) || null : existing?.format || null;
    await ContractTemplate.upsert({ quoteType: req.params.type, terms: terms.trim(), format, source, pdfId: existing?.pdfId || null }, { logging: false });
    return res.json(await result('Contract saved. Existing quotations keep their assigned contract version.'));
  } catch (error) { return next(error); }
});
module.exports = router;
