-- Migration: create user_otps table
CREATE TABLE IF NOT EXISTS user_otps (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  phone VARCHAR(80) NULL,
  email VARCHAR(255) NULL,
  otp VARCHAR(10) NOT NULL,
  purpose VARCHAR(60) NOT NULL DEFAULT 'login',
  expires_at DATETIME NOT NULL,
  verified_at DATETIME NULL,
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY user_otps_lookup_index (phone, email, purpose, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
