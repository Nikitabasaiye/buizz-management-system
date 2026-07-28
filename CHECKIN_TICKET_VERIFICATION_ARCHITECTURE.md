# Check-In and Ticket Verification System Architecture

## Overview

This document provides a comprehensive system design architecture for the check-in and ticket verification workflow in the Buizz platform (similar to BookMyShow). The system enables secure ticket generation, QR code-based verification, and real-time check-in management for events.

## System Components

### 1. Database Schema

#### Bookings Table (`bookings`)
```sql
CREATE TABLE bookings (
  booking_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  booking_number VARCHAR(50) UNIQUE NOT NULL COMMENT 'BKG-XXXXXX',
  user_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  ticket_type_id BIGINT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  booking_status ENUM('pending', 'confirmed', 'cancelled', 'expired') DEFAULT 'pending',
  payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  booking_method ENUM('online', 'offline') DEFAULT 'online',
  created_by BIGINT UNSIGNED NULL COMMENT 'Organizer for offline bookings',
  expires_at DATETIME NOT NULL COMMENT '15-minute payment window',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE RESTRICT
);
```

**Purpose**: Stores booking records created before payment. Acts as the initial reservation that gets confirmed upon successful payment.

#### Payments Table (`payments`)
```sql
CREATE TABLE payments (
  payment_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  order_id VARCHAR(255) UNIQUE NOT NULL COMMENT 'Gateway order ID',
  transaction_id VARCHAR(255) NULL COMMENT 'Gateway transaction ID',
  razorpay_payment_id VARCHAR(255) NULL COMMENT 'Razorpay payment ID',
  razorpay_order_id VARCHAR(255) NULL COMMENT 'Razorpay order ID',
  razorpay_signature VARCHAR(255) NULL COMMENT 'Razorpay signature',
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  payment_method ENUM('phonepe', 'razorpay', 'paytm', 'upi', 'card', 'netbanking', 'wallet'),
  gateway_response JSON NULL COMMENT 'Raw webhook payload',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
);
```

**Purpose**: Links bookings to payment gateway transactions. Stores Razorpay/PhonePe specific IDs for payment verification and tracking.

#### Tickets Table (`tickets`)
```sql
CREATE TABLE tickets (
  ticket_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  ticket_number VARCHAR(50) UNIQUE NOT NULL COMMENT 'TKT-XXXXXX',
  booking_id BIGINT UNSIGNED NOT NULL,
  payment_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  ticket_type_id BIGINT UNSIGNED NOT NULL,
  ticket_type VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  qr_code TEXT NULL COMMENT 'Base64 QR code image',
  qr_data TEXT NULL COMMENT 'JSON data embedded in QR',
  status ENUM('active', 'used', 'cancelled', 'expired') DEFAULT 'active',
  checked_in TINYINT(1) DEFAULT 0,
  checked_in_at DATETIME NULL,
  scanned_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE RESTRICT,
  FOREIGN KEY (scanned_by) REFERENCES users(user_id) ON DELETE SET NULL
);
```

**Purpose**: Individual tickets generated after successful payment. Each booking can generate multiple tickets (based on quantity). Contains QR code data for verification.

#### Check-Ins Table (`check_ins`)
```sql
CREATE TABLE check_ins (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  ticket_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  checked_by BIGINT UNSIGNED NOT NULL,
  checked_by_role VARCHAR(20) NOT NULL,
  scanner_id VARCHAR(100) NULL COMMENT 'Device identifier',
  notes TEXT NULL,
  checked_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY check_ins_ticket_unique (ticket_id),
  KEY check_ins_event_id_index (event_id),
  KEY check_ins_user_id_index (user_id),
  KEY check_ins_checked_by_index (checked_by),
  FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
```

**Purpose**: Records all check-in events with audit trail. Prevents duplicate check-ins via unique constraint on ticket_id.

