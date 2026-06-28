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