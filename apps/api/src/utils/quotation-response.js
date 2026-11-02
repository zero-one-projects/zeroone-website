const crypto = require('crypto');

function documentHash(document) {
  // MySQL may reorder JSON keys, so hash a canonical representation.
  function stable(value) {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
    return value;
  }
  return crypto.createHash('sha256').update(JSON.stringify(stable(document))).digest('hex');
}

function responseSummary(row, admin = false) {
  const response = row.clientResponse;
  if (!response) return null;
  return { action: response.action, respondedAt: response.respondedAt,
    signedAt: response.signature?.signedAt || null,
    signaturePending: response.action === 'accept' && !response.signature && (response.document || row.document).clientFlow !== 'quotation_only',
    current: response.documentHash === documentHash(row.document),
    ...(admin ? { email: response.email, name: response.name, note: response.note, documentHash: response.documentHash, signature: response.signature || null } : {}) };
}

function codeHash(id, code) {
  if (!process.env.JWT_SECRET) throw new Error('Verification signing secret is not configured.');
  return crypto.createHmac('sha256', process.env.JWT_SECRET).update(`quotation:${id}:${code}`).digest('hex');
}

module.exports = { documentHash, responseSummary, codeHash };
