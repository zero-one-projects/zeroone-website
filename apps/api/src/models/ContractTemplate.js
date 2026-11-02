const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('ContractTemplate', {
  quoteType: { type: DataTypes.STRING(20), primaryKey: true, field: 'quote_type' },
  terms: { type: DataTypes.TEXT('medium'), allowNull: false },
  format: { type: DataTypes.JSON, allowNull: true },
  source: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'default' },
  pdfId: { type: DataTypes.UUID, allowNull: true, field: 'pdf_id' }
}, { tableName: 'contract_templates', underscored: true });
