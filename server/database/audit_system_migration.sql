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
