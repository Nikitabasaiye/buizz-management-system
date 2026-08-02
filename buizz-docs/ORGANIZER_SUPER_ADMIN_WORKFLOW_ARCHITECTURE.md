# Buizz Organizer & Super Admin Workflow and System Architecture

## Executive Summary

This document provides a comprehensive overview of the Organizer and Super Admin workflows and system architecture for the Buizz platform (BookMyShow-style event management system). The system implements a role-based access control (RBAC) system with granular permissions, multi-tier approval workflows, and comprehensive audit logging.

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Buizz Platform                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Customer   │  │  Organizer   │  │  Super Admin │          │
│  │   Platform   │  │   Platform   │  │   Platform   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                 │                 │                   │
│         └─────────────────┴─────────────────┘                   │
│                           │                                     │
│                   ┌───────▼────────┐                            │
│                   │   API Gateway  │                            │
│                   │  (Express.js)  │                            │
│                   └───────┬────────┘                            │
│                           │                                     │
│         ┌─────────────────┼─────────────────┐                 │
│         │                 │                 │                 │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐            │
│  │   Auth      │  │   Events    │  │   Payments  │            │
│  │  Service    │  │  Service    │  │  Service    │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                 │                 │                 │
│         └─────────────────┴─────────────────┘                 │
│                           │                                     │
│                   ┌───────▼────────┐                            │
│                   │  MySQL Database │                            │
│                   │  + Redis Cache  │                            │
│                   └─────────────────┘                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

**Backend:**
- Node.js with Express.js
- MySQL for persistent data storage
- Redis for session management and caching
- JWT for authentication
- bcrypt for password hashing

**Frontend:**
- Next.js 15 with App Router
- TypeScript
- Zustand for state management
- Tailwind CSS for styling

**Security:**
- HTTP-only cookies for token storage
- Token blacklisting for logout
- Role-based access control (RBAC)
- Granular permission system
- Audit logging for all critical actions

---

## 2. Role-Based Access Control (RBAC) System

### 2.1 User Roles

The system supports the following roles:

```javascript
const USER_ROLES = {
  CUSTOMER: 'customer',
  ORGANIZER: 'organizer',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  CHECKIN_STAFF: 'checkin_staff',
  INFLUENCER: 'influencer'
};
```

### 2.2 Permission Architecture

**Permission Categories:**

1. **User Management**: `user:create`, `user:read`, `user:update`, `user:delete`, `user:list`
2. **Event Management**: `event:create`, `event:read`, `event:update`, `event:delete`, `event:publish`, `event:list`
3. **Ticket Management**: `ticket:create`, `ticket:read`, `ticket:update`, `ticket:delete`, `ticket:scan`, `ticket:list`
4. **Payment Management**: `payment:create`, `payment:read`, `payment:refund`, `payment:list`
5. **Organization Management**: `org:create`, `org:read`, `org:update`, `org:delete`, `org:manage_members`
6. **Admin Operations**: `admin:access`, `admin:users`, `admin:events`, `admin:payments`, `admin:analytics`, `admin:settings`
7. **Analytics**: `analytics:view`, `analytics:read`, `analytics:export`
8. **Permission Management**: `permission:assign`, `permission:revoke`, `permission:view`

### 2.3 Role-Permission Matrix

| Permission Category | Customer | Organizer | Admin | Super Admin | Check-in Staff |
|---------------------|----------|-----------|-------|-------------|----------------|
| User Management     | Self     | Self      | All   | All         | None           |
| Event Management    | Read     | Full      | Full  | Full        | Read           |
| Ticket Management   | Own      | Full      | Read  | Full        | Scan           |
| Payment Management  | Own      | Read/Refund| Read/Refund | Full | None |
| Analytics           | None     | Read      | Full  | Full        | None           |
| Admin Operations    | None     | None      | Full  | Full        | None           |
| Permission Mgmt     | None     | None      | Delegated | Full | None |

---

## 3. Organizer Workflow

### 3.1 Organizer Registration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Organizer Registration                        │
└─────────────────────────────────────────────────────────────────┘

1. Registration Request
   POST /api/v1/organizer/register
   Request Body:
   {
     "name": "John Doe",
     "email": "john@company.com",
     "password": "securePassword123",
     "phone": "+919876543210",
     "businessName": "Event Productions Ltd",
     "businessType": "event_management",
     "city": "Mumbai",
     "state": "Maharashtra"
   }

2. Email Verification
   - System sends verification email with token
   - GET /api/v1/organizer/verify-email/:token
   - Email verified → account becomes active

