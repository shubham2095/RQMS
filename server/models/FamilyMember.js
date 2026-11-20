const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FamilyMember = sequelize.define(
  'FamilyMember',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    employee_profile_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(150), allowNull: false },
    relation: { type: DataTypes.STRING(50), allowNull: false },
    date_of_birth: { type: DataTypes.DATEONLY, allowNull: true },
    is_dependent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { tableName: 'family_members' }
);

module.exports = FamilyMember;
