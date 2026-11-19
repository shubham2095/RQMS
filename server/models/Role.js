const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Role = sequelize.define(
  'Role',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    slug: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
  },
  { tableName: 'roles' }
);

module.exports = Role;
