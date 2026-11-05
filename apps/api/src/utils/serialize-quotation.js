const { defaultPaymentInstructions, paymentSummary } = require('./quotation-payment');
const { quotationExpiresAt } = require('./quotation-sharing');
const { responseSummary, documentHash } = require('./quotation-response');
const { quotationContract } = require('./quotation-contract');

function serializeQuotation(row, includeShare = false) {
  const document = { ...row.document };
  if (!includeShare && document.clientFlow === 'quotation_only') {
    for (const key of ['contractText', 'contractSource', 'contractPdf', 'contractStyle', 'contractDetails', 'paymentInstructions', 'initialPaymentPercent']) delete document[key];
  }
  return {
    id: row.id,
    reference: `ZO-${new Date(row.createdAt).getUTCFullYear()}-${String(row.id).padStart(5, '0')}`,
    document,
    paymentInstructions: row.document.clientFlow === 'quotation_only' ? '' : row.document.paymentInstructions?.trim() || defaultPaymentInstructions,
    contractText: row.clientResponse?.action === 'accept' && row.clientResponse.documentHash === documentHash(row.document) ? row.clientResponse.contractText || quotationContract(row.document) : quotationContract(row.document),
    paymentSummary: row.document.clientFlow === 'quotation_only' ? null : paymentSummary(row.document, row.clientResponse?.contractText || quotationContract(row.document)),
    documentVersion: documentHash(row.document),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    clientResponse: responseSummary(row, includeShare),
    contractState: require('./contract-acceptance').publicState(row, includeShare),
    ...require('./payment-verification').publicPaymentState(row),
    ...(includeShare ? {
      sharePath: row.shareToken ? `/quotation/${row.shareToken}` : null,
      expiresAt: quotationExpiresAt(row.document.validUntil)
    } : {})
  };
}

module.exports = { serializeQuotation };
