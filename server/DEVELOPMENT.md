# 👨‍💻 Development Workflow Guide

## 🎯 How to Add a New Feature

### Example: Implementing the Payments Module

#### Step 1: Model (Already Created ✅)
```javascript
// src/modules/payments/payment.model.js
// Already exists with Razorpay fields
```

#### Step 2: Create Repository
```javascript
// src/modules/payments/payment.repository.js
const Payment = require('./payment.model');

const create = async (paymentData) => {
  return await Payment.create(paymentData);
};

const findByOrderId = async (orderId) => {
  return await Payment.findOne({ orderId }).lean();
};

// ... more methods

module.exports = { create, findByOrderId };
```

#### Step 3: Create Service (Business Logic)
```javascript
// src/modules/payments/payment.service.js
const Razorpay = require('razorpay');
const paymentRepository = require('./payment.repository');
const { AppError } = require('../../middleware/errorHandler');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const createOrder = async (eventId, userId, amount) => {
  const order = await razorpay.orders.create({
    amount: amount * 100, // Convert to paise
    currency: 'INR'
  });

  const payment = await paymentRepository.create({
    userId,
    eventId,
    orderId: order.id,
    amount,
    status: 'pending'
  });

  return { order, payment };
};

module.exports = { createOrder };
```

#### Step 4: Create Controller (HTTP Layer)
```javascript
// src/modules/payments/payment.controller.js
const paymentService = require('./payment.service');

const createOrder = async (req, res, next) => {
  try {
    const result = await paymentService.createOrder(
      req.body.eventId,
      req.user.id,
      req.body.amount
    );
    res.status(201).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { createOrder };
```

#### Step 5: Update Routes
```javascript
// src/modules/payments/payment.routes.js
const express = require('express');
const paymentController = require('./payment.controller');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.post('/create-order', paymentController.createOrder);

module.exports = router;
```

## 🔄 Request Flow

```
1. Client Request
   ↓
2. Express Middleware (auth, validation, rate limiting)
   ↓
3. Route Handler
   ↓
4. Controller (thin layer, just req/res)
   ↓
5. Service (business logic)
   ↓
6. Repository (database operations)
   ↓
7. Database (MongoDB/Redis)
   ↓
8. Response back through layers
```

## 🛠️ Common Development Tasks

### Adding Authentication to a Route
```javascript
const { authenticate, authorize } = require('../../middleware/auth');
const { USER_ROLES } = require('../../constants');

// Public route
router.get('/public', controller.method);

// Authenticated route
router.get('/protected', authenticate, controller.method);

// Role-based route
router.post('/admin-only', 
  authenticate, 
  authorize(USER_ROLES.ADMIN), 
  controller.method
);
```

### Adding Validation
```javascript
// Create validator
const { body } = require('express-validator');

const createEventSchema = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('startDate').isISO8601().withMessage('Valid date required')
];

// Use in route
const { validateRequest } = require('../../validators');

router.post('/', 
  validateRequest(createEventSchema), 
  controller.createEvent
);
```

### Using Redis Cache
```javascript
const { getRedisClient } = require('../../database/redis');

const getCachedData = async (key) => {
  const redis = getRedisClient();
  const cached = await redis.get(key);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from database
  const data = await fetchFromDB();
  
  // Cache for 1 hour
  await redis.setEx(key, 3600, JSON.stringify(data));
  
  return data;
};
```

### Adding Background Job
```javascript
const { emailQueue } = require('../../queues');

// Add job to queue
await emailQueue.add('welcome', {
  to: user.email,
  subject: 'Welcome to Buizz',
  template: 'welcome'
});
```

### Emitting Socket Events
```javascript
const { getIO } = require('../../sockets');

// Emit to specific room
const io = getIO();
io.to(`event:${eventId}`).emit('ticket:sold', {
  eventId,
  availableSeats: event.availableSeats
});
```

### Error Handling
```javascript
const { AppError } = require('../../middleware/errorHandler');

// Throw operational error
if (!user) {
  throw new AppError('User not found', 404);
}

// Errors are automatically caught by error middleware
```

## 📋 Code Checklist

Before committing code, ensure:

- [ ] Business logic is in service, not controller
- [ ] Database operations are in repository
- [ ] Input validation is added
- [ ] Authentication/authorization is applied
- [ ] Error handling is implemented
- [ ] Appropriate HTTP status codes used
- [ ] No sensitive data in logs
- [ ] Database queries use indexes
- [ ] Expensive operations use queues
- [ ] Real-time updates use Socket.io
- [ ] Cache frequently accessed data
- [ ] Follow existing code patterns

## 🧪 Testing Endpoints

### Using cURL
```bash
# Register
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"password123"}'

# Login and save token
TOKEN=$(curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}' \
  | jq -r '.data.token')

# Use token
curl -X GET http://localhost:5000/api/v1/events \
  -H "Authorization: Bearer $TOKEN"
```

### Using Postman
1. Create environment with `baseUrl` = `http://localhost:5000`
2. Add `token` variable
3. Set Authorization header: `Bearer {{token}}`

## 🐛 Debugging Tips

### Check Logs
```bash
# Development logs (console)
npm run dev

# Production logs (files)
tail -f logs/combined.log
tail -f logs/error.log
```

### MongoDB Queries
```javascript
// Enable query logging
mongoose.set('debug', true);
```

### Redis Commands
```bash
# Connect to Redis CLI
redis-cli

# Check keys
KEYS *

# Get value
GET key_name

# Check queue
LRANGE bull:emailQueue:wait 0 -1
```

## 🚀 Performance Tips

1. **Use Lean Queries**: `.lean()` for read-only operations
2. **Add Indexes**: On frequently queried fields
3. **Cache Aggressively**: Use Redis for hot data
4. **Use Queues**: For heavy operations
5. **Paginate Results**: Always limit query results
6. **Use Projections**: Select only needed fields
7. **Avoid N+1 Queries**: Use populate wisely

## 📚 Useful Commands

```bash
# Install dependencies
npm install

# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Docker commands
docker-compose up -d
docker-compose logs -f
docker-compose down

# MongoDB commands
mongosh
use buizz
db.users.find()

# Redis commands
redis-cli
KEYS *
```

## 🎓 Learning Resources

- **Express.js**: https://expressjs.com/
- **Mongoose**: https://mongoosejs.com/
- **Redis**: https://redis.io/docs/
- **BullMQ**: https://docs.bullmq.io/
- **Socket.io**: https://socket.io/docs/
- **JWT**: https://jwt.io/

---

**Happy Coding! 🎉**
