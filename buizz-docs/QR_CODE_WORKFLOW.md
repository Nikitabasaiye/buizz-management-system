# QR Code Workflow Documentation

## Overview

This document explains the complete QR code workflow for ticket verification, including user redirection to ticket profile and check-in staff scanning functionality.

## QR Code Generation

### QR Data Format

When a ticket is created, the QR code contains a backend redirect URL:

```
https://buizz.com/api/v1/qr/redirect/{ticket_number}
```

**Example:** `https://buizz.com/api/v1/qr/redirect/TKT17053412345678901234`

### Generation Process

```javascript
// From ticket.repository.js
const baseUrl = process.env.API_URL || process.env.FRONTEND_URL || 'https://buizz.com';
const qrData = `${baseUrl}/api/v1/qr/redirect/${ticket_number}`;
const qr_code = await QRCode.toDataURL(qrData, {
  errorCorrectionLevel: 'M',
  margin: 1,
  width: 224,
  color: { dark: '#090a0d', light: '#ffffff' }
});
```

---

## User Workflow: Scanning QR Code

### When User Scans with Phone Camera

**Flow:**
1. User opens phone camera and scans QR code
2. Camera detects URL: `https://buizz.com/api/v1/qr/redirect/TKT...`
3. Phone opens browser to that URL
4. Backend endpoint validates ticket exists
5. Backend redirects to frontend: `https://buizz.com/ticket/TKT...`
6. Frontend displays ticket profile page

### API Endpoint

**Endpoint:** `GET /api/v1/qr/redirect/:ticketNumber`

**Authentication:** None (public endpoint)

**Response:** HTTP 302 Redirect to frontend

**Error Handling:** If ticket not found, shows HTML error page

**Example:**
```bash
curl -I https://buizz.com/api/v1/qr/redirect/TKT17053412345678901234
# Returns: HTTP/1.1 302 Found
# Location: https://buizz.com/ticket/TKT17053412345678901234
```

### Frontend Ticket Profile Page

The frontend should handle the route `/ticket/:ticketNumber` and display:

- Ticket details (event, date, venue, seat)
- QR code image
- Ticket status (active, used, cancelled)
- Check-in status
- Booking information
- Download ticket PDF option

---

## Check-in Staff Workflow: Scanning for Verification

### When Check-in Staff Scans QR Code

**Flow:**
1. Check-in staff opens scanner app
2. Scans QR code with device camera
3. App extracts ticket number from QR data
4. App calls verification endpoint (without scanning)
5. Staff sees ticket details and validation status
6. Staff confirms and calls scan endpoint
7. Ticket is marked as used

### API Endpoints

#### 1. Verify Ticket (Without Scanning)

**Endpoint:** `POST /api/v1/qr/verify`

**Authentication:** Required (TICKET_SCAN permission)

**Request Body:**
```json
{
  "ticketNumber": "TKT17053412345678901234"
}
```

**Or with QR data:**
```json
{
  "qrData": "https://buizz.com/api/v1/qr/redirect/TKT17053412345678901234"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "validationStatus": "valid",
    "validationMessage": "Ticket is valid",
    "ticket": {
      "ticketNumber": "TKT17053412345678901234",
      "ticketId": 123,
      "status": "active",
      "price": 500,
      "ticketType": "VIP",
      "checkedIn": false,
      "checkedInAt": null,
      "scannedBy": null,
      "createdAt": "2024-01-15T10:00:00Z",
      "user": {
        "id": 456,
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+91XXXXXXXXXX"
      },
      "event": {
        "id": 789,
        "title": "Music Festival 2024",
        "description": "Annual music festival",
        "type": "concert",
        "startDate": "2024-02-15T18:00:00Z",
        "endDate": "2024-02-15T23:00:00Z",
        "venueName": "City Stadium",
        "venueAddress": "123 Main Street",
        "venueCity": "Mumbai",
        "venueState": "Maharashtra",
        "banner": "https://buizz.com/events/banner.jpg",
        "status": "published"
      },
      "booking": {
        "orderId": "ORD123456789",
        "transactionId": "TXN987654321",
        "bookingId": 111
      }
    }
  }
}
```

**Validation Statuses:**
- `valid` - Ticket can be scanned
- `already_used` - Ticket already checked in
- `cancelled` - Ticket was cancelled
- `expired` - Ticket has expired
- `event_ended` - Event already ended
- `not_started` - Event hasn't started yet

