const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: 'users',
    // password_hash kabhi galti se response mein na jaye — login ke liye User.scope('withPassword') use karo.
    defaultScope: { attributes: { exclude: ['password_hash'] } },
    scopes: { withPassword: { attributes: { include: ['password_hash'] } } },
  }
);

module.exports = User;