#### QR Scans Table (`qr_scans`)
```sql
CREATE TABLE qr_scans (
  scan_id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  ticket_id BIGINT UNSIGNED NOT NULL,
  scanned_by BIGINT UNSIGNED NOT NULL,
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  scan_location_lat DECIMAL(10, 8) NULL,
  scan_location_lng DECIMAL(11, 8) NULL,
  device_info VARCHAR(255) NULL,
  FOREIGN KEY (ticket_id) REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  FOREIGN KEY (scanned_by) REFERENCES users(user_id) ON DELETE SET NULL
);
```

**Purpose**: Detailed scan history including location and device information for security analytics.

---

## Workflow Architecture

### Phase 1: Booking Creation (Pre-Payment)

**Flow:**
1. User selects event and ticket type
2. System validates ticket availability and user limits (max 10 tickets per event)
3. Creates booking record with `pending` status
4. Sets 15-minute payment expiration window
5. Creates payment record with gateway order ID
6. Initiates payment via PhonePe or Razorpay

**Key Validations:**
- Event must be published
- Ticket type must have available quantity
- User cannot exceed 10 tickets per event
- At least one payment gateway must be configured

**Database State:**
```
bookings: { booking_status: 'pending', payment_status: 'pending' }
payments: { status: 'pending', order_id: 'gateway_order_id' }
tickets: NOT CREATED YET
```

---

### Phase 2: Payment Confirmation & Ticket Generation

**Flow:**
1. Payment gateway sends webhook/callback
2. System verifies payment signature (Razorpay) or status (PhonePe)
3. Updates payment status to `completed`
4. Updates booking status to `confirmed`
5. **Generates tickets** (one per quantity purchased)
6. Updates ticket type available quantity
7. Updates event available seats
8. Generates PDF tickets with QR codes
9. Sends confirmation email with ticket attachments

**Ticket Generation Process:**
```javascript
// For each ticket in quantity:
1. Generate unique ticket number: {timestamp}{random}
2. Create QR code data: {FRONTEND_URL}/ticket/{ticket_number}
3. Generate QR code image (Base64) using qrcode library
4. Store in tickets table with:
   - ticket_number, booking_id, payment_id, event_id, user_id
   - ticket_type_id, ticket_type, price
   - qr_code (Base64 image), qr_data (URL)
   - status: 'active'
```

**Database State:**
```
bookings: { booking_status: 'confirmed', payment_status: 'completed' }
payments: { status: 'completed', transaction_id: 'gateway_txn_id' }
tickets: [{ status: 'active', qr_code: 'base64...', qr_data: 'https://...' }]
```

---

### Phase 3: Ticket Verification (Pre-Check-In)

**Endpoint:** `POST /checkin/events/:eventId/validate`

**Flow:**
1. Check-in staff scans QR code or enters ticket number
2. System resolves ticket from:
   - `ticketId` (database ID)
   - `ticketNumber` (TKT-XXXXXX format)
   - `qrData` (JSON payload from QR scan)
3. Validates ticket:
   - Ticket exists in database
   - Ticket belongs to the correct event
   - Booking status is `confirmed`
   - Ticket status is `active` (not cancelled/expired)
   - Ticket has NOT been checked in yet
4. Returns validation result without modifying state

**Response States:**
- `valid: true` - Ticket is ready for check-in
- `valid: false, alreadyUsed: true` - Ticket already checked in
- `valid: false, reason: '...'` - Various validation failures

**Use Case:** Pre-scan preview to verify ticket validity before actual check-in.

---

### Phase 4: Check-In Process

**Endpoint:** `POST /checkin/events/:eventId/checkin`

**Flow:**
1. Check-in staff validates ticket (same as Phase 3)
2. If valid, creates check-in record:
   - Links ticket_id, booking_id, event_id, user_id
   - Records checked_by (staff user ID and role)
   - Optional: scanner_id (device identifier)
   - Optional: notes
