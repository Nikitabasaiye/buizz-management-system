# BookMyShow-Style Support System Architecture

## Overview

This document explains how the support panel works in BookMyShow-style systems, including 2-way communication between users/organizers and support agents, and the complaint resolution workflow.

## System Architecture

### Core Components

1. **Support Tickets** - The main ticketing system for issues
2. **Support Messages** - 2-way conversation threads within tickets
3. **Support Attachments** - File attachments (screenshots, documents)
4. **Activity Logs** - Complete audit trail of all actions
5. **Escalation System** - Multi-level ticket escalation
6. **Satisfaction Rating** - Customer feedback on resolution

---

## Database Schema

### 1. support_tickets Table

```sql
CREATE TABLE support_tickets (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  ticket_id VARCHAR(80) UNIQUE NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  escalation_level ENUM('level_1', 'level_2', 'level_3') DEFAULT 'level_1',
  category VARCHAR(80) DEFAULT 'general',
  order_id BIGINT UNSIGNED NULL,
  event_id BIGINT UNSIGNED NULL,
  status ENUM('open', 'in_progress', 'resolved', 'closed', 'deleted') DEFAULT 'open',
  resolution TEXT NULL,
  assigned_to BIGINT UNSIGNED NULL,
  assigned_at DATETIME NULL,
  resolved_at DATETIME NULL,
  escalated_at DATETIME NULL,
  escalated_by BIGINT UNSIGNED NULL,
  first_response_time INT UNSIGNED NULL,
  resolution_time INT UNSIGNED NULL,
  customer_satisfaction ENUM('very_dissatisfied', 'dissatisfied', 'neutral', 'satisfied', 'very_satisfied') NULL,
  satisfaction_notes TEXT NULL,
  last_message_at DATETIME NULL,
  unread_count INT UNSIGNED DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE SET NULL,
  FOREIGN KEY (order_id) REFERENCES bookings(booking_id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(user_id) ON DELETE NULL,
  FOREIGN KEY (escalated_by) REFERENCES users(user_id) ON DELETE SET NULL
);
```

### 2. support_messages Table (2-Way Communication)

```sql
CREATE TABLE support_messages (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  ticket_id VARCHAR(80) NOT NULL,
  sender_id BIGINT UNSIGNED NOT NULL,
  sender_role ENUM('customer', 'organizer', 'admin', 'super_admin', 'checkin_staff') NOT NULL,
  message TEXT NOT NULL,
  message_type ENUM('text', 'image', 'document', 'system') DEFAULT 'text',
  is_internal TINYINT(1) DEFAULT 0,
  is_read TINYINT(1) DEFAULT 0,
  read_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE
);
```

### 3. support_attachments Table

```sql
CREATE TABLE support_attachments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  message_id BIGINT UNSIGNED NOT NULL,
  ticket_id VARCHAR(80) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES support_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE CASCADE
);
```

### 4. support_ticket_activities Table (Audit Trail)

```sql
CREATE TABLE support_ticket_activities (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  ticket_id VARCHAR(80) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  user_role ENUM('customer', 'organizer', 'admin', 'super_admin', 'checkin_staff') NOT NULL,
  action ENUM('created', 'updated', 'assigned', 'status_changed', 'priority_changed', 'message_sent', 'resolved', 'reopened', 'closed') NOT NULL,
  old_value TEXT NULL,
  new_value TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
```

---

## 2-Way Communication Workflow

### User/Organizer Side

```
┌─────────────┐
│  User/Org   │
│             │
│ Create Ticket│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Ticket    │
│   Created   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Send Message│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Support     │
│ Agent       │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Reply       │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  User/Org   │
│  Responds   │
└─────────────┘
```

### Support Agent Side

```
┌─────────────┐
│ Support     │
│ Dashboard   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ View Ticket │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Read        │
│ Messages   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Send Reply  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Update      │
│ Status      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Resolve     │
│ Ticket      │
└─────────────┘
```

---

## API Endpoints