3. Initial Status
   - Role: organizer
   - KYC Status: pending
   - Bank Verification: pending
   - Account Status: active (limited)

4. Dashboard Access
   - Can access basic dashboard
   - Cannot publish events until KYC verified
   - Cannot receive payouts until bank verified
```

### 3.2 KYC Verification Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      KYC Verification                           │
└─────────────────────────────────────────────────────────────────┘

1. Document Upload
   POST /api/v1/organizer/kyc/documents
   Request Body:
   {
     "panCard": "base64_encoded_pan",
     "aadharCard": "base64_encoded_aadhar",
     "businessProof": "base64_encoded_business_proof"
   }

2. Admin Review
   - Admin receives notification
   - Admin reviews documents
   - Admin approves/rejects KYC

3. KYC Approval
   PATCH /api/v1/organizer/:id/kyc
   - Admin action
   - Status changes: pending → verified/rejected

4. Post-KYC Benefits
   - Can publish events
   - Events go live immediately
   - Higher trust score
```

### 3.3 Bank Verification Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Bank Verification                             │
└─────────────────────────────────────────────────────────────────┘

1. Bank Details Submission
   PUT /api/v1/organizer/bank
   Request Body:
   {
     "accountHolderName": "John Doe",
     "bankAccountNumber": "1234567890",
     "bankIfscCode": "SBIN0001234",
     "bankName": "State Bank of India",
     "upiId": "john@upi"
   }

2. Verification Process
   - System validates IFSC code
   - Micro-deposit verification (optional)
   - Admin manual verification

3. Verification Status
   - pending → verified/rejected
   - Enables payout processing

4. Payout Flow
   - Revenue accumulated
   - Platform fee deducted (7%)
   - Net amount transferred to verified bank
```

### 3.4 Event Management Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Event Lifecycle                              │
└─────────────────────────────────────────────────────────────────┘

1. Event Creation
   POST /api/v1/events
   - Event created with status: draft
   - Can add ticket types, pricing, seat maps
   - Upload banners, media

2. Event Submission
   PUT /api/v1/events/:id/submit
   - Status: draft → pending_approval
   - Sent to admin for review

3. Admin Approval
   - Admin reviews event details
   - Approve/Reject event
   - Status: pending_approval → published/rejected

4. Event Publication
   - Status: published
   - Visible to customers
   - Bookings enabled

5. Event Completion
   - Status: published → completed
   - Final attendance recorded
   - Revenue settlement initiated
```

### 3.5 Organizer Dashboard Features

**Analytics Dashboard:**
- Total events, published events, draft events
- Total bookings, tickets sold
- Total revenue, average transaction value
- Check-in rates, attendance analytics

**Event Management:**
- Create/edit/delete events
- Manage ticket types and pricing
- Configure seat maps
- Set event schedules

**Booking Management:**
- View all bookings
- Filter by event, status, date
- Export booking data
- Process refunds

**Attendee Management:**
- View attendee lists
- Check-in status tracking
- Export attendee data
- Communication tools

**Revenue Management:**
- Revenue breakdown by event
- Payout history
- Commission tracking
- Financial reports

---

## 4. Super Admin Workflow

### 4.1 Super Admin Registration

```
┌─────────────────────────────────────────────────────────────────┐
│                  Super Admin Registration                        │
└─────────────────────────────────────────────────────────────────┘

1. Registration Request
   POST /api/v1/admin/register
   Request Body:
   {
     "name": "Super Admin",
     "email": "superadmin@buizz.com",
     "password": "securePassword123",
     "adminSecret": "SUPER_SECRET_KEY"  // Required for registration
   }

2. Secret Validation
   - Validates against ADMIN_REGISTRATION_SECRET
   - Only authorized personnel can register

3. Account Creation
   - Role: admin
   - is_super_admin: true
   - All permissions granted

4. Initial Setup
   - Can create other admins
   - Can configure platform settings
   - Can manage all system aspects
```

### 4.2 Admin Management

```
┌─────────────────────────────────────────────────────────────────┐
│                      Admin Management                            │
└─────────────────────────────────────────────────────────────────┘

1. Create Admin
   POST /api/v1/admin/register
   - Super Admin only
   - Can assign specific permissions
   - Can delegate permission management

2. Admin Delegation
   - Grant permission management rights
   - Create user groups
   - Assign permissions to groups
   - Audit all delegation actions

3. Admin Monitoring
   - View all admin activities
   - Track permission changes
   - Monitor system access
   - Audit log review

4. Admin Deactivation
   DELETE /api/v1/admin/:id
   - Super Admin only
   - Cannot self-deactivate
   - Immediate effect
```

