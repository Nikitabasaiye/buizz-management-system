# 🚀 Quick Reference Card

## Start Server

```bash
# Development (recommended)
npm run dev

# Production
npm start

# With Docker
docker-compose up -d
```

## Stop Server

```bash
# Ctrl+C in terminal

# Docker
docker-compose down
```

## Test Endpoints

```bash
# Health check
curl http://localhost:5000/health

# Register
curl -X POST http://localhost:5000/api/v1/auth/register -H "Content-Type: application/json" -d "{\"name\":\"John\",\"email\":\"john@test.com\",\"password\":\"password123\"}"

# Login
curl -X POST http://localhost:5000/api/v1/auth/login -H "Content-Type: application/json" -d "{\"email\":\"john@test.com\",\"password\":\"password123\"}"
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Port in use | Change PORT in .env |
| MongoDB error | Start MongoDB service |
| Redis error | Start Redis service |
| Module not found | Run `npm install` |

## File Locations

- Entry point: `server.js`
- Environment: `.env`
- Logs: `logs/`
- Modules: `src/modules/`

## Environment Variables

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/buizz
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
```

## Useful Commands

```bash
# Install dependencies
npm install

# Check logs
type logs\combined.log

# MongoDB shell
mongosh

# Redis CLI
redis-cli

# Check running processes
netstat -ano | findstr :5000
```
