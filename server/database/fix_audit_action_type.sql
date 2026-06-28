-- Quick fix for audit_logs table missing action_type column
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS action_type ENUM('create', 'read', 'update', 'delete', 'login', 'logout', 'approve', 'reject', 'publish', 'cancel', 'payment', 'upload', 'download', 'other') NOT NULL DEFAULT 'other' AFTER action;