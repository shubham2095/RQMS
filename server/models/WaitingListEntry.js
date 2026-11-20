const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const WaitingListEntry = sequelize.define(
  'WaitingListEntry',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    quarter_application_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
    quarter_type: { type: DataTypes.STRING(10), allowNull: false },
    station: { type: DataTypes.STRING(100), allowNull: false },
    priority_score: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    rank: { type: DataTypes.INTEGER, allowNull: true },
    waiting_since: { type: DataTypes.DATE, allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { tableName: 'waiting_list_entries' }
);

module.exports = WaitingListEntry;
