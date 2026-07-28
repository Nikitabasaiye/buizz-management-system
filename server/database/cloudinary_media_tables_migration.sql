-- Migration: Create Cloudinary media tables
-- This migration creates tables to store Cloudinary media metadata
-- Run this on production MySQL (u943298757_buizz)

-- 1. Event images table (for event banners, thumbnails, etc.)
CREATE TABLE IF NOT EXISTS event_images (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  image_url VARCHAR(1024) NOT NULL COMMENT 'Cloudinary secure URL',
  public_id VARCHAR(255) NOT NULL COMMENT 'Cloudinary public ID for deletion',
  image_type ENUM('banner', 'thumbnail', 'poster', 'other') DEFAULT 'banner',
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  size_bytes BIGINT UNSIGNED NULL,
  format VARCHAR(20) NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  display_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_event_id (event_id),
  KEY idx_public_id (public_id),
  KEY idx_image_type (image_type),
  CONSTRAINT fk_event_images_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Event gallery table (for event photo galleries)
CREATE TABLE IF NOT EXISTS event_gallery (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  image_url VARCHAR(1024) NOT NULL COMMENT 'Cloudinary secure URL',
  public_id VARCHAR(255) NOT NULL COMMENT 'Cloudinary public ID for deletion',
  caption VARCHAR(255) NULL,
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  size_bytes BIGINT UNSIGNED NULL,
  format VARCHAR(20) NULL,
  display_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_event_id (event_id),
  KEY idx_public_id (public_id),
  KEY idx_display_order (display_order),
  CONSTRAINT fk_event_gallery_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Event videos table (for event videos)
CREATE TABLE IF NOT EXISTS event_videos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  video_url VARCHAR(1024) NOT NULL COMMENT 'Cloudinary secure URL',
  public_id VARCHAR(255) NOT NULL COMMENT 'Cloudinary public ID for deletion',
  thumbnail_url VARCHAR(1024) NULL COMMENT 'Video thumbnail URL',
  title VARCHAR(255) NULL,
  description TEXT NULL,
  duration INT UNSIGNED NULL COMMENT 'Duration in seconds',
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  size_bytes BIGINT UNSIGNED NULL,
  format VARCHAR(20) NULL,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  display_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_event_id (event_id),
  KEY idx_public_id (public_id),
  KEY idx_is_featured (is_featured),
  CONSTRAINT fk_event_videos_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Update KYC documents table to include Cloudinary fields
ALTER TABLE kyc_documents 
ADD COLUMN IF NOT EXISTS cloudinary_url VARCHAR(1024) NULL COMMENT 'Cloudinary secure URL',
ADD COLUMN IF NOT EXISTS public_id VARCHAR(255) NULL COMMENT 'Cloudinary public ID for deletion',
ADD COLUMN IF NOT EXISTS cloudinary_format VARCHAR(20) NULL,
ADD COLUMN IF NOT EXISTS cloudinary_size BIGINT UNSIGNED NULL,
ADD INDEX IF NOT EXISTS idx_public_id (public_id);

-- 5. Update users table for profile images
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(1024) NULL COMMENT 'Cloudinary profile image URL',
ADD COLUMN IF NOT EXISTS profile_image_public_id VARCHAR(255) NULL COMMENT 'Cloudinary public ID for deletion';

-- 6. Update organizations table for logos
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS logo_url VARCHAR(1024) NULL COMMENT 'Cloudinary logo URL',
ADD COLUMN IF NOT EXISTS logo_public_id VARCHAR(255) NULL COMMENT 'Cloudinary public ID for deletion';

-- 7. Create general documents table (for invoices, reports, etc.)
CREATE TABLE IF NOT EXISTS documents (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  document_type ENUM('invoice', 'report', 'contract', 'receipt', 'other') NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  document_url VARCHAR(1024) NOT NULL COMMENT 'Cloudinary secure URL',
  public_id VARCHAR(255) NOT NULL COMMENT 'Cloudinary public ID for deletion',
  related_entity_type ENUM('event', 'booking', 'payment', 'organization', 'user') NULL,
  related_entity_id BIGINT UNSIGNED NULL,
  size_bytes BIGINT UNSIGNED NULL,
  format VARCHAR(20) NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_document_type (document_type),
  KEY idx_related_entity (related_entity_type, related_entity_id),
  KEY idx_public_id (public_id),
  KEY idx_uploaded_by (uploaded_by),
  CONSTRAINT fk_documents_user FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Create ticket QR codes table (for storing QR code images)
CREATE TABLE IF NOT EXISTS ticket_qr_codes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT UNSIGNED NOT NULL,
  qr_code_url VARCHAR(1024) NOT NULL COMMENT 'Cloudinary QR code URL',
  public_id VARCHAR(255) NOT NULL COMMENT 'Cloudinary public ID for deletion',
  qr_data TEXT NOT NULL COMMENT 'QR code data',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ticket_qr (ticket_id),
  KEY idx_public_id (public_id),
  CONSTRAINT fk_ticket_qr_codes_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_images_type_primary ON event_images(image_type, is_primary);
CREATE INDEX IF NOT EXISTS idx_event_gallery_order ON event_gallery(event_id, display_order);
CREATE INDEX IF NOT EXISTS idx_event_videos_featured ON event_videos(event_id, is_featured, display_order);
