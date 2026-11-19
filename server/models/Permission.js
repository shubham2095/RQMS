const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Permission = sequelize.define(
  'Permission',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    group: { type: DataTypes.STRING(50), allowNull: true },
  },
  { tableName: 'permissions' }
);

module.exports = Permission;
