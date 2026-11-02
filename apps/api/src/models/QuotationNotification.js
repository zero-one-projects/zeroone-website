const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('QuotationNotification', {
  id: { type: DataTypes.UUID, primaryKey: true },
  quotationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'quotation_id' },
  payload: { type: DataTypes.JSON, allowNull: false },
  status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'pending' },
  attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  nextAttemptAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'next_attempt_at' },
  lockedAt: { type: DataTypes.DATE, allowNull: true, field: 'locked_at' },
  sentAt: { type: DataTypes.DATE, allowNull: true, field: 'sent_at' },
  lastError: { type: DataTypes.STRING(500), allowNull: true, field: 'last_error' }
}, { tableName: 'quotation_notifications', underscored: true, indexes: [{ fields: ['status', 'next_attempt_at'] }] });
