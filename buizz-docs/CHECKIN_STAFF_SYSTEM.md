# Check-in Staff Assignment & Approval System

## Overview

The check-in staff system enables organizers to assign dedicated check-in staff to their events, with super admin approval workflow. This provides controlled access to ticket scanning and verification capabilities.

## System Architecture

### Roles & Permissions

| Role | TICKET_SCAN Permission | Can Assign Staff | Can Approve Staff |
|------|----------------------|-----------------|-------------------|
| **Super Admin** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Admin** | ✅ Yes | ❌ No | ❌ No |
| **Organizer** | ✅ Yes | ✅ Yes (own events) | ❌ No |
| **Check-in Staff** | ✅ Yes | ❌ No | ❌ No |
| **Customer** | ❌ No | ❌ No | ❌ No |

### Workflow

```
┌─────────────┐
│  Organizer  │
│             │
│ Assign Staff│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Status:   │
│  Pending    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Super Admin │
│             │
│  Approve/   │
│   Reject    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Status:   │
│ Approved/   │
│  Rejected   │
└─────────────┘
```

---

## Database Schema

### event_checkin_staff Table

```sql
CREATE TABLE event_checkin_staff (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  event_id BIGINT UNSIGNED NOT NULL,
  staff_user_id BIGINT UNSIGNED NOT NULL,
  assigned_by BIGINT UNSIGNED NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending', 'approved', 'rejected', 'active', 'inactive') DEFAULT 'pending',
  approved_by BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  rejection_reason TEXT NULL,
  scanner_id VARCHAR(100) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY (event_id, staff_user_id),
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (staff_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL
);
```

### checkin_staff_performance Table

```sql
CREATE TABLE checkin_staff_performance (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  staff_user_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  date DATE NOT NULL,
  total_scans INT UNSIGNED DEFAULT 0,
  successful_scans INT UNSIGNED DEFAULT 0,
  failed_scans INT UNSIGNED DEFAULT 0,
  avg_scan_time_ms DECIMAL(10, 2) NULL,
  scanner_id VARCHAR(100) NULL,
  UNIQUE KEY (staff_user_id, event_id, date),
  FOREIGN KEY (staff_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
);
```

---

## API Endpoints

### Base URL: `/api/v1/checkin-staff`

### 1. Assign Staff to Event

**Endpoint:** `POST /events/:eventId/staff`

**Authentication:** Organizer (event owner only)

**Request Body:**
```json
{
  "staffUserId": 123,
  "scannerId": "SCANNER-001",
  "notes": "Main entrance gate"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Check-in staff assigned successfully. Pending super admin approval.",
  "data": {
    "id": 1,
    "eventId": 456,
    "staffUserId": 123,
    "staffName": "John Smith",
    "staffEmail": "john@example.com",
    "status": "pending",
    "assignedBy": "Jane Organizer",
    "assignedAt": "2024-01-15T10:00:00Z"
  }
}
```

### 2. Approve Staff Assignment

**Endpoint:** `PATCH /assignments/:assignmentId/approve`

**Authentication:** Super Admin only

**Response (200):**
```json
{
  "success": true,
  "message": "Check-in staff assignment approved successfully",
  "data": {
    "id": 1,
    "status": "approved",
    "approvedBy": "Super Admin Name",
    "approvedAt": "2024-01-15T11:00:00Z"
  }
}
```

### 3. Reject Staff Assignment

**Endpoint:** `PATCH /assignments/:assignmentId/reject`

**Authentication:** Super Admin only

**Request Body:**
```json
{
  "rejectionReason": "Staff not verified for this event type"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Check-in staff assignment rejected successfully",
  "data": {
    "id": 1,
    "status": "rejected",
    "rejectionReason": "Staff not verified for this event type",
    "approvedBy": "Super Admin Name",
    "approvedAt": "2024-01-15T11:00:00Z"
  }
}
```

### 4. Get Event Staff Assignments

**Endpoint:** `GET /events/:eventId/staff`

