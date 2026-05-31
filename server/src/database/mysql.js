const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

let pool;

const hasMysqlConfig = () => Boolean(
  process.env.MYSQL_HOST &&
  process.env.MYSQL_DATABASE &&
  process.env.MYSQL_USER
);

const connectMySQL = async () => {
  if (!hasMysqlConfig()) {
    const message = 'MySQL configuration is incomplete. Set MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER, and MYSQL_PASSWORD.';
    if (process.env.NODE_ENV === 'production') {
      throw new Error(message);
    }

    logger.warn(`${message} MySQL will be skipped in development.`);
    return null;
  }

  try {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
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
    await initializeSchema();
    logger.info('MySQL connected successfully');
    return pool;
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }

    logger.warn(`MySQL connection skipped in development: ${error.message}`);
    pool = null;
    return null;
  }
};

const initializeSchema = async () => {
  if (!pool) return;

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(40) NULL,
      role ENUM('admin', 'organizer', 'user', 'influencer') NOT NULL DEFAULT 'user',
      organization_id BIGINT UNSIGNED NULL,
      avatar VARCHAR(500) NULL,
      is_verified TINYINT(1) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      last_login DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY users_email_unique (email),
      KEY users_organization_id_index (organization_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
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
      venue LONGTEXT NULL,
      online_link VARCHAR(500) NULL,
      banner VARCHAR(500) NULL,
      images LONGTEXT NULL,
      ticket_types LONGTEXT NULL,
      tags LONGTEXT NULL,
      is_featured TINYINT(1) NOT NULL DEFAULT 0,
      total_seats INT UNSIGNED NULL,
      available_seats INT UNSIGNED NULL,
      views INT UNSIGNED NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY events_slug_unique (slug),
      KEY events_organization_id_index (organization_id),
      KEY events_organizer_id_index (organizer_id),
      KEY events_start_date_index (start_date),
      KEY events_status_index (status),
      KEY events_category_index (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      ticket_number VARCHAR(120) NOT NULL,
      event_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      payment_id BIGINT UNSIGNED NULL,
      ticket_type VARCHAR(150) NOT NULL,
      price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
      qr_code LONGTEXT NULL,
      status ENUM('active', 'used', 'cancelled', 'expired') NOT NULL DEFAULT 'active',
      scanned_at DATETIME NULL,
      scanned_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY tickets_ticket_number_unique (ticket_number),
      KEY tickets_event_id_index (event_id),
      KEY tickets_user_id_index (user_id),
      KEY tickets_payment_id_index (payment_id),
      KEY tickets_status_index (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const getMySQLPool = () => pool;

module.exports = {
  connectMySQL,
  getMySQLPool
};
