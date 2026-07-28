-- Buizz production schema repair
-- Safe for an existing database: creates missing tables and adds missing columns.
-- Run this in phpMyAdmin against the live database: u943298757_buizz

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
  user_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NULL,
  role ENUM('super_admin', 'admin', 'organizer', 'user', 'influencer') NOT NULL DEFAULT 'user',
  organization_id BIGINT UNSIGNED NULL,
  avatar VARCHAR(500) NULL,
  google_id VARCHAR(255) NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  kyc_status ENUM('not_submitted', 'pending', 'verified', 'rejected') NOT NULL DEFAULT 'not_submitted',
  bank_verification_status ENUM('not_submitted', 'pending', 'verified', 'rejected') NOT NULL DEFAULT 'not_submitted',
  kyc_verified_at DATETIME NULL,
  kyc_verified_by BIGINT UNSIGNED NULL,
  last_login DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY users_email_unique (email),
  KEY users_organization_id_index (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(40) NULL AFTER password,
  ADD COLUMN IF NOT EXISTS role ENUM('super_admin', 'admin', 'organizer', 'user', 'influencer') NOT NULL DEFAULT 'user' AFTER phone,
  ADD COLUMN IF NOT EXISTS organization_id BIGINT UNSIGNED NULL AFTER role,
  ADD COLUMN IF NOT EXISTS avatar VARCHAR(500) NULL AFTER organization_id,
  ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) NULL AFTER avatar,
  ADD COLUMN IF NOT EXISTS is_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER google_id,
  ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER is_verified,
  ADD COLUMN IF NOT EXISTS kyc_status ENUM('not_submitted', 'pending', 'verified', 'rejected') NOT NULL DEFAULT 'not_submitted' AFTER is_active,
  ADD COLUMN IF NOT EXISTS bank_verification_status ENUM('not_submitted', 'pending', 'verified', 'rejected') NOT NULL DEFAULT 'not_submitted' AFTER kyc_status,
  ADD COLUMN IF NOT EXISTS kyc_verified_at DATETIME NULL AFTER bank_verification_status,
  ADD COLUMN IF NOT EXISTS kyc_verified_by BIGINT UNSIGNED NULL AFTER kyc_verified_at,
  ADD COLUMN IF NOT EXISTS last_login DATETIME NULL AFTER kyc_verified_by,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER last_login,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

ALTER TABLE users
  MODIFY role ENUM('super_admin', 'admin', 'organizer', 'user', 'influencer') NOT NULL DEFAULT 'user';

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email);
CREATE INDEX IF NOT EXISTS users_organization_id_index ON users (organization_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  user_name VARCHAR(150) NULL,
  user_email VARCHAR(255) NULL,
  user_role VARCHAR(50) NULL,
  action VARCHAR(100) NOT NULL,
  action_type ENUM('create', 'read', 'update', 'delete', 'login', 'logout', 'approve', 'reject', 'publish', 'cancel', 'payment', 'upload', 'download', 'other') NOT NULL DEFAULT 'other',
  resource_type VARCHAR(50) NULL,
  resource_id BIGINT UNSIGNED NULL,
  description TEXT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  request_method VARCHAR(10) NULL,
  request_url VARCHAR(500) NULL,
  request_body JSON NULL,
  response_status INT NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  metadata JSON NULL,
  severity ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'low',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_user_id (user_id),
  KEY idx_audit_user_role (user_role),
  KEY idx_audit_action (action),
  KEY idx_audit_action_type (action_type),
  KEY idx_audit_resource (resource_type, resource_id),
  KEY idx_audit_created_at (created_at),
  KEY idx_audit_severity (severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS user_name VARCHAR(150) NULL AFTER user_id,
  ADD COLUMN IF NOT EXISTS user_email VARCHAR(255) NULL AFTER user_name,
  ADD COLUMN IF NOT EXISTS user_role VARCHAR(50) NULL AFTER user_email,
  ADD COLUMN IF NOT EXISTS action_type ENUM('create', 'read', 'update', 'delete', 'login', 'logout', 'approve', 'reject', 'publish', 'cancel', 'payment', 'upload', 'download', 'other') NOT NULL DEFAULT 'other' AFTER action,
  ADD COLUMN IF NOT EXISTS description TEXT NULL AFTER resource_id,
  ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45) NULL AFTER description,
  ADD COLUMN IF NOT EXISTS request_method VARCHAR(10) NULL AFTER user_agent,
  ADD COLUMN IF NOT EXISTS request_url VARCHAR(500) NULL AFTER request_method,
  ADD COLUMN IF NOT EXISTS request_body JSON NULL AFTER request_url,
  ADD COLUMN IF NOT EXISTS response_status INT NULL AFTER request_body,
  ADD COLUMN IF NOT EXISTS old_values JSON NULL AFTER response_status,
  ADD COLUMN IF NOT EXISTS new_values JSON NULL AFTER old_values,
  ADD COLUMN IF NOT EXISTS metadata JSON NULL AFTER new_values,
  ADD COLUMN IF NOT EXISTS severity ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'low' AFTER metadata;

CREATE TABLE IF NOT EXISTS event_approval_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  organizer_id BIGINT UNSIGNED NOT NULL,
  organizer_name VARCHAR(150) NOT NULL,
  organizer_email VARCHAR(255) NOT NULL,
  reviewer_id BIGINT UNSIGNED NULL,
  reviewer_name VARCHAR(150) NULL,
  reviewer_email VARCHAR(255) NULL,
  reviewer_role VARCHAR(50) NULL,
  action ENUM('submitted', 'approved', 'rejected', 'published', 'cancelled') NOT NULL,
  previous_status VARCHAR(50) NULL,
  new_status VARCHAR(50) NULL,
  comments TEXT NULL,
  rejection_reason TEXT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_event_approval_event_id (event_id),
  KEY idx_event_approval_organizer_id (organizer_id),
  KEY idx_event_approval_reviewer_id (reviewer_id),
  KEY idx_event_approval_action (action),
  KEY idx_event_approval_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  session_token VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  login_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  logout_at TIMESTAMP NULL,
  last_activity TIMESTAMP NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  metadata JSON NULL,
  PRIMARY KEY (id),
  KEY idx_user_sessions_user_id (user_id),
  KEY idx_user_sessions_token (session_token),
  KEY idx_user_sessions_active (is_active),
  KEY idx_user_sessions_login_at (login_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
