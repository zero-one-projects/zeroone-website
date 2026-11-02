const crypto = require('crypto');
const { responseSummary } = require('./quotation-response');
const normalize = value => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
function clientId(type, name, email) {
  return crypto.createHash('sha256').update(JSON.stringify([type, normalize(name), normalize(email)])).digest('hex');
}
function clientRecords(rows, type, search = '', savedClients = []) {
  const groups = new Map();
  for (const row of rows) {
    const d = row.document;
    if (!d || (d.quoteType === 'sync_court' ? 'subscription' : d.quoteType || 'project') !== type) continue;
    const id = clientId(type, d.clientName, d.clientEmail);
    if (!groups.has(id)) groups.set(id, { id, type, isActive: true, clientName: d.clientName || 'Unnamed client', clientEmail: d.clientEmail || '', clientAddress: d.clientAddress || '', contactPerson: d.contractDetails?.authorizedRepresentative || '', updatedAt: row.updatedAt, quotations: [] });
    const group = groups.get(id);
    group.quotations.push({ id: row.id, reference: `ZO-${new Date(row.createdAt).getUTCFullYear()}-${String(row.id).padStart(5, '0')}`, title: d.title, currency: d.currency || 'PHP', total: d.total, recurringTotal: d.recurringTotal || 0, billingPeriod: d.billingPeriod || 'monthly', validUntil: d.validUntil, createdAt: row.createdAt, updatedAt: row.updatedAt, response: responseSummary(row) });
  }
  for (const client of savedClients) {
    if (client.type !== type) continue;
    const id = client.id || clientId(type, client.clientName, client.clientEmail);
    const group = groups.get(id);
    const details = { isActive: client.isActive === undefined ? true : Boolean(client.isActive), clientName: client.clientName, clientEmail: client.clientEmail, clientAddress: client.clientAddress, contactPerson: client.contactPerson };
    if (group) Object.assign(group, details);
    else groups.set(id, { id, type, ...details, updatedAt: client.updatedAt, quotations: [] });
  }
  const query = normalize(search);
  return Array.from(groups.values()).filter(group => !query || normalize([group.clientName, group.clientEmail, group.clientAddress, group.contactPerson, ...group.quotations.flatMap(q => [q.reference, q.title])].join(' ')).includes(query));
}
module.exports = { clientRecords, clientId };
