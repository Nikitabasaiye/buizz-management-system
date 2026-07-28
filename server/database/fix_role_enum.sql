-- Migration to fix role ENUM and update existing 'user' roles to 'customer'

-- Update the role ENUM to remove 'user' and ensure 'customer' is present
ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'admin', 'organizer', 'customer', 'influencer', 'checkin_staff') NOT NULL DEFAULT 'customer';

-- Update existing users with 'user' role to 'customer'
UPDATE users SET role = 'customer' WHERE role = 'user';

-- Verify the changes
SELECT user_id, email, role FROM users WHERE role IN ('customer', 'user') LIMIT 10;
