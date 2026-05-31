# 📮 Buizz API - Complete Postman Collection

## 🔧 Setup Instructions

### 1. Create Environment in Postman

**Environment Name**: Buizz Local

**Variables**:
```
baseUrl: http://localhost:5000
apiVersion: v1
token: (leave empty - will be set automatically)
refreshToken: (leave empty - will be set automatically)
userId: (leave empty - will be set automatically)
eventId: (leave empty - will be set automatically)
```

### 2. Import Collection

Create a new collection named "Buizz API" and add the following requests:

---

## 📁 1. HEALTH CHECK

### Health Check
**Method**: `GET`  
**URL**: `{{baseUrl}}/health`  
**Headers**: None  
**Body**: None

**Expected Response** (200):
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 📁 2. AUTHENTICATION

### 2.1 Register User
**Method**: `POST`  
**URL**: `{{baseUrl}}/api/{{apiVersion}}/auth/register`

**Headers**:
```
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+919876543210"
}
```

**Expected Response** (201):
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Postman Tests** (Add to Tests tab):
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set("token", response.data.token);
    pm.environment.set("refreshToken", response.data.refreshToken);
    pm.environment.set("userId", response.data.user.id);
}
```

---

### 2.2 Login User
**Method**: `POST`  
**URL**: `{{baseUrl}}/api/{{apiVersion}}/auth/login`

**Headers**:
```
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Expected Response** (200):
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isVerified": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Postman Tests**:
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("token", response.data.token);
    pm.environment.set("refreshToken", response.data.refreshToken);
    pm.environment.set("userId", response.data.user.id);
}
```

---

### 2.3 Logout User
**Method**: `POST`  
**URL**: `{{baseUrl}}/api/{{apiVersion}}/auth/logout`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Body**: None

**Expected Response** (200):
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

**Postman Tests**:
```javascript
if (pm.response.code === 200) {
    pm.environment.unset("token");
    pm.environment.unset("refreshToken");
}
```

---

### 2.4 Refresh Token
**Method**: `POST`  
**URL**: `{{baseUrl}}/api/{{apiVersion}}/auth/refresh-token`

**Headers**:
```
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "refreshToken": "{{refreshToken}}"
}
```

**Expected Response** (200):
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Postman Tests**:
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    pm.environment.set("token", response.data.token);
    pm.environment.set("refreshToken", response.data.refreshToken);
}
```

---

### 2.5 Forgot Password
**Method**: `POST`  
**URL**: `{{baseUrl}}/api/{{apiVersion}}/auth/forgot-password`

**Headers**:
```
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "email": "john@example.com"
}
```

**Expected Response** (200):
```json
{
  "status": "success",
  "message": "Password reset link sent to email"
}
```

---

### 2.6 Reset Password
**Method**: `POST`  
**URL**: `{{baseUrl}}/api/{{apiVersion}}/auth/reset-password/:token`

**URL Params**:
- `token`: Reset token from email (e.g., `abc123def456`)

**Headers**:
```
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "password": "newPassword123"
}
```

**Expected Response** (200):
```json
{
  "status": "success",
  "message": "Password reset successfully"
}
```

---

### 2.7 Verify Email
**Method**: `GET`  
**URL**: `{{baseUrl}}/api/{{apiVersion}}/auth/verify-email/:token`

**URL Params**:
- `token`: Verification token from email

**Headers**: None  
**Body**: None

**Expected Response** (200):
```json
{
  "status": "success",
  "message": "Email verified successfully"
}
```

---

## 📁 3. EVENTS

### 3.1 Get All Events (Public)
**Method**: `GET`  
**URL**: `{{baseUrl}}/api/{{apiVersion}}/events`

**Headers**: None

**Query Parameters** (Optional):
```
page: 1
limit: 10
status: published
category: music
search: concert
sort: -createdAt
```

**Example URL with params**:
```
{{baseUrl}}/api/{{apiVersion}}/events?page=1&limit=10&status=published&category=music
```

