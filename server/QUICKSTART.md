# 🚀 Buizz Backend - Quick Start Guide

## ✅ What's Been Created

### Complete Backend Structure
```
✅ 13 Modules (auth, users, events, tickets, payments, etc.)
✅ MongoDB & Redis connections
✅ BullMQ queue system
✅ Socket.io real-time system
✅ JWT authentication with refresh tokens
✅ RBAC authorization
✅ Error handling & logging
✅ Rate limiting & security
✅ Docker configuration
✅ Production-ready architecture
```

## 📦 Installation Steps

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Setup Environment
```bash
# Copy the example env file
copy .env.example .env

# Edit .env and add your credentials:
# - MongoDB URI
# - Redis credentials
# - JWT secrets
# - Razorpay keys
# - Cloudinary credentials
```

### 3. Start Services

#### Option A: Local Development
```bash
# Make sure MongoDB and Redis are running locally
npm run dev
```

#### Option B: Docker (Recommended)
```bash
# Starts MongoDB, Redis, and the app
docker-compose up -d

# View logs
docker-compose logs -f app
```

## 🧪 Test the API

### Health Check
```bash
curl http://localhost:5000/health
```

### Register User
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

## 📁 Module Status

### ✅ Fully Implemented
- **Auth Module**: Register, login, logout, JWT, email verification, password reset
- **Users Module**: User model, repository with CRUD operations
- **Events Module**: Full CRUD, slug-based URLs, real-time updates, search & filters
- **Core Infrastructure**: DB connections, queues, sockets, middleware

### 🚧 Ready for Implementation (Models Created)
- **Tickets**: Model created, needs service & controller
- **Payments**: Model created, needs Razorpay integration
- **Organizations**: Model created, needs full CRUD
- **Influencer**: Placeholder routes
- **Digital Products**: Placeholder routes
- **Analytics**: Placeholder routes
- **WhatsApp**: Placeholder routes
- **Notifications**: Placeholder routes
- **QR**: Placeholder routes
- **Admin**: Placeholder routes

## 🏗️ Architecture Highlights

### Layered Architecture
```
Controller (HTTP) → Service (Business Logic) → Repository (Database)
```

### Key Features
- **Modular Design**: Each module is self-contained
- **Redis Caching**: Fast API responses
- **BullMQ Queues**: Background job processing
- **Socket.io**: Real-time event updates
- **JWT Auth**: Secure authentication
- **RBAC**: Role-based access control
- **Rate Limiting**: API protection
- **Error Handling**: Centralized error management
- **Logging**: Winston logger with file rotation

## 📝 Next Implementation Steps

### Priority 1: Payment & Ticketing
1. Implement Razorpay payment service
2. Create ticket generation with QR codes
3. Add payment webhook handler
4. Implement ticket validation

### Priority 2: Organizations
1. Complete organization CRUD
2. Add member management
3. Implement organization verification

### Priority 3: Analytics & Notifications
1. Track event views and bookings
2. Implement email notifications
3. Add WhatsApp integration
4. Create notification queue workers

## 🔧 Development Tips

### Adding a New Module
1. Create folder in `src/modules/[module-name]/`
2. Add: model, controller, service, repository, routes
3. Register routes in `src/app.js`
4. Follow existing patterns (auth, events)

### Database Queries
- Always use repositories for DB operations
- Use `.lean()` for read-only queries (performance)
- Add indexes for frequently queried fields

### Business Logic
- Keep controllers thin (just request/response)
- Put all business logic in services
- Use repositories for database operations

### Error Handling
```javascript
throw new AppError('Error message', statusCode);
```

## 📚 Documentation

- API docs: See README.md
- Architecture: See project vision document
- Environment: See .env.example

## 🐛 Troubleshooting

### MongoDB Connection Error
- Check MongoDB is running
- Verify MONGODB_URI in .env

### Redis Connection Error
- Check Redis is running
- Verify REDIS_HOST and REDIS_PORT

### Port Already in Use
- Change PORT in .env
- Or kill process using port 5000

## 🎯 Production Checklist

Before deploying:
- [ ] Update all secrets in .env
- [ ] Set NODE_ENV=production
- [ ] Configure MongoDB Atlas
- [ ] Configure Redis Cloud
- [ ] Set up Cloudinary
- [ ] Configure Razorpay
- [ ] Enable HTTPS
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Set up CI/CD

---

**Ready to build! 🚀**

For questions or issues, refer to the main README.md or architecture documentation.
