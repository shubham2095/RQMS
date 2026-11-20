const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const { enums, vacationClearanceSteps } = require('../config/rqms');

// DECIMAL mysql2 se string aata hai ("12.50") — API mein number dikhao.
function decimalField(name) {
  return {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    get() {
      const value = this.getDataValue(name);
      return value === null || value === undefined ? null : Number(value);
    },
  };
}

const VacationClearance = sequelize.define(
  'VacationClearance',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    vacation_request_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    step: {
      type: DataTypes.STRING(30),
      allowNull: false,
      validate: { isIn: [vacationClearanceSteps] },
    },
    sequence: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      validate: { isIn: [enums.clearanceStatuses] },
    },
    handled_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    meter_reading: decimalField('meter_reading'),
    dues_amount: decimalField('dues_amount'),
    has_damage: { type: DataTypes.BOOLEAN, allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    acted_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: 'vacation_clearances' }
);

module.exports = VacationClearance;
