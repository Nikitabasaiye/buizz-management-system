# SQL Queries for SuperAdmin to Check KYC Documents

## Database Schema
- **Table**: `user_kyc_verifications`
- **Key Fields**: 
  - `documents` (JSON) - KYC documents
  - `bank_documents` (JSON) - Bank documents
  - `status` (pending/verified/rejected)
  - `bank_status` (pending/verified/rejected)

---

## 1. View All KYC Submissions
```sql
SELECT 
    ukv.id,
    ukv.user_id,
    ukv.role,
    ukv.status,
    ukv.bank_status,
    ukv.legal_name,
    ukv.business_name,
    ukv.pan_number,
    ukv.gst_number,
    ukv.aadhaar_last4,
    ukv.city,
    ukv.state,
    ukv.submitted_at,
    ukv.reviewed_at,
    ukv.reviewed_by,
    ukv.rejection_reason,
    u.email,
    u.phone
FROM user_kyc_verifications ukv
LEFT JOIN users u ON ukv.user_id = u.user_id
ORDER BY ukv.submitted_at DESC;
```

---

## 2. View Pending KYC Requests
```sql
SELECT 
    ukv.id,
    ukv.user_id,
    ukv.role,
    ukv.legal_name,
    ukv.business_name,
    ukv.pan_number,
    ukv.city,
    ukv.state,
    ukv.submitted_at,
    u.email,
    u.phone
FROM user_kyc_verifications ukv
LEFT JOIN users u ON ukv.user_id = u.user_id
WHERE ukv.status = 'pending'
ORDER BY ukv.submitted_at ASC;
```

---

## 3. View Specific KYC Details by ID
```sql
SELECT 
    ukv.*,
    JSON_PRETTY(ukv.documents) AS kyc_documents_formatted,
    JSON_PRETTY(ukv.bank_documents) AS bank_documents_formatted,
    u.email,
    u.phone,
    u.is_verified
FROM user_kyc_verifications ukv
LEFT JOIN users u ON ukv.user_id = u.user_id
WHERE ukv.id = [KYC_ID];
```

---

## 4. View KYC Documents for Specific User
```sql
SELECT 
    ukv.id,
    ukv.status,
    ukv.bank_status,
    ukv.legal_name,
    ukv.business_name,
    ukv.pan_number,
    ukv.gst_number,
    ukv.aadhaar_last4,
    ukv.address_line,
    ukv.city,
    ukv.state,
    ukv.pincode,
    JSON_PRETTY(ukv.documents) AS kyc_documents,
    JSON_PRETTY(ukv.bank_documents) AS bank_documents,
    ukv.submitted_at,
    ukv.reviewed_at,
    ukv.reviewed_by,
    ukv.rejection_reason,
    ukv.review_notes
FROM user_kyc_verifications ukv
WHERE ukv.user_id = [USER_ID]
ORDER BY ukv.submitted_at DESC;
```

---

## 5. View KYC by Role (Organizer/Admin/SuperAdmin)
```sql
SELECT 
    ukv.id,
    ukv.user_id,
    ukv.role,
    ukv.status,
    ukv.legal_name,
    ukv.business_name,
    ukv.pan_number,
    ukv.city,
    ukv.state,
    ukv.submitted_at,
    u.email
FROM user_kyc_verifications ukv
LEFT JOIN users u ON ukv.user_id = u.user_id
WHERE ukv.role = 'organizer'
ORDER BY ukv.submitted_at DESC;
```

---

## 6. Extract Document URLs from JSON
```sql
SELECT 
    ukv.id,
    ukv.user_id,
    ukv.legal_name,
    ukv.documents->>'$.type' AS document_type,
    ukv.documents->>'$.url' AS document_url,
    ukv.documents->>'$.fileName' AS file_name
FROM user_kyc_verifications ukv
WHERE ukv.id = [KYC_ID];
```

---

## 7. View All Document URLs for a KYC Submission
```sql
SELECT 
    ukv.id,
    ukv.user_id,
    ukv.legal_name,
    doc.type,
    doc.url,
    doc.fileName
FROM user_kyc_verifications ukv
CROSS JOIN JSON_TABLE(
    ukv.documents,
    '$[*]' COLUMNS(
        type VARCHAR(50) PATH '$.type',
        url VARCHAR(255) PATH '$.url',
        fileName VARCHAR(255) PATH '$.fileName'
    )
) AS doc
WHERE ukv.id = [KYC_ID];
```

---

## 8. View Bank Documents
```sql
SELECT 
    ukv.id,
    ukv.user_id,
    ukv.legal_name,
    bank_doc.type,
    bank_doc.url,
    bank_doc.fileName
FROM user_kyc_verifications ukv
CROSS JOIN JSON_TABLE(
    ukv.bank_documents,
    '$[*]' COLUMNS(
        type VARCHAR(50) PATH '$.type',
        url VARCHAR(255) PATH '$.url',
        fileName VARCHAR(255) PATH '$.fileName'
    )
) AS bank_doc
WHERE ukv.id = [KYC_ID];
```

