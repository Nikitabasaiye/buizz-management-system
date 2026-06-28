# Buizz Admin Application

Standalone admin & super_admin management application for **admin.buizz.com**

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd admin
npm install
```

### 2. Configure Environment
Update `.env` file with your configuration (already created with defaults)

### 3. Run Database Migrations
```bash
# From server directory
mysql -u root -p buizz_management < database/approval_system_migration.sql
mysql -u root -p buizz_management < database/rbac_user_groups_migration.sql
```

### 4. Start Application
```bash
# Development
npm run dev

# Production
npm start
```

**Access:** `http://localhost:5001`

---

## 📁 Project Structure

```
admin/
├── src/
│   ├── modules/
│   │   ├── auth/              # Admin authentication
│   │   ├── users/             # User management
│   │   ├── rbac/              # Permissions & groups
│   │   ├── approvals/         # Event approvals
│   │   ├── events/            # Event management
│   │   ├── organizations/     # Organization management
│   │   ├── analytics/         # Analytics & reports
│   │   ├── bookings/          # Booking management
│   │   └── payments/          # Payment management
│   ├── middleware/            # Auth, RBAC, security
│   ├── utils/                 # Helpers & utilities
│   ├── services/              # Business logic
│   ├── database/              # MySQL & Redis
│   ├── config/                # Configuration files
│   └── app.js                 # Express app setup
├── logs/                      # Application logs
├── server.js                  # Entry point
├── package.json
├── .env                       # Environment variables
├── .gitignore
└── README.md
```

---

## 🔐 Authentication

### Register Admin/Super Admin

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "Admin User",
  "email": "admin@buizz.com",
  "password": "admin123",
  "role": "admin",
  "adminSecret": "change-this-admin-secret"
}
```

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@buizz.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "name": "Admin User",
      "email": "admin@buizz.com",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Use token in subsequent requests:**
```
Authorization: Bearer <token>
```

---

## 📍 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register admin/super_admin
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/profile` - Get profile
- `PUT /api/v1/auth/profile` - Update profile

### User Management
- `GET /api/v1/users` - List all users
- `GET /api/v1/users/:id` - Get user details
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Deactivate user

### RBAC (Permissions & Groups)
- `GET /api/v1/rbac/permissions` - List all permissions
- `GET /api/v1/rbac/permissions/user/:userId` - Get user permissions
- `POST /api/v1/rbac/permissions/assign` - Assign permission
- `DELETE /api/v1/rbac/permissions/revoke` - Revoke permission
- `GET /api/v1/rbac/groups` - List groups
- `POST /api/v1/rbac/groups` - Create group
- `POST /api/v1/rbac/groups/:groupId/members` - Add member
- `DELETE /api/v1/rbac/groups/:groupId/members/:userId` - Remove member

### Event Approvals
- `GET /api/v1/approvals` - List all approval requests
- `GET /api/v1/approvals/stats` - Approval statistics
- `GET /api/v1/approvals/my-requests` - My requests
- `GET /api/v1/approvals/:id` - Get specific request
- `POST /api/v1/approvals/:id/admin-review` - Admin approval/rejection
- `POST /api/v1/approvals/:id/super-admin-review` - Super admin approval/rejection

### Event Management
- `GET /api/v1/events` - List events
- `GET /api/v1/events/:id` - Get event details
- `POST /api/v1/events` - Create event (no approval needed)
- `PUT /api/v1/events/:id` - Update event
- `DELETE /api/v1/events/:id` - Delete event

### Analytics
- `GET /api/v1/analytics/dashboard` - Dashboard overview
- `GET /api/v1/analytics/revenue` - Revenue analytics

### Organizations
- `GET /api/v1/organizations` - List organizations

### Bookings
- `GET /api/v1/bookings` - List bookings

### Payments
- `GET /api/v1/payments` - List payments

---

## 🔧 Environment Variables

```env
# Server
NODE_ENV=development
ADMIN_PORT=5001
API_VERSION=v1

# CORS
ADMIN_FRONTEND_URL=http://localhost:3001

# Database (shared with main app)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=buizz_management
MYSQL_USER=root
MYSQL_PASSWORD=

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Admin
ADMIN_REGISTRATION_SECRET=change-this-admin-secret

# Email
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=contact@buizz.com
SMTP_PASS=Indiabuizz@12345
SMTP_SECURE=true
```

---

## 🌐 Production Deployment

### Deploy to admin.buizz.com

1. **Clone Repository**
```bash
git clone <repo-url>
cd buizz_management_system/admin
```

2. **Install Dependencies**
```bash
npm install --production
```

3. **Configure Environment**
```bash
cp .env.example .env
nano .env  # Update with production values
```

4. **Start with PM2**
```bash
npm install -g pm2
pm2 start server.js --name buizz-admin-app
pm2 save
pm2 startup
```

5. **Configure Nginx**
```nginx
server {
    listen 80;
    server_name admin.buizz.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.buizz.com;

    ssl_certificate /etc/letsencrypt/live/admin.buizz.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.buizz.com/privkey.pem;

    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        root /var/www/admin.buizz.com/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

6. **SSL Certificate**
```bash
sudo certbot --nginx -d admin.buizz.com
```

---

## 🧪 Testing

### Postman Collection

Import and test all endpoints using Postman:

1. Register super_admin
2. Login and get token
3. Test user management endpoints
4. Test approval workflow
5. Test RBAC endpoints

---

## 🔒 Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Rate limiting
- Helmet.js security headers
- CORS configuration
- Input validation with Joi
- Password hashing with bcrypt
- SQL injection prevention
- XSS protection

---

## 📊 Database

**Shared with main application:**
- MySQL for persistent storage
- Redis for caching & sessions

**Tables used:**
- users
- events
- event_approval_requests
- permissions
- user_groups
- user_group_members
- user_group_permissions
- user_permissions
- bookings
- payments

---

## 🛠️ Development

### Run in Development Mode
```bash
npm run dev
```

### View Logs
```bash
tail -f logs/admin-app.log
```

### PM2 Commands
```bash
pm2 logs buizz-admin-app
pm2 restart buizz-admin-app
pm2 stop buizz-admin-app
```

---

## 📝 Features

✅ Admin & Super Admin authentication  
✅ User management (CRUD)  
✅ RBAC with 52 granular permissions  
✅ Event approval workflow (dual approval)  
✅ Direct event creation for admins  
✅ Analytics dashboard  
✅ User groups & permission delegation  
✅ Audit logging  
✅ Real-time statistics  

---

## 🤝 Support

**Technical Support:** devops@buizz.com  
**Admin Access:** admin@buizz.com

---

## 📄 License

Proprietary - Buizz Management System
