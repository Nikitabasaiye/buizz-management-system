-- Migration: create notification_logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NULL,
  type VARCHAR(60) NOT NULL,
  provider VARCHAR(60) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  status ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
  message_id VARCHAR(255) NULL,
  retry_count INT UNSIGNED NOT NULL DEFAULT 0,
  error TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY notification_logs_booking_index (booking_id),
  KEY notification_logs_recipient_index (recipient)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
