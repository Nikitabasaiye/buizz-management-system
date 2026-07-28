-- Repair event approval queue table for organizer event submissions.
-- Run this on the live Buizz database if POST /api/v1/events returns 500
-- while creating organizer approval requests.

CREATE TABLE IF NOT EXISTS event_approval_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NULL,
  organizer_id BIGINT UNSIGNED NULL,
  action_type ENUM('create', 'update', 'delete') NOT NULL DEFAULT 'create',
  request_data LONGTEXT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  admin_status ENUM('pending', 'approved', 'rejected') NULL DEFAULT 'pending',
  super_admin_status ENUM('pending', 'approved', 'rejected') NULL DEFAULT 'pending',
  admin_id BIGINT UNSIGNED NULL,
  super_admin_id BIGINT UNSIGNED NULL,
  rejection_reason TEXT NULL,
  processed_at DATETIME NULL,
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY event_approval_requests_event_id_index (event_id),
  KEY event_approval_requests_organizer_id_index (organizer_id),
  KEY event_approval_requests_status_index (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS buizz_add_column_if_missing;
DELIMITER $$
CREATE PROCEDURE buizz_add_column_if_missing(
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
    SET @alter_sql = CONCAT('ALTER TABLE `', p_table_name, '` ADD COLUMN `', p_column_name, '` ', p_column_definition);
    PREPARE stmt FROM @alter_sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL buizz_add_column_if_missing('event_approval_requests', 'event_id', 'BIGINT UNSIGNED NULL');
CALL buizz_add_column_if_missing('event_approval_requests', 'organizer_id', 'BIGINT UNSIGNED NULL');
CALL buizz_add_column_if_missing('event_approval_requests', 'action_type', 'ENUM(''create'', ''update'', ''delete'') NOT NULL DEFAULT ''create''');
CALL buizz_add_column_if_missing('event_approval_requests', 'request_data', 'LONGTEXT NULL');
CALL buizz_add_column_if_missing('event_approval_requests', 'status', 'ENUM(''pending'', ''approved'', ''rejected'') NOT NULL DEFAULT ''pending''');
CALL buizz_add_column_if_missing('event_approval_requests', 'admin_status', 'ENUM(''pending'', ''approved'', ''rejected'') NULL DEFAULT ''pending''');
CALL buizz_add_column_if_missing('event_approval_requests', 'super_admin_status', 'ENUM(''pending'', ''approved'', ''rejected'') NULL DEFAULT ''pending''');
CALL buizz_add_column_if_missing('event_approval_requests', 'admin_id', 'BIGINT UNSIGNED NULL');
CALL buizz_add_column_if_missing('event_approval_requests', 'super_admin_id', 'BIGINT UNSIGNED NULL');
CALL buizz_add_column_if_missing('event_approval_requests', 'rejection_reason', 'TEXT NULL');
CALL buizz_add_column_if_missing('event_approval_requests', 'processed_at', 'DATETIME NULL');
CALL buizz_add_column_if_missing('event_approval_requests', 'requested_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
CALL buizz_add_column_if_missing('event_approval_requests', 'created_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
CALL buizz_add_column_if_missing('event_approval_requests', 'updated_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

DROP PROCEDURE IF EXISTS buizz_add_index_if_missing;
DELIMITER $$
CREATE PROCEDURE buizz_add_index_if_missing(
  IN p_table_name VARCHAR(64),
  IN p_index_name VARCHAR(64),
  IN p_columns TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND INDEX_NAME = p_index_name
  ) THEN
    SET @index_sql = CONCAT('ALTER TABLE `', p_table_name, '` ADD INDEX `', p_index_name, '` (', p_columns, ')');
    PREPARE stmt FROM @index_sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL buizz_add_index_if_missing('event_approval_requests', 'event_approval_requests_event_id_index', '`event_id`');
CALL buizz_add_index_if_missing('event_approval_requests', 'event_approval_requests_organizer_id_index', '`organizer_id`');
CALL buizz_add_index_if_missing('event_approval_requests', 'event_approval_requests_status_index', '`status`');

UPDATE event_approval_requests
SET
  status = COALESCE(status, 'pending'),
  admin_status = COALESCE(admin_status, 'pending'),
  super_admin_status = COALESCE(super_admin_status, 'pending');

DROP PROCEDURE IF EXISTS buizz_add_column_if_missing;
DROP PROCEDURE IF EXISTS buizz_add_index_if_missing;