**Expected Response** (200):
```json
{
  "status": "success",
  "data": {
    "events": [
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
        "title": "Summer Music Festival 2024",
        "slug": "summer-music-festival-2024-1705320000000",
        "description": "The biggest music festival of the year",
        "category": "music",
        "type": "offline",
        "status": "published",
        "startDate": "2024-06-15T18:00:00.000Z",
        "endDate": "2024-06-17T23:00:00.000Z",
        "venue": {
          "name": "Central Park",
          "address": "123 Park Avenue",
          "city": "New York",
          "state": "NY",
          "country": "USA"
        },
        "banner": "https://example.com/banner.jpg",
        "ticketTypes": [
          {
            "name": "General Admission",
            "price": 50,
            "quantity": 1000,
            "sold": 250,
            "description": "Standard entry ticket"
          },
          {
            "name": "VIP",
            "price": 150,
            "quantity": 100,
            "sold": 45,
            "description": "VIP access with premium seating"
          }
        ],
        "totalSeats": 1100,
        "availableSeats": 805,
        "views": 1523,
        "isFeatured": true,
        "organizerId": {
          "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
          "name": "Event Organizers Inc"
        },
        "organizationId": {
          "_id": "65a1b2c3d4e5f6g7h8i9j0k3",
          "name": "Music Events Co"
        },
        "createdAt": "2024-01-10T10:00:00.000Z",
        "updatedAt": "2024-01-15T14:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "pages": 5
    }
  }
}
```

---

### 3.2 Get Event by ID (Public)
**Method**: `GET`  
**URL**: `{{baseUrl}}/api/{{apiVersion}}/events/:id`

**URL Params**:
- `id`: Event ID (e.g., `65a1b2c3d4e5f6g7h8i9j0k1`)

**Headers**: None  
**Body**: None

**Expected Response** (200):
```json
{
  "status": "success",
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "title": "Summer Music Festival 2024",
    "slug": "summer-music-festival-2024-1705320000000",
    "description": "The biggest music festival of the year",
    "category": "music",
    "type": "offline",
    "status": "published",
    "startDate": "2024-06-15T18:00:00.000Z",
    "endDate": "2024-06-17T23:00:00.000Z",
    "venue": {
      "name": "Central Park",
      "address": "123 Park Avenue",
      "city": "New York",
      "state": "NY",
      "country": "USA",
      "coordinates": {
        "lat": 40.785091,
        "lng": -73.968285
      }
    },
    "banner": "https://example.com/banner.jpg",
    "images": [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg"
    ],
    "ticketTypes": [
      {
        "name": "General Admission",
        "price": 50,
        "quantity": 1000,
        "sold": 250,
        "description": "Standard entry ticket"
      }
    ],
    "tags": ["music", "festival", "outdoor"],
    "totalSeats": 1100,
    "availableSeats": 805,
    "views": 1524,
    "isFeatured": true,
    "organizerId": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "name": "Event Organizers Inc",
      "email": "organizer@example.com"
    },
    "organizationId": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k3",
      "name": "Music Events Co"
    },
    "createdAt": "2024-01-10T10:00:00.000Z",
    "updatedAt": "2024-01-15T14:30:00.000Z"
  }
}
```

---

### 3.3 Get Event by Slug (Public)
**Method**: `GET`  
**URL**: `{{baseUrl}}/api/{{apiVersion}}/events/slug/:slug`

**URL Params**:
- `slug`: Event slug (e.g., `summer-music-festival-2024-1705320000000`)

**Headers**: None  
**Body**: None

**Expected Response**: Same as Get Event by ID

---

### 3.4 Create Event (Organizer Only)
**Method**: `POST`  
**URL**: `{{baseUrl}}/api/{{apiVersion}}/events`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Body** (raw JSON):
```json
{
  "title": "Tech Conference 2024",
  "description": "Annual technology conference featuring industry leaders and innovators",
  "organizationId": "65a1b2c3d4e5f6g7h8i9j0k3",
  "category": "technology",
  "type": "hybrid",
  "startDate": "2024-08-20T09:00:00.000Z",
  "endDate": "2024-08-22T18:00:00.000Z",
  "venue": {
    "name": "Convention Center",
    "address": "456 Tech Street",
    "city": "San Francisco",
    "state": "CA",
    "country": "USA",
    "coordinates": {
      "lat": 37.7749,
      "lng": -122.4194
    }
  },
  "onlineLink": "https://zoom.us/j/123456789",
  "banner": "https://example.com/tech-banner.jpg",
  "images": [
    "https://example.com/tech1.jpg",
    "https://example.com/tech2.jpg"
  ],
  "ticketTypes": [
    {
      "name": "Early Bird",
      "price": 199,
      "quantity": 500,
      "description": "Early bird special pricing"
    },
    {
      "name": "Regular",
      "price": 299,
      "quantity": 1000,
      "description": "Standard admission"
    },
    {
      "name": "VIP",
      "price": 599,
      "quantity": 100,
      "description": "VIP access with networking sessions"
    }
  ],
  "tags": ["technology", "conference", "networking"],
  "totalSeats": 1600,
  "isFeatured": false
}
```

