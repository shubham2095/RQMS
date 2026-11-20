const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const { certificateTypes } = require('../config/rqms');
const jsonField = require('../utils/jsonField');

// Polymorphic: certifiable_type ('Allotment') + certifiable_id
const Certificate = sequelize.define(
  'Certificate',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    certifiable_type: { type: DataTypes.STRING(50), allowNull: false },
    certifiable_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: { isIn: [Object.keys(certificateTypes)] },
    },
    number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    payload: jsonField('payload'),
    file_path: { type: DataTypes.STRING(255), allowNull: true },
    is_signed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    signed_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    signed_at: { type: DataTypes.DATE, allowNull: true },
    issued_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    issued_at: { type: DataTypes.DATE, allowNull: false },
  },
  { tableName: 'certificates' }
);

module.exports = Certificate;