### Base URL: `/api/v1/support`

#### Ticket Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/` | Create support ticket | Yes |
| GET | `/` | Get all tickets (admin only) | Admin/Super Admin |
| GET | `/stats` | Get ticket statistics | Admin/Super Admin |
| GET | `/:id` | Get single ticket | Yes (owner or admin) |
| PUT | `/:id` | Update ticket | Yes |
| DELETE | `/:id` | Delete ticket | Admin/Super Admin |

### Base URL: `/api/v1/support-messages`

#### 2-Way Communication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/tickets/:ticketId/messages` | Send message in ticket | Yes |
| GET | `/tickets/:ticketId/messages` | Get all ticket messages | Yes (access control) |
| POST | `/tickets/:ticketId/messages/:messageId/attachments` | Upload attachment | Yes |
| GET | `/tickets/:ticketId/activity` | Get ticket activity log | Yes (access control) |
| POST | `/tickets/:ticketId/read` | Mark messages as read | Yes |
| POST | `/tickets/:ticketId/escalate` | Escalate ticket | Admin/Super Admin |
| POST | `/tickets/:ticketId/satisfaction` | Submit satisfaction rating | Yes (ticket owner) |

---

## Complaint Resolution Workflow

### Phase 1: Ticket Creation

**User Action:**
```bash
POST /api/v1/support
Authorization: Bearer <user_token>

{
  "subject": "Payment failed for booking",
  "description": "I tried to pay for event XYZ but payment failed",
  "priority": "high",
  "category": "payment",
  "orderId": "BKG123456789"
}
```

**System Response:**
```json
{
  "success": true,
  "message": "Support ticket created successfully",
  "data": {
    "ticketId": "TKT-1705341234567-ABC123DEF",
    "id": 123
  }
}
```

### Phase 2: Assignment & First Response

**Admin Action:**
```bash
PUT /api/v1/support/TKT-1705341234567-ABC123DEF
Authorization: Bearer <admin_token>

{
  "status": "in_progress",
  "assigned_to": 456
}
```

**System Action:**
- Updates ticket status to `in_progress`
- Records assignment time
- Sends notification to assigned agent

### Phase 3: 2-Way Communication

**User Sends Message:**
```bash
POST /api/v1/support-messages/tickets/TKT-1705341234567-ABC123DEF/messages
Authorization: Bearer <user_token>

{
  "message": "Here's the screenshot of the error",
  "messageType": "text"
}
```

**Agent Responds:**
```bash
POST /api/v1/support-messages/tickets/TKT-1705341234567-ABC123DEF/messages
Authorization: Bearer <admin_token>

{
  "message": "I see the issue. Let me check with the payment gateway team.",
  "messageType": "text",
  "isInternal": false
}
```

**Internal Note (Agent to Agent):**
```bash
POST /api/v1/support-messages/tickets/TKT-1705341234567-ABC123DEF/messages
Authorization: Bearer <admin_token>

{
  "message": "This might be a Razorpay issue. Need to verify webhook signature.",
  "messageType": "text",
  "isInternal": true
}
```

### Phase 4: Resolution

**Agent Resolves:**
```bash
PUT /api/v1/support/TKT-1705341234567-ABC123DEF
Authorization: Bearer <admin_token>

{
  "status": "resolved",
  "resolution": "Payment gateway issue resolved. User can retry payment."
}
```

**System Action:**
- Updates status to `resolved`
- Records resolution time
- Calculates `first_response_time` and `resolution_time`
- Sends resolution notification to user

### Phase 5: Customer Feedback

**User Rates Resolution:**
```bash
POST /api/v1/support-messages/tickets/TKT-1705341234567-ABC123DEF/satisfaction
Authorization: Bearer <user_token>

{
  "satisfaction": "satisfied",
  "notes": "Quick response, issue resolved in 2 hours"
}
```

---

## Escalation System

### Escalation Levels

