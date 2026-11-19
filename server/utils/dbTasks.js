// Database tasks: create / migrate / seed / reset
// Root se chalao:  npm run db:create | db:migrate | db:seed | db:reset
require('../config/env');
const path = require('path');
const mysql = require('mysql2/promise');
const { Umzug, SequelizeStorage } = require('umzug');
const { Sequelize } = require('sequelize');
const sequelize = require('../config/db');

const dbName = process.env.DB_NAME || 'rqms';

function connectWithoutDatabase() {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });
}

// Migrations aur seeders ek hi tarah ke hain: har file { up(queryInterface, Sequelize), down(...) } export kare.
function makeUmzug(folder, tableName) {
  return new Umzug({
    migrations: {
      glob: ['*.js', { cwd: path.join(__dirname, '..', folder) }],
      resolve: ({ name, path: filePath, context }) => {
        const file = require(filePath);
        return {
          name,
          up: () => file.up(context, Sequelize),
          down: () => file.down(context, Sequelize),
        };
      },
    },
    context: sequelize.getQueryInterface(),
    // modelName alag hona zaroori hai, warna migrations aur seeders ek hi tracking table share kar lete hain.
    storage: new SequelizeStorage({ sequelize, tableName, modelName: tableName }),
    logger: console,
  });
}

async function createDatabase() {
  const conn = await connectWithoutDatabase();
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`Database "${dbName}" ready.`);
  } finally {
    await conn.end();
  }
}

async function dropDatabase() {
  const conn = await connectWithoutDatabase();
  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    console.log(`Database "${dbName}" dropped.`);
  } finally {
    await conn.end();
  }
}

async function migrate() {
  const done = await makeUmzug('migrations', 'sequelize_meta').up();
  console.log(`${done.length} migration(s) applied.`);
}

async function seed() {
  const done = await makeUmzug('seeders', 'sequelize_data').up();
  console.log(`${done.length} seeder(s) applied.`);
}

async function reset() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('db:reset is blocked when NODE_ENV=production');
  }
  await dropDatabase();
  await createDatabase();
  await migrate();
  await seed();
}

const tasks = { create: createDatabase, migrate, seed, reset };

async function run(taskName) {
  const task = tasks[taskName];
  if (!task) {
    console.error(`Unknown task "${taskName}". Use: ${Object.keys(tasks).join(' | ')}`);
    process.exit(1);
  }
  try {
    await task();
  } catch (err) {
    console.error(`db:${taskName} failed:`, err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  run(process.argv[2]);
}

module.exports = { createDatabase, migrate, seed, reset };
