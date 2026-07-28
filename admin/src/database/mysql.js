const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

let pool;
let status = {
  connected: false,
  schemaReady: false,
  lastError: null,
  connectedAt: null,
};

const hasMysqlConfig = () => Boolean(
  process.env.MYSQL_HOST &&
  process.env.MYSQL_DATABASE &&
  process.env.MYSQL_USER
);

const normalizeMysqlHost = (host) => (host === 'localhost' ? '127.0.0.1' : host);

const connectMySQL = async () => {
  if (!hasMysqlConfig()) {
    const message = 'MySQL configuration is incomplete. Set MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER, and MYSQL_PASSWORD.';
    status = { ...status, connected: false, schemaReady: false, lastError: message };
    if (process.env.NODE_ENV === 'production') throw new Error(message);
    logger.warn(`${message} MySQL will be skipped in development.`);
    return null;
  }

  try {
    pool = mysql.createPool({
      host: normalizeMysqlHost(process.env.MYSQL_HOST),
      port: Number(process.env.MYSQL_PORT) || 3306,
      database: process.env.MYSQL_DATABASE,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD || '',
      waitForConnections: true,
      connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT) || 10,
      queueLimit: 0,
      timezone: 'Z'
    });

    await pool.query('SELECT 1');
    status = {
      connected: true,
      schemaReady: false,
      lastError: null,
      connectedAt: new Date().toISOString(),
    };

    try {
      await initializeSchema();
      status = { ...status, schemaReady: true, lastError: null };
    } catch (schemaError) {
      status = {
        ...status,
        schemaReady: false,
        lastError: `Schema initialization failed: ${schemaError.message}`,
      };
      logger.error('MySQL schema initialization failed:', schemaError);

      if (process.env.SCHEMA_INIT_STRICT === 'true') {
        throw schemaError;
      }
    }

    logger.info('MySQL connected successfully');
    return pool;
  } catch (error) {
    status = {
      connected: false,
      schemaReady: false,
      lastError: error.message,
      connectedAt: null,
    };
    if (process.env.NODE_ENV === 'production') throw error;
    logger.warn(`MySQL connection skipped in development: ${error.message}`);
    pool = null;
    return null;
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const columnExists = async (table, column) => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return Number(rows[0].count) > 0;
};

const addColumnIfMissing = async (table, column, definition) => {
  if (!(await columnExists(table, column))) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};

const indexExists = async (table, index) => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, index]
  );
  return Number(rows[0].count) > 0;
};

const addIndexIfMissing = async (table, index, columns) => {
  if (!(await indexExists(table, index))) {
    await pool.query(`ALTER TABLE ${table} ADD INDEX ${index} (${columns})`);
  }
};

const addUniqueIndexIfMissing = async (table, index, columns) => {
  if (!(await indexExists(table, index))) {
    await pool.query(`ALTER TABLE ${table} ADD UNIQUE INDEX ${index} (${columns})`);
  }
};

const renameColumnIfExists = async (table, oldCol, newCol, definition) => {
  if ((await columnExists(table, oldCol)) && !(await columnExists(table, newCol))) {
    await pool.query(`ALTER TABLE ${table} CHANGE COLUMN ${oldCol} ${newCol} ${definition}`).catch((err) => {
      logger.warn(`Could not rename ${table}.${oldCol} to ${newCol}: ${err.message}`);
    });
  }
};