| Level | Description | Typical Response Time |
|-------|-------------|----------------------|
| **Level 1** | Standard support agent | 24 hours |
| **Level 2** | Senior support agent | 12 hours |
| **Level 3** | Technical lead/manager | 4 hours |

### Escalation Triggers

1. **Time-Based Escalation**
   - Auto-escalate if no response within SLA
   - Level 1 → Level 2 after 24 hours
   - Level 2 → Level 3 after 12 hours

2. **Manual Escalation**
   - Agent can escalate if issue is complex
   - Requires notes explaining escalation reason

**Escalation API:**
```bash
POST /api/v1/support-messages/tickets/:ticketId/escalate
Authorization: Bearer <admin_token>

{
  "escalationLevel": "level_2",
  "notes": "Technical issue requiring senior agent expertise"
}
```

---

## Internal vs External Messages

### Internal Messages (Agent to Agent)

- **Purpose:** Private notes between support agents
- **Visibility:** Only visible to admin/super_admin roles
- **Use Cases:**
  - Discussing technical details
  - Coordinating with other teams
  - Documenting investigation steps

**Example:**
```json
{
  "message": "Checked Razorpay logs - signature mismatch detected",
  "isInternal": true
}
```

### External Messages (Agent to Customer)

- **Purpose:** Communication with customer
- **Visibility:** Visible to both agent and customer
- **Use Cases:**
  - Asking for more information
  - Providing updates
  - Explaining resolution

**Example:**
```json
{
  "message": "We've identified the issue and are working on a fix",
  "isInternal": false
}
```

---

## File Attachments

### Supported File Types

- **Images:** PNG, JPG, JPEG, GIF (screenshots)
- **Documents:** PDF, DOC, DOCX (invoices, receipts)
- **Compressed:** ZIP, RAR (multiple files)

### Upload Process

```bash
POST /api/v1/support-messages/tickets/:ticketId/messages/:messageId/attachments
Content-Type: multipart/form-data
Authorization: Bearer <user_token>

file: [binary data]
```

**Response:**
```json
{
  "success": true,
  "message": "Attachment uploaded successfully",
  "data": {
    "id": 789,
    "fileName": "payment_error_screenshot.png",
    "fileUrl": "/storage/support/TKT-123/payment_error_screenshot.png",
    "fileSize": 245678,
    "fileType": "image/png"
  }
}
```

---

## Activity Logging

Every action on a ticket is logged:

| Action | Trigger | Logged Data |
|--------|---------|-------------|
| `created` | Ticket created | User, timestamp, initial data |
| `assigned` | Ticket assigned | Assigned to, assigned by |
| `status_changed` | Status updated | Old status, new status |
| `priority_changed` | Priority updated | Old priority, new priority |
| `message_sent` | Message sent | Sender, message preview |
| `resolved` | Ticket resolved | Resolution, time taken |
| `reopened` | Ticket reopened | Reason, reopened by |
| `closed` | Ticket closed | Closed by, satisfaction rating |

**Get Activity Log:**
```bash
GET /api/v1/support-messages/tickets/:ticketId/activity
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "ticketId": "TKT-123",
      "userId": 123,
      "userName": "John Doe",
      "userRole": "customer",
      "action": "created",
      "oldValue": null,
      "newValue": null,
      "notes": "Initial ticket creation",
      "createdAt": "2024-01-15T10:00:00Z"
    },
    {
      "id": 2,
      "ticketId": "TKT-123",
      "userId": 456,
      "userName": "Support Agent",
      "userRole": "admin",
      "action": "assigned",
      "oldValue": null,
      "newValue": "456",
      "notes": "Assigned to Level 1 support",
      "createdAt": "2024-01-15T10:05:00Z"
    }
  ]
}
```

---

## Performance Metrics

### Key Metrics Tracked

1. **First Response Time**
   - Time from ticket creation to first agent response
   - Target: < 24 hours for Level 1

2. **Resolution Time**
   - Time from creation to resolution
   - Target: < 48 hours for standard issues

