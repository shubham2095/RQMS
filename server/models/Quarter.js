const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const { enums } = require('../config/rqms');

const Quarter = sequelize.define(
  'Quarter',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    quarter_number: { type: DataTypes.STRING(30), allowNull: false },
    quarter_type: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: { isIn: [enums.quarterTypes] },
    },
    colony_name: { type: DataTypes.STRING(150), allowNull: false },
    address: { type: DataTypes.STRING(255), allowNull: true },
    railway_zone: { type: DataTypes.STRING(100), allowNull: true },
    division: { type: DataTypes.STRING(100), allowNull: true },
    station: { type: DataTypes.STRING(100), allowNull: false },
    block: { type: DataTypes.STRING(50), allowNull: true },
    floor: { type: DataTypes.STRING(30), allowNull: true },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'vacant',
      validate: { isIn: [enums.quarterStatuses] },
    },
    current_occupant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { tableName: 'quarters' }
);

module.exports = Quarter;
