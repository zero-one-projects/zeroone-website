const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('PosSubscription', {
  quotationId: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, field: 'quotation_id' },
  revisions: { type: DataTypes.JSON, allowNull: false }
}, { tableName: 'pos_subscriptions', underscored: true });
