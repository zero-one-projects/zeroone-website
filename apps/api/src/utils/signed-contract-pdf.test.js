const { test } = require('node:test');
const assert = require('node:assert/strict');
const { renderSignedContractPdf } = require('./signed-contract-pdf');
const { clientSignedMessage } = require('./quotation-client-email');
const record = { reference: 'ZO-2026-00001', document: { quoteType: 'project', title: 'Example project', clientName: 'Example Client', clientAddress: 'Pagadian City', contractText: 'AGREED TERMS\n\n**Original terms**', contractDetails: {} }, signature: { type: 'typed', typedName: 'Client Name', signerName: 'Client Name', signedAt: '2026-10-26T01:00:00Z', email: 'client@example.com', contractText: 'AGREED TERMS\n\n**Original terms**', documentHash: 'reviewed-document' } };
test('signed contract copies produce real PDFs for typed and drawn signatures from frozen terms', async () => {
  for (const signature of [record.signature, { ...record.signature, type: 'drawn', strokes: [[[0.1,0.2],[0.5,0.8],[0.9,0.3]]] }]) {
    const pdf = await renderSignedContractPdf({ ...record, signature });
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert(pdf.length > 10000); assert(pdf.length < 3 * 1024 * 1024);
  }
  assert.throws(() => renderSignedContractPdf({ ...record, signature: null }), /recorded contract signature/);
});
test('signed receipt is addressed only to the verified client and explains PDF and next payment step', () => {
  const message = clientSignedMessage({ reference: record.reference, title: '<Example>', clientName: 'Client Name', clientEmail: record.signature.email, signedAt: record.signature.signedAt });
  assert.deepEqual(message.toRecipients, [{emailAddress:{address:'client@example.com'}}]);
  assert(message.subject.includes('Signed contract copy'));
  assert(message.body.content.includes('&lt;Example&gt;'));
  assert(message.body.content.includes('attached as a PDF'));
  assert(message.body.content.includes('Next step: Payment'));
});

test('signed delivery attaches a PDF and sends client/team jobs to their intended recipients', async () => {
  const { mock } = require('node:test');
  const { MailConfig } = require('../models');
  const { sendQuotationResponseNotification } = require('./quotation-verification-mail');
  const messages = [];
  mock.method(MailConfig, 'findOne', async () => ({ tenantId: 'test-tenant', clientId: 'test-client', clientSecret: 'test-secret', senderEmail: 'info@example.com' }));
  mock.method(global, 'fetch', async (url, options) => {
    if (String(url).includes('oauth2')) return { ok: true, json: async () => ({ access_token: 'test-token' }) };
    messages.push(JSON.parse(options.body).message); return { ok: true };
  });
  try {
    const payload = { reference: record.reference, title: 'Example project', clientCompany: 'Example Client', clientName: 'Client Name', clientEmail: 'client@example.com', currency: 'PHP', total: 5000, respondedAt: '2026-10-26T00:00:00Z', signedAt: record.signature.signedAt, signedContract: record };
    await sendQuotationResponseNotification({ ...payload, action: 'signed' });
    await sendQuotationResponseNotification({ ...payload, action: 'client_signed' });
    assert.deepEqual(messages[0].toRecipients.map(recipient => recipient.emailAddress.address), ['billing@zerooneitinc.com','sales@zerooneitinc.com']);
    assert.deepEqual(messages[1].toRecipients.map(recipient => recipient.emailAddress.address), ['client@example.com']);
    for (const message of messages) {
      const attachment = message.attachments[0];
      assert.equal(attachment['@odata.type'], '#microsoft.graph.fileAttachment');
      assert.equal(attachment.contentType, 'application/pdf');
      assert.equal(Buffer.from(attachment.contentBytes, 'base64').subarray(0,5).toString(), '%PDF-');
    }
  } finally { mock.restoreAll(); }
});


test('default contract downloads are unsigned PDFs and leave saved terms unchanged', async () => {
  const { renderDefaultContractPdf } = require('./signed-contract-pdf');
  const { PDFDocument } = require('pdf-lib');
  const document = { ...record.document, contractText: 'SAVED TERMS\n\nPreserve this agreement.' };
  const before = JSON.stringify(document);
  const bytes = await renderDefaultContractPdf(document);
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getTitle(), 'Default contract template');
  assert(pdf.getPageCount() > 0);
  assert.equal(JSON.stringify(document), before);
});
