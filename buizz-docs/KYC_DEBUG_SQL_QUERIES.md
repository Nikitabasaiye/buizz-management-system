# KYC Debug SQL Queries

## Check if KYC table exists and its structure

```sql
-- 1. Check if table exists
SHOW TABLES LIKE 'user_kyc_verifications';

-- 2. Get table structure
DESCRIBE user_kyc_verifications;

-- 3. Check if table has any data
SELECT COUNT(*) as total_records FROM user_kyc_verifications;

-- 4. Check users table for KYC status columns
DESCRIBE users;

-- 5. Check if users have KYC status set
SELECT 
    user_id,
    email,
    role,
    kyc_status,
    bank_verification_status,
    kyc_verified_at,
    is_verified
FROM users
WHERE kyc_status != 'not_submitted'
ORDER BY kyc_verified_at DESC
LIMIT 10;
```

## Check for any KYC-related tables

```sql
-- List all tables that might contain KYC data
SHOW TABLES LIKE '%kyc%';
SHOW TABLES LIKE '%verification%';
SHOW TABLES LIKE '%document%';
```

## Check if migration was run

```sql
-- Check if KYC columns exist in users table
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'users'
AND COLUMN_NAME LIKE '%kyc%'
ORDER BY COLUMN_NAME;
```

## Test manual insertion

```sql
-- Test if you can manually insert into the table
INSERT INTO user_kyc_verifications (
    user_id,
    role,
    status,
    bank_status,
    legal_name,
    business_name,
    pan_number,
    gst_number,
    aadhaar_last4,
    address_line,
    city,
    state,
    pincode,
    documents,
    bank_documents
) VALUES (
    1,
    'organizer',
    'pending',
    'pending',
    'Test Name',
    'Test Business',
    'ABCDE1234F',
    NULL,
    '1234',
    'Test Address',
    'Test City',
    'Test State',
    '123456',
    '[{"type":"pan","url":"http://test.com/pan.pdf","fileName":"pan.pdf"}]',
    '[{"type":"cancelled_cheque_or_passbook","url":"http://test.com/cheque.pdf","fileName":"cheque.pdf"}]'
);

-- Check if insert worked
SELECT * FROM user_kyc_verifications WHERE user_id = 1;

-- Clean up test data
DELETE FROM user_kyc_verifications WHERE user_id = 1;
```

## Check for any recent errors or logs

```sql
-- If you have an error logs table, check for recent KYC-related errors
-- This depends on your logging setup
```

## Verify database connection and permissions

```sql
-- Check current database
SELECT DATABASE();

-- Check current user
SELECT CURRENT_USER();

-- Check if user has INSERT permission on user_kyc_verifications
SHOW GRANTS FOR CURRENT_USER();
```

## Common Issues and Solutions

### Issue 1: Table doesn't exist
**Solution:** Run the KYC migration
```sql
-- Run the migration file content from server/database/kyc_verification_migration.sql
```

### Issue 2: Table structure mismatch
**Solution:** Compare the structure with the migration file and alter the table accordingly

### Issue 3: Missing columns in users table
**Solution:** Add missing columns
```sql
ALTER TABLE users
ADD COLUMN kyc_status ENUM('not_submitted', 'pending', 'verified', 'rejected') NOT NULL DEFAULT 'not_submitted' AFTER is_verified,
ADD COLUMN bank_verification_status ENUM('not_submitted', 'pending', 'verified', 'rejected') NOT NULL DEFAULT 'not_submitted' AFTER kyc_status,
ADD COLUMN kyc_verified_at DATETIME NULL AFTER bank_verification_status,
ADD COLUMN kyc_verified_by BIGINT UNSIGNED NULL AFTER kyc_verified_at;
```

### Issue 4: Foreign key constraints failing
**Solution:** Check if referenced tables and columns exist
```sql
-- Check if users table has user_id column
DESCRIBE users;

-- Check if organizer_bank_accounts table exists
SHOW TABLES LIKE 'organizer_bank_accounts';
```
