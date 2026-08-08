const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');
const DATABASE_URL = process.env.MYSQL_DATABASE;

if (!process.env.MYSQL_HOST || !process.env.MYSQL_DATABASE || !process.env.MYSQL_USER) {
  console.error('Missing MySQL configuration. Set MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER, and MYSQL_PASSWORD in .env or environment variables.');
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 5),
  queueLimit: 0,
  multipleStatements: true,
  timezone: 'Z',
});

async function ensureMigrationsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS migrations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      filename VARCHAR(255) NOT NULL,
      checksum CHAR(64) NOT NULL,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY migration_filename_unique (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await pool.query(sql);
}

async function getAppliedMigrations() {
  const [rows] = await pool.query('SELECT filename, checksum FROM migrations ORDER BY filename');
  return rows.map((row) => row.filename);
}

async function getMigrationFiles() {
  const files = await fs.readdir(MIGRATIONS_DIR);
  return files
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

async function checksum(content) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

async function executeMigration(filename) {
  const filepath = path.join(MIGRATIONS_DIR, filename);
  const content = await fs.readFile(filepath, 'utf8');
  if (!content.trim()) {
    console.log(`Skipping empty migration: ${filename}`);
    return;
  }
  const hash = await checksum(content);
  console.log(`Applying migration ${filename}`);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(content);
    await connection.execute(
      'INSERT INTO migrations (filename, checksum) VALUES (?, ?)',
      [filename, hash]
    );
    await connection.commit();
    console.log(`✔ Applied: ${filename}`);
  } catch (error) {
    await connection.rollback();
    console.error(`✖ Failed migration ${filename}:`, error.message);
    throw error;
  } finally {
    connection.release();
  }
}

async function run() {
  console.log(`Running migrations for database: ${DATABASE_URL}`);
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const migrationFiles = await getMigrationFiles();
  const pending = migrationFiles.filter((filename) => !applied.includes(filename));

  if (pending.length === 0) {
    console.log('No pending migrations. Database is up to date.');
    await pool.end();
    return;
  }

  for (const filename of pending) {
    await executeMigration(filename);
  }

  console.log('Migrations complete.');
  await pool.end();
}

run().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
