const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Occupancy = sequelize.define(
  'Occupancy',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    quarter_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    allotment_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    employee_profile_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    start_date: { type: DataTypes.DATEONLY, allowNull: false },
    end_date: { type: DataTypes.DATEONLY, allowNull: true },
    is_current: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { tableName: 'occupancies' }
);

module.exports = Occupancy;
