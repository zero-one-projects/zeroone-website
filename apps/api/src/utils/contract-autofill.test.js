const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { PDFDocument, StandardFonts, PDFRawStream, decodePDFRawStream } = require('pdf-lib');
const { fieldNames, fillContractPdf, assertContractReady, hasContractFields } = require('./contract-autofill');
const document = { quoteType: 'pos', clientName: 'Example Client Inc.', clientAddress: '123 Main Street, Pagadian City', issuedOn: '2026-11-05', contractDetails: { agreementDate: '2026-11-05' }, contractAutofill: { version: 1, pdfFieldsReady: true }, contractSource: 'pdf' };
async function template() {
  const pdf = await PDFDocument.create(); const page = pdf.addPage();
  for (let index = 0; index < fieldNames.length; index += 1) pdf.getForm().createTextField(fieldNames[index]).addToPage(page, { x: 50, y: 600 - index * 40, width: 300, height: 25 });
  return Buffer.from(await pdf.save());
}
async function containsText(bytes, values) {
  const pdf = await PDFDocument.load(bytes);
  const streams = pdf.context.enumerateIndirectObjects().flatMap(([, object]) => object instanceof PDFRawStream ? [Buffer.from(decodePDFRawStream(object).decode()).toString('latin1')] : []).join('\n');
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const shownText = [...streams.matchAll(/<([a-fA-F0-9]+)>\s*Tj/g)].map(match => new TextDecoder('windows-1252').decode(Buffer.from(match[1], 'hex'))).join(' ').replace(/\u0093/g, '“').replace(/\u0094/g, '”').replace(/\s+/g, ' ');
  const embeddedText = require('./pdf-text.test-helper').generatedPdfText(pdf);
  for (const value of values) assert(streams.includes(font.encodeText(value).toString().slice(1, -1)) || shownText.includes(value) || embeddedText.includes(value), `PDF must contain ${value}`);
  return pdf;
}
test('fills and flattens client fields before review without modifying the source or legacy snapshots', async () => {
  const source = await template(), originalHash = crypto.createHash('sha256').update(source).digest('hex');
  assert(await hasContractFields(source));
  const bytes = await fillContractPdf(source, document);
  const filled = await containsText(bytes, ['November 5, 2026', document.clientName, document.clientAddress]);
  assert.equal(filled.getForm().getFields().length, 0);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), originalHash);
  assert.equal((await PDFDocument.load(source)).getForm().getTextField(fieldNames[1]).getText(), undefined);
  await containsText(await fillContractPdf(source, { ...document, clientName: 'Another Client' }), ['Another Client']);
  assert.deepEqual(await fillContractPdf(source, { ...document, contractAutofill: undefined }), source);
});
test('requires complete POS details before acceptance while preserving other quotation flows', () => {
  assert.doesNotThrow(() => assertContractReady(document));
  for (const patch of [{ clientName: '' }, { clientAddress: ' ' }, { contractDetails: { agreementDate: 'invalid' } }, { contractAutofill: undefined }]) assert.throws(() => assertContractReady({ ...document, ...patch }), { statusCode: 400 });
  assert.doesNotThrow(() => assertContractReady({ quoteType: 'pos', clientFlow: 'quotation_only' }));
  assert.doesNotThrow(() => assertContractReady({ quoteType: 'project' }));
});
test('preparation freezes the date and signed copies retain the same completed client fields', async () => {
  const { ContractFile } = require('../models');
  const { prepareQuotation } = require('./contract-templates');
  const data = await template();
  const file = { id: crypto.randomUUID(), quoteType: 'pos', fileName: 'POS.pdf', sha256: crypto.createHash('sha256').update(data).digest('hex'), byteLength: data.length, pageCount: 1, data };
  mock.method(ContractFile, 'findByPk', async () => file);
  try {
    const prepared = await prepareQuotation({ ...document, contractDetails: {}, title: 'POS package', currency: 'PHP', validUntil: '2099-01-01', items: [{ description: 'Setup', chargeType: 'setup', quantity: 1, unitPrice: 5000 }], contractPdf: file });
    assert.equal(prepared.contractDetails.agreementDate, document.issuedOn);
    assert.equal(prepared.contractAutofill.pdfFieldsReady, true); assertContractReady(prepared);
    const signature = { type: 'typed', typedName: 'Signer', signerName: 'Signer', email: 'client@example.com', signedAt: '2026-11-20T00:00:00Z', documentHash: 'saved-version' };
    const signed = await require('./signed-contract-pdf').renderSignedContractPdf({ document: prepared, reference: 'POS-TEST', signature });
    const parsed = await containsText(signed, ['November 5, 2026', document.clientName, document.clientAddress]);
    assert(parsed.getPageCount() > 1); assert.equal(parsed.getForm().getFields().length, 0);
  } finally { mock.restoreAll(); }
});

test('a signing-triggered effective date is disclosed before signing and captured from the server timestamp in Manila', async () => {
  const { agreementDate, agreementSignatureDetails } = require('./contract-autofill');
  const source = await template();
  const pending = { ...document, contractDetails: { agreementDateRule: 'signing', agreementDate: '' } };
  assertContractReady(pending);
  assert.equal(agreementDate(pending), 'Upon electronic signing');
  await containsText(await fillContractPdf(source, pending), ['electronic signing']);
  const signedAt = '2026-11-05T16:15:00.000Z';
  const signature = { signedAt, ...agreementSignatureDetails(pending, signedAt) };
  assert.equal(signature.agreementEffectiveDate, '2026-11-06');
  await containsText(await fillContractPdf(source, pending, signature), ['November 6, 2026']);
  assert.equal(pending.contractDetails.agreementDate, '');
  assert.deepEqual(agreementSignatureDetails(document, signedAt), {});
});

