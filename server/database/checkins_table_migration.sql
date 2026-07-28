-- Migration: Check-ins Table for Event Check-in System
-- This migration ensures the check_ins table exists with proper structure

CREATE TABLE IF NOT EXISTS check_ins (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  checked_by BIGINT UNSIGNED NOT NULL COMMENT 'Admin/organizer who checked in',
  checked_by_role ENUM('admin', 'super_admin', 'organizer', 'checkin_staff') NOT NULL,
  scanner_id VARCHAR(100) NULL COMMENT 'Scanner device ID',
  notes TEXT NULL,
  checked_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY check_ins_ticket_unique (ticket_id),
  KEY check_ins_event_id_index (event_id),
  KEY check_ins_user_id_index (user_id),
  KEY check_ins_checked_by_index (checked_by),
  KEY check_ins_checked_in_at_index (checked_in_at),
  FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (checked_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add qr_scans table for detailed scan tracking
CREATE TABLE IF NOT EXISTS qr_scans (
  scan_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT UNSIGNED NOT NULL,
  scanned_by BIGINT UNSIGNED NOT NULL,
  scanned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  scan_location_lat DECIMAL(10, 8) NULL,
  scan_location_lng DECIMAL(11, 8) NULL,
  device_info VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (scan_id),
  KEY qr_scans_ticket_id_index (ticket_id),
  KEY qr_scans_scanned_by_index (scanned_by),
  KEY qr_scans_scanned_at_index (scanned_at),
  FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  FOREIGN KEY (scanned_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update tickets table to ensure check-in columns exist
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS checked_in TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Whether ticket has been checked in',
ADD COLUMN IF NOT EXISTS checked_in_at DATETIME NULL COMMENT 'When ticket was checked in',
ADD COLUMN IF NOT EXISTS scanned_by BIGINT UNSIGNED NULL COMMENT 'User who scanned the ticket',
ADD INDEX IF NOT EXISTS idx_tickets_checked_in (checked_in),
ADD INDEX IF NOT EXISTS idx_tickets_checked_in_at (checked_in_at);

-- Add foreign key for scanned_by if it doesn't exist
ALTER TABLE tickets
ADD CONSTRAINT IF NOT EXISTS fk_tickets_scanned_by 
FOREIGN KEY (scanned_by) REFERENCES users(user_id) ON DELETE SET NULL;
