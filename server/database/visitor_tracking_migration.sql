CREATE TABLE IF NOT EXISTS visitor_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  visitor_id VARCHAR(128) NOT NULL,
  session_id VARCHAR(128) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  user_role VARCHAR(40) NULL,
  path VARCHAR(512) NULL,
  referrer VARCHAR(512) NULL,
  user_agent VARCHAR(512) NULL,
  ip_address VARCHAR(64) NULL,
  first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  visit_count INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY visitor_sessions_session_unique (session_id),
  KEY visitor_sessions_visitor_index (visitor_id),
  KEY visitor_sessions_role_index (user_role),
  KEY visitor_sessions_last_seen_index (last_seen_at)
);

CREATE TABLE IF NOT EXISTS visitor_page_views (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  visitor_id VARCHAR(128) NOT NULL,
  session_id VARCHAR(128) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  user_role VARCHAR(40) NULL,
  path VARCHAR(512) NOT NULL,
  referrer VARCHAR(512) NULL,
  user_agent VARCHAR(512) NULL,
  ip_address VARCHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY visitor_page_views_session_index (session_id),
  KEY visitor_page_views_path_index (path),
  KEY visitor_page_views_created_index (created_at)
);
