-- Run this once on the crashed/restored database so normal user accounts
-- are stored with the same role value the application now writes.

ALTER TABLE users
  MODIFY role ENUM(
    'super_admin',
    'admin',
    'organizer',
    'customer',
    'user',
    'influencer',
    'checkin_staff'
  ) NOT NULL DEFAULT 'user';

UPDATE users
SET role = 'user'
WHERE role IS NULL OR role = '' OR role = 'customer';

