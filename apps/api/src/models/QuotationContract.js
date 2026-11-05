const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('QuotationContract', {
  id: { type: DataTypes.UUID, primaryKey: true },
  quotationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'quotation_id' },
  documentHash: { type: DataTypes.STRING(64), allowNull: false, field: 'document_hash' },
  document: { type: DataTypes.JSON, allowNull: false },
  signature: { type: DataTypes.JSON, allowNull: true },
  providerAcceptance: { type: DataTypes.JSON, allowNull: true, field: 'provider_acceptance' },
  priorProviderAcceptance: { type: DataTypes.JSON, allowNull: true, field: 'prior_provider_acceptance' },
  clientPdf: { type: DataTypes.BLOB('long'), allowNull: true, field: 'client_pdf' },
  clientPdfSha256: { type: DataTypes.STRING(64), allowNull: true, field: 'client_pdf_sha256' },
  finalPdf: { type: DataTypes.BLOB('long'), allowNull: true, field: 'final_pdf' },
  finalPdfSha256: { type: DataTypes.STRING(64), allowNull: true, field: 'final_pdf_sha256' },
  finalizedAt: { type: DataTypes.DATE(3), allowNull: true, field: 'finalized_at' }
}, { tableName: 'quotation_contracts', underscored: true, indexes: [{ unique: true, fields: ['quotation_id', 'document_hash'] }] });