### 4.3 Organizer Management

```
┌─────────────────────────────────────────────────────────────────┐
│                    Organizer Management                          │
└─────────────────────────────────────────────────────────────────┘

1. View All Organizers
   GET /api/v1/admin/organizers
   - Paginated list
   - Filter by status, search
   - View organizer stats

2. KYC Verification
   PATCH /api/v1/organizer/:id/kyc
   - Review uploaded documents
   - Approve/reject KYC
   - Add verification notes

3. Organizer Deactivation
   DELETE /api/v1/organizer/:id
   - Deactivate problematic organizers
   - Handle active events
   - Process refunds if needed

4. Performance Monitoring
   - Track organizer performance
   - Review event success rates
   - Monitor compliance
```

### 4.4 Platform Oversight

```
┌─────────────────────────────────────────────────────────────────┐
│                     Platform Oversight                           │
└─────────────────────────────────────────────────────────────────┘

1. Overview Dashboard
   GET /api/v1/admin/overview
   - Total users, organizers, events
   - Total bookings, revenue
   - Platform health metrics

2. Event Management
   GET /api/v1/admin/events
   - View all platform events
   - Approve/reject pending events
   - Moderate content

3. Booking Management
   GET /api/v1/admin/bookings-management
   - View all bookings
   - Handle disputes
   - Process refunds

4. Payment Management
   GET /api/v1/admin/payments
   - Monitor all transactions
   - Track platform revenue
   - Handle payment issues

5. User Management
   GET /api/v1/admin/users
   - View all users
   - Handle user issues
   - Account management
```

### 4.5 Permission Management System

```
┌─────────────────────────────────────────────────────────────────┐
│                 Permission Management System                    │
└─────────────────────────────────────────────────────────────────┘

1. User Groups
   - Create custom user groups
   - Assign permissions to groups
   - Add/remove users from groups
   - Group-based access control

2. Direct Permissions
   - Override group permissions
   - Grant specific permissions to users
   - Fine-grained access control
   - Emergency access grants

3. Permission Delegation
   - Delegate permission management to admins
   - Control delegation scope
   - Monitor delegated actions
   - Revoke delegation when needed

4. Audit Logging
   - All permission changes logged
   - Track who granted/revoked permissions
   - Compliance reporting
   - Security monitoring
```

---

## 5. Authentication & Authorization System

### 5.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Authentication Flow                           │
└─────────────────────────────────────────────────────────────────┘

1. Login Request
   POST /api/v1/{role}/login
   Request Body:
   {
     "email": "user@example.com",
     "password": "password123"
   }

2. Credential Validation
   - Find user by email
   - Compare password hash
   - Check account status
   - Verify role

3. Token Generation
   - Generate access token (JWT)
   - Generate refresh token
   - Set HTTP-only cookie
   - Store in Redis (optional)

4. Response
   {
     "success": true,
     "message": "Login successful",
     "data": {
       "user": { "id": "123", "name": "John", "email": "john@example.com" },
       "token": "jwt_access_token",
       "refreshToken": "jwt_refresh_token"
     }
   }

5. Middleware Protection
   - authenticateOrganizer()
   - authenticateAdmin()
   - Token validation
   - Role verification
   - Permission checks
```

### 5.2 Token Management

**Access Token:**
- Expires in 7 days
- Contains user ID, role, permissions
- Stored in HTTP-only cookie
- Used for API authentication

**Refresh Token:**
- Longer lifespan
- Used to generate new access tokens
- Stored securely
- Can be revoked

**Token Blacklisting:**
- On logout, token added to blacklist
- Redis-based blacklist
- Configurable TTL
- Prevents token reuse

### 5.3 Authorization Middleware

```javascript
// Organizer Middleware
const authenticateOrganizer = async (req, res, next) => {
  // 1. Extract token from cookie/header
  // 2. Verify JWT signature
  // 3. Check token type (organizer)
  // 4. Fetch organizer from database
  // 5. Verify account status
  // 6. Attach organizer to request
  // 7. Proceed to next middleware
};

// Admin Middleware
const authenticateAdmin = async (req, res, next) => {
  // 1. Extract token from cookie/header
  // 2. Verify JWT signature
  // 3. Check token type (admin)
  // 4. Check token blacklist
  // 5. Fetch admin from database
  // 6. Verify account status
  // 7. Attach admin to request
  // 8. Proceed to next middleware
};

