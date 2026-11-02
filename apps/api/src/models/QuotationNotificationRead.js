const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('QuotationNotificationRead', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'user_id' },
  historyId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'history_id' }
}, { tableName: 'quotation_notification_reads', underscored: true,
  indexes: [{ unique: true, fields: ['user_id', 'history_id'] }] });
