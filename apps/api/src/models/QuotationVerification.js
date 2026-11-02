const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('QuotationVerification', {
  id: { type: DataTypes.UUID, primaryKey: true },
  quotationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'quotation_id' },
  email: { type: DataTypes.STRING(180), allowNull: false },
  action: { type: DataTypes.STRING(16), allowNull: false },
  documentHash: { type: DataTypes.STRING(64), allowNull: false, field: 'document_hash' },
  codeHash: { type: DataTypes.STRING(64), allowNull: false, field: 'code_hash' },
  expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
  attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  consumedAt: { type: DataTypes.DATE, allowNull: true, field: 'consumed_at' }
}, { tableName: 'quotation_verifications', underscored: true, indexes: [{ fields: ['quotation_id', 'email', 'created_at'] }] });
