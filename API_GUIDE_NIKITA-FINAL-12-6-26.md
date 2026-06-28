# 🚀 Buizz Management System - Complete API Guide

## 📋 Table of Contents
1. [Setup & Installation](#setup--installation)
2. [Authentication & Authorization](#authentication--authorization)
3. [API Endpoints](#api-endpoints)
4. [KYC & Bank Verification](#kyc--bank-verification)
5. [Event Management & Approval](#event-management--approval)
6. [Payment & Settlement System](#payment--settlement-system)
7. [Super Admin Analytics](#super-admin-analytics)
8. [Audit & Security](#audit--security)
9. [Testing with Postman](#testing-with-postman)
10. [Error Handling](#error-handling)

---

## 🔧 Setup & Installation

### Prerequisites
```bash
- Node.js (v16+)
- MySQL (v8.0+)
- Redis (optional, for caching)
```

### Installation Steps
```bash
# Clone repository
git clone <repository-url>
cd buizz_management_system/server

# Install dependencies
npm install

# Environment setup
cp .env.example .env
# Configure your database and other settings in .env

# Database setup
mysql -u root -p < database/complete_schema.sql

# Start the server
npm start
# or for development
npm run dev
```

### Environment Variables
```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=buizz_management_system

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# Server
PORT=5000
NODE_ENV=development
API_VERSION=v1

# Platform Settings
PLATFORM_FEE_PERCENT=2
SETTLEMENT_HOLD_DAYS=4

# File Upload
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Database Migrations
Run these SQL files in order:
```bash
1. database/main_schema.sql
2. database/kyc_verification_migration.sql
3. database/payment_settlements_migration.sql
4. database/audit_system_migration.sql
5. database/bank_documents_migration.sql
6. database/fix_audit_and_bank_verification.sql
```

---

## 🔐 Authentication & Authorization

### Base URL
```
http://localhost:5000/api/v1
```

### User Roles
- **customer**: Regular users who book events
- **organizer**: Event creators (require KYC verification)
- **admin**: Platform administrators
- **super_admin**: Full system access

### Authentication Flow

#### 1. User Registration
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "phone": "+1234567890",
  "role": "organizer"
}
```

#### 2. User Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "organizer",
      "kycStatus": "pending",
      "bankVerificationStatus": "pending"
    }
  }
}
```

#### 3. Using Authentication
Include in headers for all protected routes:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📚 API Endpoints

### 🔑 Authentication Routes
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | User registration | ❌ |
| POST | `/auth/login` | User login | ❌ |
| POST | `/auth/logout` | User logout | ✅ |
| GET | `/auth/me` | Get current user | ✅ |
| POST | `/auth/refresh` | Refresh token | ✅ |
| POST | `/auth/forgot-password` | Reset password request | ❌ |
| POST | `/auth/reset-password` | Reset password | ❌ |

### 👥 User Management
| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| GET | `/users` | List all users | admin, super_admin |
| GET | `/users/:id` | Get user by ID | admin, super_admin |
| PUT | `/users/:id` | Update user | admin, super_admin |
| DELETE | `/users/:id` | Delete user | super_admin |
| GET | `/users/profile` | Get own profile | user |
| PUT | `/users/profile` | Update own profile | user |

---

## 📋 KYC & Bank Verification

### 📄 KYC Document Upload

#### 1. Upload Single Document
```http
POST /kyc/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

{
  "document": [file],
  "documentType": "pan"
}
```

**Supported Document Types:**
- `pan` - PAN Card
- `address_proof` - Address Proof
- `aadhaar` - Aadhaar Card
- `driving_license` - Driving License
- `voter_id` - Voter ID
- `passport` - Passport
- `gst_certificate` - GST Certificate
- `cancelled_cheque_or_passbook` - Bank Documents
- `bank_statement` - Bank Statement

#### 2. Submit KYC Application
```http
POST /kyc/me
Content-Type: application/json
Authorization: Bearer <token>

{
  "legalName": "John Doe",
  "businessName": "John's Events",
  "panNumber": "ABCDE1234F",
  "gstNumber": "27ABCDE1234F1Z5",
  "aadhaarLast4": "1234",
  "addressLine": "123 Main Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "documents": [
    {
      "type": "pan",
      "url": "http://localhost:5000/storage/kyc-documents/pan/pan.pdf"
    },
    {
      "type": "address_proof",
      "url": "http://localhost:5000/storage/kyc-documents/address-proof/address.pdf"
    }
  ],
  "bankDocuments": [
    {
      "type": "cancelled_cheque_or_passbook",
      "url": "http://localhost:5000/storage/kyc-documents/bank-documents/cheque.pdf"
    }
  ]
}
```

#### 3. Admin KYC Review
```http
PATCH /kyc/requests/:id/review
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "status": "verified",
  "bankStatus": "verified",
  "reviewNotes": "All documents verified successfully"
}
```

### 🏦 Bank Account Management

#### 1. Add Bank Account with Documents
```http
POST /settlements/bank-account
Content-Type: multipart/form-data
Authorization: Bearer <token>

{
  "accountHolderName": "John Doe",
  "bankAccountNumber": "1234567890123456",
  "bankIfscCode": "HDFC0001234",
  "bankName": "HDFC Bank",
  "upiId": "john@paytm",
  "passbook": [file],
  "cheque": [file]
}
```

#### 2. Admin Bank Verification
```http
PATCH /settlements/bank-account/:organizerId/verify
Content-Type: application/json
Authorization: Bearer <super_admin_token>

{
  "status": "verified",
  "rejectionReason": null
}
```

---

## 🎪 Event Management & Approval

### 📅 Event Creation (Organizer)

```http
POST /events
Content-Type: application/json
Authorization: Bearer <organizer_token>

{
  "title": "Tech Conference 2024",
  "description": "Annual technology conference",
  "category": "Technology",
  "type": "offline",
  "startDate": "2024-12-01T09:00:00Z",
  "endDate": "2024-12-01T18:00:00Z",
  "venueName": "Convention Center",
  "venueAddress": "123 Main St",
  "venueCity": "Mumbai",
  "venueState": "Maharashtra",
  "venueCountry": "India",
  "totalSeats": 500,
  "banner": "https://example.com/banner.jpg",
  "ticketTypes": [
    {
      "name": "Early Bird",
      "description": "Early bird special price",
      "price": 500,
      "quantity": 100,
      "isFree": false,
      "saleStartDate": "2024-11-01T00:00:00Z",
      "saleEndDate": "2024-11-15T23:59:59Z"
    },
    {
      "name": "VIP Pass",
      "description": "VIP access with exclusive benefits",
      "price": 2000,
      "quantity": 50,
      "isFree": false
    },
    {
      "name": "Free Entry",
      "description": "Free entry for students",
      "price": 0,
      "quantity": 200,
      "isFree": true
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Event submitted for approval",
    "approvalRequest": {
      "requestId": 1,
      "status": "pending"
    },
    "requiresApproval": true
  }
}
```

### ✅ Event Approval Workflow

#### 1. Get Pending Approvals
```http
GET /approvals?status=pending
Authorization: Bearer <admin_token>
```

#### 2. Get Specific Approval Request
```http
GET /approvals/1
Authorization: Bearer <admin_token>
```

#### 3. Admin Review
```http
POST /approvals/1/admin-review
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "status": "approved",
  "comments": "Event details look good from admin perspective."
}
```

#### 4. Super Admin Review
```http
POST /approvals/1/super-admin-review
Content-Type: application/json
Authorization: Bearer <super_admin_token>

{
  "status": "approved",
  "comments": "Event approved by super admin. All requirements met."
}
```

#### 5. Publish Approved Event
```http
PATCH /events/:eventId/publish
Authorization: Bearer <super_admin_token>
```

---

## 💳 Payment & Settlement System

### 🎫 Booking Flow

#### 1. Create Booking
```http
POST /bookings
Content-Type: application/json
Authorization: Bearer <user_token>

{
  "eventId": 1,
  "ticketTypeId": 1,
  "quantity": 2,
  "customerDetails": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1234567890"
  }
}
```

#### 2. Process Payment
```http
POST /payments/process
Content-Type: application/json
Authorization: Bearer <user_token>

{
  "bookingId": 1,
  "paymentMethod": "card",
  "amount": 1000
}
```

### 💰 Settlement Management

#### 1. Get Settlement Summary
```http
GET /settlements/summary/me
Authorization: Bearer <organizer_token>
```

#### 2. Generate Settlement (Admin)
```http
POST /settlements/generate
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "organizerId": 2,
  "eventId": 1
}
```

#### 3. Update Settlement Status
```http
PATCH /settlements/:settlementId/status
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "status": "paid",
  "payoutReference": "TXN123456789",
  "bankReferenceId": "REF987654321",
  "notes": "Payment processed successfully"
}
```

---

## 📊 Super Admin Analytics

### 📈 Comprehensive Organizer Analytics

#### 1. Get All Organizers
```http
GET /admin/analytics/organizers?page=1&limit=20&status=verified&search=john
Authorization: Bearer <super_admin_token>
```

#### 2. Complete Organizer Dashboard
```http
GET /admin/analytics/organizers/2/dashboard
Authorization: Bearer <super_admin_token>
```

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "organizer": {
      "user_id": 2,
      "name": "John Doe",
      "email": "organizer@example.com",
      "kyc_status": "verified",
      "bank_verification_status": "verified",
      "total_events": 5,
      "published_events": 4,
      "completed_events": 2,
      "total_bookings": 150,
      "total_revenue": 75000
    },
    "events": [...],
    "bookingSummary": {
      "stats": {
        "total_bookings": 150,
        "confirmed_bookings": 140,
        "cancelled_bookings": 10,
        "unique_customers": 85
      },
      "monthlyTrends": [...],
      "topCustomers": [...]
    },
    "revenueAnalysis": {
      "stats": {
        "total_gross_revenue": 75000,
        "total_platform_fees": 1500,
        "total_net_revenue": 73500
      },
      "profitLoss": {
        "totalRevenue": 73500,
        "totalCosts": 1500,
        "netProfit": 73500,
        "profitMargin": "98.00"
      }
    },
    "eventPerformance": [...],
    "kycDetails": {...},
    "settlementHistory": [...],
    "auditHistory": [...]
  }
}
```

#### 3. Individual Analytics Sections
```http
GET /admin/analytics/organizers/2/profile
GET /admin/analytics/organizers/2/events
GET /admin/analytics/organizers/2/revenue
GET /admin/analytics/organizers/2/bookings
GET /admin/analytics/organizers/2/performance
GET /admin/analytics/organizers/2/kyc
GET /admin/analytics/organizers/2/settlements
GET /admin/analytics/organizers/2/audit
```

#### 4. Export Organizer Data
```http
GET /admin/analytics/organizers/2/export?format=json
GET /admin/analytics/organizers/2/export?format=csv
Authorization: Bearer <super_admin_token>
```

---

## 🛡️ Audit & Security

### 📋 Audit Logs

#### 1. Get Audit Logs
```http
GET /admin/audit/logs?page=1&limit=50&severity=high&userId=2
Authorization: Bearer <super_admin_token>
```

#### 2. Get User Activity
```http
GET /admin/audit/users/2/activity?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <super_admin_token>
```

#### 3. Get Dashboard Statistics
```http
GET /admin/audit/dashboard/stats?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <super_admin_token>
```

### 🔒 Security Features

#### Rate Limiting
- API rate limits applied per IP
- Different limits for different endpoints
- Configurable through environment variables

#### Input Validation
- All inputs validated using express-validator
- SQL injection prevention
- XSS protection
- File upload security

#### Authentication Security
- JWT tokens with expiration
- Refresh token mechanism
- Role-based access control (RBAC)
- Password hashing with bcrypt

---

## 🧪 Testing with Postman

### Postman Collection Setup

#### 1. Environment Variables
```json
{
  "baseUrl": "http://localhost:5000/api/v1",
  "userToken": "",
  "organizerToken": "",
  "adminToken": "",
  "superAdminToken": ""
}
```

#### 2. Pre-request Scripts for Auth
```javascript
// Auto-set authorization header
if (pm.globals.get("userToken")) {
    pm.request.headers.add({
        key: "Authorization", 
        value: "Bearer " + pm.globals.get("userToken")
    });
}
```

#### 3. Test Collection Structure
```
Buizz API Tests/
├── 1. Authentication/
│   ├── Register User
│   ├── Login User
│   ├── Get Profile
│   └── Logout
├── 2. KYC & Verification/
│   ├── Upload Document
│   ├── Submit KYC
│   ├── Admin Review KYC
│   └── Bank Account Setup
├── 3. Event Management/
│   ├── Create Event (Organizer)
│   ├── Admin Approval
│   ├── Super Admin Approval
│   └── Publish Event
├── 4. Bookings & Payments/
│   ├── Create Booking
│   ├── Process Payment
│   └── Get Booking Details
├── 5. Settlements/
│   ├── Bank Account Management
│   ├── Settlement Generation
│   └── Settlement Status Updates
└── 6. Admin Analytics/
    ├── Organizer Dashboard
    ├── Revenue Analysis
    └── Export Data
```

### Sample Test Cases

#### Authentication Test
```javascript
pm.test("Login successful", function () {
    pm.response.to.have.status(200);
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data.token).to.exist;
    
    // Save token for future requests
    pm.globals.set("userToken", response.data.token);
});
```

#### KYC Submission Test
```javascript
pm.test("KYC submission successful", function () {
    pm.response.to.have.status(201);
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data.status).to.equal("pending");
});
```

---

## ❌ Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "error": {
    "statusCode": 400,
    "status": "error",
    "isOperational": true
  },
  "message": "Validation error occurred",
  "errors": [
    {
      "type": "field",
      "msg": "Valid PAN number is required",
      "path": "panNumber",
      "location": "body"
    }
  ]
}
```

### Common HTTP Status Codes
| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Error Types by Module

#### Authentication Errors
```json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

