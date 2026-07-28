# Buizz API - New Features Documentation

## Seat Maps API

### Create Seat Map Template
```http
POST /api/v1/seatmaps/templates
Authorization: Bearer <token>
Role: admin, super_admin
```

**Request Body:**
```json
{
  "name": "Main Hall Layout",
  "description": "Standard seating arrangement for main hall",
  "layout": [
    [
      {"id": "A1", "row": "A", "column": 1, "type": "premium"},
      {"id": "A2", "row": "A", "column": 2, "type": "premium"}
    ]
  ],
  "rows": 10,
  "columns": 20,
  "seat_types": [
    {"type": "premium", "price_multiplier": 1.5, "color": "#FFD700"},
    {"type": "standard", "price_multiplier": 1.0, "color": "#4CAF50"}
  ],
  "is_active": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Main Hall Layout",
    "description": "Standard seating arrangement for main hall",
    "layout": [...],
    "rows": 10,
    "columns": 20,
    "seat_types": [...],
    "is_active": true
  }
}
```

### Get Event Seat Map
```http
GET /api/v1/seatmaps/events/:eventId/seatmap
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "event": {
      "id": 123,
      "title": "Concert Event",
      "organizer": "Organizer Name"
    },
    "override": {
      "id": 1,
      "template_id": 1,
      "custom_layout": null,
      "seat_status": {
        "A1": "booked",
        "A2": "available"
      }
    },
    "template": {
      "id": 1,
      "name": "Main Hall Layout",
      "layout": [...]
    }
  }
}
```

### Update Seat Status
```http
PATCH /api/v1/seatmaps/events/:eventId/seats
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "A1": "booked",
  "A2": "blocked"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "event_id": 123,
    "template_id": 1,
    "custom_layout": null,
    "seat_status": {
      "A1": "booked",
      "A2": "blocked"
    }
  }
}
```

### Get Available Seats
```http
GET /api/v1/seatmaps/events/:eventId/seats/available
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 200,
    "available": 150,
    "byType": {
      "premium": {"total": 50, "available": 30},
      "standard": {"total": 150, "available": 120}
    }
  }
}
```

---

## Check-in API

### Check-in a Ticket
```http
POST /api/v1/checkin/events/:eventId/checkin
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "ticketId": 456,
  "scannerId": "SCANNER_001",
  "notes": "Entry gate A"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "ticketId": 456,
    "ticketNumber": "TKT20240101001",
    "userName": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "checkedInAt": "2024-01-01T10:30:00.000Z",
    "checkedBy": 123,
    "scannerId": "SCANNER_001"
  }
}
```

### Batch Check-in
```http
POST /api/v1/checkin/events/:eventId/checkin/batch
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "tickets": [
    {"ticketId": 456},
    {"ticketNumber": "TKT20240101002"}
  ],
  "scannerId": "SCANNER_001",
  "notes": "Entry gate A"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 2,
    "successful": 2,
    "failed": 0,
    "results": [
      {
        "ticketId": 456,
        "success": true,
        "message": "Ticket checked in successfully",
        "checkin": {...}
      }
    ]
  }
}
```

### Get Event Check-in Stats
```http
GET /api/v1/checkin/events/:eventId/checkins/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTickets": 200,
    "checkedIn": 150,
    "notCheckedIn": 50,
    "checkinRate": 75.0,
    "byHour": [
      {"hour": 10, "count": 50},
      {"hour": 11, "count": 100}
    ],
    "byScanner": [
      {"scannerId": "SCANNER_001", "count": 100},
      {"scannerId": "SCANNER_002", "count": 50}
    ]
  }
}
```

---

## Search API

### Search Events (Public)
```http
GET /api/v1/search/events?q=concert&category=music&type=offline&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": 123,
        "title": "Rock Concert",
        "description": "Amazing rock concert",
        "startDate": "2024-06-15T18:00:00.000Z",
        "endDate": "2024-06-15T22:00:00.000Z",
        "type": "offline",
        "category": "music",
        "venueName": "Stadium",
        "venueCity": "Mumbai",
        "venueState": "Maharashtra",
        "minPrice": 500,
        "maxPrice": 2000,
        "availableSeats": 100,
        "totalSeats": 500,
        "banner": "/storage/events/banner.jpg",
        "organizer": {
          "name": "Organizer Name",
          "email": "organizer@example.com",
          "phone": "+1234567890"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    },
    "filters": {
      "categories": ["music", "sports", "theater"],
      "types": ["offline", "online"]
    }
  }
}
```

### Advanced Event Search
```http
POST /api/v1/search/events/advanced
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "query": "concert",
  "categories": ["music", "sports"],
  "types": ["offline"],
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-12-31"
  },
  "location": {
    "city": "Mumbai",
    "state": "Maharashtra"
  },
  "priceRange": {
    "min": 100,
    "max": 5000
  },
  "availability": "available",
  "sortBy": "start_date",
  "sortOrder": "asc",
  "page": 1,
  "limit": 20
}
```

