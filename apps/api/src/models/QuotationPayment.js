const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

function immutable() {
  throw new Error('Verified payment records are immutable. Record corrections separately.');
}

module.exports = sequelize.define('QuotationPayment', {
  id: { type: DataTypes.UUID, primaryKey: true },
  quotationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'quotation_id' },
  documentHash: { type: DataTypes.STRING(64), allowNull: false, field: 'document_hash' },
  status: { type: DataTypes.STRING(16), allowNull: false, validate: { isIn: [['paid']] } },
  paymentDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'payment_date' },
  amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  currency: { type: DataTypes.STRING(3), allowNull: false },
  referenceNumber: { type: DataTypes.STRING(180), allowNull: false, field: 'reference_number' },
  paymentMethod: { type: DataTypes.STRING(80), allowNull: false, field: 'payment_method' },
  source: { type: DataTypes.STRING(24), allowNull: false, validate: { isIn: [['manual', 'hitpay']] } },
  idempotencyKey: { type: DataTypes.STRING(180), allowNull: false, unique: true, field: 'idempotency_key' },
  providerTransactionId: { type: DataTypes.STRING(180), allowNull: true, field: 'provider_transaction_id' },
  providerEventId: { type: DataTypes.STRING(180), allowNull: true, field: 'provider_event_id' },
  deduplicationKey: { type: DataTypes.STRING(64), allowNull: false, unique: true, field: 'deduplication_key' },
  payloadHash: { type: DataTypes.STRING(64), allowNull: false, field: 'payload_hash' },
  note: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
  verifiedBy: { type: DataTypes.JSON, allowNull: false, field: 'verified_by' },
  verifiedAt: { type: DataTypes.DATE(3), allowNull: false, field: 'verified_at' },
  agreement: { type: DataTypes.JSON, allowNull: false }
}, {
  tableName: 'quotation_payments', underscored: true, updatedAt: false,
  indexes: [{ fields: ['quotation_id', 'document_hash'] }, { unique: true, fields: ['source', 'provider_transaction_id'] }],
  hooks: { beforeUpdate: immutable, beforeBulkUpdate: immutable }
});