3. **Customer Satisfaction**
   - Rating after resolution
   - Scale: very_dissatisfied to very_satisfied

4. **Escalation Rate**
   - Percentage of tickets escalated
   - High rate indicates training needs

5. **Reopening Rate**
   - Percentage of resolved tickets reopened
   - High rate indicates poor resolution quality

### Dashboard Statistics

```bash
GET /api/v1/support/stats
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "byStatus": {
      "open": 15,
      "in_progress": 8,
      "resolved": 120,
      "closed": 95
    },
    "byPriority": {
      "low": 20,
      "medium": 85,
      "high": 30,
      "urgent": 5
    },
    "total": 238
  }
}
```

---

## Frontend Integration

### React Component: Support Chat

```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';

const SupportChat = ({ ticketId, userToken, userRole }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [ticketId]);

  const fetchMessages = async () => {
    const response = await axios.get(
      `/api/v1/support-messages/tickets/${ticketId}/messages`,
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    setMessages(response.data.data);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(
        `/api/v1/support-messages/tickets/${ticketId}/messages`,
        { message: newMessage, messageType: 'text', isInternal: false },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      setNewMessage('');
      fetchMessages();
    } catch (error) {
      console.error('Failed to send message');
    }
    setLoading(false);
  };

  return (
    <div className="support-chat">
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.senderRole === userRole ? 'sent' : 'received'}`}>
            <div className="sender">{msg.senderName}</div>
            <div className="content">{msg.message}</div>
            <div className="timestamp">{new Date(msg.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage}>
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
};
```

---

## BookMyShow-Specific Features

### 1. Categorized Support

**Categories:**
- `booking` - Booking-related issues
- `payment` - Payment failures, refunds
- `technical` - App/website bugs
- `account` - Login, profile issues
- `general` - Other inquiries

### 2. Priority-Based Routing

**Priority Levels:**
- `urgent` - Payment failures, blocked access (4-hour SLA)
- `high` - Event-day issues (12-hour SLA)
- `medium` - Standard inquiries (24-hour SLA)
- `low` - Feature requests, feedback (48-hour SLA)

### 3. Context-Aware Support

**Automatic Context:**
- Links to booking details if `orderId` provided
- Links to event details if `eventId` provided
- User's booking history visible to agents
- Payment status automatically fetched

### 4. Multi-Channel Support

**Channels:**
- In-app chat (real-time)
- Email notifications
- WhatsApp (optional)
- SMS (for urgent issues)

---

## Implementation Checklist

### 1. Run Database Migration

```bash
mysql -u your_username -p your_database < server/database/support_messages_migration.sql
```

### 2. Test Basic Ticket Flow

```bash
# Create ticket
POST /api/v1/support
{ "subject": "Test", "description": "Test ticket" }

# Send message
POST /api/v1/support-messages/tickets/:ticketId/messages
{ "message": "Hello support" }

# Get messages
GET /api/v1/support-messages/tickets/:ticketId/messages
```

### 3. Test Escalation

```bash
POST /api/v1/support-messages/tickets/:ticketId/escalate
{ "escalationLevel": "level_2", "notes": "Complex issue" }
```

### 4. Test Satisfaction Rating

```bash
POST /api/v1/support-messages/tickets/:ticketId/satisfaction
{ "satisfaction": "satisfied", "notes": "Great support" }
```

---

## Summary

The BookMyShow-style support system provides:

1. **2-Way Communication** - Real-time chat between users and support agents
2. **Context-Aware** - Automatic linking to bookings, events, payments
3. **Escalation System** - Multi-level escalation for complex issues
4. **Internal Notes** - Private agent-to-agent communication
5. **File Attachments** - Screenshots, documents for issue documentation
6. **Activity Logging** - Complete audit trail of all actions
7. **Performance Metrics** - First response time, resolution time, satisfaction
8. **Categorized Support** - Organized by issue type for efficient routing

This system ensures efficient complaint resolution with proper tracking, escalation, and customer feedback mechanisms similar to BookMyShow's support panel.
