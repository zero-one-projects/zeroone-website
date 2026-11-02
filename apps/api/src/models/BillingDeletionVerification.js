const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('BillingDeletionVerification', {
  id: { type: DataTypes.UUID, primaryKey: true },
  adminId: { type: DataTypes.STRING(180), allowNull: false, field: 'admin_id' },
  selection: { type: DataTypes.JSON, allowNull: false },
  selectionHash: { type: DataTypes.STRING(64), allowNull: false, field: 'selection_hash' },
  codeHash: { type: DataTypes.STRING(64), allowNull: false, field: 'code_hash' },
  expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
  deliveredAt: { type: DataTypes.DATE, allowNull: true, field: 'delivered_at' },
  attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  consumedAt: { type: DataTypes.DATE, allowNull: true, field: 'consumed_at' }
}, { tableName: 'billing_deletion_verifications', underscored: true, indexes: [{ fields: ['admin_id', 'created_at'] }, { fields: ['created_at'] }] });
