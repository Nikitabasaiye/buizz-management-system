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
  FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
