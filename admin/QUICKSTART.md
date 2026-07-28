# Admin App - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
cd admin
npm install
```

### Step 2: Start the App
```bash
npm run dev
```

✅ App running at: `http://localhost:5001`

---

## 🧪 Test with Postman

### 1. Register Super Admin
```http
POST http://localhost:5001/api/v1/auth/register

{
  "name": "Super Admin",
  "email": "superadmin@buizz.com",
  "password": "admin123",
  "role": "super_admin",
  "adminSecret": "change-this-admin-secret"
}
```

### 2. Login
```http
POST http://localhost:5001/api/v1/auth/login

{
  "email": "superadmin@buizz.com",
  "password": "admin123"
}
```

**Copy the `token` from response**

### 3. Get Profile
```http
GET http://localhost:5001/api/v1/auth/profile
Authorization: Bearer <your_token>
```

### 4. View All Users
```http
GET http://localhost:5001/api/v1/users
Authorization: Bearer <your_token>
```

### 5. View Approvals
```http
GET http://localhost:5001/api/v1/approvals
Authorization: Bearer <your_token>
```

### 6. Dashboard Analytics
```http
GET http://localhost:5001/api/v1/analytics/dashboard
Authorization: Bearer <your_token>
```

---

## ✅ Complete Workflow Test

1. **Register organizer in main app** (port 5000)
2. **Organizer creates event** → approval request created
3. **Admin approves** in admin app (port 5001):
   ```http
   POST http://localhost:5001/api/v1/approvals/1/admin-review
   Authorization: Bearer <admin_token>
   
   {
     "status": "approved",
     "comments": "Looks good"
   }
   ```
4. **Super admin approves**:
   ```http
   POST http://localhost:5001/api/v1/approvals/1/super-admin-review
   Authorization: Bearer <super_admin_token>
   
   {
     "status": "approved",
     "comments": "Final approval"
   }
   ```
5. **Event created!**

---

## 🔑 Default Credentials

**Admin Secret:** `change-this-admin-secret`  
**Port:** `5001`  
**Database:** `u943298757_buizz` (shared with main app)

---

## 📦 What's Included

✅ Authentication (JWT)  
✅ User Management  
✅ RBAC (Permissions & Groups)  
✅ Event Approval System  
✅ Analytics Dashboard  
✅ Audit Logging  

---

## 🛠️ Useful Commands

```bash
# Development
npm run dev

# Production
npm start

# PM2
npm run pm2:start
npm run pm2:logs
npm run pm2:restart

# Docker
npm run docker:build
npm run docker:up
```

---

## 📍 All Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/register` | POST | Register admin |
| `/api/v1/auth/login` | POST | Login |
| `/api/v1/users` | GET | List users |
| `/api/v1/rbac/permissions` | GET | List permissions |
| `/api/v1/rbac/groups` | GET | List groups |
| `/api/v1/approvals` | GET | List approvals |
| `/api/v1/approvals/:id/admin-review` | POST | Admin approval |
| `/api/v1/approvals/:id/super-admin-review` | POST | Super admin approval |
| `/api/v1/events` | GET/POST | Event management |
| `/api/v1/analytics/dashboard` | GET | Dashboard stats |

---

## ⚡ Pro Tips

1. Use **Postman Environment Variables** for tokens
2. Admin app runs on **port 5001**, main app on **port 5000**
3. Both apps share the **same database**
4. Admin can create events **without approval**
5. Organizers need **dual approval** (admin + super_admin)

---

## 🐛 Troubleshooting

**Port 5001 already in use:**
```bash
lsof -i :5001
kill -9 <PID>
```

**Database connection failed:**
- Ensure MySQL is running
- Check `.env` credentials

**Token expired:**
- Login again to get new token
- Use refresh token endpoint

---

## 🎯 Next Steps

1. ✅ Start admin app: `npm run dev`
2. ✅ Register super admin
3. ✅ Test approval workflow
4. ✅ Deploy to production

**Full Documentation:** See [README.md](./README.md)
