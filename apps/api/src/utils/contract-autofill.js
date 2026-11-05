const { PDFDocument, PDFTextField } = require('pdf-lib');
const { typography, embedContractFont, clearOverlayText } = require('./contract-pdf-typography');
const fieldNames = ['zeroone.agreementDate', 'zeroone.clientName', 'zeroone.clientAddress'];
const providerField = 'zeroone.providerDetails';
const introductionField = 'zeroone.agreementIntroduction';
const signingIntroduction = 'This POS System Subscription & Service Agreement (“Agreement”) is entered into on the date of the Client\'s electronic signature (“Effective Date”) by and between:';
const companyIdentity = require('../../../web/src/content/companyIdentity.json');
const fail = message => { throw Object.assign(new Error(message), { statusCode: 400 }); };
function agreementDate(document, signature) {
  if (document.contractDetails?.agreementDateRule === 'signing') return signature?.agreementEffectiveDate || (signature?.signedAt ? new Date(signature.signedAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }) : 'Upon electronic signing');
  return document.contractDetails?.agreementDate || document.issuedOn || '';
}
function agreementSignatureDetails(document, signedAt) {
  if (document.quoteType !== 'pos' || document.contractDetails?.agreementDateRule !== 'signing') return {};
  return { agreementEffectiveDate: new Date(signedAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }) };
}
function isDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value; }
function assertContractReady(document) {
  if (document.quoteType !== 'pos' || document.clientFlow === 'quotation_only') return;
  if (!document.clientName?.trim() || !document.clientAddress?.trim() || (document.contractDetails?.agreementDateRule !== 'signing' && !isDate(agreementDate(document)))) fail('Complete the client name, business address, and agreement date before sharing or accepting the POS contract.');
  if (document.contractSource === 'pdf' && !document.contractAutofill?.pdfFieldsReady) fail('This POS contract must be completed by Zero One before acceptance or signing. Please request an updated agreement.');
}
async function hasContractFields(bytes) {
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const form = pdf.getForm();
  return fieldNames.every(name => form.getFieldMaybe(name) instanceof PDFTextField);
}
async function fillContractPdf(bytes, document, signature) {
  // Existing accepted/signed snapshots continue to render their original PDF bytes.
  if (!document.contractAutofill?.pdfFieldsReady) return Buffer.from(bytes);
  assertContractReady(document);
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const form = pdf.getForm();
  const effectiveDate = agreementDate(document, signature);
  const values = [isDate(effectiveDate) ? new Date(`${effectiveDate}T00:00:00Z`).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric' }) : effectiveDate === 'Upon electronic signing' ? 'electronic signing' : effectiveDate, document.clientName.trim(), document.clientAddress.trim().replace(/\s+/g, ' ')];
  const names = [...fieldNames];
  if (document.contractAutofill.introductionReady) {
    form.removeField(form.getTextField(fieldNames[0]));
    names.shift(); values.shift();
    names.push(introductionField);
    values.push(document.contractDetails?.agreementDateRule === 'signing' ? document.contractDetails.agreementIntroduction || signingIntroduction : `This POS System Subscription & Service Agreement (“Agreement”) is entered into on ${new Date(`${effectiveDate}T00:00:00Z`).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric' })} (“Effective Date”) by and between:`);
  }
  if (document.contractAutofill.providerFieldsReady) {
    const provider = document.providerProfile || companyIdentity;
    names.push(providerField);
    values.push(`${provider.name.toUpperCase()}, a corporation duly registered under the laws of the Republic of the Philippines, with business address at ${provider.address}, hereinafter referred to as “ZeroOne” or the “Provider”;`);
  }
  const font = await embedContractFont(pdf);
  const filledFields = [];
  for (let index = 0; index < names.length; index += 1) {
    const field = form.getFieldMaybe(names[index]);
    if (!(field instanceof PDFTextField)) fail('The POS contract PDF is missing a required client detail field.');
    const width = Math.min(...field.acroField.getWidgets().map(widget => widget.getRectangle().width - 2));
    // Keep short values at the surrounding body size; shrink only a long value
    // that genuinely cannot fit its single-line placeholder.
    const size = field.isMultiline() ? typography.bodySize : Math.min(typography.bodySize, typography.bodySize * width / Math.max(1, font.widthOfTextAtSize(values[index], typography.bodySize)));
    filledFields.push({ field, value: values[index], size });
  }
  clearOverlayText(pdf, filledFields.filter(({ field }) => [providerField, introductionField].includes(field.getName())).map(({ field }) => field));
  for (const { field, value, size } of filledFields) {
    for (const widget of field.acroField.getWidgets()) {
      const page = pdf.getPages().find(entry => entry.ref.toString() === widget.P()?.toString());
      if (!page) fail('The POS contract detail field is not attached to a page.');
      const area = widget.getRectangle();
      page.drawText(value, { font, size, x: area.x + 1, y: field.isMultiline() ? area.y + area.height - size : area.y + 2, maxWidth: area.width - 2, lineHeight: typography.lineHeight });
    }
    form.removeField(field);
  }
  form.flatten();
  return Buffer.from(await pdf.save({ updateFieldAppearances: false }));
}
async function hasProviderField(bytes) {
  return (await PDFDocument.load(bytes, { updateMetadata: false })).getForm().getFieldMaybe(providerField) instanceof PDFTextField;
}
async function hasIntroductionField(bytes) {
  return (await PDFDocument.load(bytes, { updateMetadata: false })).getForm().getFieldMaybe(introductionField) instanceof PDFTextField;
}
module.exports = { fieldNames, providerField, introductionField, signingIntroduction, agreementDate, agreementSignatureDetails, assertContractReady, hasContractFields, hasProviderField, hasIntroductionField, fillContractPdf };
