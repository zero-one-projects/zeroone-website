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

test('acceptance and signed delivery send internal copies only to billing and sales despite the configured info mailbox', async () => {
  const { mock } = require('node:test');
  const { MailConfig } = require('../models');
  const { sendQuotationResponseNotification } = require('./quotation-verification-mail');
  const messages = [];
  mock.method(MailConfig, 'findOne', async () => ({ tenantId: 'test-tenant', clientId: 'test-client', clientSecret: 'test-secret', senderEmail: 'info@zerooneitinc.com', recipientEmail: 'info@zerooneitinc.com' }));
  mock.method(global, 'fetch', async (url, options) => {
    if (String(url).includes('oauth2')) return { ok: true, json: async () => ({ access_token: 'test-token' }) };
    messages.push(JSON.parse(options.body).message); return { ok: true };
  });
  try {
    const payload = { reference: record.reference, title: 'Example project', clientCompany: 'Example Client', clientName: 'Client Name', clientEmail: 'client@example.com', currency: 'PHP', total: 5000, respondedAt: '2026-10-26T00:00:00Z', signedAt: record.signature.signedAt, signedContract: record };
    await sendQuotationResponseNotification({ ...payload, action: 'accept', signedContract: undefined });
    await sendQuotationResponseNotification({ ...payload, action: 'signed' });
    await sendQuotationResponseNotification({ ...payload, action: 'client_signed' });
    assert.deepEqual(messages[0].toRecipients.map(recipient => recipient.emailAddress.address), ['billing@zerooneitinc.com','sales@zerooneitinc.com']);
    assert.deepEqual(messages[1].toRecipients.map(recipient => recipient.emailAddress.address), ['billing@zerooneitinc.com','sales@zerooneitinc.com']);
    assert.deepEqual(messages[2].toRecipients.map(recipient => recipient.emailAddress.address), ['client@example.com']);
    for (const message of messages) {
      const recipients = [...message.toRecipients, ...(message.ccRecipients || []), ...(message.bccRecipients || [])];
      assert(!recipients.some(recipient => recipient.emailAddress.address === 'info@zerooneitinc.com'));
    }
    assert.equal(messages[0].attachments, undefined);
    for (const message of messages.slice(1)) {
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

test('signed PDF identifies the provider and records a single client signature and acceptance timestamp', async () => {
  const PDFDocument = require('pdfkit');
  const original = PDFDocument.prototype.text;
  const captured = [];
  PDFDocument.prototype.text = function (value, ...args) { captured.push(String(value)); return original.call(this, value, ...args); };
  try {
    await renderSignedContractPdf(record);
    assert(captured.includes('SERVICE PROVIDER'));
    assert(captured.includes('Zero One Information Technology Inc.'));
    assert.equal(captured.filter(text => text === 'CLIENT ACCEPTANCE').length, 1);
    assert.equal(captured.filter(text => text === 'Electronic Signature').length, 1);
    assert.equal(captured.filter(text => text === record.signature.typedName).length, 1);
    assert(captured.includes(`Date Signed: ${record.signature.signedAt}`));
    assert(captured.includes(`Verified email: ${record.signature.email}`));
    assert(!captured.includes('FOR THE PROVIDER'));
  } finally { PDFDocument.prototype.text = original; }
});

test('POS signed PDFs render client-specific pricing rows from each approved quotation', async () => {
  const PDFDocument = require('pdfkit');
  const { PDFDocument: ReadPdf } = require('pdf-lib');
  const original = PDFDocument.prototype.text;
  const captured = [];
  PDFDocument.prototype.text = function (value, ...args) { captured.push(String(value)); return original.call(this, value, ...args); };
  try {
    for (const setupPrice of [30000, 38000]) {
      captured.length = 0;
      const document = { ...record.document, quoteType: 'pos', currency: 'PHP', billingPeriod: 'monthly', total: setupPrice + 2500, hasRecurring: true, recurringTotal: 1200, items: [
        { description: 'POS setup', chargeType: 'setup', quantity: 1, unitPrice: setupPrice },
        { description: 'Extra feature', chargeType: 'addon', quantity: 1, unitPrice: 2500 },
        { description: 'Monthly plan', chargeType: 'recurring', quantity: 1, unitPrice: 1200 }
      ], contractDetails: { billingCommencement: 'Upon official Go-Live', minimumPeriod: 'Agreed period' } };
      const pdf = await ReadPdf.load(await renderSignedContractPdf({ ...record, document }));
      assert(pdf.getPageCount() > 0);
      assert(captured.includes('One-Time Setup & Implementation Fee'));
      assert(captured.includes(`PHP ${setupPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`));
      assert(captured.includes('PHP 1,200.00'));
      assert(captured.includes('Extra feature — PHP 2,500.00'));
      assert(captured.includes('Upon official Go-Live'));
      assert(captured.includes(record.reference));
      assert.equal(captured.filter(value => value === 'Electronic Signature').length, 1);
    }
  } finally { PDFDocument.prototype.text = original; }
});


test('signed PDF includes the saved hardware clause without adding terms to legacy records', async () => {
  const PDFDocument = require('pdfkit');
  const original = PDFDocument.prototype.text;
  const captured = [];
  PDFDocument.prototype.text = function (value, ...args) { captured.push(String(value)); return original.call(this, value, ...args); };
  try {
    const document = { ...record.document, items: [{ description: 'Printer', chargeType: 'hardware' }], contractDetails: { hardwareTerms: 'Saved client hardware payment terms.' }, contractPdf: { fileName: 'Agreement.pdf', sha256: 'a'.repeat(64) } };
    await renderSignedContractPdf({ ...record, document });
    assert(captured.includes(document.contractDetails.hardwareTerms));
    captured.length = 0;
    await renderSignedContractPdf({ ...record, document: { ...document, contractDetails: {} } });
    assert(!captured.includes('HARDWARE PROCUREMENT AND PAYMENT TERMS'));
  } finally { PDFDocument.prototype.text = original; }
});

test('POS acceptance review uses the uploaded page size, matching body text and branded heading without a blank extra page', async () => {
  const { PDFDocument: ReadPdf } = require('pdf-lib');
  const PDFDocument = require('pdfkit');
  const { typography } = require('./contract-pdf-typography');
  const { renderContractReviewPdf } = require('./signed-contract-pdf');
  const source = await ReadPdf.create(); source.addPage([612, 792]);
  const bytes = Buffer.from(await source.save());
  const policy = require('./contract-acceptance').acceptancePolicy;
  const document = { ...record.document, quoteType: 'pos', acceptancePolicy: policy };
  const original = PDFDocument.prototype.text, captured = [];
  PDFDocument.prototype.text = function(value, ...args) { captured.push({ value: String(value), size: this._fontSize }); return original.call(this, value, ...args); };
  try {
    const pdf = await ReadPdf.load(await renderContractReviewPdf({ bytes, document, reference: record.reference }));
    assert.equal(pdf.getPageCount(), 2);
    assert.deepEqual(pdf.getPage(1).getSize(), pdf.getPage(0).getSize());
    assert.equal(captured.find(entry => entry.value === policy.terms).size, typography.bodySize);
    assert.equal(captured.find(entry => entry.value === policy.title.toUpperCase()).size, typography.titleSize);
    assert(captured.some(entry => entry.value === 'Agreement status: Pending Admin Confirmation.'));
    assert.equal((await ReadPdf.load(bytes)).getPageCount(), 1);
  } finally { PDFDocument.prototype.text = original; }
});