// Super Admin Check
const requireSuperAdmin = (req, res, next) => {
  if (!req.admin?.isSuperAdmin) {
    return next(new AppError('Super admin access required', 403));
  }
  next();
};

// Permission Check
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user?.permissions?.includes(permission)) {
      return next(new AppError('Permission denied', 403));
    }
    next();
  };
};
```

---

## 6. Database Schema

### 6.1 Core Tables

**users table:**
```sql
CREATE TABLE users (
  user_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  display_id VARCHAR(20) UNIQUE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('customer', 'organizer', 'admin', 'super_admin', 'checkin_staff', 'influencer') NOT NULL,
  kyc_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
  bank_verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
  is_active TINYINT(1) DEFAULT 1,
  is_super_admin TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**organizer_bank_accounts table:**
```sql
CREATE TABLE organizer_bank_accounts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  organizer_id BIGINT NOT NULL,
  account_holder_name VARCHAR(255) NOT NULL,
  bank_account_number VARCHAR(50) NOT NULL,
  bank_ifsc_code VARCHAR(20) NOT NULL,
  bank_name VARCHAR(100),
  upi_id VARCHAR(100),
  is_verified TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organizer_id) REFERENCES users(user_id)
);
```

**events table:**
```sql
CREATE TABLE events (
  event_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  organizer_id BIGINT NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  description TEXT,
  category VARCHAR(100),
  type ENUM('offline', 'online') DEFAULT 'offline',
  status ENUM('draft', 'pending_approval', 'published', 'rejected', 'completed') DEFAULT 'draft',
  start_date DATETIME,
  end_date DATETIME,
  venue_name VARCHAR(255),
  venue_city VARCHAR(100),
  venue_address TEXT,
  total_seats INT,
  available_seats INT,
  banner VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organizer_id) REFERENCES users(user_id)
);
```

### 6.2 RBAC Tables

**permissions table:**
```sql
CREATE TABLE permissions (
  permission_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(150) NOT NULL,
  description TEXT,
  module VARCHAR(50) NOT NULL,
  is_active TINYINT(1) DEFAULT 1
);
```

**user_groups table:**
```sql
CREATE TABLE user_groups (
  group_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_by BIGINT NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  FOREIGN KEY (created_by) REFERENCES users(user_id)
);
```

**user_group_permissions table:**
```sql
CREATE TABLE user_group_permissions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  group_id BIGINT NOT NULL,
  permission_id BIGINT NOT NULL,
  granted_by BIGINT NOT NULL,
  UNIQUE KEY (group_id, permission_id),
  FOREIGN KEY (group_id) REFERENCES user_groups(group_id),
  FOREIGN KEY (permission_id) REFERENCES permissions(permission_id)
);
```

**user_permissions table:**
```sql
CREATE TABLE user_permissions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  permission_id BIGINT NOT NULL,
  granted_by BIGINT NOT NULL,
  UNIQUE KEY (user_id, permission_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (permission_id) REFERENCES permissions(permission_id)
);
```

### 6.3 Audit Tables

**permission_audit_logs table:**
```sql
CREATE TABLE permission_audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  action ENUM('grant', 'revoke', 'delegate', 'revoke_delegation') NOT NULL,
  target_type ENUM('user', 'group', 'admin') NOT NULL,
  target_id BIGINT NOT NULL,
  permission_id BIGINT,
  permission_name VARCHAR(100),
  performed_by BIGINT NOT NULL,
  details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (performed_by) REFERENCES users(user_id)
);
```

---

## 7. API Endpoints Summary

### 7.1 Organizer Endpoints

**Authentication:**
- `POST /api/v1/organizer/register` - Register organizer
- `POST /api/v1/organizer/login` - Login organizer
- `POST /api/v1/organizer/logout` - Logout organizer
- `POST /api/v1/organizer/refresh` - Refresh access token
- `GET /api/v1/organizer/verify-email/:token` - Verify email
- `POST /api/v1/organizer/forgot-password` - Forgot password
- `POST /api/v1/organizer/reset-password/:token` - Reset password

**Profile Management:**
- `GET /api/v1/organizer/profile` - Get profile
- `PUT /api/v1/organizer/profile` - Update profile
- `PUT /api/v1/organizer/bank` - Update bank details
- `PUT /api/v1/organizer/password` - Change password

**Dashboard:**
- `GET /api/v1/organizer/analytics` - Get analytics
- `GET /api/v1/organizer/events` - Get events
- `GET /api/v1/organizer/bookings` - Get bookings
- `GET /api/v1/organizer/revenue` - Get revenue
- `GET /api/v1/organizer/attendees` - Get attendees

**Admin Management (Admin only):**
- `GET /api/v1/organizer` - Get all organizers
- `GET /api/v1/organizer/:id` - Get organizer by ID
- `PATCH /api/v1/organizer/:id/kyc` - Verify KYC
- `DELETE /api/v1/organizer/:id` - Deactivate organizer

### 7.2 Admin/Super Admin Endpoints

**Authentication:**
- `POST /api/v1/admin/register` - Register admin (requires secret)
- `POST /api/v1/admin/login` - Login admin
- `POST /api/v1/admin/google` - Google OAuth login
- `POST /api/v1/admin/logout` - Logout admin
- `POST /api/v1/admin/refresh` - Refresh access token
- `POST /api/v1/admin/forgot-password` - Forgot password
- `POST /api/v1/admin/reset-password/:token` - Reset password

**Profile Management:**
- `GET /api/v1/admin/profile` - Get profile
- `PUT /api/v1/admin/profile` - Update profile
- `PUT /api/v1/admin/password` - Change password

**Admin Management (Super Admin only):**
- `GET /api/v1/admin` - Get all admins
- `DELETE /api/v1/admin/:id` - Deactivate admin

**Platform Management:**
- `GET /api/v1/admin/organizers` - Get all organizers
- `GET /api/v1/admin/bookings-management` - Get all bookings
- `GET /api/v1/admin/payments` - Get all payments

---

## 8. Security Considerations

### 8.1 Authentication Security
- HTTP-only cookies for token storage
- Secure flag in production
- SameSite strict policy
- Token blacklisting on logout
- Short-lived access tokens (7 days)
- Refresh token rotation

### 8.2 Authorization Security
- Role-based access control
- Granular permission system
- Middleware-level enforcement
- Server-side permission checks
- Audit logging for all permission changes

### 8.3 Data Security
- Password hashing with bcrypt
- Sensitive data encryption
- SQL injection prevention
- XSS protection
- CSRF protection
- Input validation and sanitization

### 8.4 Audit Trail
- All critical actions logged
- Permission changes tracked
- Admin activities monitored
- Delegation actions recorded
- Compliance reporting

---

## 9. Frontend Integration

### 9.1 Session Management

**Frontend Auth Session (authSession.ts):**
```typescript
// Role-specific session keys
export const BUIZZ_AUTH_SESSION_KEYS = {
  customer: "buizz-customer-session",
  organizer: "buizz-organizer-session",
  admin: "buizz-admin-session",
  "super-admin": "buizz-super-admin-session",
  checkin_staff: "buizz-checkin-session",
};

// Session functions
export const setOrganizerSession = (session) => setRoleSession("organizer", session);
export const setAdminSession = (session) => setRoleSession("admin", session);
export const setSuperAdminSession = (session) => setRoleSession("super-admin", session);

export const getOrganizerSession = () => getRoleSession("organizer");
export const getAdminSession = () => getRoleSession("admin");
export const getSuperAdminSession = () => getRoleSession("super-admin");
```

### 9.2 Route Protection

**Frontend Route Groups:**
```typescript
// Organizer Routes
/organizer/login
/organizer/dashboard
/organizer/events
/organizer/bookings
/organizer/analytics

// Admin Routes
/admin/login
/admin/dashboard
/admin/users
/admin/events
/admin/payments

// Super Admin Routes
/super-admin/login
/super-admin/dashboard
/super-admin/admins
/super-admin/permissions
```

### 9.3 Permission-Based UI

**Frontend Permission Checks:**
```typescript
// Hide/show features based on permissions
{hasPermission('event:create') && <CreateEventButton />}
{hasPermission('admin:users') && <UserManagementSection />}
{isSuperAdmin && <SuperAdminPanel />}
```

---

## 10. Workflow Diagrams

### 10.1 Organizer Onboarding Flow

```
┌─────────────┐
│  Register   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Email Verify │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Upload KYC  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ KYC Pending │◄─────────┐
└──────┬──────┘          │
       │                 │
       ▼                 │
┌─────────────┐          │
│ KYC Approved│          │
└──────┬──────┘          │
       │                 │
       ▼                 │
┌─────────────┐          │
│Upload Bank   │          │
└──────┬──────┘          │
       │                 │
       ▼                 │
┌─────────────┐          │
│Bank Pending  │◄─────────┤
└──────┬──────┘          │
       │                 │
       ▼                 │
┌─────────────┐          │
│Bank Verified│          │
└──────┬──────┘          │
       │                 │
       ▼                 │
┌─────────────┐          │
│ Fully Active│──────────┘
└─────────────┘
```

### 10.2 Event Approval Flow

```
┌─────────────┐
│Create Event │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Draft     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Submit    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Pending Review│◄────────┐
└──────┬──────┘          │
       │                 │
       ▼                 │
┌─────────────┐          │
│Admin Review │          │
└──────┬──────┘          │
       │                 │
       ├─────────────────┤
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│  Published   │   │  Rejected   │
└──────┬──────┘   └─────────────┘
       │
       ▼
┌─────────────┐
│  Bookings   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Completed  │
└─────────────┘
```

### 10.3 Super Admin Permission Flow

```
┌─────────────┐
│Super Admin  │
│  Login      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│View Dashboard│
└──────┬──────┘
       │
       ├─────────────────┬─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│Manage Admins │  │Manage Orgs  │  │Permissions  │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                 │                 │
       │                 │                 ├──────────┐
       │                 │                 │          │
       ▼                 ▼                 ▼          ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐ ┌─────────────┐
│Create Admin │  │Verify KYC   │  │Create Group│ │Delegate    │
│Assign Perms │  │Deactivate   │  │Grant Perms │ │Revoke      │
└─────────────┘  └─────────────┘  └─────────────┘ └─────────────┘
       │                 │                 │          │
       └─────────────────┴─────────────────┴──────────┘
                          │
                          ▼
                 ┌─────────────┐
                 │Audit Logs   │
                 └─────────────┘
```

---

## 11. Best Practices

### 11.1 Organizer Best Practices
- Complete KYC verification before creating events
- Verify bank details for payouts
- Use clear event descriptions
- Set appropriate pricing
- Monitor bookings regularly
- Respond to customer queries
- Maintain high event quality

### 11.2 Super Admin Best Practices
- Follow principle of least privilege
- Delegate permissions carefully
- Monitor admin activities
- Review audit logs regularly
- Maintain security standards
- Document permission changes
- Provide admin training
- Handle escalations promptly

### 11.3 System Best Practices
- Regular security audits
- Keep dependencies updated
- Monitor system performance
- Implement rate limiting
- Use environment variables for secrets
- Regular database backups
- Implement monitoring and alerting
- Document all changes

---

## 12. Troubleshooting

### 12.1 Common Issues

**Organizer cannot publish events:**
- Check KYC verification status
- Verify account is active
- Check event submission status
- Review admin approval queue

**Admin cannot access features:**
- Verify admin account is active
- Check permission assignments
- Review delegation status
- Check token validity

**Permission not working:**
- Verify permission exists in database
- Check user/group assignments
- Review permission cache
- Check middleware configuration

### 12.2 Debug Steps

1. Check authentication status
2. Verify role assignment
3. Review permission grants
4. Check audit logs
5. Test with different users
6. Review database records
7. Check middleware logs
8. Verify token validity

---

## 13. Future Enhancements

### 13.1 Planned Features
- Two-factor authentication
- Biometric authentication
- Advanced analytics dashboard
- Real-time notifications
- Mobile app support
- API rate limiting
- Advanced audit reporting
- Compliance automation

### 13.2 Scalability Improvements
- Database sharding
- Caching layer optimization
- Load balancing
- CDN integration
- Microservices architecture
- Event-driven architecture
- Real-time sync
- Geographic distribution

---

## 14. Conclusion

This architecture provides a robust, secure, and scalable foundation for the Buizz platform's organizer and super admin workflows. The role-based access control system ensures proper authorization, while the comprehensive audit logging maintains security compliance. The system is designed to handle growth while maintaining performance and security standards.

The separation of concerns between organizers, admins, and super admins ensures that each role has appropriate access to platform features while maintaining security boundaries. The permission system allows for granular control and flexible delegation of administrative tasks.

---

## Appendix A: Quick Reference

### A.1 Role Hierarchy
```
Super Admin (highest)
    ↓
Admin
    ↓
Organizer
    ↓
Customer / Influencer / Check-in Staff
```

### A.2 Permission Categories
- User Management
- Event Management
- Ticket Management
- Payment Management
- Organization Management
- Admin Operations
- Analytics
- Permission Management

### A.3 Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Server Error

---

*Document Version: 1.0*
*Last Updated: July 2026*
*Maintained By: Buizz Development Team*
