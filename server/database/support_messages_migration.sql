-- Migration: Support Messages & 2-Way Communication System
-- This migration enables BookMyShow-style 2-way communication in support tickets

-- 1. Support Messages Table (for 2-way conversation)
CREATE TABLE IF NOT EXISTS support_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id VARCHAR(80) NOT NULL,
  sender_id BIGINT UNSIGNED NOT NULL,
  sender_role ENUM('customer', 'organizer', 'admin', 'super_admin', 'checkin_staff') NOT NULL,
  message TEXT NOT NULL,
  message_type ENUM('text', 'image', 'document', 'system') DEFAULT 'text',
  is_internal TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Internal notes between support agents',
  is_read TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Read by recipient',
  read_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ticket_id (ticket_id),
  KEY idx_sender_id (sender_id),
  KEY idx_created_at (created_at),
  KEY idx_is_read (is_read),
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Support Attachments Table
CREATE TABLE IF NOT EXISTS support_attachments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  message_id BIGINT UNSIGNED NOT NULL,
  ticket_id VARCHAR(80) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL COMMENT 'Size in bytes',
  file_type VARCHAR(100) NOT NULL COMMENT 'MIME type',
  uploaded_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_message_id (message_id),
  KEY idx_ticket_id (ticket_id),
  FOREIGN KEY (message_id) REFERENCES support_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Support Ticket Activity Log (for audit trail)
CREATE TABLE IF NOT EXISTS support_ticket_activities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id VARCHAR(80) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  user_role ENUM('customer', 'organizer', 'admin', 'super_admin', 'checkin_staff') NOT NULL,
  action ENUM('created', 'updated', 'assigned', 'status_changed', 'priority_changed', 'message_sent', 'resolved', 'reopened', 'closed') NOT NULL,
  old_value TEXT NULL COMMENT 'Previous value for status/priority changes',
  new_value TEXT NULL COMMENT 'New value for status/priority changes',
  notes TEXT NULL COMMENT 'Additional context',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ticket_id (ticket_id),
  KEY idx_user_id (user_id),
  KEY idx_action (action),
  KEY idx_created_at (created_at),
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Add escalation fields to support_tickets
ALTER TABLE support_tickets
ADD COLUMN IF NOT EXISTS escalation_level ENUM('level_1', 'level_2', 'level_3') DEFAULT 'level_1' AFTER priority,
ADD COLUMN IF NOT EXISTS escalated_at DATETIME NULL AFTER escalation_level,
ADD COLUMN IF NOT EXISTS escalated_by BIGINT UNSIGNED NULL AFTER escalated_at,
ADD COLUMN IF NOT EXISTS first_response_time INT UNSIGNED NULL COMMENT 'Time to first response in seconds',
ADD COLUMN IF NOT EXISTS resolution_time INT UNSIGNED NULL COMMENT 'Total resolution time in seconds',
ADD COLUMN IF NOT EXISTS customer_satisfaction ENUM('very_dissatisfied', 'dissatisfied', 'neutral', 'satisfied', 'very_satisfied') NULL AFTER resolution_time,
ADD COLUMN IF NOT EXISTS satisfaction_notes TEXT NULL AFTER customer_satisfaction,
ADD COLUMN IF NOT EXISTS last_message_at DATETIME NULL AFTER updated_at,
ADD COLUMN IF NOT EXISTS unread_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER last_message_at,
ADD INDEX IF NOT EXISTS idx_escalation_level (escalation_level),
ADD INDEX IF NOT EXISTS idx_last_message_at (last_message_at),
ADD INDEX IF NOT EXISTS idx_unread_count (unread_count);

-- 5. Add foreign key for escalated_by
ALTER TABLE support_tickets
ADD CONSTRAINT IF NOT EXISTS fk_support_escalated_by 
FOREIGN KEY (escalated_by) REFERENCES users(user_id) ON DELETE SET NULL;

-- 6. Update notifications to include support messages
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
  'checkin_staff_rejected',
  'support_message_received',
  'support_ticket_assigned',
  'support_ticket_resolved',
  'support_ticket_reopened'
) NOT NULL;
