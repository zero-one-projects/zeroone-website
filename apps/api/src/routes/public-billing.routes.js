const router = require('express').Router();
const { BillingStatement } = require('../models');
const { serializeBill } = require('../utils/billing');
const { renderBillingPdf } = require('../utils/billing-pdf');
router.get('/:token', async (req, res, next) => {
  res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow, noarchive' });
  try {
    if (!/^[a-f0-9]{64}$/.test(req.params.token)) return res.status(404).json({ message: 'Billing link not found or disabled.' });
    const row = await BillingStatement.findOne({ where: { shareToken: req.params.token }, logging: false });
    if (!row) return res.status(404).json({ message: 'Billing link not found or disabled.' });
    const bill = serializeBill(row);
    return res.json({ reference: bill.reference, paymentInstructions: bill.document.paymentInstructions });
  } catch (error) { return next(error); }
});
router.get('/:token/pdf', async (req, res, next) => {
  res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow, noarchive' });
  try {
    if (!/^[a-f0-9]{64}$/.test(req.params.token)) return res.status(404).json({ message: 'Billing link not found or disabled.' });
    const row = await BillingStatement.findOne({ where: { shareToken: req.params.token }, logging: false });
    if (!row) return res.status(404).json({ message: 'Billing link not found or disabled.' });
    const bill = serializeBill(row);
    return res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${bill.reference}.pdf"` }).send(await renderBillingPdf(bill));
  } catch (error) { return next(error); }
});
module.exports = router;
