// Simple migration runner.
// Usage: npm run migrate
// src/db/migrations ki .sql files filename order mein chalti hain (e.g. 001_xxx.sql, 002_xxx.sql).
// Jo file chal chuki hai wo `migrations` table mein record hoti hai, dobara nahi chalti.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const migrationsDir = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getExecuted(conn) {
  const [rows] = await conn.query('SELECT filename FROM migrations');
  return new Set(rows.map((r) => r.filename));
}

function getMigrationFiles() {
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

async function runMigration(conn, filename) {
  const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf8');
  // MySQL mein DDL auto-commit hota hai, isliye yahan transaction nahi — file fail ho to wahi ruk jaata hai.
  await conn.query(sql);
  await conn.query('INSERT INTO migrations (filename) VALUES (?)', [filename]);
}

async function migrate() {
  // Pool ki jagah single connection: multipleStatements on chahiye (ek file mein kai statements)
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rqms',
    multipleStatements: true,
  });

  try {
    await ensureMigrationsTable(conn);
    const executed = await getExecuted(conn);
    const pending = getMigrationFiles().filter((f) => !executed.has(f));

    if (pending.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    for (const filename of pending) {
      console.log(`Running ${filename} ...`);
      await runMigration(conn, filename);
      console.log(`Done    ${filename}`);
    }
    console.log(`${pending.length} migration(s) applied.`);
  } finally {
    await conn.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
