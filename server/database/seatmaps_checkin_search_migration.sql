-- Migration: Seat Maps, Check-in, and Search Features
-- Add this to your existing schema

-- 1. Seat Map Templates Table
CREATE TABLE IF NOT EXISTS seat_map_templates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  layout JSON NULL COMMENT 'Seat layout array',
  `rows` INT UNSIGNED NOT NULL,
  columns INT UNSIGNED NOT NULL,
  seat_types JSON NULL COMMENT 'Seat type definitions',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_name (name),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Seat Map Overrides Table
CREATE TABLE IF NOT EXISTS seat_map_overrides (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  template_id BIGINT UNSIGNED NULL,
  custom_layout JSON NULL COMMENT 'Custom layout array',
  seat_status JSON NULL COMMENT 'Seat status map',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY event_id_unique (event_id),
  KEY idx_template_id (template_id),
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES seat_map_templates(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Add seat_map_template_id to events table
CALL add_column_if_missing(
  'events',
  'seat_map_template_id',
  'BIGINT UNSIGNED NULL AFTER total_seats'
);

ALTER TABLE events
ADD CONSTRAINT fk_events_seat_map_template
FOREIGN KEY IF NOT EXISTS (seat_map_template_id) REFERENCES seat_map_templates(id) ON DELETE SET NULL;

-- 4. Check-in Table
CREATE TABLE IF NOT EXISTS check_ins (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  checked_by BIGINT UNSIGNED NOT NULL COMMENT 'Admin/organizer who checked in',
  checked_by_role ENUM('admin', 'super_admin', 'organizer') NOT NULL,
  scanner_id VARCHAR(100) NULL COMMENT 'Scanner device ID',
  notes TEXT NULL,
  checked_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY ticket_id_unique (ticket_id),
  KEY idx_event_id (event_id),
  KEY idx_user_id (user_id),
  KEY idx_checked_by (checked_by),
  KEY idx_checked_in_at (checked_in_at),
  FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (checked_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Add full-text index for search
ALTER TABLE events
ADD FULLTEXT INDEX ft_events_search (title, description, venue_name);

-- 6. Add search-related columns to events
CALL add_column_if_missing(
  'events',
  'min_price',
  'DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER total_seats'
);

CALL add_column_if_missing(
  'events',
  'max_price',
  'DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER min_price'
);

-- Update min/max price calculation
UPDATE events e
SET 
  min_price = (SELECT COALESCE(MIN(tt.price), 0) FROM ticket_types tt WHERE tt.event_id = e.event_id),
  max_price = (SELECT COALESCE(MAX(tt.price), 0) FROM ticket_types tt WHERE tt.event_id = e.event_id)
WHERE e.status = 'published';

-- 7. Add indexes for search performance
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_venue_city ON events(venue_city);
CREATE INDEX idx_events_venue_state ON events(venue_state);
CREATE INDEX idx_events_min_price ON events(min_price);
CREATE INDEX idx_events_max_price ON events(max_price);
CREATE INDEX idx_events_available_seats ON events(available_seats);

-- 8. Add search-related columns to users
CALL add_column_if_missing(
  'users',
  'searchable',
  'TINYINT(1) NOT NULL DEFAULT 1 AFTER role'
);

-- 9. Add notification channel enum values
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
  'search_result'
) NOT NULL;

-- 10. Add search logs table (optional for analytics)
CREATE TABLE IF NOT EXISTS search_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  search_query VARCHAR(500) NOT NULL,
  search_type ENUM('events', 'organizers', 'users', 'categories', 'locations') NOT NULL,
  results_count INT UNSIGNED NOT NULL DEFAULT 0,
  time_taken_ms INT UNSIGNED NOT NULL DEFAULT 0,
  filters JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_id (user_id),
  KEY idx_search_type (search_type),
  KEY idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Drop procedures if they exist
DROP PROCEDURE IF EXISTS add_column_if_missing;
