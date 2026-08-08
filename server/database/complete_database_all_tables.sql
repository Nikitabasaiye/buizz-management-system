-- Buizz complete database schema for a fresh MySQL/MariaDB database.
-- Import this into the live database: u943298757_buizz
-- This file creates tables only. It does not insert test/demo data.

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
  user_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NULL,
  role ENUM('super_admin', 'admin', 'organizer', 'user', 'influencer') NOT NULL DEFAULT 'user',
  searchable TINYINT(1) NOT NULL DEFAULT 1,
  organization_id BIGINT UNSIGNED NULL,
  avatar VARCHAR(500) NULL,
  google_id VARCHAR(255) NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  kyc_status ENUM('not_submitted', 'pending', 'verified', 'rejected') NOT NULL DEFAULT 'not_submitted',
  bank_verification_status ENUM('not_submitted', 'pending', 'verified', 'rejected') NOT NULL DEFAULT 'not_submitted',
  kyc_verified_at DATETIME NULL,
  kyc_verified_by BIGINT UNSIGNED NULL,
  last_login DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY users_email_unique (email),
  KEY users_role_index (role),
  KEY users_active_index (is_active),
  KEY users_organization_id_index (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS organizations (
  org_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(180) NOT NULL,
  slug VARCHAR(220) NOT NULL,
  description TEXT NULL,
  logo VARCHAR(500) NULL,
  website VARCHAR(500) NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NULL,
  address_street VARCHAR(255) NULL,
  address_city VARCHAR(120) NULL,
  address_state VARCHAR(120) NULL,
  address_country VARCHAR(120) NULL,
  address_zip_code VARCHAR(40) NULL,
  owner_id BIGINT UNSIGNED NOT NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (org_id),
  UNIQUE KEY organizations_slug_unique (slug),
  KEY organizations_owner_id_index (owner_id),
  CONSTRAINT fk_organizations_owner FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS organization_members (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organization_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  role ENUM('owner', 'admin', 'member') NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY organization_members_unique (organization_id, user_id),
  KEY organization_members_user_id_index (user_id),
  CONSTRAINT fk_org_members_org FOREIGN KEY (organization_id) REFERENCES organizations(org_id) ON DELETE CASCADE,
  CONSTRAINT fk_org_members_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seat_map_templates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  layout JSON NULL,
  `rows` INT UNSIGNED NOT NULL,
  columns INT UNSIGNED NOT NULL,
  seat_types JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY seat_templates_name_index (name),
  KEY seat_templates_active_index (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS events (
  event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  organization_id BIGINT UNSIGNED NULL,
  organizer_id BIGINT UNSIGNED NOT NULL,
  category VARCHAR(120) NOT NULL,
  custom_category VARCHAR(120) NULL,
  type ENUM('online', 'offline', 'hybrid') NOT NULL DEFAULT 'offline',
  custom_type VARCHAR(50) NULL,
  status ENUM('draft', 'pending_approval', 'approved', 'rejected', 'published', 'ongoing', 'completed', 'cancelled') NOT NULL DEFAULT 'draft',
  approved_by BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  published_by BIGINT UNSIGNED NULL,
  published_at DATETIME NULL,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  venue_name VARCHAR(255) NULL,
  venue_address VARCHAR(500) NULL,
  venue_city VARCHAR(100) NULL,
  venue_state VARCHAR(100) NULL,
  venue_country VARCHAR(100) NULL,
  venue_lat DECIMAL(10, 8) NULL,
  venue_lng DECIMAL(11, 8) NULL,
  online_link VARCHAR(500) NULL,
  banner VARCHAR(500) NULL,
  images JSON NULL,
  tags JSON NULL,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  total_seats INT UNSIGNED NULL,
  seat_map_template_id BIGINT UNSIGNED NULL,
  min_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  available_seats INT UNSIGNED NULL,
  views INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id),
  UNIQUE KEY events_slug_unique (slug),
  KEY events_organizer_id_index (organizer_id),
  KEY events_organization_id_index (organization_id),
  KEY events_status_index (status),
  KEY events_category_index (category),
  KEY events_type_index (type),
  KEY events_start_date_index (start_date),
  KEY events_venue_city_index (venue_city),
  KEY events_seat_template_index (seat_map_template_id),
  CONSTRAINT fk_events_organizer FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_events_org FOREIGN KEY (organization_id) REFERENCES organizations(org_id) ON DELETE SET NULL,
  CONSTRAINT fk_events_seat_template FOREIGN KEY (seat_map_template_id) REFERENCES seat_map_templates(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  is_free TINYINT(1) NOT NULL DEFAULT 0,
  quantity INT UNSIGNED NOT NULL,
  available_quantity INT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ticket_types_event_id_index (event_id),
  CONSTRAINT fk_ticket_types_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bookings (
  booking_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_number VARCHAR(80) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  ticket_type_id BIGINT UNSIGNED NULL,
  quantity INT UNSIGNED NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  booking_status ENUM('pending', 'confirmed', 'cancelled', 'expired', 'refunded') NOT NULL DEFAULT 'pending',
  payment_status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  booking_method ENUM('online', 'offline') NOT NULL DEFAULT 'online',
  created_by BIGINT UNSIGNED NULL,
  expires_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (booking_id),
  UNIQUE KEY bookings_number_unique (booking_number),
  KEY bookings_user_id_index (user_id),
  KEY bookings_event_id_index (event_id),
  KEY bookings_method_index (booking_method),
  CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_ticket_type FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  payment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  order_id VARCHAR(120) NOT NULL,
  transaction_id VARCHAR(160) NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  payment_method ENUM('phonepe', 'razorpay', 'paytm', 'upi', 'card', 'netbanking', 'wallet', 'cod') NULL,
  gateway_response JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id),
  UNIQUE KEY payments_order_unique (order_id),
  KEY payments_booking_id_index (booking_id),
  KEY payments_user_id_index (user_id),
  KEY payments_event_id_index (event_id),
  CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE SET NULL,
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tickets (
  ticket_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_number VARCHAR(100) NOT NULL,
  booking_id BIGINT UNSIGNED NULL,
  payment_id BIGINT UNSIGNED NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  ticket_type_id BIGINT UNSIGNED NULL,
  ticket_type VARCHAR(150) NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  qr_code VARCHAR(500) NULL,
  qr_data LONGTEXT NULL,
  status ENUM('active', 'used', 'cancelled', 'expired') NOT NULL DEFAULT 'active',
  checked_in TINYINT(1) NOT NULL DEFAULT 0,
  checked_in_at DATETIME NULL,
  scanned_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (ticket_id),
  UNIQUE KEY tickets_number_unique (ticket_number),
  KEY tickets_booking_id_index (booking_id),
  KEY tickets_payment_id_index (payment_id),
  KEY tickets_event_id_index (event_id),
  KEY tickets_user_id_index (user_id),
  CONSTRAINT fk_tickets_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE SET NULL,
  CONSTRAINT fk_tickets_payment FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE SET NULL,
  CONSTRAINT fk_tickets_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  CONSTRAINT fk_tickets_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoices (
  invoice_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_number VARCHAR(100) NOT NULL,
  booking_id BIGINT UNSIGNED NOT NULL,
  payment_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(12, 2) NOT NULL,
  pdf_url VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (invoice_id),
  UNIQUE KEY invoices_number_unique (invoice_number),
  KEY invoices_booking_id_index (booking_id),
  CONSTRAINT fk_invoices_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  CONSTRAINT fk_invoices_payment FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE SET NULL,
  CONSTRAINT fk_invoices_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qr_scans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT UNSIGNED NOT NULL,
  scanned_by BIGINT UNSIGNED NULL,
  scanned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY qr_scans_ticket_id_index (ticket_id),
  CONSTRAINT fk_qr_scans_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  CONSTRAINT fk_qr_scans_user FOREIGN KEY (scanned_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS check_ins (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  checked_by BIGINT UNSIGNED NOT NULL,
  checked_by_role ENUM('admin', 'super_admin', 'organizer') NOT NULL,
  scanner_id VARCHAR(100) NULL,
  notes TEXT NULL,
  checked_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY check_ins_ticket_unique (ticket_id),
  KEY check_ins_event_id_index (event_id),
  KEY check_ins_user_id_index (user_id),
  KEY check_ins_checked_by_index (checked_by),
  CONSTRAINT fk_checkins_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  CONSTRAINT fk_checkins_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  CONSTRAINT fk_checkins_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  CONSTRAINT fk_checkins_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_checkins_checked_by FOREIGN KEY (checked_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admins (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NULL,
  avatar VARCHAR(500) NULL,
  permissions JSON NULL,
  is_super_admin TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY admins_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS organizer_bank_accounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organizer_id BIGINT UNSIGNED NOT NULL,
  account_holder_name VARCHAR(180) NOT NULL,
  account_number VARCHAR(80) NOT NULL,
  ifsc_code VARCHAR(20) NOT NULL,
  bank_name VARCHAR(160) NOT NULL,
  branch_name VARCHAR(160) NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY organizer_bank_accounts_organizer_index (organizer_id),
  CONSTRAINT fk_bank_accounts_organizer FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS organizer_settlements (
  settlement_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organizer_id BIGINT UNSIGNED NOT NULL,
  bank_account_id BIGINT UNSIGNED NULL,
  settlement_number VARCHAR(100) NOT NULL,
  gross_amount DECIMAL(12, 2) NOT NULL,
  platform_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  net_amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status ENUM('pending', 'processing', 'settled', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
  period_start DATE NULL,
  period_end DATE NULL,
  settled_at DATETIME NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (settlement_id),
  UNIQUE KEY settlement_number_unique (settlement_number),
  KEY settlements_organizer_index (organizer_id),
  CONSTRAINT fk_settlements_organizer FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_settlements_bank FOREIGN KEY (bank_account_id) REFERENCES organizer_bank_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settlement_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  settlement_id BIGINT UNSIGNED NULL,
  payment_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  organizer_id BIGINT UNSIGNED NOT NULL,
  gross_amount DECIMAL(12, 2) NOT NULL,
  platform_fee_percent DECIMAL(5, 2) NOT NULL DEFAULT 2.00,
  platform_fee_amount DECIMAL(12, 2) NOT NULL,
  net_amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  eligible_at DATETIME NOT NULL,
  status ENUM('pending', 'included', 'settled', 'cancelled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY settlement_items_payment_unique (payment_id),
  KEY settlement_items_settlement_index (settlement_id),
  CONSTRAINT fk_settlement_items_settlement FOREIGN KEY (settlement_id) REFERENCES organizer_settlements(settlement_id) ON DELETE SET NULL,
  CONSTRAINT fk_settlement_items_payment FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE CASCADE,
  CONSTRAINT fk_settlement_items_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE SET NULL,
  CONSTRAINT fk_settlement_items_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  CONSTRAINT fk_settlement_items_organizer FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_kyc_verifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  role ENUM('super_admin', 'admin', 'organizer') NOT NULL,
  status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
  bank_status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
  legal_name VARCHAR(150) NOT NULL,
  business_name VARCHAR(180) NULL,
  pan_number VARCHAR(20) NOT NULL,
  gst_number VARCHAR(30) NULL,
  aadhaar_last4 VARCHAR(4) NULL,
  address_line VARCHAR(255) NOT NULL,
  city VARCHAR(120) NOT NULL,
  state VARCHAR(120) NOT NULL,
  pincode VARCHAR(20) NOT NULL,
  bank_account_id BIGINT UNSIGNED NULL,
  documents JSON NOT NULL,
  bank_documents JSON NOT NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  rejection_reason TEXT NULL,
  review_notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY user_kyc_user_status_index (user_id, status),
  KEY user_kyc_status_index (status),
  CONSTRAINT fk_kyc_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_kyc_bank FOREIGN KEY (bank_account_id) REFERENCES organizer_bank_accounts(id) ON DELETE SET NULL,
  CONSTRAINT fk_kyc_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS influencer_profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  bio TEXT NULL,
  social_links JSON NULL,
  commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY influencer_profiles_user_unique (user_id),
  CONSTRAINT fk_influencer_profiles_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS affiliate_links (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  influencer_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(80) NOT NULL,
  clicks INT UNSIGNED NOT NULL DEFAULT 0,
  conversions INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY affiliate_links_code_unique (code),
  KEY affiliate_links_influencer_index (influencer_id),
  KEY affiliate_links_event_index (event_id),
  CONSTRAINT fk_affiliate_influencer FOREIGN KEY (influencer_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_affiliate_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(80) NULL,
  channel ENUM('booking_confirmed', 'booking_offline', 'payment_success', 'ticket_reminder', 'event_update', 'event_approval', 'marketing', 'other', 'seat_map_update', 'check_in_success', 'check_in_failed', 'search_result') NOT NULL DEFAULT 'other',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSON NULL,
  related_type VARCHAR(80) NULL,
  related_id BIGINT UNSIGNED NULL,
  metadata JSON NULL,
  status ENUM('pending', 'sent', 'failed', 'read') NOT NULL DEFAULT 'pending',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY notifications_user_index (user_id),
  KEY notifications_channel_index (channel),
  KEY notifications_read_index (is_read),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  user_name VARCHAR(150) NULL,
  user_email VARCHAR(255) NULL,
  user_role VARCHAR(50) NULL,
  action VARCHAR(100) NOT NULL,
  action_type ENUM('create', 'read', 'update', 'delete', 'login', 'logout', 'approve', 'reject', 'publish', 'cancel', 'payment', 'upload', 'download', 'other') NOT NULL DEFAULT 'other',
  resource_type VARCHAR(50) NULL,
  resource_id BIGINT UNSIGNED NULL,
  description TEXT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  request_method VARCHAR(10) NULL,
  request_url VARCHAR(500) NULL,
  request_body JSON NULL,
  response_status INT NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  metadata JSON NULL,
  severity ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'low',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY audit_logs_user_index (user_id),
  KEY audit_logs_action_index (action),
  KEY audit_logs_resource_index (resource_type, resource_id),
  KEY audit_logs_created_index (created_at),
  CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_approval_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  organizer_id BIGINT UNSIGNED NOT NULL,
  organizer_name VARCHAR(150) NOT NULL,
  organizer_email VARCHAR(255) NOT NULL,
  reviewer_id BIGINT UNSIGNED NULL,
  reviewer_name VARCHAR(150) NULL,
  reviewer_email VARCHAR(255) NULL,
  reviewer_role VARCHAR(50) NULL,
  action ENUM('submitted', 'approved', 'rejected', 'published', 'cancelled') NOT NULL,
  previous_status VARCHAR(50) NULL,
  new_status VARCHAR(50) NULL,
  comments TEXT NULL,
  rejection_reason TEXT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY event_approval_history_event_index (event_id),
  KEY event_approval_history_organizer_index (organizer_id),
  KEY event_approval_history_reviewer_index (reviewer_id),
  CONSTRAINT fk_event_approval_history_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  CONSTRAINT fk_event_approval_history_organizer FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_event_approval_history_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  session_token VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  login_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  logout_at TIMESTAMP NULL,
  last_activity TIMESTAMP NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  metadata JSON NULL,
  PRIMARY KEY (id),
  KEY user_sessions_user_index (user_id),
  KEY user_sessions_token_index (session_token),
  CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS file_access_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  file_type VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NULL,
  file_size BIGINT NULL,
  action ENUM('upload', 'download', 'view', 'delete') NOT NULL,
  resource_type VARCHAR(50) NULL,
  resource_id BIGINT UNSIGNED NULL,
  ip_address VARCHAR(45) NULL,
  status VARCHAR(50) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY file_access_user_index (user_id),
  KEY file_access_resource_index (resource_type, resource_id),
  CONSTRAINT fk_file_access_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS launch_waitlist (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY launch_waitlist_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_approval_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NULL,
  organizer_id BIGINT UNSIGNED NOT NULL,
  action_type ENUM('create', 'update', 'delete') NOT NULL,
  request_data JSON NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  admin_id BIGINT UNSIGNED NULL,
  super_admin_id BIGINT UNSIGNED NULL,
  admin_status ENUM('pending', 'approved', 'rejected') NULL,
  super_admin_status ENUM('pending', 'approved', 'rejected') NULL,
  rejection_reason TEXT NULL,
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  KEY event_approval_requests_event_index (event_id),
  KEY event_approval_requests_organizer_index (organizer_id),
  KEY event_approval_requests_status_index (status),
  CONSTRAINT fk_event_approval_requests_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  CONSTRAINT fk_event_approval_requests_organizer FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_event_approval_requests_admin FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_event_approval_requests_super_admin FOREIGN KEY (super_admin_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_event_bookings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  total_tickets INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY user_event_bookings_unique (user_id, event_id),
  CONSTRAINT fk_user_event_bookings_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_user_event_bookings_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_groups (
  group_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id),
  UNIQUE KEY user_groups_name_unique (name),
  CONSTRAINT fk_user_groups_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
  permission_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  module VARCHAR(80) NOT NULL,
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (permission_id),
  UNIQUE KEY permissions_name_unique (name),
  KEY permissions_module_index (module)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_group_members (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  added_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY user_group_members_unique (group_id, user_id),
  CONSTRAINT fk_group_members_group FOREIGN KEY (group_id) REFERENCES user_groups(group_id) ON DELETE CASCADE,
  CONSTRAINT fk_group_members_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_group_members_added_by FOREIGN KEY (added_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_group_permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  granted_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY group_permission_unique (group_id, permission_id),
  CONSTRAINT fk_group_permissions_group FOREIGN KEY (group_id) REFERENCES user_groups(group_id) ON DELETE CASCADE,
  CONSTRAINT fk_group_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE,
  CONSTRAINT fk_group_permissions_granted_by FOREIGN KEY (granted_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  granted_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY user_permission_unique (user_id, permission_id),
  CONSTRAINT fk_user_permissions_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_user_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE,
  CONSTRAINT fk_user_permissions_granted_by FOREIGN KEY (granted_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permission_delegations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  delegated_to BIGINT UNSIGNED NOT NULL,
  can_assign_permissions TINYINT(1) NOT NULL DEFAULT 0,
  can_create_groups TINYINT(1) NOT NULL DEFAULT 0,
  can_manage_users TINYINT(1) NOT NULL DEFAULT 0,
  delegated_by BIGINT UNSIGNED NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY permission_delegations_user_unique (delegated_to),
  CONSTRAINT fk_permission_delegations_user FOREIGN KEY (delegated_to) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_permission_delegations_by FOREIGN KEY (delegated_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permission_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NULL,
  target_id BIGINT UNSIGNED NULL,
  permission_id BIGINT UNSIGNED NULL,
  permission_name VARCHAR(120) NULL,
  performed_by BIGINT UNSIGNED NULL,
  details JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY permission_audit_action_index (action),
  KEY permission_audit_performed_by_index (performed_by),
  CONSTRAINT fk_permission_audit_by FOREIGN KEY (performed_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seat_map_overrides (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  template_id BIGINT UNSIGNED NULL,
  custom_layout JSON NULL,
  seat_status JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY seat_overrides_event_unique (event_id),
  KEY seat_overrides_template_index (template_id),
  CONSTRAINT fk_seat_overrides_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  CONSTRAINT fk_seat_overrides_template FOREIGN KEY (template_id) REFERENCES seat_map_templates(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
    KEY search_logs_user_index (user_id),
    KEY search_logs_type_index (search_type),
    KEY search_logs_created_index (created_at),
    CONSTRAINT fk_search_logs_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
  review_id VARCHAR(36) NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  rating INT NOT NULL,
  title VARCHAR(200) NULL,
  review_text TEXT NULL,
  images JSON NULL,
  status ENUM('pending', 'approved', 'rejected', 'flagged') NOT NULL DEFAULT 'approved',
  helpful_count INT NOT NULL DEFAULT 0,
  report_count INT NOT NULL DEFAULT 0,
  is_verified_purchase TINYINT(1) NOT NULL DEFAULT 0,
  organizer_response TEXT NULL,
  organizer_response_date DATETIME NULL,
  admin_notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (review_id),
  KEY reviews_event_index (event_id),
  KEY reviews_user_index (user_id),
  KEY reviews_booking_index (booking_id),
  KEY reviews_status_index (status),
  CONSTRAINT fk_reviews_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE SET NULL,
  CONSTRAINT chk_reviews_rating CHECK (rating >= 1 AND rating <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS review_helpful (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  review_id VARCHAR(36) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  is_helpful TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY review_helpful_user_review_unique (review_id, user_id),
  CONSTRAINT fk_review_helpful_review FOREIGN KEY (review_id) REFERENCES reviews(review_id) ON DELETE CASCADE,
  CONSTRAINT fk_review_helpful_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS review_reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  review_id VARCHAR(36) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  reason ENUM('spam', 'inappropriate', 'offensive', 'fake', 'other') NOT NULL,
  description TEXT NULL,
  status ENUM('pending', 'reviewed', 'resolved', 'dismissed') NOT NULL DEFAULT 'pending',
  admin_notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY review_reports_review_index (review_id),
  KEY review_reports_user_index (user_id),
  CONSTRAINT fk_review_reports_review FOREIGN KEY (review_id) REFERENCES reviews(review_id) ON DELETE CASCADE,
  CONSTRAINT fk_review_reports_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_rating_summary (
  event_id BIGINT UNSIGNED NOT NULL,
  total_reviews INT NOT NULL DEFAULT 0,
  average_rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  rating_5_star INT NOT NULL DEFAULT 0,
  rating_4_star INT NOT NULL DEFAULT 0,
  rating_3_star INT NOT NULL DEFAULT 0,
  rating_2_star INT NOT NULL DEFAULT 0,
  rating_1_star INT NOT NULL DEFAULT 0,
  last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id),
  CONSTRAINT fk_rating_summary_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS support_tickets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id VARCHAR(80) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  category VARCHAR(80) NOT NULL DEFAULT 'general',
  order_id BIGINT UNSIGNED NULL,
  event_id BIGINT UNSIGNED NULL,
  status ENUM('open', 'in_progress', 'resolved', 'closed', 'deleted') NOT NULL DEFAULT 'open',
  resolution TEXT NULL,
  assigned_to BIGINT UNSIGNED NULL,
  assigned_at DATETIME NULL,
  resolved_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY support_tickets_ticket_id_unique (ticket_id),
  KEY support_tickets_user_index (user_id),
  KEY support_tickets_status_index (status),
  KEY support_tickets_priority_index (priority),
  CONSTRAINT fk_support_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_support_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE SET NULL,
  CONSTRAINT fk_support_booking FOREIGN KEY (order_id) REFERENCES bookings(booking_id) ON DELETE SET NULL,
  CONSTRAINT fk_support_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
