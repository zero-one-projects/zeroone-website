const { ContractTemplate } = require('../models');
const { defaultContractTexts } = require('./quotation-contract');
const { getContractFile, fileMetadata, contractSources } = require('./contract-files');
const { normalizeQuotation } = require('./quotation');
async function contractDefaults() {
  const rows = await ContractTemplate.findAll({ logging: false });
  return { ...defaultContractTexts, ...Object.fromEntries(rows.map((row) => [row.quoteType, row.terms])) };
}
async function contractFormats() {
  const rows = await ContractTemplate.findAll({ logging: false });
  return Object.fromEntries(rows.filter((row) => row.format).map((row) => [row.quoteType, row.format]));
}
async function prepareQuotation(input) {
  if (!input || (input.contractText !== undefined && typeof input.contractText !== 'string')) return normalizeQuotation(input);
  // Quotation-only delivery does not require a contract template or PDF.
  if (input.clientFlow === 'quotation_only') return normalizeQuotation({ ...input, contractSource: 'default', contractPdf: undefined });
  if (input.contractSource === undefined && input.contractText === undefined) {
    const selected = (await contractSources())[input.quoteType || 'project'];
    if (selected?.source === 'pdf') input = { ...input, contractSource: 'pdf', contractPdf: selected.pdf };
  }
  if (input.contractSource === 'pdf') {
    const file = await getContractFile(input.contractPdf);
    if (file.quoteType !== (input.quoteType || 'project')) throw Object.assign(new Error('Choose a PDF for this quotation type.'), { statusCode: 400 });
    return normalizeQuotation({ ...input, contractSource: 'pdf', contractPdf: fileMetadata(file), contractText: '', contractStyle: undefined });
  }
  const defaults = await contractDefaults();
  const type = input.quoteType || 'project';
  const contractText = input.contractText?.trim() || defaults[type] || '';
  const formats = await contractFormats();
  const contractStyle = input.contractStyle === undefined && contractText === defaults[type] ? formats[type] : input.contractStyle;
  return normalizeQuotation({ ...input, contractPdf: undefined, contractText, contractStyle });
}
module.exports = { contractDefaults, contractFormats, prepareQuotation };
