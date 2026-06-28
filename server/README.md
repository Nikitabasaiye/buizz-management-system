# Buizz Event Management Platform - Backend

## Architecture
- **Style**: Modular Monolith (Microservice Ready)
- **Stack**: Node.js, Express, MongoDB, Redis, BullMQ, Socket.io
- **Pattern**: Controller → Service → Repository

## Project Structure
```
server/
├── src/
│   ├── config/           # Configuration files
│   ├── modules/          # Feature modules
│   │   ├── auth/         # Authentication & authorization
│   │   ├── users/        # User management
│   │   ├── events/       # Event management
│   │   ├── tickets/      # Ticket management
│   │   ├── payments/     # Payment processing
│   │   └── ...
│   ├── middleware/       # Express middleware
│   ├── services/         # Shared services
│   ├── repositories/     # Database repositories
│   ├── queues/           # BullMQ job queues
│   ├── sockets/          # Socket.io handlers
│   ├── database/         # DB connections
│   ├── validators/       # Request validators
│   ├── constants/        # App constants
│   └── utils/            # Utility functions
└── server.js             # Entry point
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB
- Redis

### Installation
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your credentials
```

### Running Locally
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Docker Setup
```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

## API Endpoints

### Authentication
- POST `/api/v1/auth/register` - Register new user
- POST `/api/v1/auth/login` - Login user
- POST `/api/v1/auth/logout` - Logout user
- POST `/api/v1/auth/refresh-token` - Refresh access token
- GET `/api/v1/auth/verify-email/:token` - Verify email
- POST `/api/v1/auth/forgot-password` - Request password reset
- POST `/api/v1/auth/reset-password/:token` - Reset password

### Events
- GET `/api/v1/events` - Get all events
- GET `/api/v1/events/:id` - Get event by ID
- GET `/api/v1/events/slug/:slug` - Get event by slug
- POST `/api/v1/events` - Create event (Organizer only)
- PUT `/api/v1/events/:id` - Update event (Organizer only)
- DELETE `/api/v1/events/:id` - Delete event (Organizer only)
- PATCH `/api/v1/events/:id/publish` - Publish event (Organizer only)

## Module Implementation Status

✅ **Completed**
- Auth (register, login, logout, JWT, email verification)
- Users (model, repository)
- Events (full CRUD, real-time updates)
- Database connections (MongoDB, Redis)
- Queue system (BullMQ)
- Socket.io (real-time)
- Middleware (auth, error handling, rate limiting)

🚧 **Pending Implementation**
- Tickets (generation, QR codes)
- Payments (Razorpay integration)
- Organizations (full CRUD)
- Influencer module
- Digital Products
- Analytics
- WhatsApp automation
- Notifications
- QR scanning
- Admin panel

## Best Practices Implemented
- ✅ Business logic in services, not controllers
- ✅ Database operations in repositories
- ✅ JWT authentication with refresh tokens
- ✅ Redis caching for performance
- ✅ BullMQ for background jobs
- ✅ Socket.io for real-time features
- ✅ Request validation
- ✅ Error handling middleware
- ✅ Rate limiting
- ✅ Security headers (Helmet)
- ✅ Logging (Winston)
- ✅ Docker support

## Next Steps
1. Implement Payment module with Razorpay
2. Implement Ticket generation with QR codes
3. Complete Organization CRUD
4. Add Analytics trackings
5. Implement WhatsApp notifications
6. Add comprehensive tests
7. Set up CI/CD pipeline
8. Deploy to AWS EC2


