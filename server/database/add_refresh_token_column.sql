-- Migration: Add refresh_token column to user_sessions table
-- This migration adds the missing refresh_token column to existing user_sessions table

-- Check if column exists, if not add it
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'user_sessions'
  AND COLUMN_NAME = 'refresh_token'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE user_sessions ADD COLUMN refresh_token VARCHAR(255) NULL COMMENT ''Refresh token for token rotation'' AFTER session_token',
  'SELECT ''Column refresh_token already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add unique index for refresh_token if it doesn't exist
SET @index_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'user_sessions'
  AND INDEX_NAME = 'user_sessions_refresh_token_unique'
);

SET @sql = IF(@index_exists = 0,
  'CREATE UNIQUE INDEX user_sessions_refresh_token_unique ON user_sessions(refresh_token)',
  'SELECT ''Index user_sessions_refresh_token_unique already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
