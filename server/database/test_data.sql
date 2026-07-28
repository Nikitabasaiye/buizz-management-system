-- Fix audit_logs table - add missing columns
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS action_type ENUM('create', 'read', 'update', 'delete', 'login', 'logout', 'approve', 'reject', 'publish', 'cancel', 'payment', 'upload', 'download', 'other') NOT NULL DEFAULT 'other' AFTER action;

-- Add missing columns to users table for bank verification tracking
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bank_verification_status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending' AFTER kyc_status,
ADD COLUMN IF NOT EXISTS bank_verified_by BIGINT UNSIGNED NULL AFTER bank_verification_status,
ADD COLUMN IF NOT EXISTS bank_verified_at DATETIME NULL AFTER bank_verified_by,
ADD COLUMN IF NOT EXISTS bank_rejection_reason TEXT NULL AFTER bank_verified_at,
ADD FOREIGN KEY IF NOT EXISTS fk_users_bank_verified_by (bank_verified_by) REFERENCES users(user_id) ON DELETE SET NULL;

-- Add index for bank verification status
CREATE INDEX IF NOT EXISTS idx_users_bank_verification_status ON users(bank_verification_status);

-- Verify table structures
SHOW COLUMNS FROM audit_logs;
SHOW COLUMNS FROM users LIKE '%bank%';
SHOW COLUMNS FROM organizer_bank_accounts;


-- Migration for Event Approval System and Enhanced Features
-- Add this to your existing schema