3. Updates ticket status:
   - `status: 'used'`
   - `checked_in: 1`
   - `checked_in_at: NOW()`
   - `scanned_by: staff_user_id`
4. Creates QR scan record for audit trail
5. Returns success response with ticket details

**Database State:**
```
tickets: { status: 'used', checked_in: 1, checked_in_at: timestamp, scanned_by: staff_id }
check_ins: { ticket_id, checked_by, checked_by_role, checked_in_at, scanner_id, notes }
qr_scans: { ticket_id, scanned_by, scanned_at, device_info, location }
```

**Error Handling:**
- Ticket not found → 404
- Wrong event → 400
- Already checked in → Returns existing check-in details (idempotent)
- Invalid booking status → 400
- Cancelled/expired ticket → 400

---

### Phase 5: Batch Check-In

**Endpoint:** `POST /checkin/events/:eventId/checkin/batch`

**Flow:**
1. Receives array of tickets to check-in
2. Processes each ticket independently using `checkInTicket()`
3. Uses `Promise.allSettled()` for parallel processing
4. Aggregates results:
   - Total processed
   - Successful count
   - Failed count
   - Individual results with success/error messages

**Use Case:** Bulk check-in for groups or multiple tickets from same booking.

---

## QR Code System

### QR Code Generation

**Library:** `qrcode` npm package

**Format:**
```javascript
const qrData = `${baseUrl}/ticket/${ticketNumber}`;
const qr_code = await QRCode.toDataURL(qrData, {
  errorCorrectionLevel: 'M',  // Medium error correction
  margin: 1,
  width: 224,                 // 224x224 pixels
  color: { 
    dark: '#090a0d',           // Dark color
    light: '#ffffff'           // Light color
  }
});
```

**QR Data Structure:**
- **URL Format:** `https://buizz.com/ticket/TKT1234567890`
- **JSON Format (Optional):** `{ "ticket_number": "TKT1234567890", "ticket_id": 123 }`

**Storage:**
- `qr_code` column: Base64-encoded PNG image
- `qr_data` column: URL or JSON string embedded in QR

### QR Code Scanning

**Resolution Logic:**
```javascript
function resolveTicket({ ticketId, ticketNumber, qrData }) {
  // 1. If QR data provided, parse it
  if (qrData) {
    const parsed = JSON.parse(qrData);
    ticketNumber = parsed.ticket_number || parsed.ticketNumber;
    ticketId = parsed.ticket_id || parsed.ticketId;
  }
  
  // 2. Fallback: treat raw string as ticket number
  if (!ticketId && !ticketNumber && qrData) {
    ticketNumber = qrData;
  }
  
  // 3. Query database
  const col = ticketId ? 'ticket_id = ?' : 'ticket_number = ?';
  const val = ticketId || ticketNumber;
  
  return await pool.query(
    `SELECT t.*, b.*, u.* FROM tickets t
     JOIN bookings b ON t.booking_id = b.booking_id
     JOIN users u ON t.user_id = u.user_id
     WHERE ${col}`,
    [val]
  );
}
```

**Security Features:**
- Unique ticket numbers prevent duplication
- Event validation prevents cross-event ticket usage
- Status validation prevents reuse
- Check-in uniqueness constraint prevents double scanning

---

## Check-In Analytics & Reporting

### Real-Time Statistics

**Endpoint:** `GET /checkin/events/:eventId/checkins/stats`

**Metrics Provided:**
- `totalTickets` - Total confirmed tickets for event
- `checkedIn` - Number of tickets checked in
- `notCheckedIn` - Tickets pending check-in
- `checkinRate` - Percentage of tickets checked in
- `byHour` - Check-ins distributed by hour (today)
- `byScanner` - Check-ins by scanner device

