const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Response history is committed with acceptance/requote, independently of email delivery.
// Keep read receipts separate for each administrator and preserve events across revisions.
const source = `FROM quotation_response_history h
  JOIN quotations q ON q.id = h.quotation_id AND q.deleted_at IS NULL
  LEFT JOIN quotation_notification_reads r ON r.history_id = h.id AND r.user_id = :userId
  WHERE JSON_UNQUOTE(JSON_EXTRACT(h.response, '$.action')) IN ('accept', 'requote')`;

function positiveId(value) {
  return /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
}

async function quotationActivity(userId) {
  const replacements = { userId };
  const rows = await sequelize.query(`SELECT h.id, h.quotation_id AS quotationId,
    CONCAT('ZO-', YEAR(q.created_at), '-', LPAD(q.id, GREATEST(5, CHAR_LENGTH(q.id)), '0')) AS reference,
    JSON_UNQUOTE(JSON_EXTRACT(h.response, '$.action')) AS action,
    JSON_UNQUOTE(JSON_EXTRACT(h.response, '$.document.title')) AS title,
    JSON_UNQUOTE(JSON_EXTRACT(h.response, '$.document.clientName')) AS clientName,
    JSON_UNQUOTE(JSON_EXTRACT(h.response, '$.note')) AS note,
    JSON_UNQUOTE(JSON_EXTRACT(h.response, '$.respondedAt')) AS respondedAt,
    r.id IS NOT NULL AS isRead ${source} ORDER BY h.id DESC LIMIT 50`, { replacements, type: QueryTypes.SELECT, logging: false });
  const [count] = await sequelize.query(`SELECT COUNT(*) AS unreadCount ${source} AND r.id IS NULL`, { replacements, type: QueryTypes.SELECT, logging: false });
  return { notifications: rows.map(row => ({ ...row, isRead: Boolean(Number(row.isRead)), href: `/admin/quotations?id=${row.quotationId}` })), unreadCount: Number(count.unreadCount) };
}

async function quotationActivityCounts(userId) {
  const rows = await sequelize.query(`SELECT h.quotation_id AS quotationId,
    COUNT(*) AS unreadCount
    ${source} AND r.id IS NULL GROUP BY h.quotation_id`, { replacements: { userId }, type: QueryTypes.SELECT, logging: false });
  return { unreadCount: rows.reduce((sum, row) => sum + Number(row.unreadCount), 0),
    quotations: Object.fromEntries(rows.map(row => [row.quotationId, Number(row.unreadCount)])) };
}

async function markQuotationActivityRead(userId, historyId) {
  if (historyId !== undefined && !positiveId(historyId)) throw Object.assign(new Error('Invalid notification ID.'), { statusCode: 400 });
  // The SELECT limits writes to actual, visible quotation response events.
  await sequelize.query(`INSERT IGNORE INTO quotation_notification_reads (user_id, history_id, created_at, updated_at)
    SELECT :userId, h.id, NOW(), NOW() ${source} AND r.id IS NULL${historyId === undefined ? '' : ' AND h.id = :historyId'}`,
  { replacements: { userId, ...(historyId === undefined ? {} : { historyId: Number(historyId) }) }, logging: false });
}

module.exports = { quotationActivity, quotationActivityCounts, markQuotationActivityRead };
