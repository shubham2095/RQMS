const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Polymorphic: documentable_type ('QuarterApplication') + documentable_id
const Document = sequelize.define(
  'Document',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    documentable_type: { type: DataTypes.STRING(50), allowNull: false },
    documentable_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    category: { type: DataTypes.STRING(50), allowNull: false },
    title: { type: DataTypes.STRING(150), allowNull: true },
    original_name: { type: DataTypes.STRING(255), allowNull: false },
    path: { type: DataTypes.STRING(255), allowNull: false },
    disk: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'local' },
    mime: { type: DataTypes.STRING(100), allowNull: false },
    size: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    hash: { type: DataTypes.STRING(64), allowNull: true },
    uploaded_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { tableName: 'documents' }
);

module.exports = Document;