-- 1. Event Approval Requests Table
CREATE TABLE IF NOT EXISTS event_approval_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NULL,
  organizer_id BIGINT UNSIGNED NOT NULL,
  action_type ENUM('create', 'update', 'delete') NOT NULL,
  request_data JSON NULL COMMENT 'Event data for create/update',
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  admin_id BIGINT UNSIGNED NULL COMMENT 'Admin who approved/rejected',
  super_admin_id BIGINT UNSIGNED NULL COMMENT 'Super admin who approved/rejected',
  admin_status ENUM('pending', 'approved', 'rejected') NULL,
  super_admin_status ENUM('pending', 'approved', 'rejected') NULL,
  rejection_reason TEXT NULL,
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  KEY approval_event_id_index (event_id),
  KEY approval_organizer_id_index (organizer_id),
  KEY approval_status_index (status),
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE SET NULL,
  FOREIGN KEY (super_admin_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Add offline booking support
DROP PROCEDURE IF EXISTS add_column_if_missing;
DELIMITER $$
CREATE PROCEDURE add_column_if_missing(
  IN p_table_name VARCHAR(64),
  IN p_column_name VARCHAR(64),
  IN p_column_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND COLUMN_NAME = p_column_name
  ) THEN
    SET @alter_sql = CONCAT(
      'ALTER TABLE `', p_table_name, '` ADD COLUMN `', p_column_name, '` ', p_column_definition
    );
    PREPARE stmt FROM @alter_sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL add_column_if_missing(
  'bookings',
  'booking_method',
  'ENUM(''online'', ''offline'') NOT NULL DEFAULT ''online'' AFTER payment_status'
);
CALL add_column_if_missing(
  'bookings',
  'created_by',
  'BIGINT UNSIGNED NULL COMMENT ''Organizer who created offline booking'' AFTER booking_method'
);

ALTER TABLE payments 
MODIFY COLUMN payment_method ENUM('phonepe', 'razorpay', 'paytm', 'upi', 'card', 'netbanking', 'wallet', 'cod') NULL;

-- 3. Add user ticket booking limit tracking
CREATE TABLE IF NOT EXISTS user_event_bookings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  total_tickets INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY user_event_unique (user_id, event_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Enhance notifications table for booking notifications
ALTER TABLE notifications 
MODIFY COLUMN channel ENUM('booking_confirmed', 'booking_offline', 'payment_success', 'ticket_reminder', 'event_update', 'event_approval', 'marketing', 'other') NOT NULL;

-- 5. Add is_free flag to ticket_types
CALL add_column_if_missing(
  'ticket_types',
  'is_free',
  'TINYINT(1) NOT NULL DEFAULT 0 AFTER price'
);

-- 6. Add custom fields to events table
CALL add_column_if_missing(
  'events',
  'custom_category',
  'VARCHAR(120) NULL COMMENT ''Custom category if user selects custom option'' AFTER category'
);
CALL add_column_if_missing(
  'events',
  'custom_type',
  'VARCHAR(50) NULL COMMENT ''Custom event type if user selects custom option'' AFTER type'
);

-- Indexes for performance
DROP PROCEDURE IF EXISTS add_index_if_missing;
DELIMITER $$
CREATE PROCEDURE add_index_if_missing(
  IN p_table_name VARCHAR(64),
  IN p_index_name VARCHAR(64),
  IN p_index_columns TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND INDEX_NAME = p_index_name
  ) THEN
    SET @index_sql = CONCAT(
      'CREATE INDEX `', p_index_name, '` ON `', p_table_name, '` (', p_index_columns, ')'
    );
    PREPARE stmt FROM @index_sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL add_index_if_missing('bookings', 'idx_bookings_method', '`booking_method`');
CALL add_index_if_missing('bookings', 'idx_bookings_created_by', '`created_by`');
CALL add_index_if_missing('event_approval_requests', 'idx_approval_action_type', '`action_type`');

DROP PROCEDURE IF EXISTS add_column_if_missing;
DROP PROCEDURE IF EXISTS add_index_if_missing;
-- Migration: Comprehensive Audit Log System
-- Tracks all user, organizer, and admin actions

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  user_name VARCHAR(150) NULL,
  user_email VARCHAR(255) NULL,
  user_role ENUM('customer', 'organizer', 'admin', 'super_admin') NULL,
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
  INDEX idx_user_id (user_id),
  INDEX idx_user_role (user_role),
  INDEX idx_action (action),
  INDEX idx_action_type (action_type),
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_created_at (created_at),
  INDEX idx_severity (severity),
  INDEX idx_user_action (user_id, action, created_at),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for tracking event approvals specifically
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
  INDEX idx_event_id (event_id),
  INDEX idx_organizer_id (organizer_id),
  INDEX idx_reviewer_id (reviewer_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for user login/session tracking
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
  INDEX idx_user_id (user_id),
  INDEX idx_session_token (session_token),
  INDEX idx_is_active (is_active),
  INDEX idx_login_at (login_at),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for tracking file uploads/downloads
CREATE TABLE IF NOT EXISTS file_access_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  file_type VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NULL,
  file_size BIGINT NULL,
  action ENUM('upload', 'download', 'view', 'delete') NOT NULL,
  resource_type VARCHAR(50) NULL,
  resource_id BIGINT UNSIGNED NULL,
  ip_address VARCHAR(45) NULL,
  status VARCHAR(50) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user_id (user_id),
  INDEX idx_file_type (file_type),
  INDEX idx_action (action),
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add tracking columns to existing tables if not exists
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS approved_by BIGINT UNSIGNED NULL AFTER status,
  ADD COLUMN IF NOT EXISTS approved_at DATETIME NULL AFTER approved_by,
  ADD COLUMN IF NOT EXISTS published_by BIGINT UNSIGNED NULL AFTER approved_at,
  ADD COLUMN IF NOT EXISTS published_at DATETIME NULL AFTER published_by,
  ADD FOREIGN KEY IF NOT EXISTS fk_events_approved_by (approved_by) REFERENCES users(user_id) ON DELETE SET NULL,
  ADD FOREIGN KEY IF NOT EXISTS fk_events_published_by (published_by) REFERENCES users(user_id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_events_organizer_status ON events(organizer_id, status);
CREATE INDEX IF NOT EXISTS idx_events_approved_by ON events(approved_by);
CREATE INDEX IF NOT EXISTS idx_events_published_by ON events(published_by);
-- Add bank document verification fields to organizer_bank_accounts table

ALTER TABLE organizer_bank_accounts 
ADD COLUMN IF NOT EXISTS bank_documents JSON NULL AFTER upi_id,
ADD COLUMN IF NOT EXISTS verification_status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending' AFTER is_verified,
ADD COLUMN IF NOT EXISTS verified_by BIGINT UNSIGNED NULL AFTER verification_status,
ADD COLUMN IF NOT EXISTS verified_at DATETIME NULL AFTER verified_by,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL AFTER verified_at,
ADD FOREIGN KEY IF NOT EXISTS fk_bank_verified_by (verified_by) REFERENCES users(user_id) ON DELETE SET NULL;

-- Add index for verification status
CREATE INDEX IF NOT EXISTS idx_bank_verification_status ON organizer_bank_accounts(verification_status);

-- Complete Audit System Table Verification and Fix Script

-- 1. Check if audit_logs table exists and create if not
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  user_name VARCHAR(150) NULL,
  user_email VARCHAR(255) NULL,
  user_role ENUM('customer', 'organizer', 'admin', 'super_admin') NULL,
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
  INDEX idx_user_id (user_id),
  INDEX idx_user_role (user_role),
  INDEX idx_action (action),
  INDEX idx_action_type (action_type),
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_created_at (created_at),
  INDEX idx_severity (severity),
  INDEX idx_user_action (user_id, action, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Add missing columns if they don't exist
ALTER TABLE audit_logs 
  ADD COLUMN IF NOT EXISTS user_name VARCHAR(150) NULL AFTER user_id,
  ADD COLUMN IF NOT EXISTS user_email VARCHAR(255) NULL AFTER user_name,
  ADD COLUMN IF NOT EXISTS user_role ENUM('customer', 'organizer', 'admin', 'super_admin') NULL AFTER user_email;

-- 3. Create other audit tables if they don't exist
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
  INDEX idx_event_id (event_id),
  INDEX idx_organizer_id (organizer_id),
  INDEX idx_reviewer_id (reviewer_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
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
  INDEX idx_user_id (user_id),
  INDEX idx_session_token (session_token),
  INDEX idx_is_active (is_active),
  INDEX idx_login_at (login_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS file_access_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  file_type VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NULL,
  file_size BIGINT NULL,
  action ENUM('upload', 'download', 'view', 'delete') NOT NULL,
  resource_type VARCHAR(50) NULL,
  resource_id BIGINT UNSIGNED NULL,
  ip_address VARCHAR(45) NULL,
  status VARCHAR(50) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user_id (user_id),
  INDEX idx_file_type (file_type),
  INDEX idx_action (action),
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Show table structure for verification
SHOW TABLES LIKE '%audit%';
SHOW TABLES LIKE '%session%';
SHOW TABLES LIKE '%file_access%';
SHOW TABLES LIKE '%event_approval%';

-- Quick fix for audit_logs table missing action_type column
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS action_type ENUM('create', 'read', 'update', 'delete', 'login', 'logout', 'approve', 'reject', 'publish', 'cancel', 'payment', 'upload', 'download', 'other') NOT NULL DEFAULT 'other' AFTER action;

-- Fix audit_logs table structure
-- Add missing user_name column if it doesn't exist

ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS user_name VARCHAR(150) NULL AFTER user_id;

-- Verify the table structure
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'u943298757_buizz' 
AND TABLE_NAME = 'audit_logs' 
ORDER BY ORDINAL_POSITION;
-- Migration: user KYC and bank document verification.
-- Applies to organizer, admin, and super_admin users.

ALTER TABLE users
  ADD COLUMN kyc_status ENUM('not_submitted', 'pending', 'verified', 'rejected') NOT NULL DEFAULT 'not_submitted' AFTER is_verified,
  ADD COLUMN bank_verification_status ENUM('not_submitted', 'pending', 'verified', 'rejected') NOT NULL DEFAULT 'not_submitted' AFTER kyc_status,
  ADD COLUMN kyc_verified_at DATETIME NULL AFTER bank_verification_status,
  ADD COLUMN kyc_verified_by BIGINT UNSIGNED NULL AFTER kyc_verified_at;

CREATE TABLE IF NOT EXISTS user_kyc_verifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  role ENUM('super_admin', 'admin', 'organizer') NOT NULL,
  status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
  bank_status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
  legal_name VARCHAR(150) NOT NULL,
  business_name VARCHAR(180) NULL,
  pan_number VARCHAR(20) NOT NULL,
  gst_number VARCHAR(30) NULL,
  aadhaar_last4 VARCHAR(4) NULL,
  address_line VARCHAR(255) NOT NULL,
  city VARCHAR(120) NOT NULL,
  state VARCHAR(120) NOT NULL,
  pincode VARCHAR(20) NOT NULL,
  bank_account_id BIGINT UNSIGNED NULL,
  documents JSON NOT NULL,
  bank_documents JSON NOT NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  rejection_reason TEXT NULL,
  review_notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY user_kyc_user_status_index (user_id, status),
  KEY user_kyc_status_index (status),
  KEY user_kyc_role_index (role),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (bank_account_id) REFERENCES organizer_bank_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Migration: organizer payment settlements
-- Tracks organizer payouts after event completion.

CREATE TABLE IF NOT EXISTS organizer_bank_accounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organizer_id BIGINT UNSIGNED NOT NULL,
  account_holder_name VARCHAR(150) NOT NULL,
  bank_account_number VARCHAR(50) NOT NULL,
  bank_ifsc_code VARCHAR(20) NOT NULL,
  bank_name VARCHAR(150) NULL,
  upi_id VARCHAR(100) NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY organizer_bank_accounts_organizer_unique (organizer_id),
  KEY organizer_bank_accounts_active_index (is_active),
  FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS organizer_settlements (
  settlement_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  settlement_number VARCHAR(50) NOT NULL,
  organizer_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  gross_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  platform_fee_percent DECIMAL(5, 2) NOT NULL DEFAULT 2.00,
  platform_fee_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  net_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status ENUM('pending', 'processing', 'paid', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
  scheduled_at DATETIME NULL,
  processed_at DATETIME NULL,
  paid_at DATETIME NULL,
  payout_reference VARCHAR(120) NULL,
  bank_reference_id VARCHAR(120) NULL,
  bank_account_snapshot JSON NULL,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (settlement_id),
  UNIQUE KEY organizer_settlements_number_unique (settlement_number),
  KEY organizer_settlements_organizer_index (organizer_id),
  KEY organizer_settlements_event_index (event_id),
  KEY organizer_settlements_status_index (status),
  FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settlement_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  settlement_id BIGINT UNSIGNED NULL,
  payment_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  organizer_id BIGINT UNSIGNED NOT NULL,
  gross_amount DECIMAL(12, 2) NOT NULL,
  platform_fee_percent DECIMAL(5, 2) NOT NULL DEFAULT 2.00,
  platform_fee_amount DECIMAL(12, 2) NOT NULL,
  net_amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  eligible_at DATETIME NOT NULL,
  status ENUM('pending', 'included', 'settled', 'cancelled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY settlement_items_payment_unique (payment_id),
  KEY settlement_items_settlement_index (settlement_id),
  KEY settlement_items_organizer_event_index (organizer_id, event_id),
  KEY settlement_items_status_eligible_index (status, eligible_at),
  FOREIGN KEY (settlement_id) REFERENCES organizer_settlements(settlement_id) ON DELETE SET NULL,
  FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE SET NULL,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Migration for User Groups and Granular Permission System

-- 1. User Groups Table
CREATE TABLE IF NOT EXISTS user_groups (
  group_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id),
  UNIQUE KEY user_groups_name_unique (name),
  KEY user_groups_created_by_index (created_by),
  KEY user_groups_is_active_index (is_active),
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Permissions Table (All available permissions in system)
CREATE TABLE IF NOT EXISTS permissions (
  permission_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL COMMENT 'e.g., event:create, user:read',
  display_name VARCHAR(150) NOT NULL COMMENT 'Human readable name',
  description TEXT NULL,
  module VARCHAR(50) NOT NULL COMMENT 'event, user, booking, etc.',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (permission_id),
  UNIQUE KEY permissions_name_unique (name),
  KEY permissions_module_index (module),
  KEY permissions_is_active_index (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. User Group Members Table
CREATE TABLE IF NOT EXISTS user_group_members (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  added_by BIGINT UNSIGNED NOT NULL,
  added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY group_members_unique (group_id, user_id),
  KEY group_members_user_id_index (user_id),
  KEY group_members_group_id_index (group_id),
  FOREIGN KEY (group_id) REFERENCES user_groups(group_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (added_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. User Group Permissions Table (Permissions assigned to groups)
CREATE TABLE IF NOT EXISTS user_group_permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  granted_by BIGINT UNSIGNED NOT NULL,
  granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY group_permissions_unique (group_id, permission_id),
  KEY group_permissions_group_id_index (group_id),
  KEY group_permissions_permission_id_index (permission_id),
  FOREIGN KEY (group_id) REFERENCES user_groups(group_id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. User Permissions Table (Direct permissions to users, overrides group)
CREATE TABLE IF NOT EXISTS user_permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  granted_by BIGINT UNSIGNED NOT NULL,
  granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY user_permissions_unique (user_id, permission_id),
  KEY user_permissions_user_id_index (user_id),
  KEY user_permissions_permission_id_index (permission_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Permission Management Delegation Table
CREATE TABLE IF NOT EXISTS permission_delegations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  delegated_to BIGINT UNSIGNED NOT NULL COMMENT 'Admin user who can manage permissions',
  can_assign_permissions TINYINT(1) NOT NULL DEFAULT 1,
  can_create_groups TINYINT(1) NOT NULL DEFAULT 1,
  can_manage_users TINYINT(1) NOT NULL DEFAULT 1,
  delegated_by BIGINT UNSIGNED NOT NULL COMMENT 'Super admin who delegated',
  delegated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY delegations_user_unique (delegated_to),
  KEY delegations_delegated_by_index (delegated_by),
  KEY delegations_is_active_index (is_active),
  FOREIGN KEY (delegated_to) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (delegated_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Permission Change Audit Table
CREATE TABLE IF NOT EXISTS permission_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  action ENUM('grant', 'revoke', 'delegate', 'revoke_delegation') NOT NULL,
  target_type ENUM('user', 'group', 'admin') NOT NULL,
  target_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NULL,
  permission_name VARCHAR(100) NULL,
  performed_by BIGINT UNSIGNED NOT NULL,
  details JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY audit_target_index (target_type, target_id),
  KEY audit_performed_by_index (performed_by),
  KEY audit_created_at_index (created_at),
  FOREIGN KEY (performed_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default permissions
INSERT INTO permissions (name, display_name, description, module) VALUES
-- User Management
('user:create', 'Create User', 'Create new users', 'user'),
('user:read', 'Read User', 'View user details', 'user'),
('user:update', 'Update User', 'Update user information', 'user'),
('user:delete', 'Delete User', 'Delete users', 'user'),
('user:list', 'List Users', 'View all users', 'user'),

-- Event Management
('event:create', 'Create Event', 'Create new events', 'event'),
('event:read', 'Read Event', 'View event details', 'event'),
('event:update', 'Update Event', 'Update event information', 'event'),
('event:delete', 'Delete Event', 'Delete events', 'event'),
('event:publish', 'Publish Event', 'Publish events', 'event'),
('event:list', 'List Events', 'View all events', 'event'),

-- Event Approval
('approval:view', 'View Approvals', 'View pending approvals', 'approval'),
('approval:approve', 'Approve Event', 'Approve event requests', 'approval'),
('approval:reject', 'Reject Event', 'Reject event requests', 'approval'),

-- Ticket Management
('ticket:create', 'Create Ticket', 'Create tickets', 'ticket'),
('ticket:read', 'Read Ticket', 'View ticket details', 'ticket'),
('ticket:update', 'Update Ticket', 'Update ticket information', 'ticket'),
('ticket:delete', 'Delete Ticket', 'Delete tickets', 'ticket'),
('ticket:scan', 'Scan Ticket', 'Scan tickets for check-in', 'ticket'),
('ticket:list', 'List Tickets', 'View all tickets', 'ticket'),

-- Booking Management
('booking:create', 'Create Booking', 'Create bookings', 'booking'),
('booking:read', 'Read Booking', 'View booking details', 'booking'),
('booking:update', 'Update Booking', 'Update booking information', 'booking'),
('booking:cancel', 'Cancel Booking', 'Cancel bookings', 'booking'),
('booking:list', 'List Bookings', 'View all bookings', 'booking'),
('booking:offline', 'Offline Booking', 'Create offline bookings', 'booking'),

-- Payment Management
('payment:create', 'Create Payment', 'Process payments', 'payment'),
('payment:read', 'Read Payment', 'View payment details', 'payment'),
('payment:refund', 'Refund Payment', 'Process refunds', 'payment'),
('payment:list', 'List Payments', 'View all payments', 'payment'),

-- Organization Management
('org:create', 'Create Organization', 'Create organizations', 'organization'),
('org:read', 'Read Organization', 'View organization details', 'organization'),
('org:update', 'Update Organization', 'Update organization info', 'organization'),
('org:delete', 'Delete Organization', 'Delete organizations', 'organization'),
('org:manage_members', 'Manage Members', 'Manage organization members', 'organization'),

-- Analytics
('analytics:view', 'View Analytics', 'View analytics dashboard', 'analytics'),
('analytics:export', 'Export Analytics', 'Export analytics data', 'analytics'),

-- Admin Permissions
('admin:access', 'Admin Access', 'Access admin panel', 'admin'),
('admin:users', 'Manage Users', 'Manage all users', 'admin'),
('admin:events', 'Manage Events', 'Manage all events', 'admin'),
('admin:payments', 'Manage Payments', 'Manage all payments', 'admin'),
('admin:analytics', 'Admin Analytics', 'View admin analytics', 'admin'),
('admin:settings', 'Admin Settings', 'Manage system settings', 'admin'),

-- Permission Management (Super Admin & Delegated Admin)
('permission:assign', 'Assign Permissions', 'Assign permissions to users/groups', 'permission'),
('permission:revoke', 'Revoke Permissions', 'Revoke permissions from users/groups', 'permission'),
('permission:view', 'View Permissions', 'View all permissions', 'permission'),
('group:create', 'Create Group', 'Create user groups', 'group'),
('group:update', 'Update Group', 'Update user groups', 'group'),
('group:delete', 'Delete Group', 'Delete user groups', 'group'),
('group:manage_members', 'Manage Group Members', 'Add/remove users from groups', 'group'),
('delegation:grant', 'Grant Delegation', 'Delegate permission management to admins', 'delegation'),
('delegation:revoke', 'Revoke Delegation', 'Revoke delegation from admins', 'delegation');

-- Create indexes for performance
CREATE INDEX idx_permissions_module_active ON permissions(module, is_active);
CREATE INDEX idx_user_group_members_user ON user_group_members(user_id);
CREATE INDEX idx_user_permissions_lookup ON user_permissions(user_id, permission_id);
CREATE INDEX idx_group_permissions_lookup ON user_group_permissions(group_id, permission_id);
-- Complete fix for audit_logs table - drop and recreate with all columns
DROP TABLE IF EXISTS audit_logs;

CREATE TABLE audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  user_name VARCHAR(150) NULL,
  user_email VARCHAR(255) NULL,
  user_role ENUM('customer', 'organizer', 'admin', 'super_admin') NULL,
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
  INDEX idx_user_id (user_id),
  INDEX idx_user_role (user_role),
  INDEX idx_action (action),
  INDEX idx_action_type (action_type),
  INDEX idx_resource (resource_type, resource_id),
  INDEX idx_created_at (created_at),
  INDEX idx_severity (severity),
  INDEX idx_user_action (user_id, action, created_at),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;