const { Op } = require('sequelize');
const { QuotationNotification } = require('../models');
const { sendQuotationResponseNotification } = require('./quotation-verification-mail');

let processing = false;

async function processQuotationNotifications({ send = sendQuotationResponseNotification, now = new Date() } = {}) {
  if (processing) return;
  processing = true;
  try {
    // Recover work interrupted by a server restart or crash.
    await QuotationNotification.update({ status: 'pending', lockedAt: null }, {
      where: { status: 'sending', lockedAt: { [Op.lt]: new Date(now.getTime() - 5 * 60 * 1000) } }, logging: false
    });
    const rows = await QuotationNotification.findAll({
      where: { status: 'pending', nextAttemptAt: { [Op.lte]: now } }, order: [['createdAt', 'ASC']], limit: 10, logging: false
    });
    for (const row of rows) {
      const attempt = row.attempts + 1;
      const [claimed] = await QuotationNotification.update({ status: 'sending', lockedAt: now, attempts: attempt }, {
        where: { id: row.id, status: 'pending', nextAttemptAt: { [Op.lte]: now } }, logging: false
      });
      if (!claimed) continue;
      // Refresh the instance after the atomic claim so retry updates persist.
      await row.reload({ logging: false });
      try {
        await send(row.payload);
        await row.update({ status: 'sent', lockedAt: null, attempts: attempt, sentAt: new Date(), lastError: null }, { logging: false });
      } catch (error) {
        const delay = Math.min(60 * 60 * 1000, 30000 * 2 ** Math.min(attempt - 1, 7));
        await row.update({ status: 'pending', lockedAt: null, attempts: attempt,
          nextAttemptAt: new Date(now.getTime() + delay), lastError: String(error.message || 'Email delivery failed').slice(0, 500)
        }, { logging: false });
        console.warn(`Quotation response notification ${row.id} queued for retry.`);
      }
    }
  } finally { processing = false; }
}

function queueNotificationDelivery() {
  processQuotationNotifications().catch(() => console.warn('Quotation notification delivery is temporarily unavailable.'));
}

function startQuotationNotificationWorker() {
  queueNotificationDelivery();
  const timer = setInterval(queueNotificationDelivery, 30000);
  timer.unref();
  return () => clearInterval(timer);
}

module.exports = { processQuotationNotifications, queueNotificationDelivery, startQuotationNotificationWorker };
