-- Buizz payment ticket QR, email, check-in staff, and approval de-dupe repair
-- Run this once on the production database before redeploying the patched API.

DELIMITER $$

DROP PROCEDURE IF EXISTS buizz_add_column_if_missing $$
CREATE PROCEDURE buizz_add_column_if_missing(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_column
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$

DROP PROCEDURE IF EXISTS buizz_add_index_if_missing $$
CREATE PROCEDURE buizz_add_index_if_missing(
  IN p_table VARCHAR(64),
  IN p_index VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND INDEX_NAME = p_index
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$

DROP PROCEDURE IF EXISTS buizz_copy_column_if_exists $$
CREATE PROCEDURE buizz_copy_column_if_exists(
  IN p_table VARCHAR(64),
  IN p_from_column VARCHAR(64),
  IN p_to_column VARCHAR(64)
)
BEGIN
  IF EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_from_column
  ) AND EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_to_column
  ) THEN
    SET @ddl = CONCAT(
      'UPDATE `', p_table, '` SET `', p_to_column, '` = `', p_from_column, '` ',
      'WHERE `', p_to_column, '` IS NULL'
    );
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$

DELIMITER ;

CREATE TABLE IF NOT EXISTS event_checkin_staff (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  staff_id BIGINT UNSIGNED NOT NULL,
  assigned_by BIGINT UNSIGNED NOT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  permissions JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY event_checkin_staff_unique (event_id, staff_id),
  KEY event_checkin_staff_event_index (event_id),
  KEY event_checkin_staff_staff_index (staff_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CALL buizz_add_column_if_missing('event_checkin_staff', 'staff_id', 'BIGINT UNSIGNED NULL');
CALL buizz_add_column_if_missing('event_checkin_staff', 'assigned_by', 'BIGINT UNSIGNED NULL');
CALL buizz_add_column_if_missing('event_checkin_staff', 'assigned_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
CALL buizz_add_column_if_missing('event_checkin_staff', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL buizz_add_column_if_missing('event_checkin_staff', 'permissions', 'JSON NULL');
CALL buizz_add_column_if_missing('event_checkin_staff', 'updated_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

CALL buizz_copy_column_if_exists('event_checkin_staff', 'staff_user_id', 'staff_id');

UPDATE event_checkin_staff
SET permissions = JSON_OBJECT('scan', true, 'view', true)
WHERE permissions IS NULL;

UPDATE event_checkin_staff
SET is_active = 1
WHERE is_active IS NULL;

CREATE TABLE IF NOT EXISTS checkin_staff_performance (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  staff_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  date DATE NOT NULL,
  tickets_scanned INT UNSIGNED NOT NULL DEFAULT 0,
  tickets_verified INT UNSIGNED NOT NULL DEFAULT 0,
  tickets_rejected INT UNSIGNED NOT NULL DEFAULT 0,
  average_scan_time DECIMAL(5, 2) NULL,
  shift_start DATETIME NULL,
  shift_end DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY checkin_staff_performance_unique (staff_id, event_id, date),
  KEY checkin_staff_performance_staff_index (staff_id),
  KEY checkin_staff_performance_event_index (event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CALL buizz_add_column_if_missing('tickets', 'qr_data', 'TEXT NULL');
CALL buizz_add_column_if_missing('tickets', 'checked_in', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL buizz_add_column_if_missing('tickets', 'checked_in_at', 'DATETIME NULL');
CALL buizz_add_column_if_missing('tickets', 'scanned_by', 'BIGINT UNSIGNED NULL');

CALL buizz_add_column_if_missing('qr_scans', 'device_info', 'VARCHAR(255) NULL');
CALL buizz_add_column_if_missing('qr_scans', 'ip_address', 'VARCHAR(45) NULL');

-- Keep one approval request per organizer event. Extra historical requests are marked rejected
-- instead of deleted so audit history remains available.
UPDATE event_approval_requests ear
JOIN (
  SELECT event_id, organizer_id, MAX(id) AS keep_id
  FROM event_approval_requests
  WHERE event_id IS NOT NULL
  GROUP BY event_id, organizer_id
) keeper ON keeper.event_id = ear.event_id AND keeper.organizer_id = ear.organizer_id
SET ear.status = 'rejected',
    ear.admin_status = 'rejected',
    ear.super_admin_status = 'rejected',
    ear.rejection_reason = COALESCE(ear.rejection_reason, 'Superseded by latest approval request for same event.'),
    ear.updated_at = NOW()
WHERE ear.id <> keeper.keep_id
  AND ear.status = 'pending';

DROP PROCEDURE IF EXISTS buizz_add_column_if_missing;
DROP PROCEDURE IF EXISTS buizz_add_index_if_missing;
DROP PROCEDURE IF EXISTS buizz_copy_column_if_exists;