**SQL Queries:**
```sql
-- Total tickets
SELECT COUNT(*) FROM tickets t
JOIN bookings b ON t.booking_id = b.booking_id
WHERE b.event_id = ? AND b.booking_status = 'confirmed'

-- Checked in count
SELECT COUNT(*) FROM check_ins WHERE event_id = ?

-- By hour distribution
SELECT HOUR(checked_in_at) AS hour, COUNT(*) AS count
FROM check_ins
WHERE event_id = ? AND DATE(checked_in_at) = CURDATE()
GROUP BY HOUR(checked_in_at)
ORDER BY hour

-- By scanner
SELECT scanner_id, COUNT(*) AS count
FROM check_ins
WHERE event_id = ?
GROUP BY scanner_id
ORDER BY count DESC
```

### Check-In History

**Endpoint:** `GET /checkin/events/:eventId/checkins`

**Filters:**
- `fromDate` - Start date filter
- `toDate` - End date filter
- `page` - Pagination page
- `limit` - Results per page

**Response Data:**
```javascript
{
  checkins: [
    {
      id: 1,
      ticketId: 123,
      ticketNumber: 'TKT1234567890',
      ticketType: 'VIP',
      userName: 'John Doe',
      email: 'john@example.com',
      phone: '+91XXXXXXXXXX',
      checkedInAt: '2024-01-15T10:30:00Z',
      checkedBy: 456,
      checkedByRole: 'checkin_staff',
      scannerId: 'SCANNER-001',
      notes: 'VIP entry'
    }
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 150,
    pages: 8
  }
}
```

---

## Security & Fraud Prevention

### 1. Ticket Uniqueness
- Unique ticket numbers generated using timestamp + random
- Database unique constraint prevents duplicates
- Cryptographically random component prevents prediction

### 2. Event Validation
- Every check-in validates ticket belongs to correct event
- Prevents using tickets from other events

### 3. Status Validation
- Only `active` tickets can be checked in
- `cancelled` and `expired` tickets are rejected
- `used` tickets show previous check-in details

### 4. Booking Validation
- Only `confirmed` bookings allow check-in
- `pending` bookings (unpaid) are rejected
- `cancelled` bookings are rejected

### 5. Double-Check-In Prevention
- Unique constraint on `check_ins.ticket_id`
- Database-level guarantee of single check-in per ticket
- Idempotent operation: returns existing check-in if already done

### 6. Audit Trail
- Every check-in recorded with:
  - Staff user ID and role
  - Timestamp
  - Scanner device ID
  - Optional notes
- QR scan table records all scan attempts
- Check-in history cannot be deleted (CASCADE only on ticket deletion)

### 7. Role-Based Access
- Check-in requires authentication
- Only authorized roles can perform check-in:
  - `checkin_staff`
  - `organizer`
  - `admin`
  - `super_admin`
- Permission: `PERMISSIONS.TICKET_SCAN`

---

## API Endpoints Summary

### Check-In Module (`/checkin`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/events/:eventId/validate` | Validate ticket without checking in | Yes |
| POST | `/events/:eventId/checkin` | Check in a single ticket | Yes |
| POST | `/events/:eventId/checkin/batch` | Batch check-in multiple tickets | Yes |
| GET | `/events/:eventId/checkins` | List check-ins for event | Yes |
| GET | `/events/:eventId/checkins/stats` | Check-in statistics | Yes |
| GET | `/tickets/:ticketId/checkin` | Get check-in record for ticket | Yes |

### QR Module (`/qr`)

| Method | Endpoint | Description | Auth Required | Permission |
|--------|----------|-------------|---------------|------------|
| POST | `/scan` | Scan QR code and get ticket details | Yes | TICKET_SCAN |
| GET | `/details/:ticketNumber` | Get ticket details by number | No | - |

---

## Error Handling

### Common Error Responses

**404 Not Found:**
- Ticket not found
- Event not found

**400 Bad Request:**
- Ticket belongs to different event
- Booking not confirmed
- Ticket cancelled
- Ticket expired
- Invalid ticket number format
- Missing required fields

