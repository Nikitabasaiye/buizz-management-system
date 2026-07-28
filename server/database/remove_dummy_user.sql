-- Remove dummy user data
DELETE FROM users WHERE email = 'lalitabasaiye03@gmail.com';
DELETE FROM users WHERE phone = '+918421142160';

-- Also check for user_id 25 if it's the dummy user
DELETE FROM users WHERE user_id = 25 AND email = 'lalitabasaiye03@gmail.com';

-- If you want to keep user_id 25 but fix the role, uncomment below:
-- UPDATE users SET role = 'organizer' WHERE user_id = 25 AND email = 'lalitabasaiye03@gmail.com';

-- Verify deletion
SELECT COUNT(*) as remaining_dummy_users FROM users WHERE email = 'lalitabasaiye03@gmail.com' OR phone = '+918421142160';

-- Check if user_id 25 still exists and its role
SELECT user_id, email, role FROM users WHERE user_id = 25;
