-- Reviews and Ratings System Migration
-- Run this script to create all review-related tables

-- Main reviews table
CREATE TABLE IF NOT EXISTS reviews (
  review_id VARCHAR(36) PRIMARY KEY,
  event_id VARCHAR(36) NOT NULL,
  booking_id VARCHAR(36),
  user_id VARCHAR(36) NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(200),
  review_text TEXT,
  images JSON DEFAULT NULL COMMENT 'Array of image URLs',
  status ENUM('pending', 'approved', 'rejected', 'flagged') DEFAULT 'approved',
  helpful_count INT DEFAULT 0,
  report_count INT DEFAULT 0,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  organizer_response TEXT DEFAULT NULL,
  organizer_response_date DATETIME DEFAULT NULL,
  admin_notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_event_id (event_id),
  INDEX idx_user_id (user_id),
  INDEX idx_booking_id (booking_id),
  INDEX idx_status (status),
  INDEX idx_rating (rating),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Review helpful votes table
CREATE TABLE IF NOT EXISTS review_helpful (
  id INT AUTO_INCREMENT PRIMARY KEY,
  review_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  is_helpful BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_review (review_id, user_id),
  INDEX idx_review_id (review_id),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (review_id) REFERENCES reviews(review_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Review reports table
CREATE TABLE IF NOT EXISTS review_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  review_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  reason ENUM('spam', 'inappropriate', 'offensive', 'fake', 'other') NOT NULL,
  description TEXT,
  status ENUM('pending', 'reviewed', 'resolved', 'dismissed') DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_review_id (review_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  FOREIGN KEY (review_id) REFERENCES reviews(review_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Event rating summary table (for quick access)
CREATE TABLE IF NOT EXISTS event_rating_summary (
  event_id VARCHAR(36) PRIMARY KEY,
  total_reviews INT DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  rating_5_star INT DEFAULT 0,
  rating_4_star INT DEFAULT 0,
  rating_3_star INT DEFAULT 0,
  rating_2_star INT DEFAULT 0,
  rating_1_star INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample reviews for testing (optional - remove in production)
-- INSERT INTO reviews (review_id, event_id, user_id, rating, title, review_text, is_verified_purchase)
-- SELECT 
--   UUID(),
--   e.event_id,
--   u.user_id,
--   FLOOR(1 + RAND() * 5),
--   'Great event!',
--   'Had an amazing experience at this event. Would definitely recommend!',
--   TRUE
-- FROM events e
-- CROSS JOIN users u
-- WHERE u.role = 'customer'
-- LIMIT 50;
