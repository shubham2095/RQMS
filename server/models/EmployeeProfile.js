const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const { enums } = require('../config/rqms');

const EmployeeProfile = sequelize.define(
  'EmployeeProfile',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
    employee_id: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    designation: { type: DataTypes.STRING(100), allowNull: true },
    department: { type: DataTypes.STRING(100), allowNull: true },
    station: { type: DataTypes.STRING(100), allowNull: true },
    division: { type: DataTypes.STRING(100), allowNull: true },
    railway_zone: { type: DataTypes.STRING(100), allowNull: true },
    category: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'GENERAL',
      validate: { isIn: [enums.categories] },
    },
    service_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'non_essential',
      validate: { isIn: [enums.serviceTypes] },
    },
    grade_pay: { type: DataTypes.INTEGER, allowNull: true },
    pay_level: { type: DataTypes.STRING(30), allowNull: true },
    date_of_joining: { type: DataTypes.DATEONLY, allowNull: true },
    retirement_date: { type: DataTypes.DATEONLY, allowNull: true },
    has_active_allotment: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { tableName: 'employee_profiles' }
);

module.exports = EmployeeProfile;
