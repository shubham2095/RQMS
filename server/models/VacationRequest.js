const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const { enums, vacationClearanceSteps } = require('../config/rqms');

const VacationRequest = sequelize.define(
  'VacationRequest',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    reference_no: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    allotment_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    quarter_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    employee_profile_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    trigger: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { isIn: [enums.vacationTriggers] },
    },
    requested_vacation_date: { type: DataTypes.DATEONLY, allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'submitted',
      validate: { isIn: [enums.vacationStatuses] },
    },
    current_step: {
      type: DataTypes.STRING(30),
      allowNull: true,
      validate: { isIn: [vacationClearanceSteps] },
    },
    completed_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: 'vacation_requests' }
);

module.exports = VacationRequest;
