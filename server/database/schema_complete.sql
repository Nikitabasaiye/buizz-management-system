-- ============================================
-- Buizz Complete System Architecture - MySQL Schema
-- Matches the exact architecture specification
-- ============================================

SET FOREIGN_KEY_CHECKS = 0;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. USERS TABLE (Single table for all roles)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  user_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NULL,
  role ENUM('super_admin', 'admin', 'organizer', 'user', 'influencer') NOT NULL DEFAULT 'user',
  organization_id BIGINT UNSIGNED NULL,
  avatar VARCHAR(500) NULL,
  google_id VARCHAR(255) NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  kyc_status ENUM('not_submitted', 'pending', 'verified', 'rejected') NOT NULL DEFAULT 'not_submitted',
  bank_verification_status ENUM('not_submitted', 'pending', 'verified', 'rejected') NOT NULL DEFAULT 'not_submitted',
  kyc_verified_at DATETIME NULL,
  kyc_verified_by BIGINT UNSIGNED NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY users_email_unique (email),
  KEY users_organization_id_index (organization_id),
  KEY users_role_index (role),
  KEY users_is_active_index (is_active),
  KEY users_email_active_index (email, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. ORGANIZATIONS TABLE
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS organizations (
  org_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT NULL,
  logo VARCHAR(500) NULL,
  website VARCHAR(500) NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NULL,
  address_street VARCHAR(255) NULL,
  address_city VARCHAR(100) NULL,
  address_state VARCHAR(100) NULL,
  address_country VARCHAR(100) NULL,
  address_zip_code VARCHAR(20) NULL,
  owner_id BIGINT UNSIGNED NOT NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (org_id),
  UNIQUE KEY organizations_slug_unique (slug),
  KEY organizations_owner_id_index (owner_id),
  KEY organizations_is_active_index (is_active),
  FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. ORGANIZATION MEMBERS TABLE
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS organization_members (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organization_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  role ENUM('owner', 'admin', 'member') NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY org_members_unique (organization_id, user_id),
  KEY org_members_user_id_index (user_id),
  FOREIGN KEY (organization_id) REFERENCES organizations(org_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. EVENTS TABLE
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS events (
  event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  organization_id BIGINT UNSIGNED NULL,
  organizer_id BIGINT UNSIGNED NOT NULL,
  category VARCHAR(120) NOT NULL,
  custom_category VARCHAR(120) NULL COMMENT 'Custom category if user selects custom option',
  type ENUM('online', 'offline', 'hybrid') NOT NULL DEFAULT 'offline',
  custom_type VARCHAR(50) NULL COMMENT 'Custom event type if user selects custom option',
  status ENUM('draft', 'published', 'ongoing', 'completed', 'cancelled') NOT NULL DEFAULT 'draft',
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
  available_seats INT UNSIGNED NULL,
  views INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id),
  UNIQUE KEY events_slug_unique (slug),
  KEY events_organization_id_index (organization_id),
  KEY events_organizer_id_index (organizer_id),
  KEY events_start_date_index (start_date),
  KEY events_status_index (status),
  KEY events_category_index (category),
  KEY events_is_featured_index (is_featured),
  KEY events_status_start_index (status, start_date),
  FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(org_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. TICKET TYPES TABLE (Separate from events for better querying)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ticket_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL COMMENT 'Early Bird, VIP, Platinum, etc.',
  description TEXT NULL,
  price DECIMAL(10, 2) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  available_quantity INT UNSIGNED NOT NULL,
  sale_start_date DATETIME NULL,
  sale_end_date DATETIME NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ticket_types_event_id_index (event_id),
  KEY ticket_types_is_active_index (is_active),
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. BOOKINGS TABLE (Created BEFORE payment)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS bookings (
  booking_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_number VARCHAR(50) NOT NULL COMMENT 'BKG-XXXXXX',
  user_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  ticket_type_id BIGINT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  booking_status ENUM('pending', 'confirmed', 'cancelled', 'expired') NOT NULL DEFAULT 'pending',
  payment_status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  booking_method ENUM('online', 'offline') NOT NULL DEFAULT 'online',
  created_by BIGINT UNSIGNED NULL COMMENT 'Organizer who created offline booking',
  expires_at DATETIME NOT NULL COMMENT 'Booking expires if not paid within 15 mins',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (booking_id),
  UNIQUE KEY bookings_booking_number_unique (booking_number),
  KEY bookings_user_id_index (user_id),
  KEY bookings_event_id_index (event_id),
  KEY bookings_booking_status_index (booking_status),
  KEY bookings_payment_status_index (payment_status),
  KEY idx_bookings_method (booking_method),
  KEY idx_bookings_created_by (created_by),
  KEY bookings_user_status_index (user_id, booking_status),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. PAYMENTS TABLE (Links to booking)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS payments (
  payment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  order_id VARCHAR(255) NOT NULL COMMENT 'Gateway order ID',
  transaction_id VARCHAR(255) NULL COMMENT 'Gateway transaction ID after payment',
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  payment_method ENUM('phonepe', 'razorpay', 'paytm', 'upi', 'card', 'netbanking', 'wallet') NULL,
  gateway_response JSON NULL COMMENT 'Raw webhook payload from PhonePe/Razorpay',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id),
  UNIQUE KEY payments_order_id_unique (order_id),
  KEY payments_booking_id_index (booking_id),
  KEY payments_user_id_index (user_id),
  KEY payments_event_id_index (event_id),
  KEY payments_transaction_id_index (transaction_id),
  KEY payments_status_index (status),
  KEY payments_user_status_index (user_id, status),
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. TICKETS TABLE (Generated AFTER payment success)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tickets (
  ticket_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_number VARCHAR(50) NOT NULL COMMENT 'TKT-XXXXXX',
  booking_id BIGINT UNSIGNED NOT NULL,
  payment_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  ticket_type_id BIGINT UNSIGNED NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  qr_code TEXT NULL COMMENT 'Base64 QR code image',
  qr_data TEXT NULL COMMENT 'JSON data embedded in QR',
  status ENUM('active', 'used', 'cancelled', 'expired') NOT NULL DEFAULT 'active',
  checked_in TINYINT(1) NOT NULL DEFAULT 0,
  checked_in_at DATETIME NULL,
  scanned_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (ticket_id),
  UNIQUE KEY tickets_ticket_number_unique (ticket_number),
  KEY tickets_booking_id_index (booking_id),
  KEY tickets_payment_id_index (payment_id),
  KEY tickets_event_id_index (event_id),
  KEY tickets_user_id_index (user_id),
  KEY tickets_status_index (status),
  KEY tickets_user_status_index (user_id, status),
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE RESTRICT,
  FOREIGN KEY (scanned_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════════════════
-- 9. INVOICES TABLE (PDF metadata after payment)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS invoices (
  invoice_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_number VARCHAR(50) NOT NULL COMMENT 'INV-XXXXXX',
  booking_id BIGINT UNSIGNED NOT NULL,
  payment_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10, 2) NOT NULL,
  pdf_url VARCHAR(500) NULL COMMENT 'S3/local path to PDF',
  pdf_generated_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (invoice_id),
  UNIQUE KEY invoices_invoice_number_unique (invoice_number),
  UNIQUE KEY invoices_booking_id_unique (booking_id),
  KEY invoices_payment_id_index (payment_id),
  KEY invoices_user_id_index (user_id),
  KEY invoices_event_id_index (event_id),
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════════════════
-- 10. INFLUENCER PROFILES TABLE (Separate from users)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS organizer_bank_accounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organizer_id BIGINT UNSIGNED NOT NULL,
  account_holder_name VARCHAR(150) NOT NULL,
  bank_account_number VARCHAR(50) NOT NULL,
  bank_ifsc_code VARCHAR(20) NOT NULL,
  bank_name VARCHAR(150) NULL,
  upi_id VARCHAR(100) NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY organizer_bank_accounts_organizer_unique (organizer_id),
  KEY organizer_bank_accounts_active_index (is_active),
  FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS organizer_settlements (
  settlement_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  settlement_number VARCHAR(50) NOT NULL,
  organizer_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  gross_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  platform_fee_percent DECIMAL(5, 2) NOT NULL DEFAULT 2.00,
  platform_fee_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  net_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status ENUM('pending', 'processing', 'paid', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
  scheduled_at DATETIME NULL,
  processed_at DATETIME NULL,
  paid_at DATETIME NULL,
  payout_reference VARCHAR(120) NULL,
  bank_reference_id VARCHAR(120) NULL,
  bank_account_snapshot JSON NULL,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (settlement_id),
  UNIQUE KEY organizer_settlements_number_unique (settlement_number),
  KEY organizer_settlements_organizer_index (organizer_id),
  KEY organizer_settlements_event_index (event_id),
  KEY organizer_settlements_status_index (status),
  FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
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
  KEY settlement_items_organizer_event_index (organizer_id, event_id),
  KEY settlement_items_status_eligible_index (status, eligible_at),
  FOREIGN KEY (settlement_id) REFERENCES organizer_settlements(settlement_id) ON DELETE SET NULL,
  FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE SET NULL,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (organizer_id) REFERENCES users(user_id) ON DELETE CASCADE
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
  KEY user_kyc_role_index (role),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (bank_account_id) REFERENCES organizer_bank_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS influencer_profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL COMMENT 'FK to users table with role=influencer',
  instagram_url VARCHAR(255) NULL,
  youtube_url VARCHAR(255) NULL,
  twitter_url VARCHAR(255) NULL,
  website_url VARCHAR(255) NULL,
  follower_count INT UNSIGNED NULL,
  niche VARCHAR(100) NULL COMMENT 'Tech, Fashion, Lifestyle, etc.',
  bio TEXT NULL,
  commission_percentage DECIMAL(5, 2) NOT NULL DEFAULT 10.00 COMMENT 'Default 10%',
  total_referrals INT UNSIGNED NOT NULL DEFAULT 0,
  total_earnings DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  payout_method ENUM('bank', 'upi', 'paypal', 'wallet') NULL,
  bank_account_number VARCHAR(50) NULL,
  bank_ifsc_code VARCHAR(20) NULL,
  bank_account_holder_name VARCHAR(150) NULL,
  upi_id VARCHAR(100) NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY influencer_profiles_user_id_unique (user_id),
  KEY influencer_profiles_is_active_index (is_active),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════════════════
-- 11. AFFILIATE LINKS TABLE (Influencer referral tracking)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS affiliate_links (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  influencer_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(50) NOT NULL COMMENT 'Unique referral code like TECH2024JOHN',
  link_url VARCHAR(500) NOT NULL COMMENT 'Full URL with ?ref=TECH2024JOHN',
  clicks INT UNSIGNED NOT NULL DEFAULT 0,
  conversions INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Successful bookings',
  total_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  commission_earned DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY affiliate_links_code_unique (code),
  UNIQUE KEY affiliate_links_influencer_event_unique (influencer_id, event_id),
  KEY affiliate_links_event_id_index (event_id),
  KEY affiliate_links_is_active_index (is_active),
  FOREIGN KEY (influencer_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════════════════
-- 12. NOTIFICATIONS TABLE (All notification logs)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  type ENUM('email', 'whatsapp', 'sms', 'push') NOT NULL,
  channel ENUM('booking_confirmed', 'payment_success', 'ticket_reminder', 'event_update', 'marketing', 'other') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSON NULL COMMENT 'Additional context',
  status ENUM('pending', 'sent', 'failed', 'bounced') NOT NULL DEFAULT 'pending',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  sent_at DATETIME NULL,
  read_at DATETIME NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY notifications_user_id_index (user_id),
  KEY notifications_type_index (type),
  KEY notifications_status_index (status),
  KEY notifications_is_read_index (is_read),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════════════════
-- 13. QR SCANS TABLE (Check-in history)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS qr_scans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT UNSIGNED NOT NULL,
  scanned_by BIGINT UNSIGNED NOT NULL COMMENT 'Organizer/staff user_id',
  scanned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  location VARCHAR(255) NULL COMMENT 'Entry gate, VIP lounge, etc.',
  device_info TEXT NULL,
  latitude DECIMAL(10, 8) NULL,
  longitude DECIMAL(11, 8) NULL,
  PRIMARY KEY (id),
  KEY qr_scans_ticket_id_index (ticket_id),
  KEY qr_scans_scanned_by_index (scanned_by),
  KEY qr_scans_scanned_at_index (scanned_at),
  FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  FOREIGN KEY (scanned_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════════════════
-- 14. AUDIT LOGS TABLE (Complete activity tracking)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  action VARCHAR(100) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  user_email VARCHAR(255) NULL,
  user_role VARCHAR(50) NULL,
  resource_type ENUM('user', 'event', 'ticket', 'payment', 'booking', 'organization', 'influencer', 'other') NULL,
  resource_id BIGINT UNSIGNED NULL,
  method ENUM('GET', 'POST', 'PUT', 'PATCH', 'DELETE') NULL,
  path VARCHAR(500) NULL,
  ip VARCHAR(45) NULL,
  user_agent TEXT NULL,
  status ENUM('success', 'failure', 'error') NOT NULL DEFAULT 'success',
  error_message TEXT NULL,
  request_body JSON NULL,
  response_status INT NULL,
  duration INT NULL COMMENT 'Duration in milliseconds',
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY audit_logs_user_id_index (user_id),
  KEY audit_logs_action_index (action),
  KEY audit_logs_resource_type_index (resource_type),
  KEY audit_logs_resource_id_index (resource_id),
  KEY audit_logs_created_at_index (created_at),
  KEY audit_logs_status_index (status),
  KEY audit_logs_user_created_index (user_id, created_at),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════════════════
-- 15. LAUNCH WAITLIST TABLE
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS launch_waitlist (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY launch_waitlist_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ══════════════════════════════════════════════════════════════════════════════
-- SUMMARY OF ARCHITECTURE
-- ══════════════════════════════════════════════════════════════════════════════
--
-- DATA FLOW:
-- 1. User registers → users table (single table for all roles)
-- 2. Organizer creates event → events table
-- 3. Ticket types defined → ticket_types table
-- 4. User initiates booking → bookings table (status: pending)
-- 5. Payment gateway called → PhonePe/Razorpay
-- 6. Payment webhook → payments table (links to booking)
-- 7. Tickets generated → tickets table (with QR codes)
-- 8. Invoice generated → invoices table (PDF metadata)
-- 9. WhatsApp sent → notifications table (delivery log)
-- 10. User checks in → qr_scans table (scan history)
--
-- ROLE HIERARCHY:
-- super_admin > admin > organizer > influencer > user
--
-- KEY TABLES:
-- - bookings: Created BEFORE payment (prevents double-booking)
-- - payments: Stores gateway response (evidence for reconciliation)
-- - tickets: Generated AFTER payment success (prevents fake tickets)
-- - influencer_profiles: Separate from users (no null fields on users)
-- - affiliate_links: Tracks conversions per influencer per event
--
-- ══════════════════════════════════════════════════════════════════════════════
