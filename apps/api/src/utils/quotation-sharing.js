function quotationExpiresAt(validUntil) {
  if (typeof validUntil !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) return null;
  const calendarDate = Date.parse(validUntil);
  if (!Number.isFinite(calendarDate) || new Date(calendarDate).toISOString().slice(0, 10) !== validUntil) return null;
  const start = Date.parse(`${validUntil}T00:00:00+08:00`);
  return Number.isFinite(start) ? new Date(start + 24 * 60 * 60 * 1000) : null;
}

function quotationExpired(document, now = Date.now()) {
  const expiry = quotationExpiresAt(document?.validUntil);
  return !expiry || now >= expiry.getTime();
}

module.exports = { quotationExpiresAt, quotationExpired };
