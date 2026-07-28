-- Migration: User Sessions Table for Database Session Storage
-- This migration creates a user_sessions table to store session data
-- in the database instead of relying solely on Redis/memory storage
-- This provides better persistence and session management capabilities

CREATE TABLE IF NOT EXISTS user_sessions (
  session_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  session_token VARCHAR(255) NOT NULL COMMENT 'JWT token or session identifier',
  refresh_token VARCHAR(255) NULL COMMENT 'Refresh token for token rotation',
  role ENUM('customer', 'organizer', 'admin', 'super_admin', 'checkin_staff', 'influencer') NOT NULL,
  
  -- Session metadata
  ip_address VARCHAR(45) NULL COMMENT 'IP address of the user',
  user_agent TEXT NULL COMMENT 'Browser/device information',
  device_type VARCHAR(50) NULL COMMENT 'mobile, desktop, tablet, etc.',
  browser VARCHAR(100) NULL COMMENT 'Browser name',
  os VARCHAR(100) NULL COMMENT 'Operating system',
  
  -- Session status
  is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Whether session is currently active',
  is_revoked TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Whether session was manually revoked',
  revoked_at DATETIME NULL COMMENT 'Timestamp when session was revoked',
  revoked_by BIGINT UNSIGNED NULL COMMENT 'User ID who revoked the session',
  revoke_reason VARCHAR(255) NULL COMMENT 'Reason for session revocation',
  
  -- Session timing
  last_activity TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Last user activity timestamp',
  expires_at TIMESTAMP NOT NULL COMMENT 'Session expiration time',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Additional session data
  session_data JSON NULL COMMENT 'Additional session metadata (preferences, etc.)',
  location_data JSON NULL COMMENT 'Geolocation data if available',
  
  PRIMARY KEY (session_id),
  UNIQUE KEY user_sessions_token_unique (session_token),
  UNIQUE KEY user_sessions_refresh_token_unique (refresh_token),
  KEY user_sessions_user_id_index (user_id),
  KEY user_sessions_role_index (role),
  KEY user_sessions_is_active_index (is_active),
  KEY user_sessions_expires_at_index (expires_at),
  KEY user_sessions_last_activity_index (last_activity),
  KEY user_sessions_user_active_index (user_id, is_active),
  KEY user_sessions_user_role_active_index (user_id, role, is_active),
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (revoked_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stores user session data for authentication and session management';

-- Create index for efficient session cleanup queries
CREATE INDEX idx_sessions_cleanup ON user_sessions(is_active, expires_at);

-- Create index for finding active sessions by user and role
CREATE INDEX idx_user_active_sessions ON user_sessions(user_id, role, is_active, last_activity);

-- Create a table for session activity logs (optional - for detailed tracking)
CREATE TABLE IF NOT EXISTS session_activity_logs (
  log_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  action ENUM('login', 'logout', 'refresh', 'activity', 'revoked', 'expired') NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  action_details JSON NULL COMMENT 'Additional context about the action',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (log_id),
  KEY session_activity_logs_session_id_index (session_id),
  KEY session_activity_logs_user_id_index (user_id),
  KEY session_activity_logs_action_index (action),
  KEY session_activity_logs_created_at_index (created_at),
  
  FOREIGN KEY (session_id) REFERENCES user_sessions(session_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Logs session-related activities for audit and security purposes';

-- Create a table for managing multiple concurrent sessions per user
CREATE TABLE IF NOT EXISTS user_session_limits (
  limit_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  role ENUM('customer', 'organizer', 'admin', 'super_admin', 'checkin_staff', 'influencer') NOT NULL,
  max_concurrent_sessions INT UNSIGNED NOT NULL DEFAULT 5 COMMENT 'Maximum allowed concurrent sessions',
  max_session_duration_hours INT UNSIGNED NOT NULL DEFAULT 168 COMMENT 'Maximum session duration in hours (7 days default)',
  allow_multiple_devices TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Allow sessions from multiple devices',
  enforce_ip_binding TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Bind session to IP address',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (limit_id),
  UNIQUE KEY user_session_limits_user_role_unique (user_id, role),
  KEY user_session_limits_user_id_index (user_id),
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Configures session limits and policies per user role';

-- Insert default session limits for different roles
INSERT INTO user_session_limits (user_id, role, max_concurrent_sessions, max_session_duration_hours, allow_multiple_devices, enforce_ip_binding)
SELECT user_id, role, 
  CASE role 
    WHEN 'super_admin' THEN 3
    WHEN 'admin' THEN 5
    WHEN 'organizer' THEN 10
    WHEN 'influencer' THEN 5
    ELSE 3
  END as max_concurrent_sessions,
  CASE role 
    WHEN 'super_admin' THEN 8
    WHEN 'admin' THEN 12
    WHEN 'organizer' THEN 168
    WHEN 'influencer' THEN 168
    ELSE 168
  END as max_session_duration_hours,
  CASE role 
    WHEN 'super_admin' THEN 0
    WHEN 'admin' THEN 1
    ELSE 1
  END as allow_multiple_devices,
  CASE role 
    WHEN 'super_admin' THEN 1
    ELSE 0
  END as enforce_ip_binding
FROM users 
WHERE role IN ('super_admin', 'admin', 'organizer', 'influencer', 'user')
ON DUPLICATE KEY UPDATE 
  max_concurrent_sessions = VALUES(max_concurrent_sessions),
  max_session_duration_hours = VALUES(max_session_duration_hours),
  allow_multiple_devices = VALUES(allow_multiple_devices),
  enforce_ip_binding = VALUES(enforce_ip_binding);
