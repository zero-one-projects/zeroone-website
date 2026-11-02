const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('BillingStatement', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  shareToken: { type: DataTypes.STRING(64), allowNull: true, unique: true, field: 'share_token' },
  quotationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'quotation_id' },
  emailSentAt: { type: DataTypes.DATE(3), allowNull: true, field: 'email_sent_at' },
  emailSentTo: { type: DataTypes.STRING(180), allowNull: true, field: 'email_sent_to' },
  period: { type: DataTypes.STRING(7), allowNull: false },
  document: { type: DataTypes.JSON, allowNull: false }
}, { tableName: 'billing_statements', underscored: true,
  indexes: [{ unique: true, name: 'billing_quotation_month_unique', fields: ['quotation_id', 'period'] }] });
