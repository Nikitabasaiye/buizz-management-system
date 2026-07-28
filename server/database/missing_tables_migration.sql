-- Migration: Create missing tables required for booking flow
-- Run this on production MySQL (u943298757_buizz)

-- 1. user_event_bookings: tracks per-user ticket count per event (enforces 10-ticket limit)
CREATE TABLE IF NOT EXISTS user_event_bookings (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED    NOT NULL,
  event_id    INT UNSIGNED    NOT NULL,
  total_tickets INT UNSIGNED  NOT NULL DEFAULT 0,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_event (user_id, event_id),
  KEY idx_user_id (user_id),
  KEY idx_event_id (event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
