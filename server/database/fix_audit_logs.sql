-- Fix audit_logs table structure
-- Add missing user_name column if it doesn't exist

ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS user_name VARCHAR(150) NULL AFTER user_id;

-- Verify the table structure
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'u943298757_buizz' 
AND TABLE_NAME = 'audit_logs' 
ORDER BY ORDINAL_POSITION;