**403 Forbidden:**
- Access denied (wrong user/role)
- Permission insufficient

**409 Conflict:**
- Ticket already checked in (returns existing check-in instead)

---

## Performance Considerations

### Database Indexes
```sql
-- Tickets table indexes
KEY tickets_ticket_number_unique (ticket_number)
KEY tickets_booking_id_index (booking_id)
KEY tickets_payment_id_index (payment_id)
KEY tickets_event_id_index (event_id)
KEY tickets_user_id_index (user_id)
KEY tickets_status_index (status)
KEY tickets_user_status_index (user_id, status)

-- Check-ins table indexes
KEY check_ins_ticket_unique (ticket_id)
KEY check_ins_event_id_index (event_id)
KEY check_ins_user_id_index (user_id)
KEY check_ins_checked_by_index (checked_by)
```

### Query Optimization
- Use indexed columns for WHERE clauses
- Join queries use foreign key indexes
- Pagination for large result sets
- Batch processing for multiple check-ins

### Caching Strategy
- Event details cached during check-in
- Ticket type information cached
- User session data in database (new implementation)

---

## Integration Points

### Payment Gateway Integration
- **PhonePe:** Webhook callback triggers ticket generation
- **Razorpay:** Signature verification + webhook triggers ticket generation
- Payment metadata stores ticket type and quantity information

### Email Service Integration
- Ticket PDF generated after payment confirmation
- Email sent with PDF attachments
- QR code embedded in PDF for offline verification

### PDF Service Integration
- Generates professional ticket PDFs
- Includes QR code, event details, user information
- One PDF per ticket for multiple ticket bookings

### Audit Service Integration
- All check-in operations logged
- QR scan operations logged
- Permission-based audit trail

---

## Offline Mode Support

### Offline Booking Creation
- Organizers can create bookings without payment
- `booking_method: 'offline'`
- `created_by` tracks organizer who created booking
- Tickets generated immediately (no payment required)

### Offline Check-In
- Check-in works without internet (cached event data)
- QR codes contain all necessary information
- Sync when connection restored (check-in records uploaded)

---

## Future Enhancements

### 1. Seat Map Integration
- Link tickets to specific seats
- Check-in validates seat assignment
- Visual seat map for organizers

### 2. Multi-Day Events
- Support for festival passes
- Daily check-in validation
- Multi-entry tickets

### 3. Transferable Tickets
- Ticket transfer functionality
- Ownership change tracking
- Transfer history audit

### 4. Dynamic QR Codes
- Time-based QR codes
- Refreshing QR codes for security
- Anti-screenshot measures

### 5. Biometric Check-In
- Face recognition integration
- Fingerprint scanning
- Identity verification

---

## Monitoring & Alerts

### Key Metrics to Monitor
- Check-in rate by hour
- Failed check-in attempts
- Scanner device performance
- Ticket validation errors
- Payment-to-ticket generation latency

### Alert Conditions
- High failed check-in rate (>10%)
- Scanner device offline
- Payment success but ticket generation failure
- Duplicate check-in attempts (potential fraud)

---

## Summary

The Buizz check-in and ticket verification system provides:

1. **Secure Ticket Generation**: Unique QR codes with cryptographic randomness
2. **Robust Validation**: Multi-layer validation (event, booking, ticket status)
3. **Fraud Prevention**: Double-check-in prevention, audit trails, role-based access
4. **Real-Time Analytics**: Check-in statistics, scanner performance, attendance tracking
5. **Flexible Check-In**: Single, batch, and pre-validation modes
6. **Comprehensive Audit**: Complete history of all check-in operations
7. **Offline Support**: Works without internet for critical operations
8. **Payment Integration**: Seamless integration with PhonePe and Razorpay

The system ensures a smooth, secure, and efficient check-in experience similar to BookMyShow while providing organizers with detailed insights and control over event access management.
