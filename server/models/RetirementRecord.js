const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const { enums } = require('../config/rqms');
const decimalField = require('../utils/decimalField');

const RetirementRecord = sequelize.define(
  'RetirementRecord',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    employee_profile_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    allotment_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    retirement_date: { type: DataTypes.DATEONLY, allowNull: false },
    retention_granted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    retention_period_days: { type: DataTypes.INTEGER, allowNull: true },
    retention_expiry_date: { type: DataTypes.DATEONLY, allowNull: true },
    overstay_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    penalty_amount: decimalField('penalty_amount', { allowNull: false, defaultValue: 0 }),
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'notice',
      validate: { isIn: [enums.retirementStatuses] },
    },
    last_evaluated_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: 'retirement_records' }
);

module.exports = RetirementRecord;
