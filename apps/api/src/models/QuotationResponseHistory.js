const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('QuotationResponseHistory', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  quotationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'quotation_id' },
  documentHash: { type: DataTypes.STRING(64), allowNull: false, field: 'document_hash' },
  response: { type: DataTypes.JSON, allowNull: false }
}, { tableName: 'quotation_response_history', underscored: true,
  indexes: [{ unique: true, fields: ['quotation_id', 'document_hash'] }] });
