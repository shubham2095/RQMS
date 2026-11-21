const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const NotificationLog = sequelize.define(
  'NotificationLog',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    channel: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'system' },
    event: { type: DataTypes.STRING(60), allowNull: false },
    title: { type: DataTypes.STRING(150), allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'logged' }, // logged -> read
    response: { type: DataTypes.TEXT, allowNull: true },
    sent_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: 'notification_logs' }
);

module.exports = NotificationLog;