**Authentication:** Organizer (event owner) or Super Admin

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "eventId": 456,
      "staffUserId": 123,
      "staffName": "John Smith",
      "staffEmail": "john@example.com",
      "staffPhone": "+91XXXXXXXXXX",
      "assignedBy": "Jane Organizer",
      "assignedAt": "2024-01-15T10:00:00Z",
      "status": "approved",
      "scannerId": "SCANNER-001",
      "notes": "Main entrance gate",
      "approvedBy": "Super Admin Name",
      "approvedAt": "2024-01-15T11:00:00Z",
      "rejectionReason": null
    }
  ]
}
```

### 5. Get Pending Assignments

**Endpoint:** `GET /assignments/pending`

**Authentication:** Super Admin only

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "assignments": [
      {
        "id": 1,
        "eventId": 456,
        "eventTitle": "Music Festival 2024",
        "eventDate": "2024-02-15T18:00:00Z",
        "staffUserId": 123,
        "staffName": "John Smith",
        "staffEmail": "john@example.com",
        "assignedBy": "Jane Organizer",
        "assignedAt": "2024-01-15T10:00:00Z",
        "scannerId": "SCANNER-001",
        "notes": "Main entrance gate"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "pages": 1
    }
  }
}
```

### 6. Remove Staff Assignment

**Endpoint:** `DELETE /assignments/:assignmentId`

**Authentication:** Organizer (who assigned) or Super Admin

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Assignment removed successfully"
  }
}
```

### 7. Get Staff Performance

**Endpoint:** `GET /staff/:staffUserId/performance`

**Authentication:** Any authenticated user

**Query Parameters:**
- `eventId` (optional): Filter by event
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "staffUserId": 123,
      "eventId": 456,
      "date": "2024-01-15",
      "totalScans": 150,
      "successfulScans": 145,
      "failedScans": 5,
      "avgScanTimeMs": 250.5,
      "scannerId": "SCANNER-001",
      "successRate": "96.7"
    }
  ]
}
```

---

## Implementation Steps

### 1. Run Database Migration

```bash
mysql -u your_username -p your_database < server/database/checkin_staff_migration.sql
```

### 2. Create Check-in Staff Users

Create users with `checkin_staff` role:

```sql
INSERT INTO users (name, email, password, phone, role, is_active) 
VALUES 
  ('Check-in Staff 1', 'staff1@buizz.com', '$2b$10$hashedpassword', '+919876543210', 'checkin_staff', 1),
  ('Check-in Staff 2', 'staff2@buizz.com', '$2b$10$hashedpassword', '+919876543211', 'checkin_staff', 1);
```

### 3. Assign Staff to Events

Organizers can now assign staff via API:

```bash
POST /api/v1/checkin-staff/events/:eventId/staff
Authorization: Bearer <organizer_token>

{
  "staffUserId": 123,
  "scannerId": "SCANNER-001",
  "notes": "Main entrance gate"
}
```

### 4. Super Admin Approves

Super admin reviews and approves:

```bash
PATCH /api/v1/checkin-staff/assignments/:assignmentId/approve
Authorization: Bearer <super_admin_token>
```

---

## Use Cases

### Use Case 1: Large Event with Multiple Gates

**Scenario:** Music festival with 5 entry gates

**Solution:**
1. Organizer creates 5 check-in staff users
2. Assigns each staff to a specific gate (scannerId: GATE-1, GATE-2, etc.)
3. Super admin approves all assignments
4. Staff can only check in tickets at their assigned gate

### Use Case 2: Temporary Staff for Weekend Event

**Scenario:** Weekend conference needing temporary check-in staff

**Solution:**
1. Create temporary check-in staff accounts
2. Assign to event with notes: "Weekend conference only"
3. Super admin approves for specific dates
4. After event, organizer removes assignments

### Use Case 3: Performance Monitoring

**Scenario:** Track staff efficiency