#### KYC Validation Errors
```json
{
  "statusCode": 400,
  "message": "KYC validation failed",
  "errors": [
    {
      "msg": "Valid PAN number is required",
      "path": "panNumber"
    }
  ]
}
```

#### Authorization Errors
```json
{
  "statusCode": 403,
  "message": "Your KYC is not verified. Please complete KYC verification before creating events.",
  "reason": "kyc_not_verified"
}
```

---

## 📝 Additional Resources

### Database Schema
- Complete schema in `/database/` folder
- Migration files for different modules
- Indexes and constraints documentation

### File Upload Guidelines
- Supported formats: PDF, JPG, PNG
- Maximum file size: 10MB
- Automatic file organization by type and user

### Platform Configuration
- Platform fee: 2% (configurable)
- Settlement hold period: 4 days (configurable)
- File storage: Local + Cloudinary support

### Security Best Practices
- Always use HTTPS in production
- Validate all inputs on both client and server
- Implement proper error handling
- Use environment variables for sensitive data
- Regular security audits and updates

---

## 🚀 Quick Start Checklist

- [ ] Install dependencies (`npm install`)
- [ ] Setup environment variables (`.env`)
- [ ] Run database migrations
- [ ] Create super admin user
- [ ] Test authentication endpoints
- [ ] Upload sample documents for KYC
- [ ] Test event creation and approval flow
- [ ] Verify payment and settlement flow
- [ ] Test admin analytics dashboard

---

## 📞 Support & Contact

For technical support or API questions:
- Documentation: This file
- API Testing: Use provided Postman collection
- Database Issues: Check migration files
- Authentication Problems: Verify JWT configuration

---

**Last Updated:** December 2024  
**API Version:** v1  
**Compatible Node.js:** v16+  
**Database:** MySQL 8.0+