**Expected Response** (201):
```json
{
  "status": "success",
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k4",
    "title": "Tech Conference 2024",
    "slug": "tech-conference-2024-1705320123456",
    "description": "Annual technology conference featuring industry leaders and innovators",
    "organizationId": "65a1b2c3d4e5f6g7h8i9j0k3",
    "organizerId": "65a1b2c3d4e5f6g7h8i9j0k2",
    "category": "technology",
    "type": "hybrid",
    "status": "draft",
    "startDate": "2024-08-20T09:00:00.000Z",
    "endDate": "2024-08-22T18:00:00.000Z",
    "venue": {
      "name": "Convention Center",
      "address": "456 Tech Street",
      "city": "San Francisco",
      "state": "CA",
      "country": "USA",
      "coordinates": {
        "lat": 37.7749,
        "lng": -122.4194
      }
    },
    "onlineLink": "https://zoom.us/j/123456789",
    "banner": "https://example.com/tech-banner.jpg",
    "images": [
      "https://example.com/tech1.jpg",
      "https://example.com/tech2.jpg"
    ],
    "ticketTypes": [
      {
        "name": "Early Bird",
        "price": 199,
        "quantity": 500,
        "sold": 0,
        "description": "Early bird special pricing"
      },
      {
        "name": "Regular",
        "price": 299,
        "quantity": 1000,
        "sold": 0,
        "description": "Standard admission"
      },
      {
        "name": "VIP",
        "price": 599,
        "quantity": 100,
        "sold": 0,
        "description": "VIP access with networking sessions"
      }
    ],
    "tags": ["technology", "conference", "networking"],
    "totalSeats": 1600,
    "availableSeats": 1600,
    "views": 0,
    "isFeatured": false,
    "createdAt": "2024-01-15T15:00:00.000Z",
    "updatedAt": "2024-01-15T15:00:00.000Z"
  }
}
```

