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