// ── Schema ────────────────────────────────────────────────────────────────────
const initializeSchema = async () => {
  if (!pool) return;

  await pool.query(`SET FOREIGN_KEY_CHECKS = 0`);

  // ── launch_waitlist ──────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS launch_waitlist (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      email VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY launch_waitlist_email_unique (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── users ────────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      display_id BIGINT UNSIGNED NULL,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(40) NULL,
      role ENUM('super_admin', 'admin', 'organizer', 'user', 'influencer') NOT NULL DEFAULT 'user',
      organization_id BIGINT UNSIGNED NULL,
      avatar VARCHAR(500) NULL,
      is_verified TINYINT(1) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      last_login DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id),
      UNIQUE KEY users_email_unique (email),
      UNIQUE KEY users_display_id_unique (display_id),
      KEY users_organization_id_index (organization_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // migrate id → user_id if old column still exists
  await renameColumnIfExists('users', 'id', 'user_id', 'BIGINT UNSIGNED NOT NULL AUTO_INCREMENT');
  await addColumnIfMissing('users', 'display_id', 'BIGINT UNSIGNED NULL AFTER user_id');
  await pool.query('UPDATE users SET display_id = user_id WHERE display_id IS NULL');
  await addUniqueIndexIfMissing('users', 'users_display_id_unique', 'display_id');

  // ── organizations ────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(180) NOT NULL,
      slug VARCHAR(220) NOT NULL,
      description TEXT NULL,
      logo VARCHAR(500) NULL,
      website VARCHAR(500) NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(40) NULL,
      address_street VARCHAR(255) NULL,
      address_city VARCHAR(120) NULL,
      address_state VARCHAR(120) NULL,
      address_country VARCHAR(120) NULL,
      address_zip_code VARCHAR(40) NULL,
      owner_id BIGINT UNSIGNED NOT NULL,
      is_verified TINYINT(1) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY organizations_slug_unique (slug),
      KEY organizations_owner_id_index (owner_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── organization_members ─────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS organization_members (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      organization_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      role ENUM('owner', 'admin', 'member') NOT NULL DEFAULT 'member',
      joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY organization_members_unique (organization_id, user_id),
      KEY organization_members_user_id_index (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── events ───────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      organization_id BIGINT UNSIGNED NULL,
      organizer_id BIGINT UNSIGNED NOT NULL,
      category VARCHAR(120) NOT NULL,
      type ENUM('online', 'offline', 'hybrid') NOT NULL DEFAULT 'offline',
      status ENUM('draft', 'published', 'ongoing', 'completed', 'cancelled') NOT NULL DEFAULT 'draft',
      start_date DATETIME NOT NULL,
      end_date DATETIME NOT NULL,
      venue_name VARCHAR(255) NULL,
      venue_address VARCHAR(500) NULL,
      venue_city VARCHAR(100) NULL,
      venue_state VARCHAR(100) NULL,
      venue_country VARCHAR(100) NULL,
      venue_lat DECIMAL(10, 8) NULL,
      venue_lng DECIMAL(11, 8) NULL,
      online_link VARCHAR(500) NULL,
      banner VARCHAR(500) NULL,
      images LONGTEXT NULL,
      tags LONGTEXT NULL,
      is_featured TINYINT(1) NOT NULL DEFAULT 0,
      total_seats INT UNSIGNED NULL,
      available_seats INT UNSIGNED NULL,
      views INT UNSIGNED NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (event_id),
      UNIQUE KEY events_slug_unique (slug),
      KEY events_organizer_id_index (organizer_id),
      KEY events_status_index (status),
      KEY events_category_index (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // migrate id → event_id if old column still exists
  await renameColumnIfExists('events', 'id', 'event_id', 'BIGINT UNSIGNED NOT NULL AUTO_INCREMENT');

  // drop old ticket_types column from events if it exists
  if (await columnExists('events', 'ticket_types')) {
    await pool.query('ALTER TABLE events DROP COLUMN ticket_types').catch((err) =>
      logger.warn(`Could not drop events.ticket_types: ${err.message}`)
    );
  }

  // ── ticket_types ─────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ticket_types (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      event_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(100) NOT NULL,
      description TEXT NULL,
      price DECIMAL(10, 2) NOT NULL,
      quantity INT UNSIGNED NOT NULL,
      available_quantity INT UNSIGNED NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY ticket_types_event_id_index (event_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      booking_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      booking_number VARCHAR(50) NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      event_id BIGINT UNSIGNED NOT NULL,
      ticket_type_id BIGINT UNSIGNED NOT NULL,
      quantity INT UNSIGNED NOT NULL,
      total_amount DECIMAL(10, 2) NOT NULL,
      booking_status ENUM('pending', 'confirmed', 'cancelled', 'expired') NOT NULL DEFAULT 'pending',
      payment_status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
      booking_method ENUM('online', 'offline') NOT NULL DEFAULT 'online',
      created_by BIGINT UNSIGNED NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (booking_id),
      UNIQUE KEY bookings_booking_number_unique (booking_number),
      KEY bookings_user_id_index (user_id),
      KEY bookings_event_id_index (event_id),
      KEY bookings_ticket_type_id_index (ticket_type_id),
      KEY bookings_booking_status_index (booking_status),
      KEY bookings_payment_status_index (payment_status),
      KEY idx_bookings_method (booking_method),
      KEY idx_bookings_created_by (created_by)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await addColumnIfMissing('bookings', 'booking_method', "ENUM('online', 'offline') NOT NULL DEFAULT 'online' AFTER payment_status");
  await addColumnIfMissing('bookings', 'created_by', 'BIGINT UNSIGNED NULL AFTER booking_method');
  await addIndexIfMissing('bookings', 'idx_bookings_method', 'booking_method');
  await addIndexIfMissing('bookings', 'idx_bookings_created_by', 'created_by');

  // ── payments ─────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      payment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      booking_id BIGINT UNSIGNED NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      event_id BIGINT UNSIGNED NOT NULL,
      order_id VARCHAR(255) NOT NULL,
      transaction_id VARCHAR(255) NULL,
      amount DECIMAL(10, 2) NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'INR',
      status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
      payment_method VARCHAR(50) NULL,
      gateway_response LONGTEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (payment_id),
      UNIQUE KEY payments_order_id_unique (order_id),
      KEY payments_booking_id_index (booking_id),
      KEY payments_user_id_index (user_id),
      KEY payments_event_id_index (event_id),
      KEY payments_status_index (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await renameColumnIfExists('payments', 'id', 'payment_id', 'BIGINT UNSIGNED NOT NULL AUTO_INCREMENT');
  await renameColumnIfExists('payments', 'metadata', 'gateway_response', 'LONGTEXT NULL');
  await addColumnIfMissing('payments', 'booking_id', 'BIGINT UNSIGNED NULL AFTER payment_id');
  await addColumnIfMissing('payments', 'gateway_response', 'LONGTEXT NULL AFTER payment_method');

  // ── tickets ───────────────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      ticket_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      ticket_number VARCHAR(120) NOT NULL,
      booking_id BIGINT UNSIGNED NULL,
      payment_id BIGINT UNSIGNED NULL,
      event_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      ticket_type_id BIGINT UNSIGNED NULL,
      ticket_type VARCHAR(150) NULL,
      price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      qr_code LONGTEXT NULL,
      qr_data LONGTEXT NULL,
      status ENUM('active', 'used', 'cancelled', 'expired') NOT NULL DEFAULT 'active',
      checked_in TINYINT(1) NOT NULL DEFAULT 0,
      checked_in_at DATETIME NULL,
      scanned_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (ticket_id),
      UNIQUE KEY tickets_ticket_number_unique (ticket_number),
      KEY tickets_booking_id_index (booking_id),
      KEY tickets_event_id_index (event_id),
      KEY tickets_user_id_index (user_id),
      KEY tickets_payment_id_index (payment_id),
      KEY tickets_status_index (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await renameColumnIfExists('tickets', 'id', 'ticket_id', 'BIGINT UNSIGNED NOT NULL AUTO_INCREMENT');
  await renameColumnIfExists('tickets', 'scanned_at', 'checked_in_at', 'DATETIME NULL');
  await addColumnIfMissing('tickets', 'booking_id', 'BIGINT UNSIGNED NULL AFTER ticket_number');
  await addColumnIfMissing('tickets', 'ticket_type_id', 'BIGINT UNSIGNED NULL AFTER user_id');
  await addColumnIfMissing('tickets', 'ticket_type', 'VARCHAR(150) NULL AFTER ticket_type_id');
  await addColumnIfMissing('tickets', 'qr_data', 'LONGTEXT NULL AFTER qr_code');
  await addColumnIfMissing('tickets', 'checked_in', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER status');
  await addColumnIfMissing('tickets', 'checked_in_at', 'DATETIME NULL AFTER checked_in');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS qr_scans (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      ticket_id BIGINT UNSIGNED NOT NULL,
      scanned_by BIGINT UNSIGNED NULL,
      scanned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ip_address VARCHAR(45) NULL,
      device_info VARCHAR(255) NULL,
      PRIMARY KEY (id),
      KEY qr_scans_ticket_id_index (ticket_id),
      KEY qr_scans_scanned_by_index (scanned_by)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(40) NULL,
      avatar VARCHAR(500) NULL,
      permissions LONGTEXT NULL,
      is_super_admin TINYINT(1) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      last_login DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY admins_email_unique (email),
      KEY admins_is_active_index (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // ── users role enum migration ─────────────────────────────────────────────
  await pool.query(`
    ALTER TABLE users
    MODIFY role ENUM('super_admin', 'admin', 'organizer', 'user', 'influencer') NOT NULL DEFAULT 'user'
  `).catch((err) => logger.warn(`users.role enum update skipped: ${err.message}`));

  await pool.query(`SET FOREIGN_KEY_CHECKS = 1`);
};

const getMySQLPool = () => pool;
const getMySQLStatus = () => ({ ...status });

const requirePool = () => {
  if (!pool) throw new Error('MySQL is not connected.');
  return pool;
};

const execute = (...args) => requirePool().execute(...args);
const query = (...args) => requirePool().query(...args);
const getConnection = (...args) => requirePool().getConnection(...args);

module.exports = { connectMySQL, getMySQLPool, getMySQLStatus, execute, query, getConnection };