### Autocomplete
```http
GET /api/v1/search/autocomplete?q=con&type=events
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": {
      "events": [
        {"id": 123, "name": "Rock Concert", "banner": "/storage/events/banner.jpg", "start_date": "2024-06-15"}
      ],
      "organizers": [],
      "categories": [],
      "locations": []
    }
  }
}
```

---

## Notifications API

### Get User Notifications
```http
GET /api/v1/notifications?page=1&limit=20&is_read=false&channel=booking_confirmed
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 1,
        "user_id": 123,
        "title": "Booking Confirmed!",
        "message": "Your booking for 'Rock Concert' has been confirmed.",
        "channel": "booking_confirmed",
        "related_type": "booking",
        "related_id": 456,
        "metadata": {
          "eventId": 123,
          "eventName": "Rock Concert",
          "eventDate": "2024-06-15",
          "ticketNumbers": "TKT001,TKT002",
          "amount": 2000
        },
        "is_read": false,
        "created_at": "2024-01-01T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3
    }
  }
}
```

### Mark as Read
```http
PATCH /api/v1/notifications/:id/read
Authorization: Bearer <token>
```

### Get Unread Count
```http
GET /api/v1/notifications/unread/count
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "unreadCount": 5
  }
}
```

---

## Database Schema

### New Tables

#### seat_map_templates
- `id` - Primary key
- `name` - Template name
- `description` - Template description
- `layout` - JSON seat layout
- `rows` - Number of rows
- `columns` - Number of columns
- `seat_types` - JSON seat type definitions
- `is_active` - Active status

#### seat_map_overrides
- `id` - Primary key
- `event_id` - Event reference
- `template_id` - Template reference
- `custom_layout` - Custom layout JSON
- `seat_status` - Seat status map JSON

#### check_ins
- `id` - Primary key
- `ticket_id` - Ticket reference
- `booking_id` - Booking reference
- `event_id` - Event reference
- `user_id` - User reference
- `checked_by` - Admin/organizer ID
- `checked_by_role` - Role (admin, super_admin, organizer)
- `scanner_id` - Scanner device ID
- `notes` - Check-in notes
- `checked_in_at` - Check-in timestamp

#### search_logs (optional)
- `id` - Primary key
- `user_id` - User reference
- `search_query` - Search query
- `search_type` - Type of search
- `results_count` - Number of results
- `time_taken_ms` - Query time
- `filters` - Search filters JSON

### Updated Tables

#### events
- Added `seat_map_template_id` - Foreign key to seat_map_templates
- Added `min_price` - Minimum ticket price
- Added `max_price` - Maximum ticket price

#### users
- Added `searchable` - Whether user appears in search results

#### notifications
- Added new channel values: `seat_map_update`, `check_in_success`, `check_in_failed`, `search_result`

---

## API Endpoints Summary

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | /seatmaps/templates | Yes | admin, super_admin | Create template |
| GET | /seatmaps/templates | Yes | All | List templates |
| GET | /seatmaps/templates/:id | Yes | All | Get template |
| PUT | /seatmaps/templates/:id | Yes | admin, super_admin | Update template |
| DELETE | /seatmaps/templates/:id | Yes | admin, super_admin | Delete template |
| POST | /seatmaps/events/:eventId/override | Yes | All | Create override |
| GET | /seatmaps/events/:eventId/override | Yes | All | Get override |
| PUT | /seatmaps/events/:eventId/override | Yes | All | Update override |
| DELETE | /seatmaps/events/:eventId/override | Yes | All | Delete override |
| PATCH | /seatmaps/events/:eventId/seats | Yes | All | Update seat status |
| GET | /seatmaps/events/:eventId/seats/available | Yes | All | Get available seats |
| GET | /seatmaps/events/:eventId/seatmap | Yes | All | Get complete seat map |
| POST | /checkin/events/:eventId/checkin | Yes | All | Check-in ticket |
| POST | /checkin/events/:eventId/checkin/batch | Yes | All | Batch check-in |
| GET | /checkin/events/:eventId/checkins | Yes | All | Get check-ins |
| GET | /checkin/events/:eventId/checkins/stats | Yes | All | Get check-in stats |
| GET | /checkin/tickets/:ticketId/checkin | Yes | All | Get ticket check-in |
| GET | /search/events | No | All | Search events (public) |
| GET | /search/organizers | Yes | All | Search organizers |
| GET | /search/users | Yes | admin, super_admin | Search users |
| POST | /search/events/advanced | Yes | All | Advanced search |
| GET | /search/autocomplete | No | All | Autocomplete |
| GET | /notifications | Yes | All | Get notifications |
| GET | /notifications/:id | Yes | All | Get notification |
| PATCH | /notifications/:id/read | Yes | All | Mark as read |
| PATCH | /notifications/read-all | Yes | All | Mark all as read |
| DELETE | /notifications/:id | Yes | All | Delete notification |
| DELETE | /notifications | Yes | All | Delete all notifications |
| GET | /notifications/unread/count | Yes | All | Get unread count |