test('normalization snapshots the company profile and keeps fixed and signing-triggered dates distinct', () => {
  const { normalizeQuotation } = require('./quotation');
  const profile = require('../../../web/src/content/companyIdentity.json');
  const input = { ...document, title: 'POS', currency: 'PHP', validUntil: '2099-01-01', contractSource: 'default', contractText: 'Approved terms', providerProfile: { name: 'Untrusted provider', address: 'Wrong address' }, items: [{ description: 'Setup', chargeType: 'setup', quantity: 1, unitPrice: 5000 }] };
  const pending = normalizeQuotation({ ...input, contractDetails: { agreementDateRule: 'signing', agreementDate: '2026-01-01' } });
  assert.equal(pending.contractDetails.agreementDate, '');
  assert.equal(pending.contractDetails.agreementDateRule, 'signing');
  assert.deepEqual(pending.providerProfile, profile);
  assert.equal(normalizeQuotation(input).contractDetails.agreementDate, '2026-11-05');
  assert.throws(() => normalizeQuotation({ ...input, contractDetails: { agreementDateRule: 'unknown' } }));
});

test('uploaded PDF provider details use the quotation profile snapshot', async () => {
  const { providerField, hasProviderField } = require('./contract-autofill');
  const pdf = await PDFDocument.load(await template());
  const field = pdf.getForm().createTextField(providerField); field.enableMultiline();
  field.addToPage(pdf.getPage(0), { x: 50, y: 300, width: 500, height: 70 });
  const bytes = Buffer.from(await pdf.save()); assert(await hasProviderField(bytes));
  const filled = await fillContractPdf(bytes, { ...document, providerProfile: { name: 'Recorded Provider Ltd.', address: 'Recorded provider address' }, contractAutofill: { version: 2, pdfFieldsReady: true, providerFieldsReady: true } });
  await containsText(filled, ['RECORDED PROVIDER LTD.', 'Recorded provider address']);
});

test('the signing-triggered PDF introduction uses the agreed sentence without a separate date field', async () => {
  const { introductionField, signingIntroduction, agreementSignatureDetails } = require('./contract-autofill');
  const pdf = await PDFDocument.load(await template());
  const intro = pdf.getForm().createTextField(introductionField); intro.enableMultiline();
  intro.addToPage(pdf.getPage(0), { x: 50, y: 200, width: 500, height: 45 });
  const bytes = Buffer.from(await pdf.save());
  const agreed = { ...document, contractDetails: { agreementDateRule: 'signing', agreementIntroduction: signingIntroduction }, contractAutofill: { version: 3, pdfFieldsReady: true, introductionReady: true } };
  for (const signature of [undefined, { signedAt: '2026-11-05T16:15:00Z', ...agreementSignatureDetails(agreed, '2026-11-05T16:15:00Z') }]) {
    const rendered = await containsText(await fillContractPdf(bytes, agreed, signature), [signingIntroduction, document.clientName, document.clientAddress]);
    assert.equal(rendered.getForm().getFields().length, 0);
  }
  assert((await PDFDocument.load(bytes)).getForm().getTextField(fieldNames[0]));
});

test('short client details and multiline paragraphs share the contract body size without auto-enlarging', async () => {
  const { PDFName, PDFDict } = require('pdf-lib');
  const { typography } = require('./contract-pdf-typography');
  const { introductionField, providerField, signingIntroduction } = require('./contract-autofill');
  const source = await PDFDocument.load(await template());
  source.getPage(0).drawText('Printed introduction placeholder', { x: 51, y: 215, size: 11 });
  for (const [name, y, height] of [[introductionField, 200, 31], [providerField, 100, 44]]) {
    const field = source.getForm().createTextField(name); field.enableMultiline();
    field.addToPage(source.getPage(0), { x: 50, y, width: 511, height });
  }
  const input = { ...document, clientName: 'Riza test 2', clientAddress: 'blk 1 lot 7 phase 3 lower Alta Tierra, Tiguma', contractDetails: { agreementDateRule: 'signing', agreementIntroduction: signingIntroduction }, contractAutofill: { pdfFieldsReady: true, providerFieldsReady: true, introductionReady: true } };
  const filled = await containsText(await fillContractPdf(Buffer.from(await source.save()), input), [input.clientName, input.clientAddress, signingIntroduction]);
  const fonts = filled.getPage(0).node.Resources().lookup(PDFName.of('Font'), PDFDict);
  assert(fonts.entries().some(([, reference]) => String(filled.context.lookup(reference).get(PDFName.of('BaseFont'))).includes('Carlito-Regular')));
  const streams = filled.getPage(0).node.Contents().asArray().map(reference => Buffer.from(decodePDFRawStream(filled.context.lookup(reference)).decode()).toString()).join('\n');
  const sizes = [...streams.matchAll(/\/Carlito-Regular-\d+ ([\d.]+) Tf/g)].map(match => Number(match[1]));
  assert.equal(sizes.length, 4);
  assert(sizes.every(size => size === typography.bodySize));
  assert(streams.includes(`${typography.lineHeight} TL`));
  assert(streams.includes('W* n'));
});
