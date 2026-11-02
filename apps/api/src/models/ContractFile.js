const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
module.exports = sequelize.define('ContractFile', {
  id: { type: DataTypes.UUID, primaryKey: true },
  quoteType: { type: DataTypes.STRING(20), allowNull: false, field: 'quote_type' },
  fileName: { type: DataTypes.STRING(180), allowNull: false, field: 'file_name' },
  sha256: { type: DataTypes.STRING(64), allowNull: false },
  byteLength: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'byte_length' },
  pageCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'page_count' },
  data: { type: DataTypes.BLOB('long'), allowNull: false }
}, { tableName: 'contract_files', underscored: true, updatedAt: false });
