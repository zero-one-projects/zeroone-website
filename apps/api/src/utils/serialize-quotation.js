const { defaultPaymentInstructions } = require('./quotation-payment');
const { quotationExpiresAt } = require('./quotation-sharing');
const { responseSummary, documentHash } = require('./quotation-response');
const { quotationContract } = require('./quotation-contract');

function serializeQuotation(row, includeShare = false) {
  return {
    id: row.id,
    reference: `ZO-${new Date(row.createdAt).getUTCFullYear()}-${String(row.id).padStart(5, '0')}`,
    document: row.document,
    paymentInstructions: row.document.paymentInstructions?.trim() || defaultPaymentInstructions,
    contractText: row.clientResponse?.action === 'accept' && row.clientResponse.documentHash === documentHash(row.document) ? row.clientResponse.contractText || quotationContract(row.document) : quotationContract(row.document),
    documentVersion: documentHash(row.document),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    clientResponse: responseSummary(row, includeShare),
    ...(includeShare ? {
      sharePath: row.shareToken ? `/quotation/${row.shareToken}` : null,
      expiresAt: quotationExpiresAt(row.document.validUntil)
    } : {})
  };
}

module.exports = { serializeQuotation };
