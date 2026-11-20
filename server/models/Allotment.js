const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const { enums } = require('../config/rqms');

const Allotment = sequelize.define(
  'Allotment',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    allotment_order_no: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    quarter_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    quarter_application_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    employee_profile_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'offered',
      validate: { isIn: [enums.allotmentStatuses] },
    },
    offered_at: { type: DataTypes.DATE, allowNull: false },
    responded_at: { type: DataTypes.DATE, allowNull: true },
    possession_date: { type: DataTypes.DATEONLY, allowNull: true },
    vacated_on: { type: DataTypes.DATEONLY, allowNull: true },
    approved_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
  },
  { tableName: 'allotments' }
);

module.exports = Allotment;
