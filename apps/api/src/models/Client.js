const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('Client', {
  id: { type: DataTypes.STRING(64), primaryKey: true },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  type: { type: DataTypes.STRING(20), allowNull: false },
  clientName: { type: DataTypes.STRING(180), allowNull: false },
  clientEmail: { type: DataTypes.STRING(180), allowNull: false },
  contactPerson: { type: DataTypes.STRING(180), allowNull: false, defaultValue: '' },
  clientAddress: { type: DataTypes.TEXT, allowNull: false }
}, { tableName: 'clients', underscored: true });
