/**
 * Seed script: creates the initial super admin account.
 * Run once: node scripts/seedSuperAdmin.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
  SUPER_ADMIN_NAME,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_PASSWORD,
} = process.env;

const SUPER_ADMIN = {
  name: SUPER_ADMIN_NAME,
  email: SUPER_ADMIN_EMAIL,
  password: SUPER_ADMIN_PASSWORD,
};

async function seed() {
  const required = [
    'MYSQL_HOST',
    'MYSQL_PORT',
    'MYSQL_USER',
    'MYSQL_PASSWORD',
    'MYSQL_DATABASE',
    'SUPER_ADMIN_NAME',
    'SUPER_ADMIN_EMAIL',
    'SUPER_ADMIN_PASSWORD',
  ];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const connection = await mysql.createConnection({
    host: MYSQL_HOST,
    port: Number(MYSQL_PORT),
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
  });

  try {
    const [existing] = await connection.execute(
      'SELECT user_id FROM users WHERE email = ?',
      [SUPER_ADMIN.email]
    );

    if (existing.length > 0) {
      return;
    }

    const hashed = await bcrypt.hash(SUPER_ADMIN.password, 12);

    const [result] = await connection.execute(
      `INSERT INTO users (name, email, password, role, is_verified, is_active)
       VALUES (?, ?, ?, 'super_admin', 1, 1)`,
      [SUPER_ADMIN.name, SUPER_ADMIN.email, hashed]
    );
    await connection.execute(
      'UPDATE users SET display_id = ? WHERE user_id = ? AND display_id IS NULL',
      [result.insertId, result.insertId]
    );

    process.stdout.write('Super admin created successfully.\n');
    process.stdout.write(`  Email   : ${SUPER_ADMIN.email}\n`);
    process.stdout.write('Change the password after first login.\n');
  } finally {
    await connection.end();
  }
}

seed().catch((err) => {
  process.stderr.write(`Seed failed: ${err.message}\n`);
  process.exit(1);
});