---

## 9. Count KYC Submissions by Status
```sql
SELECT 
    status,
    COUNT(*) as count
FROM user_kyc_verifications
GROUP BY status;
```

---

## 10. Count KYC by Role
```sql
SELECT 
    role,
    status,
    COUNT(*) as count
FROM user_kyc_verifications
GROUP BY role, status
ORDER BY role, status;
```

---

## 11. View Recently Submitted KYC (Last 7 Days)
```sql
SELECT 
    ukv.id,
    ukv.user_id,
    ukv.role,
    ukv.legal_name,
    ukv.business_name,
    ukv.status,
    ukv.submitted_at,
    u.email
FROM user_kyc_verifications ukv
LEFT JOIN users u ON ukv.user_id = u.user_id
WHERE ukv.submitted_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY ukv.submitted_at DESC;
```

---

## 12. View Rejected KYC with Reasons
```sql
SELECT 
    ukv.id,
    ukv.user_id,
    ukv.legal_name,
    ukv.business_name,
    ukv.rejection_reason,
    ukv.review_notes,
    ukv.reviewed_at,
    u.email
FROM user_kyc_verifications ukv
LEFT JOIN users u ON ukv.user_id = u.user_id
WHERE ukv.status = 'rejected'
ORDER BY ukv.reviewed_at DESC;
```

---

## 13. Update KYC Status (Approve)
```sql
UPDATE user_kyc_verifications
SET 
    status = 'verified',
    reviewed_by = [SUPERADMIN_USER_ID],
    reviewed_at = NOW(),
    review_notes = 'KYC approved by superadmin'
WHERE id = [KYC_ID];
```

---

## 14. Update KYC Status (Reject)
```sql
UPDATE user_kyc_verifications
SET 
    status = 'rejected',
    reviewed_by = [SUPERADMIN_USER_ID],
    reviewed_at = NOW(),
    rejection_reason = 'Documents unclear/incomplete',
    review_notes = 'Please resubmit with clear documents'
WHERE id = [KYC_ID];
```

---

## 15. Update User KYC Status in Users Table
```sql
UPDATE users
SET 
    kyc_status = 'verified',
    kyc_verified_at = NOW(),
    kyc_verified_by = [SUPERADMIN_USER_ID]
WHERE user_id = [USER_ID];
```

---

## 16. View Complete KYC Information with User Details
```sql
SELECT 
    ukv.id AS kyc_id,
    ukv.user_id,
    u.email,
    u.phone,
    ukv.role,
    ukv.status AS kyc_status,
    ukv.bank_status,
    ukv.legal_name,
    ukv.business_name,
    ukv.pan_number,
    ukv.gst_number,
    ukv.aadhaar_last4,
    ukv.address_line,
    ukv.city,
    ukv.state,
    ukv.pincode,
    JSON_PRETTY(ukv.documents) AS kyc_documents,
    JSON_PRETTY(ukv.bank_documents) AS bank_documents,
    ukv.submitted_at,
    ukv.reviewed_at,
    ukv.reviewed_by,
    ukv.rejection_reason,
    ukv.review_notes,
    u.is_verified,
    u.kyc_status AS user_kyc_status,
    u.kyc_verified_at
FROM user_kyc_verifications ukv
LEFT JOIN users u ON ukv.user_id = u.user_id
WHERE ukv.id = [KYC_ID];
```

---

## 17. Search KYC by PAN Number
```sql
SELECT 
    ukv.id,
    ukv.user_id,
    ukv.legal_name,
    ukv.business_name,
    ukv.pan_number,
    ukv.status,
    ukv.city,
    ukv.state,
    u.email
FROM user_kyc_verifications ukv
LEFT JOIN users u ON ukv.user_id = u.user_id
WHERE ukv.pan_number = '[PAN_NUMBER]';
```

---

## 18. View KYC Statistics Dashboard
```sql
SELECT 
    COUNT(*) AS total_submissions,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
    SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) AS verified,
    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
    SUM(CASE WHEN bank_status = 'pending' THEN 1 ELSE 0 END) AS bank_pending,
    SUM(CASE WHEN bank_status = 'verified' THEN 1 ELSE 0 END) AS bank_verified,
    SUM(CASE WHEN bank_status = 'rejected' THEN 1 ELSE 0 END) AS bank_rejected
FROM user_kyc_verifications;
```

---

## Usage Notes:
- Replace `[KYC_ID]` with actual KYC verification ID
- Replace `[USER_ID]` with actual user ID
- Replace `[SUPERADMIN_USER_ID]` with your superadmin user ID
- Replace `[PAN_NUMBER]` with actual PAN number to search
- Use `JSON_PRETTY()` for readable JSON output
- Use `JSON_TABLE()` for extracting individual document details