**Postman Tests**:
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set("eventId", response.data._id);
}
```

**Note**: User must have role "organizer" or "admin" to create events.

---

### 3.5 Update Event (Organizer Only)
**Method**: `PUT`  
**URL**: `{{baseUrl}}/api/{{apiVersion}}/events/:id`

**URL Params**:
- `id`: Event ID (use `{{eventId}}`)

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Body** (raw JSON) - Send only fields to update:
```json
{
  "title": "Tech Conference 2024 - Updated",
  "description": "Updated description with more details",
  "ticketTypes": [
    {
      "name": "Early Bird",
      "price": 179,
      "quantity": 500,
      "description": "Updated early bird pricing"
    },
    {
      "name": "Regular",
      "price": 299,
      "quantity": 1000,
      "description": "Standard admission"
    }
  ],
  "isFeatured": true
}
```

**Expected Response** (200):
```json
{
  "status": "success",
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k4",
    "title": "Tech Conference 2024 - Updated",
    "description": "Updated description with more details",
    // ... other fields
    "isFeatured": true,
    "updatedAt": "2024-01-15T16:00:00.000Z"
  }
}
```

---

### 3.6 Publish Event (Organizer Only)
**Method**: `PATCH`  
**URL**: `{{baseUrl}}/api/{{apiVersion}}/events/:id/publish`

**URL Params**:
- `id`: Event ID (use `{{eventId}}`)

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Body**: None

**Expected Response** (200):
```json
{
  "status": "success",
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k4",
    "title": "Tech Conference 2024",
    "status": "published",
    // ... other fields
  }
}
```

---

### 3.7 Delete Event (Organizer Only)
**Method**: `DELETE`  
**URL**: `{{baseUrl}}/api/{{apiVersion}}/events/:id`

**URL Params**:
- `id`: Event ID (use `{{eventId}}`)

**Headers**:
```
Authorization: Bearer {{token}}
```

**Body**: None

**Expected Response** (200):
```json
{
  "status": "success",
  "message": "Event deleted successfully"
}
```

---

## 📁 4. USERS (Placeholder)

### 4.1 Get User Profile
**Method**: `GET`  
**URL**: `{{baseUrl}}/api/{{apiVersion}}/users/profile`

**Headers**:
```
Authorization: Bearer {{token}}
```

**Body**: None

**Expected Response** (200):
```json
{
  "message": "User profile"
}
```

---

## 📁 5. ORGANIZATIONS (Placeholder)

### 5.1 Get All Organizations
**Method**: `GET`  
**URL**: `{{baseUrl}}/api/{{apiVersion}}/organizations`

**Headers**: None  
**Body**: None

**Expected Response** (200):
```json
{
  "message": "Organizations list"
}
```

---

## 📁 6. TICKETS (Placeholder)

### 6.1 Get All Tickets
**Method**: `GET`  
**URL**: `{{baseUrl}}/api/{{apiVersion}}/tickets`

**Headers**:
```
Authorization: Bearer {{token}}
```

**Body**: None

**Expected Response** (200):
```json
{
  "message": "Tickets list"
}
```

---

## 📁 7. PAYMENTS (Placeholder)

### 7.1 Create Payment Order
**Method**: `POST`  
**URL**: `{{baseUrl}}/api/{{apiVersion}}/payments/create-order`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Body** (raw JSON):
```json
{
  "eventId": "{{eventId}}",
  "ticketType": "General Admission",
  "quantity": 2,
  "amount": 100
}
```

**Expected Response** (200):
```json
{
  "message": "Create payment order"
}
```

---

### 7.2 Verify Payment
**Method**: `POST`  
**URL**: `{{baseUrl}}/api/{{apiVersion}}/payments/verify`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Body** (raw JSON):
```json
{
  "orderId": "order_123456",
  "paymentId": "pay_123456",
  "signature": "signature_123456"
}
```

**Expected Response** (200):
```json
{
  "message": "Verify payment"
} 
```

---

### 7.3 Payment Webhook
**Method**: `POST`  
**URL**: `{{baseUrl}}/api/{{apiVersion}}/payments/webhook`

**Headers**:
```
Content-Type: application/json
X-Razorpay-Signature: signature_from_razorpay
```

**Body** (raw JSON):
```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_123456",
        "amount": 10000,
        "currency": "INR",
        "status": "captured"
      }
    }
  }
}
```

**Expected Response** (200):
```json
{
  "message": "Payment webhook"
}
```

---

## 🔐 Authorization Setup

### For Protected Routes

1. **Login first** to get token
2. **Set Authorization header** in Postman:
   - Go to Authorization tab
   - Type: Bearer Token
   - Token: `{{token}}`

OR manually add header:
```
Authorization: Bearer {{token}}
```

---

## 🧪 Testing Workflow

### Complete Test Flow:

1. **Health Check** - Verify server is running
2. **Register** - Create new user account
3. **Login** - Get authentication token
4. **Get Events** - View all events (public)
5. **Create Event** - Create new event (requires organizer role)
6. **Get Event by ID** - View specific event
7. **Update Event** - Modify event details
8. **Publish Event** - Make event public
9. **Logout** - End session

---

## 📊 Common Response Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## 🚨 Error Response Format

All errors follow this format:

```json
{
  "status": "error",
  "message": "Error description here"
}
```

**Example - Validation Error**:
```json
{
  "status": "error",
  "message": "Valid email is required, Password must be at least 8 characters"
}
```

**Example - Authentication Error**:
```json
{
  "status": "error",
  "message": "Authentication required"
}
```

**Example - Authorization Error**:
```json
{
  "status": "error",
  "message": "You do not have permission to perform this action"
}
```

---

## 💡 Pro Tips

1. **Use Environment Variables**: Set `{{baseUrl}}`, `{{token}}`, etc.
2. **Use Tests Tab**: Auto-save tokens from responses
3. **Use Pre-request Scripts**: Auto-refresh expired tokens
4. **Save Requests**: Organize in folders by module
5. **Use Collections**: Share with team members

---

## 📥 Import Ready JSON

Save this as `Buizz_API.postman_collection.json` and import to Postman.

---

**All APIs documented and ready for testing!** 🚀
