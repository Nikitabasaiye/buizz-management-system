-- Repair organizer bank schema for /api/v1/organizer/bank
-- Run this on the live database if bank update fails with:
-- "Failed to update bank details. Please check your database schema."

CREATE TABLE IF NOT EXISTS organizer_bank_accounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organizer_id BIGINT UNSIGNED NOT NULL,
  account_holder_name VARCHAR(180) NOT NULL,
  bank_account_number VARCHAR(80) NULL,
  bank_ifsc_code VARCHAR(20) NULL,
  bank_name VARCHAR(160) NULL,
  upi_id VARCHAR(100) NULL,
  bank_documents JSON NULL,
  verification_status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
  verified_by BIGINT UNSIGNED NULL,
  verified_at DATETIME NULL,
  rejection_reason TEXT NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY organizer_bank_accounts_organizer_unique (organizer_id),
  KEY organizer_bank_accounts_active_index (is_active),
  KEY idx_bank_verification_status (verification_status),
  CONSTRAINT fk_organizer_bank_user FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE organizer_bank_accounts
  ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(80) NULL AFTER account_holder_name,
  ADD COLUMN IF NOT EXISTS bank_ifsc_code VARCHAR(20) NULL AFTER bank_account_number,
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(160) NULL AFTER bank_ifsc_code,
  ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100) NULL AFTER bank_name,
  ADD COLUMN IF NOT EXISTS bank_documents JSON NULL AFTER upi_id,
  ADD COLUMN IF NOT EXISTS verification_status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending' AFTER bank_documents,
  ADD COLUMN IF NOT EXISTS verified_by BIGINT UNSIGNED NULL AFTER verification_status,
  ADD COLUMN IF NOT EXISTS verified_at DATETIME NULL AFTER verified_by,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL AFTER verified_at,
  ADD COLUMN IF NOT EXISTS is_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER rejection_reason,
  ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER is_verified,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER is_active,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Keep old schema column values if the crashed/old database used account_number / ifsc_code.
SET @has_account_number = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'organizer_bank_accounts'
    AND COLUMN_NAME = 'account_number'
);
SET @copy_account_sql = IF(
  @has_account_number > 0,
  'UPDATE organizer_bank_accounts SET bank_account_number = COALESCE(bank_account_number, account_number)',
  'SELECT 1'
);
PREPARE copy_account_stmt FROM @copy_account_sql;
EXECUTE copy_account_stmt;
DEALLOCATE PREPARE copy_account_stmt;
SET @relax_account_sql = IF(
  @has_account_number > 0,
  'ALTER TABLE organizer_bank_accounts MODIFY COLUMN account_number VARCHAR(80) NULL',
  'SELECT 1'
);
PREPARE relax_account_stmt FROM @relax_account_sql;
EXECUTE relax_account_stmt;
DEALLOCATE PREPARE relax_account_stmt;

SET @has_ifsc_code = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'organizer_bank_accounts'
    AND COLUMN_NAME = 'ifsc_code'
);
SET @copy_ifsc_sql = IF(
  @has_ifsc_code > 0,
  'UPDATE organizer_bank_accounts SET bank_ifsc_code = COALESCE(bank_ifsc_code, ifsc_code)',
  'SELECT 1'
);
PREPARE copy_ifsc_stmt FROM @copy_ifsc_sql;
EXECUTE copy_ifsc_stmt;
DEALLOCATE PREPARE copy_ifsc_stmt;
SET @relax_ifsc_sql = IF(
  @has_ifsc_code > 0,
  'ALTER TABLE organizer_bank_accounts MODIFY COLUMN ifsc_code VARCHAR(20) NULL',
  'SELECT 1'
);
PREPARE relax_ifsc_stmt FROM @relax_ifsc_sql;
EXECUTE relax_ifsc_stmt;
DEALLOCATE PREPARE relax_ifsc_stmt;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS bank_verified_by BIGINT UNSIGNED NULL AFTER kyc_verified_by,
  ADD COLUMN IF NOT EXISTS bank_verified_at DATETIME NULL AFTER bank_verified_by;
