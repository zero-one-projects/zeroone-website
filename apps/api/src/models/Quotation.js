const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('Quotation', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  document: { type: DataTypes.JSON, allowNull: false },
  contractState: { type: DataTypes.JSON, allowNull: true, field: 'contract_state' },
  paymentState: { type: DataTypes.JSON, allowNull: true, field: 'payment_state' },
  shareToken: { type: DataTypes.STRING(64), allowNull: true, unique: true, field: 'share_token' },
  clientResponse: { type: DataTypes.JSON, allowNull: true, field: 'client_response' }
}, { tableName: 'quotations', underscored: true, paranoid: true });