**Solution:**
1. Use performance endpoint to track scan rates
2. Identify slow performers for training
3. Optimize gate assignments based on performance

---

## Security Features

### 1. Role-Based Access
- Only organizers can assign staff to their events
- Only super admins can approve/reject assignments
- Only approved staff can check in tickets

### 2. Event Ownership Validation
- Staff can only check in tickets for assigned events
- Cross-event scanning prevented

### 3. Approval Workflow
- Staff assignments require super admin approval
- Pending assignments cannot perform check-ins
- Rejection requires reason for audit trail

### 4. Audit Trail
- All assignments tracked with timestamps
- Approval/rejection reasons stored
- Performance metrics logged

---

## Notifications

### Email Notifications

1. **Assignment Created**
   - Sent to: Super Admin
   - Subject: "Check-in Staff Assignment Pending Approval"
   - Content: Event details, staff info, organizer info

2. **Assignment Approved**
   - Sent to: Check-in Staff
   - Subject: "Check-in Staff Assignment Approved"
   - Content: Event details, approval info

3. **Assignment Rejected**
   - Sent to: Organizer
   - Subject: "Check-in Staff Assignment Rejected"
   - Content: Rejection reason, event details

---

## Frontend Integration

### React Component: Assign Staff

```typescript
import { useState } from 'react';
import axios from 'axios';

const AssignStaffForm = ({ eventId, organizerToken }) => {
  const [staffUserId, setStaffUserId] = useState('');
  const [scannerId, setScannerId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(
        `/api/v1/checkin-staff/events/${eventId}/staff`,
        { staffUserId, scannerId, notes },
        { headers: { Authorization: `Bearer ${organizerToken}` } }
      );
      alert('Staff assigned successfully');
    } catch (error) {
      alert('Failed to assign staff');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={staffUserId}
        onChange={(e) => setStaffUserId(e.target.value)}
        placeholder="Staff User ID"
      />
      <input 
        value={scannerId}
        onChange={(e) => setScannerId(e.target.value)}
        placeholder="Scanner ID"
      />
      <textarea 
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes"
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Assigning...' : 'Assign Staff'}
      </button>
    </form>
  );
};
```

### React Component: Pending Approvals (Super Admin)

```typescript
import { useEffect, useState } from 'react';
import axios from 'axios';

const PendingApprovals = ({ superAdminToken }) => {
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    const response = await axios.get(
      '/api/v1/checkin-staff/assignments/pending',
      { headers: { Authorization: `Bearer ${superAdminToken}` } }
    );
    setAssignments(response.data.data.assignments);
  };

  const approve = async (assignmentId) => {
    await axios.patch(
      `/api/v1/checkin-staff/assignments/${assignmentId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${superAdminToken}` } }
    );
    fetchPending();
  };

  const reject = async (assignmentId, reason) => {
    await axios.patch(
      `/api/v1/checkin-staff/assignments/${assignmentId}/reject`,
      { rejectionReason: reason },
      { headers: { Authorization: `Bearer ${superAdminToken}` } }
    );
    fetchPending();
  };

  return (
    <div>
      <h2>Pending Approvals</h2>
      {assignments.map((assignment) => (
        <div key={assignment.id}>
          <p>{assignment.staffName} - {assignment.eventTitle}</p>
          <button onClick={() => approve(assignment.id)}>Approve</button>
          <button onClick={() => reject(assignment.id, 'Not suitable')}>Reject</button>
        </div>
      ))}
    </div>
  );
};
```

---

## Summary

The check-in staff system provides:

1. **Controlled Access**: Organizers can assign staff, super admins approve
2. **Event-Specific**: Staff assigned to specific events only
3. **Audit Trail**: Complete history of assignments and approvals
4. **Performance Tracking**: Monitor staff efficiency
5. **Security**: Role-based permissions prevent unauthorized access
6. **Flexibility**: Easy to add/remove staff as needed

This system ensures that ticket verification is performed only by authorized personnel, with proper oversight and accountability.
