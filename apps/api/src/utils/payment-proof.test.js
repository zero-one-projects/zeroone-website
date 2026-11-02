const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { PDFDocument } = require('pdf-lib');
const { normalizeProofInput, validateProofFile, proofMessage } = require('./payment-proof');

test('payment proof validates receipt data, amounts, dates, file contents, and size', async () => {
  const input = { id: crypto.randomUUID(), amountPaid: '15000.00', paidOn: '2026-01-01', transactionReference: ' REF-123 ', note: 'Initial payment' };
  assert.equal(normalizeProofInput(input).amountPaid, 15000);
  assert.equal(normalizeProofInput(input).transactionReference, 'REF-123');
  for (const changes of [{ id: 'bad' }, { amountPaid: '-1' }, { amountPaid: '1.001' }, { paidOn: '2099-01-01' }, { paidOn: '2026-02-30' }, { transactionReference: '' }]) assert.throws(() => normalizeProofInput({ ...input, ...changes }), { statusCode: 400 });
  await assert.rejects(() => validateProofFile({ buffer: Buffer.from('<script>bad</script>'), mimetype: 'image/png' }), { statusCode: 400 });
  await assert.rejects(() => validateProofFile({ buffer: Buffer.alloc(2 * 1024 * 1024 + 1) }), { statusCode: 400 });
  const pdf = await PDFDocument.create(); pdf.addPage();
  const file = await validateProofFile({ buffer: Buffer.from(await pdf.save()), originalname: 'receipt.pdf', mimetype: 'application/pdf' });
  assert.equal(file.mimeType, 'application/pdf'); assert.equal(file.data.subarray(0, 5).toString(), '%PDF-');
  const image = await require('sharp')({ create: { width: 20, height: 20, channels: 3, background: '#fff' } }).png().toBuffer();
  assert.equal((await validateProofFile({ buffer: image })).mimeType, 'image/png');
});

test('payment proof email attaches the private receipt and verified client and contract details only to sales and billing', async () => {
  const data = Buffer.from('receipt bytes');
  const row = { id: crypto.randomUUID(), data, sha256: crypto.createHash('sha256').update(data).digest('hex'), mimeType: 'image/png', fileName: 'Payment-Proof.png', clientEmail: 'verified@example.com', documentHash: 'signed-version', amountPaid: '15000.00', paidOn: '2026-01-01', transactionReference: 'BANK-123', note: 'Down payment', createdAt: new Date('2026-01-01'), snapshot: { reference: 'ZO-2026-00024', clientName: 'Verified Client', signedAt: '2026-01-01', document: { clientName: 'Client Company', title: 'Website', currency: 'PHP', total: 30000, initialPaymentPercent: 50 } } };
  mock.method(require('../models').QuotationPaymentProof, 'findByPk', async () => row);
  const messages = [];
  mock.method(require('../models').MailConfig, 'findOne', async () => ({ tenantId: 'test', clientId: 'test', clientSecret: 'test', senderEmail: 'info@zerooneitinc.com' }));
  mock.method(global, 'fetch', async (url, options) => {
    if (String(url).includes('/oauth2/')) return { ok: true, json: async () => ({ access_token: 'test' }) };
    messages.push(JSON.parse(options.body).message); return { ok: true };
  });
  try {
    await require('./quotation-verification-mail').sendQuotationResponseNotification({ action: 'payment_proof', proofId: row.id });
    assert.equal(messages.length, 1);
    const message = messages[0];
    assert.deepEqual(message.toRecipients.map(recipient => recipient.emailAddress.address), ['sales@zerooneitinc.com', 'billing@zerooneitinc.com']);
    for (const text of ['ZO-2026-00024', 'Client Company', 'Verified Client', 'verified@example.com', 'signed-version', '30,000.00', '15,000.00', 'BANK-123', 'Awaiting billing verification']) assert(message.body.content.includes(text));
    assert.equal(Buffer.from(message.attachments[0].contentBytes, 'base64').toString(), data.toString());
    row.sha256 = 'corrupted'; await assert.rejects(() => proofMessage(row.id), /integrity check/);
  } finally { mock.restoreAll(); }
});
