const express = require('express');
const { requireAuth, requireRole, roles } = require('../middleware/auth');
const { quotationActivity, quotationActivityCounts, markQuotationActivityRead } = require('../utils/quotation-activity');
const router = express.Router();
router.use(requireAuth, requireRole([roles.ADMIN, roles.SUPERADMIN]));
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

router.get('/counts', async (req, res, next) => {
  try { return res.json(await quotationActivityCounts(req.user.sub)); } catch (error) { return next(error); }
});
router.get('/', async (req, res, next) => {
  try { return res.json(await quotationActivity(req.user.sub)); } catch (error) { return next(error); }
});
router.post('/:id/read', async (req, res, next) => {
  try {
    await markQuotationActivityRead(req.user.sub, req.params.id);
    return res.json({ message: 'Notification marked as read.' });
  } catch (error) { return next(error); }
});
router.post('/read-all', async (req, res, next) => {
  try {
    await markQuotationActivityRead(req.user.sub);
    return res.json({ message: 'Notifications marked as read.' });
  } catch (error) { return next(error); }
});
module.exports = router;
