const crypto = require('crypto');
const { PDFDocument, PDFName, PDFDict, PDFArray } = require('pdf-lib');
const { ContractFile } = require('../models');
const maxPdfBytes = 2 * 1024 * 1024;
const fileAttributes = ['id', 'quoteType', 'fileName', 'sha256', 'byteLength', 'pageCount', 'createdAt'];
const fail = (message) => Object.assign(new Error(message), { statusCode: 400 });
function fileMetadata(file) {
  return { id: file.id, fileName: file.fileName, sha256: file.sha256, byteLength: file.byteLength, pageCount: file.pageCount };
}
async function validatePdf(file) {
  if (!file || !/\.pdf$/i.test(file.originalname) || file.mimetype !== 'application/pdf' || file.buffer.subarray(0,5).toString() !== '%PDF-') throw fail('Choose a valid PDF contract.');
  if (file.buffer.length > maxPdfBytes) throw fail('PDF contracts must be 2 MB or smaller.');
  let pdf;
  try { pdf = await PDFDocument.load(file.buffer, { updateMetadata: false }); }
  catch { throw fail('This PDF cannot be opened. Upload a readable PDF without a password.'); }
  if (pdf.isEncrypted || pdf.getPageCount() < 1 || pdf.getPageCount() > 100) throw fail('Upload an unencrypted PDF with 1 to 100 pages.');
  // Contracts are documents: remove automatic/embedded actions, while keeping their page appearance.
  pdf.catalog.delete(PDFName.of('OpenAction')); pdf.catalog.delete(PDFName.of('AA'));
  const names = pdf.catalog.lookupMaybe(PDFName.of('Names'), PDFDict);
  names?.delete(PDFName.of('JavaScript')); names?.delete(PDFName.of('EmbeddedFiles'));
  for (const page of pdf.getPages()) {
    page.node.delete(PDFName.of('AA'));
    const annotations = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
    for (let i = 0; annotations && i < annotations.size(); i += 1) {
      const annotation = annotations.lookupMaybe(i, PDFDict); if (!annotation) continue;
      annotation.delete(PDFName.of('AA'));
      const action = annotation.lookupMaybe(PDFName.of('A'), PDFDict);
      if (action && !['/URI', '/GoTo'].includes(String(action.get(PDFName.of('S'))))) annotation.delete(PDFName.of('A'));
    }
  }
  const data = Buffer.from(await pdf.save());
  if (data.length > maxPdfBytes) throw fail('PDF contracts must be 2 MB or smaller after processing.');
  return { data, sha256: crypto.createHash('sha256').update(data).digest('hex'), byteLength: data.length, pageCount: pdf.getPageCount(),
    fileName: file.originalname.replace(/[\x00-\x1f\x7f/\\]/g, '_').slice(-180) };
}
async function getContractFile(metadata, withData = false) {
  if (!metadata?.id || !/^[a-f0-9-]{36}$/i.test(metadata.id)) throw fail('Select an uploaded PDF contract.');
  const file = await ContractFile.findByPk(metadata.id, { ...(withData ? {} : { attributes: fileAttributes }), logging: false });
  if (!file || (metadata.sha256 && metadata.sha256 !== file.sha256)) throw fail('This contract PDF is unavailable or has changed.');
  if (withData && crypto.createHash('sha256').update(file.data).digest('hex') !== file.sha256) throw fail('This contract PDF is unavailable or has changed.');
  return file;
}
async function contractSources() {
  const { ContractTemplate } = require('../models');
  const rows = await ContractTemplate.findAll({ logging: false });
  const result = {};
  for (const type of ['project','subscription','pos','sync_court']) {
    const row = rows.find((entry) => entry.quoteType === type);
    const file = row?.pdfId ? await ContractFile.findByPk(row.pdfId, { attributes: fileAttributes, logging: false }) : null;
    result[type] = { source: row?.source === 'pdf' && file ? 'pdf' : 'default', pdf: file ? fileMetadata(file) : null };
  }
  return result;
}
module.exports = { maxPdfBytes, fileAttributes, fileMetadata, validatePdf, getContractFile, contractSources };
