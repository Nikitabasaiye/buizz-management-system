-- Migration: Check-in Staff Assignment and Approval System
-- This migration enables organizers to assign check-in staff to events
-- and super admins to approve check-in staff assignments

-- 1. Check-in Staff Assignments Table
CREATE TABLE IF NOT EXISTS event_checkin_staff (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  staff_user_id BIGINT UNSIGNED NOT NULL COMMENT 'User ID of check-in staff',
  assigned_by BIGINT UNSIGNED NOT NULL COMMENT 'Organizer or admin who assigned',
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending', 'approved', 'rejected', 'active', 'inactive') NOT NULL DEFAULT 'pending',
  approved_by BIGINT UNSIGNED NULL COMMENT 'Super admin who approved',
  approved_at DATETIME NULL,
  rejection_reason TEXT NULL,
  scanner_id VARCHAR(100) NULL COMMENT 'Device identifier for this staff',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY event_staff_unique (event_id, staff_user_id),
  KEY idx_event_id (event_id),
  KEY idx_staff_user_id (staff_user_id),
  KEY idx_status (status),
  KEY idx_assigned_by (assigned_by),
  KEY idx_approved_by (approved_by),
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (staff_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Check-in Staff Performance Tracking
CREATE TABLE IF NOT EXISTS checkin_staff_performance (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  staff_user_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  date DATE NOT NULL,
  total_scans INT UNSIGNED NOT NULL DEFAULT 0,
  successful_scans INT UNSIGNED NOT NULL DEFAULT 0,
  failed_scans INT UNSIGNED NOT NULL DEFAULT 0,
  avg_scan_time_ms DECIMAL(10, 2) NULL,
  scanner_id VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY staff_event_date_unique (staff_user_id, event_id, date),
  KEY idx_staff_user_id (staff_user_id),
  KEY idx_event_id (event_id),
  KEY idx_date (date),
  FOREIGN KEY (staff_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Add check-in staff approval notification channel
ALTER TABLE notifications 
MODIFY COLUMN channel ENUM(
  'booking_confirmed', 
  'booking_offline', 
  'payment_success', 
  'ticket_reminder', 
  'event_update', 
  'event_approval', 
  'marketing', 
  'other',
  'seat_map_update',
  'check_in_success',
  'check_in_failed',
  'search_result',
  'checkin_staff_assigned',
  'checkin_staff_approved',
  'checkin_staff_rejected'
) NOT NULL;

-- 4. Create indexes for performance
CREATE INDEX idx_event_checkin_staff_status ON event_checkin_staff(status, event_id);
CREATE INDEX idx_event_checkin_staff_assigned ON event_checkin_staff(assigned_by, status);
