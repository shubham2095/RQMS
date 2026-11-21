const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const jsonField = require('../utils/jsonField');

// Append-only: sirf created_at (updatedAt nahi).
const AuditLog = sequelize.define(
  'AuditLog',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    action: { type: DataTypes.STRING(60), allowNull: false },
    auditable_type: { type: DataTypes.STRING(50), allowNull: true },
    auditable_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    description: { type: DataTypes.STRING(500), allowNull: false },
    properties: jsonField('properties'),
    ip_address: { type: DataTypes.STRING(64), allowNull: true },
    user_agent: { type: DataTypes.STRING(255), allowNull: true },
  },
  { tableName: 'audit_logs', updatedAt: false }
);

module.exports = AuditLog;
