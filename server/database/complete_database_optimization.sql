-- ============================================
-- Complete Database Optimization & Missing Tables
-- ============================================

SET FOREIGN_KEY_CHECKS = 0;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. FIX USERS TABLE ROLE ENUM
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE users 
MODIFY COLUMN role ENUM('super_admin', 'admin', 'organizer', 'customer', 'influencer', 'checkin_staff') 
NOT NULL DEFAULT 'customer';

-- Update existing 'user' roles to 'customer'
UPDATE users SET role = 'customer' WHERE role = 'user';

-- Add missing display_id column if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_id BIGINT UNSIGNED NULL AFTER user_id;
UPDATE users SET display_id = user_id WHERE display_id IS NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. ADD MISSING COLUMNS TO EVENTS TABLE
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS language VARCHAR(100) NULL COMMENT 'Event language (e.g., Hindi, English, Mixed)' AFTER category,
ADD COLUMN IF NOT EXISTS age_restriction VARCHAR(50) NULL COMMENT 'Age restriction (e.g., 18+, All Ages, 16+)' AFTER language,
ADD COLUMN IF NOT EXISTS duration VARCHAR(50) NULL COMMENT 'Event duration (e.g., 2h 30m, 3 hours)' AFTER age_restriction,
ADD COLUMN IF NOT EXISTS subtitle VARCHAR(255) NULL COMMENT 'Event subtitle/tagline' AFTER title,
ADD COLUMN IF NOT EXISTS terms_conditions TEXT NULL COMMENT 'Terms and conditions including refund policy, cancellation policy, custom terms' AFTER description;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. CREATE MISSING TABLES
-- ══════════════════════════════════════════════════════════════════════════════

