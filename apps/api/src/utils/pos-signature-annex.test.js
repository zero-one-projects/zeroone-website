const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { PDFDocument, PDFName, PDFDict, pushGraphicsState, popGraphicsState, concatTransformationMatrix, drawObject } = require('pdf-lib');
const PdfKit = require('pdfkit');
const { renderPosSignatureAnnex } = require('./pos-signature-annex');
const { style } = require('./pos-contract-pdf-layout');
const { generatedPdfText } = require('./pdf-text.test-helper');

const record = {
  reference: 'ZO-2026-00197',
  document: { quoteType: 'pos', posPurpose: 'new', clientName: 'Example Client', clientAddress: 'Pagadian City', title: 'Cloud-Based POS System', currency: 'PHP', billingPeriod: 'monthly', contractDetails: { agreementDateRule: 'signing' }, acceptancePolicy: require('./contract-acceptance').acceptancePolicy,
    items: [{ description: 'POS setup', chargeType: 'setup', quantity: 1, unitPrice: 19999.50 }, { description: 'Monthly plan', chargeType: 'recurring', quantity: 1, unitPrice: 1699 }],
    contractPdf: { fileName: 'POS.pdf', sha256: 'a'.repeat(64) } },
  signature: { type: 'typed', typedName: 'Client Signer', signerName: 'Client Signer', consentText: require('./quotation-signature').consentText, signedAt: '2026-11-05T09:21:14.301Z', email: 'client@example.com', documentHash: 'b'.repeat(64) }
};

test('POS signature annex matches the contract typography and preserves one complete signature with its audit details', async () => {
  const snapshot = JSON.stringify(record);
  const captured = [];
  const original = PdfKit.prototype.text;
  mock.method(PdfKit.prototype, 'text', function(value, ...args) {
    captured.push({ value: String(value), size: this._fontSize, page: this.page, y: typeof args[1] === 'number' ? args[1] : this.y });
    return original.call(this, value, ...args);
  });
  try {
    const pdf = await PDFDocument.load(await renderPosSignatureAnnex(record, { width: 612, height: 792, pageOffset: 10 }));
    assert(pdf.getPageCount() >= 2);
    assert(pdf.getPages().every(page => page.getWidth() === 612 && page.getHeight() === 792));
    assert.equal(captured.find(value => value.value === 'ELECTRONIC SIGNATURE & ACCEPTANCE').size, style.titleSize);
    assert.equal(captured.find(value => value.value === record.document.acceptancePolicy.terms).size, style.bodySize);
    const start = captured.findIndex(value => value.value === 'SERVICE PROVIDER');
    const end = captured.findIndex(value => value.value === `PDF SHA-256: ${record.document.contractPdf.sha256}`);
    assert.equal(new Set(captured.slice(start, end + 1).map(value => value.page)).size, 1, 'the client signature and its audit metadata must stay together');
    assert.equal(captured.filter(value => value.value === 'CLIENT ACCEPTANCE').length, 1);
    assert.equal(captured.filter(value => value.value === 'Electronic Signature').length, 1);
    assert.equal(captured.filter(value => value.value === record.signature.typedName).length, 1);
    for (const value of [`Date Signed: ${record.signature.signedAt}`, `Verified email: ${record.signature.email}`, `Document version: ${record.signature.documentHash}`, 'PHP 19,999.50', 'PHP 1,699.00']) assert(captured.some(entry => entry.value === value));
    for (const value of ['11', String(10 + pdf.getPageCount())]) assert(captured.some(entry => entry.value === value && entry.y === 773));
    assert.equal(JSON.stringify(record), snapshot);
  } finally { mock.restoreAll(); }
});

test('long approved feature rows paginate without crossing the footer or losing the final feature', async () => {
  const features = Array.from({ length: 100 }, (_, index) => `Approved feature ${index + 1}`).join(' ');
  const input = { ...record, signature: { ...record.signature, type: 'drawn', strokes: [[[.1, .2], [.4, .7], [.8, .3]]] }, document: { ...record.document, items: [...record.document.items, { chargeType: 'addon', description: features, quantity: 1, unitPrice: 500 }] } };
  const source = PdfKit.prototype.text;
  let tailSeen = false;
  mock.method(PdfKit.prototype, 'text', function(value, ...args) {
    if (String(value).includes('Approved feature 100')) tailSeen = true;
    if (typeof args[1] === 'number' && args[1] < this.page.height - 72 && String(value).startsWith('Approved feature')) assert(args[1] + style.lineHeight <= this.page.height - 72);
    return source.call(this, value, ...args);
  });
  try {
    const pdf = await PDFDocument.load(await renderPosSignatureAnnex(input, { width: 612, height: 792, pageOffset: 10 }));
    assert(pdf.getPageCount() > 2);
    assert(tailSeen);
    assert.equal(JSON.stringify(input.signature.strokes), JSON.stringify([[[.1, .2], [.4, .7], [.8, .3]]]));
  } finally { mock.restoreAll(); }
});

test('uploaded POS signed copies retain the source pages and repeat their watermark and page size on the annex', async () => {
  const { ContractFile } = require('../models');
  const source = await PDFDocument.create();
  const page = source.addPage([612, 792]);
  // Match the native image/soft-mask operators in the uploaded POS watermark.
  const alpha = source.context.register(source.context.flateStream(Buffer.from([32]), { Type: 'XObject', Subtype: 'Image', Width: 1, Height: 1, ColorSpace: 'DeviceGray', BitsPerComponent: 8 }));
  const image = source.context.register(source.context.flateStream(Buffer.from([240, 240, 240]), { Type: 'XObject', Subtype: 'Image', Width: 1, Height: 1, ColorSpace: 'DeviceRGB', BitsPerComponent: 8, SMask: alpha }));
  const imageName = page.node.newXObject('Im', image);
  page.pushOperators(pushGraphicsState(), concatTransformationMatrix(592.1, 0, 0, 592.1, 116.65, 96.96), drawObject(imageName), popGraphicsState());
  page.drawText('Original approved source terms', { x: 52, y: 650, size: 11 });
  const data = Buffer.from(await source.save());
  const sha256 = crypto.createHash('sha256').update(data).digest('hex');
  const id = crypto.randomUUID();
  mock.method(ContractFile, 'findByPk', async () => ({ id, data, sha256 }));
  try {
    const input = { ...record, document: { ...record.document, contractSource: 'pdf', contractPdf: { ...record.document.contractPdf, id, sha256 } } };
    const parsed = await PDFDocument.load(await require('./signed-contract-pdf').renderSignedContractPdf(input));
    assert(parsed.getPages().every(entry => entry.getWidth() === 612 && entry.getHeight() === 792));
    for (const entry of parsed.getPages().slice(1)) {
      const objects = entry.node.Resources().lookup(PDFName.of('XObject'), PDFDict);
      assert(objects.keys().some(name => name.toString().includes('ContractWatermark')));
    }
    const text = generatedPdfText(parsed);
    assert(text.includes(record.signature.signedAt));
    assert(text.includes(record.signature.email));
    assert.equal(crypto.createHash('sha256').update(data).digest('hex'), sha256);
    assert.equal((await PDFDocument.load(data)).getPageCount(), 1);
  } finally { mock.restoreAll(); }
});
