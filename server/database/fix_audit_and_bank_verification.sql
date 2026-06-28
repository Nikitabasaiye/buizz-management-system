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