#### 2. Scan Ticket (Mark as Used)

**Endpoint:** `POST /api/v1/qr/scan`

**Authentication:** Required (TICKET_SCAN permission)

**Request Body:**
```json
{
  "ticketNumber": "TKT17053412345678901234"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Ticket scanned successfully",
  "data": {
    "ticketNumber": "TKT17053412345678901234",
    "ticketId": 123,
    "status": "used",
    "price": 500,
    "ticketType": "VIP",
    "checkedIn": true,
    "checkedInAt": "2024-02-15T18:30:00Z",
    "scannedBy": 999,
    "createdAt": "2024-01-15T10:00:00Z",
    "user": {
      "id": 456,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+91XXXXXXXXXX"
    },
    "event": {
      "id": 789,
      "title": "Music Festival 2024",
      "startDate": "2024-02-15T18:00:00Z",
      "endDate": "2024-02-15T23:00:00Z",
      "venueName": "City Stadium",
      "venueAddress": "123 Main Street",
      "venueCity": "Mumbai"
    },
    "booking": {
      "orderId": "ORD123456789",
      "transactionId": "TXN987654321",
      "bookingId": 111
    }
  }
}
```

**Error Responses:**

**Already Used (400):**
```json
{
  "success": false,
  "message": "Ticket has already been scanned"
}
```

**Cancelled (400):**
```json
{
  "success": false,
  "message": "Ticket has been cancelled"
}
```

**Event Ended (400):**
```json
{
  "success": false,
  "message": "Event has already ended"
}
```

---

## Complete Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER SCANS QR                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phone Camera Detects:                                          │
│  https://buizz.com/api/v1/qr/redirect/TKT1234567890            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend: GET /api/v1/qr/redirect/:ticketNumber                 │
│  - Validates ticket exists                                       │
│  - Redirects to: https://buizz.com/ticket/TKT1234567890         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Frontend: /ticket/:ticketNumber                                │
│  - Displays ticket profile                                       │
│  - Shows QR code, event details, status                          │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                    CHECK-IN STAFF SCANS QR                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Scanner App Extracts: TKT1234567890                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: POST /api/v1/qr/verify                                 │
│  - Returns ticket details + validation status                   │
│  - Staff reviews: user info, event, ticket status                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: Staff Confirms Valid Ticket                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: POST /api/v1/qr/scan                                   │
│  - Marks ticket as used                                          │
│  - Records check-in time and staff ID                           │
│  - Returns updated ticket status                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Features

### 1. Access Control

- **Redirect Endpoint:** Public (no auth required)
- **Verify Endpoint:** Requires TICKET_SCAN permission
- **Scan Endpoint:** Requires TICKET_SCAN permission

### 2. Validation Checks

Before scanning, the system validates:
- Ticket exists
- Ticket is not already used
- Ticket is not cancelled
- Ticket is not expired
- Event has not ended
- Event has started (optional)

### 3. Audit Trail

Every scan is logged:
- Ticket ID
- Scanned by (user ID)
- Scan timestamp
- Scanner device ID (if available)

---

## Frontend Integration Examples

### React Component: Check-in Scanner

