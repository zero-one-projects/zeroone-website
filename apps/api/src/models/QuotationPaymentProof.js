const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('QuotationPaymentProof', {
  id: { type: DataTypes.UUID, primaryKey: true },
  quotationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'quotation_id' },
  documentHash: { type: DataTypes.STRING(64), allowNull: false, field: 'document_hash' },
  clientEmail: { type: DataTypes.STRING(180), allowNull: false, field: 'client_email' },
  amountPaid: { type: DataTypes.DECIMAL(14, 2), allowNull: false, field: 'amount_paid' },
  paidOn: { type: DataTypes.DATEONLY, allowNull: false, field: 'paid_on' },
  transactionReference: { type: DataTypes.STRING(180), allowNull: false, field: 'transaction_reference' },
  note: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
  fileName: { type: DataTypes.STRING(180), allowNull: false, field: 'file_name' },
  mimeType: { type: DataTypes.STRING(40), allowNull: false, field: 'mime_type' },
  sha256: { type: DataTypes.STRING(64), allowNull: false },
  data: { type: DataTypes.BLOB('medium'), allowNull: false },
  snapshot: { type: DataTypes.JSON, allowNull: false }
}, { tableName: 'quotation_payment_proofs', underscored: true, updatedAt: false, indexes: [{ fields: ['quotation_id'] }] });
