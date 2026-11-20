const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const { enums } = require('../config/rqms');
const jsonField = require('../utils/jsonField');

const QuarterApplication = sequelize.define(
  'QuarterApplication',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    reference_no: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    employee_profile_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    preferred_quarter_type: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: { isIn: [enums.quarterTypes] },
    },
    preferred_colony: { type: DataTypes.STRING(150), allowNull: true },
    station: { type: DataTypes.STRING(100), allowNull: false },
    division: { type: DataTypes.STRING(100), allowNull: true },
    service_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { isIn: [enums.serviceTypes] },
    },
    category: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { isIn: [enums.categories] },
    },
    family_size: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    medical_ground: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    special_grounds: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'submitted',
      validate: { isIn: [enums.applicationStatuses] },
    },
    priority_score: { type: DataTypes.INTEGER, allowNull: true },
    eligibility_result: jsonField('eligibility_result'),
    priority_breakdown: jsonField('priority_breakdown'),
    applied_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    verified_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    verified_at: { type: DataTypes.DATE, allowNull: true },
    decided_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    decided_at: { type: DataTypes.DATE, allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
  },
  { tableName: 'quarter_applications' }
);

module.exports = QuarterApplication;
