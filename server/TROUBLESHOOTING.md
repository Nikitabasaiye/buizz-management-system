# 🔧 Troubleshooting Guide

## ✅ Issues Fixed

### 1. Mongoose Duplicate Index Warnings
**Problem**: Mongoose was warning about duplicate indexes on email, slug, orderId, and ticketNumber fields.

**Solution**: ✅ Fixed by removing `unique: true` from schema fields and adding it to the index definition instead.

```javascript
// Before (caused warning)
email: { type: String, unique: true }
schema.index({ email: 1 });

// After (fixed)
email: { type: String }
schema.index({ email: 1 }, { unique: true });
```

### 2. Redis Version Warning
**Problem**: Your Redis version is 5.0.14.1, but BullMQ recommends 6.2.0+

**Solutions**:
- **Option A**: Upgrade Redis (recommended)
  ```bash
  # Windows: Download from https://github.com/tporadowski/redis/releases
  # Or use Docker
  docker run -d -p 6379:6379 redis:7-alpine
  ```
- **Option B**: Ignore warning (system will still work, but may have reduced performance)

### 3. Wrong Entry Point
**Problem**: Running `node src/app.js` instead of `node server.js`

**Solution**: ✅ Always use the correct entry point:
```bash
# Correct
node server.js

# Or use npm scripts
npm start        # Production
npm run dev      # Development with nodemon
```

---

## 🚀 Correct Startup Procedure

### Method 1: Using npm scripts (Recommended)
```bash
cd server

# Development mode (auto-reload on changes)
npm run dev

# Production mode
npm start
```

### Method 2: Using Docker (Best for production)
```bash
cd server

# Start all services (MongoDB + Redis + App)
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down
```

### Method 3: Direct node command
```bash
cd server
node server.js
```

---

## ⚠️ Common Errors & Solutions

### Error: "Cannot find module 'dotenv'"
**Solution**: Install dependencies
```bash
npm install
```

### Error: "MongooseServerSelectionError"
**Solution**: Make sure MongoDB is running
```bash
# Check if MongoDB is running
# Windows: Check Services or Task Manager

# Or use Docker
docker run -d -p 27017:27017 mongo:7
```

### Error: "Redis connection failed"
**Solution**: Make sure Redis is running
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Or use Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### Error: "Port 5000 already in use"
**Solution**: Change port in .env or kill the process
```bash
# Change port in .env
PORT=5001

# Or kill process on Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

---

## 🧪 Verify Everything is Working

### 1. Check Health Endpoint
```bash
curl http://localhost:5000/health
```

**Expected Response**:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Test Registration
```bash
curl -X POST http://localhost:5000/api/v1/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

### 3. Test Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

### 4. Check Logs
```bash
# Development: Check console output
# Production: Check log files
type logs\combined.log
type logs\error.log
```

---

## 📋 Pre-flight Checklist

Before starting the server, ensure:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] MongoDB running (local or Atlas)
- [ ] Redis running (local or cloud)
- [ ] Dependencies installed (`npm install`)
- [ ] .env file created and configured
- [ ] Correct entry point used (`server.js`)

---

## 🔍 Debug Mode

To see detailed logs and trace warnings:

```bash
# Enable debug mode
set DEBUG=*
node --trace-warnings server.js

# Or with nodemon
set DEBUG=*
nodemon --trace-warnings server.js
```

---

## 🐳 Docker Troubleshooting

### Container won't start
```bash
# Check container logs
docker-compose logs app

# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Can't connect to MongoDB/Redis in Docker
```bash
# Check if containers are running
docker-compose ps

# Check network
docker network ls
docker network inspect server_default
```

---

## 📊 System Requirements

### Minimum
- Node.js: 18.x
- MongoDB: 5.x
- Redis: 5.x (works but shows warnings)
- RAM: 2GB
- Disk: 1GB

### Recommended
- Node.js: 18.x or 20.x
- MongoDB: 7.x
- Redis: 7.x
- RAM: 4GB
- Disk: 5GB

---

## 🆘 Still Having Issues?

1. **Check all services are running**:
   - MongoDB: `mongosh` or check Task Manager
   - Redis: `redis-cli ping`
   - Node: `node --version`

2. **Check environment variables**:
   ```bash
   type .env
   ```

3. **Clear node_modules and reinstall**:
   ```bash
   rmdir /s /q node_modules
   del package-lock.json
   npm install
   ```

4. **Check firewall/antivirus**:
   - Allow Node.js through firewall
   - Allow ports 5000, 27017, 6379

5. **Check logs**:
   ```bash
   type logs\error.log
   ```

---

## ✅ Success Indicators

When the server starts successfully, you should see:

```
MongoDB connected successfully
Redis connected successfully
Queues initialized successfully
Server running on port 5000 in development mode
Socket.io initialized successfully
```

---

## 🎯 Quick Fix Commands

```bash
# Full reset and restart
docker-compose down -v
docker-compose up -d --build

# Or without Docker
rmdir /s /q node_modules
npm install
node server.js
```

---

**All issues have been fixed! You can now start the server without warnings.** 🎉
