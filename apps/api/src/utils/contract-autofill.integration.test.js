const { test, mock } = require('node:test');
const assert = require('node:assert/strict');

test('POS PDF fields are completed before acceptance and retained in signed copies; incomplete agreements cannot be accepted', { skip: process.env.RUN_CONTRACT_AUTOFILL_DB_TESTS !== 'true' }, async () => {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
  const crypto = require('crypto');
  const { PDFDocument, PDFRawStream, StandardFonts, decodePDFRawStream } = require('pdf-lib');
  const { sequelize } = require('../config/database');
  const { ContractFile, Quotation, QuotationContract, QuotationVerification, QuotationNotification, QuotationResponseHistory } = require('../models');
  const { documentHash, codeHash } = require('./quotation-response');
  const { fieldNames } = require('./contract-autofill');
  const { fileMetadata } = require('./contract-files');
  const ids = []; let file, server;
  sequelize.options.logging = false;
  mock.method(require('./quotation-notifications'), 'queueNotificationDelivery', () => {});
  const sendCode = mock.method(require('./quotation-verification-mail'), 'sendQuotationCode', async () => {});
  async function assertFilled(bytes, expectedDate = 'October 25, 2026') {
    const parsed = await PDFDocument.load(bytes);
    assert.equal(parsed.getForm().getFields().length, 0);
    const font = await parsed.embedFont(StandardFonts.Helvetica);
    const text = parsed.context.enumerateIndirectObjects().flatMap(([, value]) => value instanceof PDFRawStream ? [Buffer.from(decodePDFRawStream(value).decode()).toString('latin1')] : []).join('\n');
    const embeddedText = require('./pdf-text.test-helper').generatedPdfText(parsed);
    for (const value of ['Example Client Inc.', '123 Main Street, Pagadian City', expectedDate]) assert(text.includes(font.encodeText(value).toString().slice(1, -1)) || embeddedText.includes(value));
    return parsed;
  }
  try {
    const template = await PDFDocument.create(); const page = template.addPage();
    for (let index = 0; index < fieldNames.length; index += 1) template.getForm().createTextField(fieldNames[index]).addToPage(page, { x: 50, y: 600 - index * 40, width: 350, height: 25 });
    const providerField = template.getForm().createTextField('zeroone.providerDetails'); providerField.enableMultiline(); providerField.addToPage(page, { x: 50, y: 400, width: 500, height: 70 });
    const data = Buffer.from(await template.save());
    file = await ContractFile.create({ id: crypto.randomUUID(), quoteType: 'pos', fileName: 'Temporary fillable POS.pdf', data, sha256: crypto.createHash('sha256').update(data).digest('hex'), byteLength: data.length, pageCount: 1 }, { logging: false });
    server = await new Promise(resolve => { const instance = require('../app').listen(0, '127.0.0.1', () => resolve(instance)); });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const admin = require('jsonwebtoken').sign({ sub: 'autofill-test', role: 1 }, process.env.JWT_SECRET, { expiresIn: '5m' });
    const headers = { Authorization: `Bearer ${admin}`, 'Content-Type': 'application/json' };
    async function json(path, body, authenticated = true) {
      const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: authenticated ? headers : { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: response.status, body: await response.json() };
    }
    const input = { quoteType: 'pos', contractSource: 'pdf', contractPdf: fileMetadata(file), clientFlow: 'full', title: 'POS autofill fixture', clientName: 'Example Client Inc.', clientAddress: '123 Main Street, Pagadian City', clientEmail: 'client@example.com', issuedOn: '2026-11-05', validUntil: '2099-01-01', currency: 'PHP', contractDetails: { agreementDate: '2026-10-25' }, items: [{ description: 'Setup', chargeType: 'setup', quantity: 1, unitPrice: 5000 }] };
    const created = await json('/admin/quotations', { document: input });
    assert.equal(created.status, 201); ids.push(created.body.quotation.id);
    const row = await Quotation.findByPk(created.body.quotation.id, { logging: false });
    assert.equal(row.document.contractAutofill.pdfFieldsReady, true);
    assert.equal(row.document.contractDetails.agreementDate, '2026-10-25');
    const review = await fetch(`${base}/quotations/${row.shareToken}/contract-pdf`);
    assert.equal(review.status, 200); await assertFilled(Buffer.from(await review.arrayBuffer()));
    const preview = await fetch(`${base}/admin/contracts/quotations/${row.id}/pdf`, { headers });
    assert.equal(preview.status, 200); await assertFilled(Buffer.from(await preview.arrayBuffer()));
    assert.equal((await fetch(`${base}/admin/contracts/quotations/${row.id}/pdf`)).status, 401);
    const incomplete = await json('/admin/quotations', { document: { ...input, clientAddress: '' } });
    assert.equal(incomplete.status, 201); ids.push(incomplete.body.quotation.id);
    assert.equal((await json(`/admin/quotations/${incomplete.body.quotation.id}/share`, {})).status, 400);
    const incompleteRow = await Quotation.findByPk(incomplete.body.quotation.id, { logging: false });
    const blocked = await json(`/quotations/${incompleteRow.shareToken}/verification`, { action: 'accept', email: input.clientEmail, documentVersion: documentHash(incompleteRow.document) }, false);
    assert.equal(blocked.status, 400); assert.equal(sendCode.mock.callCount(), 0);
    const challengeId = crypto.randomUUID();
    await QuotationVerification.create({ id: challengeId, quotationId: row.id, email: input.clientEmail, action: 'accept', documentHash: documentHash(row.document), codeHash: codeHash(challengeId, '123456'), expiresAt: new Date(Date.now() + 600000) }, { logging: false });
    const verified = await json(`/quotations/${row.shareToken}/verify`, { challengeId, code: '123456' }, false);
    assert.equal(verified.status, 200);
    const accepted = await json(`/quotations/${row.shareToken}/respond`, { challengeId, verificationProof: verified.body.verificationProof, action: 'accept', name: 'Client Representative' }, false);
    assert.equal(accepted.status, 200);
    const signed = await json(`/quotations/${row.shareToken}/sign`, { challengeId, verificationProof: accepted.body.signingSession.verificationProof, name: 'Client Representative', signature: { type: 'typed', typedName: 'Client Representative', agreed: true } }, false);
    assert.equal(signed.status, 200);
    const copy = await fetch(`${base}/admin/contracts/signed-copy`, { method: 'POST', headers, body: JSON.stringify({ quotationId: row.id, documentHash: documentHash(row.document) }) });
    assert.equal(copy.status, 200); const signedPdf = await assertFilled(Buffer.from(await copy.arrayBuffer())); assert(signedPdf.getPageCount() > 1);
    const triggered = await json('/admin/quotations', { document: { ...input, contractDetails: { agreementDateRule: 'signing' } } });
    assert.equal(triggered.status, 201); ids.push(triggered.body.quotation.id);
    const triggeredRow = await Quotation.findByPk(triggered.body.quotation.id, { logging: false });
    assert.equal(triggeredRow.document.contractDetails.agreementDate, '');
    assert.equal(triggeredRow.document.contractAutofill.providerFieldsReady, true);
    assert.equal(triggeredRow.document.providerProfile.name, 'Zero One Information Technology Inc.');
    const pendingPdf = await fetch(`${base}/quotations/${triggeredRow.shareToken}/contract-pdf`);
    assert.equal(pendingPdf.status, 200); await assertFilled(Buffer.from(await pendingPdf.arrayBuffer()), 'electronic signing');
    const signingChallengeId = crypto.randomUUID();
    await QuotationVerification.create({ id: signingChallengeId, quotationId: triggeredRow.id, email: input.clientEmail, action: 'accept', documentHash: documentHash(triggeredRow.document), codeHash: codeHash(signingChallengeId, '654321'), expiresAt: new Date(Date.now() + 600000) }, { logging: false });
    const verifiedTrigger = await json(`/quotations/${triggeredRow.shareToken}/verify`, { challengeId: signingChallengeId, code: '654321' }, false);
    assert.equal(verifiedTrigger.status, 200);
    const acceptedTrigger = await json(`/quotations/${triggeredRow.shareToken}/respond`, { challengeId: signingChallengeId, verificationProof: verifiedTrigger.body.verificationProof, action: 'accept', name: 'Client Representative' }, false);
    assert.equal(acceptedTrigger.status, 200);
    const signedTrigger = await json(`/quotations/${triggeredRow.shareToken}/sign`, { challengeId: signingChallengeId, verificationProof: acceptedTrigger.body.signingSession.verificationProof, name: 'Client Representative', signature: { type: 'typed', typedName: 'Client Representative', agreed: true } }, false);
    assert.equal(signedTrigger.status, 200);
    await triggeredRow.reload({ logging: false });
    const recorded = triggeredRow.clientResponse.signature;
    assert.equal(recorded.agreementEffectiveDate, new Date(recorded.signedAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }));
    assert.equal(triggeredRow.clientResponse.document.contractDetails.agreementDate, '');
    const triggeredCopy = await fetch(`${base}/admin/contracts/signed-copy`, { method: 'POST', headers, body: JSON.stringify({ quotationId: triggeredRow.id, documentHash: documentHash(triggeredRow.document) }) });
    assert.equal(triggeredCopy.status, 200);
    await assertFilled(Buffer.from(await triggeredCopy.arrayBuffer()), new Date(`${recorded.agreementEffectiveDate}T00:00:00Z`).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric' }));
    const source = await ContractFile.findByPk(file.id, { logging: false }); assert.deepEqual(source.data, data);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (ids.length) { for (const model of [QuotationContract, QuotationNotification, QuotationResponseHistory, QuotationVerification]) await model.destroy({ where: { quotationId: ids }, logging: false }); await Quotation.destroy({ where: { id: ids }, force: true, logging: false }); }
    if (file) await ContractFile.destroy({ where: { id: file.id }, logging: false });
    mock.restoreAll(); await sequelize.close();
  }
});