-- ADMINS TABLE (Separate admin-specific data)
CREATE TABLE IF NOT EXISTS admins (
  admin_id BIGINT UNSIGNED NOT NULL,
  department VARCHAR(100) NULL,
  permissions JSON NULL COMMENT 'Additional admin-specific permissions',
  last_password_change DATETIME NULL,
  two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0,
  two_factor_secret VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (admin_id),
  FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- EVENT APPROVAL REQUESTS TABLE
CREATE TABLE IF NOT EXISTS event_approval_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NULL,
  organizer_id BIGINT UNSIGNED NOT NULL,
  action_type ENUM('create', 'update', 'delete') NOT NULL DEFAULT 'create',
  request_data JSON NULL,
  status ENUM('pending', 'approved', 'rejected', 'changes_requested') NOT NULL DEFAULT 'pending',
  admin_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  super_admin_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  admin_id BIGINT UNSIGNED NULL,
  super_admin_id BIGINT UNSIGNED NULL,
  processed_at DATETIME NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  rejection_reason TEXT NULL,
  review_notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY event_approval_requests_event_id_index (event_id),
  KEY event_approval_requests_organizer_index (organizer_id),
  KEY event_approval_requests_status_index (status),
  KEY event_approval_requests_admin_status_index (admin_status),
  KEY event_approval_requests_super_admin_status_index (super_admin_status),
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE SET NULL,
  FOREIGN KEY (super_admin_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- EVENT APPROVAL HISTORY TABLE
CREATE TABLE IF NOT EXISTS event_approval_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  approval_request_id BIGINT UNSIGNED NULL,
  event_id BIGINT UNSIGNED NULL,
  organizer_id BIGINT UNSIGNED NULL,
  organizer_name VARCHAR(150) NULL,
  organizer_email VARCHAR(255) NULL,
  reviewer_id BIGINT UNSIGNED NULL,
  reviewer_name VARCHAR(150) NULL,
  reviewer_email VARCHAR(255) NULL,
  reviewer_role VARCHAR(50) NULL,
  action ENUM('submitted', 'approved', 'rejected', 'changes_requested', 'resubmitted') NOT NULL,
  previous_status VARCHAR(50) NULL,
  new_status VARCHAR(50) NULL,
  comments TEXT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY event_approval_history_request_index (approval_request_id),
  KEY event_approval_history_event_index (event_id),
  KEY event_approval_history_organizer_index (organizer_id),
  KEY event_approval_history_reviewer_index (reviewer_id),
  KEY event_approval_history_action_index (action),
  FOREIGN KEY (approval_request_id) REFERENCES event_approval_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE SET NULL,
  FOREIGN KEY (reviewer_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- EVENT CHECKIN STAFF TABLE
CREATE TABLE IF NOT EXISTS event_checkin_staff (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  staff_id BIGINT UNSIGNED NOT NULL,
  assigned_by BIGINT UNSIGNED NOT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  permissions JSON NULL COMMENT 'Check-in permissions (scan, view, manage)',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY event_checkin_staff_unique (event_id, staff_id),
  KEY event_checkin_staff_event_index (event_id),
  KEY event_checkin_staff_staff_index (staff_id),
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- EVENT GALLERY TABLE
CREATE TABLE IF NOT EXISTS event_gallery (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  caption VARCHAR(255) NULL,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY event_gallery_event_index (event_id),
  KEY event_gallery_featured_index (is_featured),
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- EVENT IMAGES TABLE (Separate from gallery for event banner/images)
CREATE TABLE IF NOT EXISTS event_images (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  image_type ENUM('banner', 'gallery', 'thumbnail') NOT NULL DEFAULT 'gallery',
  alt_text VARCHAR(255) NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY event_images_event_index (event_id),
  KEY event_images_type_index (image_type),
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- EVENT VIDEOS TABLE
CREATE TABLE IF NOT EXISTS event_videos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  video_url VARCHAR(500) NOT NULL,
  video_type ENUM('youtube', 'vimeo', 'direct') NOT NULL DEFAULT 'youtube',
  thumbnail_url VARCHAR(500) NULL,
  title VARCHAR(255) NULL,
  description TEXT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY event_videos_event_index (event_id),
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- FILE ACCESS LOGS TABLE
CREATE TABLE IF NOT EXISTS file_access_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) NULL,
  action ENUM('view', 'download', 'upload', 'delete') NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  access_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY file_access_logs_user_index (user_id),
  KEY file_access_logs_file_index (file_path(255)),
  KEY file_access_logs_time_index (access_time),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PAYMENT HISTORY TABLE (Separate from payments for historical tracking)
CREATE TABLE IF NOT EXISTS payment_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  payment_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  action ENUM('created', 'completed', 'failed', 'refunded', 'partial_refund') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  previous_status VARCHAR(50) NULL,
  new_status VARCHAR(50) NULL,
  performed_by BIGINT UNSIGNED NULL,
  performed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT NULL,
  metadata JSON NULL,
  PRIMARY KEY (id),
  KEY payment_history_payment_index (payment_id),
  KEY payment_history_booking_index (booking_id),
  KEY payment_history_user_index (user_id),
  KEY payment_history_action_index (action),
  KEY payment_history_time_index (performed_at),
  FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (performed_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PERMISSIONS TABLE (Dynamic permissions system)
CREATE TABLE IF NOT EXISTS permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT NULL,
  module VARCHAR(50) NOT NULL COMMENT 'users, events, payments, etc.',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY permissions_slug_unique (slug),
  KEY permissions_module_index (module),
  KEY permissions_active_index (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PERMISSION AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS permission_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NULL,
  action ENUM('granted', 'revoked', 'modified') NOT NULL,
  performed_by BIGINT UNSIGNED NOT NULL,
  performed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  previous_value JSON NULL,
  new_value JSON NULL,
  reason TEXT NULL,
  PRIMARY KEY (id),
  KEY permission_audit_logs_user_index (user_id),
  KEY permission_audit_logs_permission_index (permission_id),
  KEY permission_audit_logs_performed_by_index (performed_by),
  KEY permission_audit_logs_time_index (performed_at),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE SET NULL,
  FOREIGN KEY (performed_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PERMISSION DELEGATIONS TABLE
CREATE TABLE IF NOT EXISTS permission_delegations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  from_user_id BIGINT UNSIGNED NOT NULL,
  to_user_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  delegated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  revoked_at DATETIME NULL,
  revoked_by BIGINT UNSIGNED NULL,
  notes TEXT NULL,
  PRIMARY KEY (id),
  KEY permission_delegations_from_index (from_user_id),
  KEY permission_delegations_to_index (to_user_id),
  KEY permission_delegations_permission_index (permission_id),
  KEY permission_delegations_active_index (is_active),
  FOREIGN KEY (from_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (to_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  FOREIGN KEY (revoked_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SEARCH LOGS TABLE
CREATE TABLE IF NOT EXISTS search_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  search_query VARCHAR(500) NOT NULL,
  search_type ENUM('events', 'plays', 'activities', 'all') NOT NULL DEFAULT 'all',
  filters JSON NULL COMMENT 'Applied filters (category, price, date, etc.)',
  results_count INT UNSIGNED NULL,
  clicked_event_id BIGINT UNSIGNED NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  searched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY search_logs_user_index (user_id),
  KEY search_logs_query_index (search_query(255)),
  KEY search_logs_type_index (search_type),
  KEY search_logs_time_index (searched_at),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  FOREIGN KEY (clicked_event_id) REFERENCES events(event_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SEAT MAP TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS seat_map_templates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organizer_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  template_data JSON NOT NULL COMMENT 'Seat map configuration',
  venue_name VARCHAR(255) NULL,
  total_seats INT UNSIGNED NOT NULL DEFAULT 0,
  is_public TINYINT(1) NOT NULL DEFAULT 0,
  usage_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY seat_map_templates_organizer_index (organizer_id),
  KEY seat_map_templates_public_index (is_public),
  FOREIGN KEY (organized_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SEAT MAP OVERRIDES TABLE
CREATE TABLE IF NOT EXISTS seat_map_overrides (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  seat_id VARCHAR(50) NOT NULL,
  status ENUM('available', 'booked', 'blocked', 'vip') NOT NULL DEFAULT 'available',
  price_override DECIMAL(10, 2) NULL,
  blocked_reason VARCHAR(255) NULL,
  blocked_by BIGINT UNSIGNED NULL,
  blocked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY seat_map_overrides_unique (event_id, seat_id),
  KEY seat_map_overrides_event_index (event_id),
  KEY seat_map_overrides_status_index (status),
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (blocked_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS support_tickets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_number VARCHAR(50) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  subject VARCHAR(255) NOT NULL,
  category ENUM('booking', 'payment', 'event', 'account', 'technical', 'other') NOT NULL,
  priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  status ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
  assigned_to BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY support_tickets_number_unique (ticket_number),
  KEY support_tickets_user_index (user_id),
  KEY support_tickets_status_index (status),
  KEY support_tickets_assigned_index (assigned_to),
  KEY support_tickets_category_index (category),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SUPPORT TICKET ACTIVITIES TABLE
CREATE TABLE IF NOT EXISTS support_ticket_activities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  action ENUM('created', 'comment', 'status_changed', 'assigned', 'resolved', 'closed') NOT NULL,
  previous_value VARCHAR(255) NULL,
  new_value VARCHAR(255) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY support_ticket_activities_ticket_index (ticket_id),
  KEY support_ticket_activities_user_index (user_id),
  KEY support_ticket_activities_action_index (action),
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SUPPORT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS support_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT UNSIGNED NOT NULL,
  sender_id BIGINT UNSIGNED NOT NULL,
  message TEXT NOT NULL,
  is_internal TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Internal note vs customer message',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY support_messages_ticket_index (ticket_id),
  KEY support_messages_sender_index (sender_id),
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SUPPORT ATTACHMENTS TABLE
CREATE TABLE IF NOT EXISTS support_attachments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT UNSIGNED NOT NULL,
  message_id BIGINT UNSIGNED NULL,
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT UNSIGNED NULL,
  file_type VARCHAR(100) NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY support_attachments_ticket_index (ticket_id),
  KEY support_attachments_message_index (message_id),
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES support_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USER EVENT BOOKINGS TABLE (Separate from bookings for user history)
CREATE TABLE IF NOT EXISTS user_event_bookings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NOT NULL,
  ticket_count INT UNSIGNED NOT NULL DEFAULT 1,
  total_amount DECIMAL(10, 2) NOT NULL,
  booking_date DATETIME NOT NULL,
  event_date DATETIME NOT NULL,
  status ENUM('confirmed', 'cancelled', 'completed', 'no_show') NOT NULL DEFAULT 'confirmed',
  checked_in TINYINT(1) NOT NULL DEFAULT 0,
  checked_in_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY user_event_bookings_user_index (user_id),
  KEY user_event_bookings_event_index (event_id),
  KEY user_event_bookings_booking_index (booking_id),
  KEY user_event_bookings_date_index (event_date),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USER GROUPS TABLE
CREATE TABLE IF NOT EXISTS user_groups (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY user_groups_slug_unique (slug),
  KEY user_groups_created_by_index (created_by),
  KEY user_groups_active_index (is_active),
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USER GROUP MEMBERS TABLE
CREATE TABLE IF NOT EXISTS user_group_members (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  role ENUM('admin', 'member') NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY user_group_members_unique (group_id, user_id),
  KEY user_group_members_group_index (group_id),
  KEY user_group_members_user_index (user_id),
  FOREIGN KEY (group_id) REFERENCES user_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USER GROUP PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS user_group_permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  granted_by BIGINT UNSIGNED NOT NULL,
  granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY user_group_permissions_unique (group_id, permission_id),
  KEY user_group_permissions_group_index (group_id),
  KEY user_group_permissions_permission_index (permission_id),
  FOREIGN KEY (group_id) REFERENCES user_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USER PERMISSIONS TABLE (Individual user permissions)
CREATE TABLE IF NOT EXISTS user_permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  granted_by BIGINT UNSIGNED NOT NULL,
  granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY user_permissions_unique (user_id, permission_id),
  KEY user_permissions_user_index (user_id),
  KEY user_permissions_permission_index (permission_id),
  KEY user_permissions_active_index (is_active),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USER SESSIONS TABLE
CREATE TABLE IF NOT EXISTS user_sessions (
  session_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  session_token VARCHAR(500) NOT NULL,
  refresh_token VARCHAR(500) NOT NULL,
  role VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  device_type VARCHAR(50) NULL,
  browser VARCHAR(50) NULL,
  os VARCHAR(50) NULL,
  location VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  expires_at DATETIME NOT NULL,
  last_activity DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  session_data JSON NULL,
  location_data JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (session_id),
  UNIQUE KEY user_sessions_token_unique (session_token),
  KEY user_sessions_user_index (user_id),
  KEY user_sessions_active_index (is_active),
  KEY user_sessions_expires_index (expires_at),
  KEY user_sessions_device_index (device_type),
  KEY user_sessions_browser_index (browser),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CHECKIN STAFF PERFORMANCE TABLE
CREATE TABLE IF NOT EXISTS checkin_staff_performance (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  staff_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  date DATE NOT NULL,
  tickets_scanned INT UNSIGNED NOT NULL DEFAULT 0,
  tickets_verified INT UNSIGNED NOT NULL DEFAULT 0,
  tickets_rejected INT UNSIGNED NOT NULL DEFAULT 0,
  average_scan_time DECIMAL(5, 2) NULL COMMENT 'Average time per scan in seconds',
  shift_start DATETIME NULL,
  shift_end DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY checkin_staff_performance_unique (staff_id, event_id, date),
  KEY checkin_staff_performance_staff_index (staff_id),
  KEY checkin_staff_performance_event_index (event_id),
  KEY checkin_staff_performance_date_index (date),
  FOREIGN KEY (staff_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. ADD MISSING INDEXES FOR PERFORMANCE
-- ══════════════════════════════════════════════════════════════════════════════

-- Users table additional indexes
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- Events table additional indexes
CREATE INDEX IF NOT EXISTS idx_events_organizer_status ON events(organizer_id, status);
CREATE INDEX IF NOT EXISTS idx_events_category_status ON events(category, status);
CREATE INDEX IF NOT EXISTS idx_events_date_range ON events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_events_featured_status ON events(is_featured, status);

-- Bookings table additional indexes
CREATE INDEX IF NOT EXISTS idx_bookings_event_status ON bookings(event_id, booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_event ON bookings(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_bookings_expires ON bookings(expires_at);

-- Payments table additional indexes
CREATE INDEX IF NOT EXISTS idx_payments_status_created ON payments(status, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_event_status ON payments(event_id, status);

-- Tickets table additional indexes
CREATE INDEX IF NOT EXISTS idx_tickets_event_status ON tickets(event_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_user_event ON tickets(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_checked_in ON tickets(checked_in, checked_in_at);

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. INSERT DEFAULT PERMISSIONS
-- ══════════════════════════════════════════════════════════════════════════════
INSERT IGNORE INTO permissions (name, slug, description, module) VALUES
('Create Events', 'event:create', 'Create new events', 'events'),
('Read Events', 'event:read', 'View event details', 'events'),
('Update Events', 'event:update', 'Edit event information', 'events'),
('Delete Events', 'event:delete', 'Delete events', 'events'),
('Publish Events', 'event:publish', 'Publish events to public', 'events'),
('List Events', 'event:list', 'List all events', 'events'),
('Create Users', 'user:create', 'Create new users', 'users'),
('Read Users', 'user:read', 'View user details', 'users'),
('Update Users', 'user:update', 'Edit user information', 'users'),
('Delete Users', 'user:delete', 'Delete users', 'users'),
('List Users', 'user:list', 'List all users', 'users'),
('Create Tickets', 'ticket:create', 'Create ticket types', 'tickets'),
('Read Tickets', 'ticket:read', 'View ticket details', 'tickets'),
('Update Tickets', 'ticket:update', 'Edit ticket information', 'tickets'),
('Delete Tickets', 'ticket:delete', 'Delete tickets', 'tickets'),
('Scan Tickets', 'ticket:scan', 'Scan QR codes for check-in', 'tickets'),
('List Tickets', 'ticket:list', 'List all tickets', 'tickets'),
('Create Payments', 'payment:create', 'Initiate payments', 'payments'),
('Read Payments', 'payment:read', 'View payment details', 'payments'),
('Refund Payments', 'payment:refund', 'Process refunds', 'payments'),
('List Payments', 'payment:list', 'List all payments', 'payments'),
('Admin Access', 'admin:access', 'Access admin panel', 'admin'),
('Manage Users', 'admin:users', 'Manage user accounts', 'admin'),
('Manage Events', 'admin:events', 'Manage all events', 'admin'),
('Manage Payments', 'admin:payments', 'Manage payments', 'admin'),
('View Analytics', 'admin:analytics', 'View system analytics', 'admin'),
('Manage Settings', 'admin:settings', 'Manage system settings', 'admin');

SET FOREIGN_KEY_CHECKS = 1;

-- ══════════════════════════════════════════════════════════════════════════════
-- SUMMARY
-- ══════════════════════════════════════════════════════════════════════════════
-- This migration:
-- 1. Fixes the users table role ENUM (user -> customer)
-- 2. Adds missing columns to events table (language, age_restriction, duration, subtitle, terms_conditions)
-- 3. Creates 25+ missing tables for complete system functionality
-- 4. Adds performance indexes for frequently queried columns
-- 5. Inserts default permissions for the permissions system
-- ══════════════════════════════════════════════════════════════════════════════
