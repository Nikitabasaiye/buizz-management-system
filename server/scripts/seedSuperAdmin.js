/**
 * Seed script: creates the initial super admin account.
 * Run once: node scripts/seedSuperAdmin.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const {
  MYSQL_HOST = 'localhost',
  MYSQL_PORT = 3306,
  MYSQL_USER = 'root',
  MYSQL_PASSWORD = '',
  MYSQL_DATABASE = 'buizz_management',
  SUPER_ADMIN_NAME = 'Super Admin',
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_PASSWORD,
} = process.env;

const SUPER_ADMIN = {
  name: SUPER_ADMIN_NAME,
  email: SUPER_ADMIN_EMAIL,
  password: SUPER_ADMIN_PASSWORD,
};

async function seed() {
  if (!SUPER_ADMIN.email || !SUPER_ADMIN.password) {
    throw new Error('Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in the environment before running this seed.');
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
