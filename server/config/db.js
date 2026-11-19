require('./env');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'rqms',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: false,
    pool: { max: 10, min: 0, idle: 10000 },
    // snake_case columns (created_at, user_id ...) — CLAUDE.md section 8 ke tables ke saath match
    define: { underscored: true },
  }
);

module.exports = sequelize;
