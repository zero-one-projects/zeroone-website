const express = require('express');
const { Quotation } = require('../models');
const { requireAuth, requireRole, roles } = require('../middleware/auth');
const { authorizedActor } = require('../utils/contract-acceptance');
const { recordVerifiedPayment, paymentList } = require('../utils/payment-verification');

const router = express.Router();
router.use(requireAuth, requireRole([roles.ADMIN, roles.SUPERADMIN]));
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

router.get('/:id/payments', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ message: 'Choose a saved quotation.' });
    await authorizedActor(req);
    const row = await Quotation.findByPk(req.params.id, { logging: false });
    if (!row) return res.status(404).json({ message: 'Quotation not found.' });
    return res.json(await paymentList(row));
  } catch (error) { return next(error); }
});

router.post('/:id/verify-payment', async (req, res, next) => {
  try {
    // The source and actor come from the authenticated route, never req.body.
    const result = await recordVerifiedPayment({ quotationId: req.params.id, input: req.body, context: { source: 'manual', request: req } });
    return res.status(result.replayed ? 200 : 201).json(result);
  } catch (error) { return next(error); }
});

module.exports = router;