```typescript
import { useState } from 'react';
import axios from 'axios';

const CheckinScanner = ({ authToken }) => {
  const [ticketNumber, setTicketNumber] = useState('');
  const [ticketDetails, setTicketDetails] = useState(null);
  const [validationStatus, setValidationStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async (qrData) => {
    // Extract ticket number from QR data
    const extractedTicketNumber = qrData.split('/').pop();
    setTicketNumber(extractedTicketNumber);
    
    // Verify ticket first
    await verifyTicket(extractedTicketNumber);
  };

  const verifyTicket = async (tn) => {
    setLoading(true);
    try {
      const response = await axios.post(
        '/api/v1/qr/verify',
        { ticketNumber: tn },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      
      setTicketDetails(response.data.data.ticket);
      setValidationStatus(response.data.data.validationStatus);
    } catch (error) {
      console.error('Verification failed', error);
    }
    setLoading(false);
  };

  const confirmScan = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        '/api/v1/qr/scan',
        { ticketNumber },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      
      alert(response.data.message);
      setTicketDetails(response.data.data);
      setValidationStatus('already_used');
    } catch (error) {
      alert(error.response?.data?.message || 'Scan failed');
    }
    setLoading(false);
  };

  return (
    <div className="checkin-scanner">
      <h2>Check-in Scanner</h2>
      
      {ticketDetails && (
        <div className="ticket-details">
          <h3>Ticket Details</h3>
          <p><strong>Status:</strong> {validationStatus}</p>
          <p><strong>Ticket:</strong> {ticketDetails.ticketNumber}</p>
          <p><strong>User:</strong> {ticketDetails.user.name}</p>
          <p><strong>Email:</strong> {ticketDetails.user.email}</p>
          <p><strong>Phone:</strong> {ticketDetails.user.phone}</p>
          <p><strong>Event:</strong> {ticketDetails.event.title}</p>
          <p><strong>Date:</strong> {new Date(ticketDetails.event.startDate).toLocaleString()}</p>
          <p><strong>Venue:</strong> {ticketDetails.event.venueName}</p>
          <p><strong>Type:</strong> {ticketDetails.ticketType}</p>
          <p><strong>Price:</strong> ₹{ticketDetails.price}</p>
          
          {validationStatus === 'valid' && (
            <button 
              onClick={confirmScan} 
              disabled={loading}
              className="scan-button"
            >
              {loading ? 'Scanning...' : 'Confirm Check-in'}
            </button>
          )}
          
          {validationStatus === 'already_used' && (
            <p className="error">Ticket already used at {ticketDetails.checkedInAt}</p>
          )}
          
          {validationStatus === 'cancelled' && (
            <p className="error">Ticket has been cancelled</p>
          )}
        </div>
      )}
    </div>
  );
};
```

### React Component: User Ticket Profile

```typescript
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const TicketProfile = () => {
  const { ticketNumber } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTicketDetails();
  }, [ticketNumber]);

  const fetchTicketDetails = async () => {
    try {
      const response = await axios.get(
        `/api/v1/qr/details/${ticketNumber}`
      );
      setTicket(response.data.data);
    } catch (error) {
      console.error('Failed to fetch ticket', error);
    }
    setLoading(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="ticket-profile">
      <h1>Your Ticket</h1>
      
      {ticket && (
        <div className="ticket-card">
          <img src={ticket.qr_code} alt="QR Code" />
          
          <div className="ticket-info">
            <h2>{ticket.event.title}</h2>
            <p><strong>Date:</strong> {new Date(ticket.event.startDate).toLocaleString()}</p>
            <p><strong>Venue:</strong> {ticket.event.venueName}</p>
            <p><strong>Address:</strong> {ticket.event.venueAddress}</p>
            <p><strong>Ticket Type:</strong> {ticket.ticketType}</p>
            <p><strong>Price:</strong> ₹{ticket.price}</p>
            <p><strong>Status:</strong> {ticket.status}</p>
            <p><strong>Checked In:</strong> {ticket.checkedIn ? 'Yes' : 'No'}</p>
            
            {ticket.checkedIn && (
              <p><strong>Checked In At:</strong> {ticket.checkedInAt}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## Testing Checklist

### 1. User QR Scan Test

- [ ] Generate ticket with QR code
- [ ] Scan QR with phone camera
- [ ] Verify redirect to frontend ticket page
- [ ] Check ticket details display correctly
- [ ] Test with invalid ticket number (should show error page)

### 2. Check-in Staff Verify Test

- [ ] Login as check-in staff
- [ ] Scan QR code
- [ ] Call verify endpoint
- [ ] Verify ticket details returned
- [ ] Check validation status
- [ ] Test with already used ticket
- [ ] Test with cancelled ticket
- [ ] Test with expired ticket

### 3. Check-in Staff Scan Test

- [ ] Verify valid ticket
- [ ] Confirm scan
- [ ] Verify ticket marked as used
- [ ] Check check-in time recorded
- [ ] Try scanning same ticket again (should fail)
- [ ] Verify audit log entry created

---

## Environment Variables

Required in `.env`:

```env
# API URL for QR code generation
API_URL=https://buizz.com

# Frontend URL for redirect
FRONTEND_URL=https://buizz.com
```

---

## Summary

The QR code workflow provides:

1. **User-Friendly:** Users can scan QR with phone camera to view their ticket
2. **Secure:** Check-in requires proper authentication and permissions
3. **Comprehensive:** Full ticket details shown to check-in staff
4. **Validated:** Multiple checks before allowing check-in
5. **Audited:** All scans logged for accountability
6. **Flexible:** Supports both verification and scanning workflows

This system ensures smooth ticket verification for both users and check-in staff, similar to BookMyShow's QR code system.
