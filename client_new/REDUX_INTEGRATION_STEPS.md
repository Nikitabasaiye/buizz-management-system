# Redux Toolkit + RTK Query Integration

## Step 1: Install Dependencies
```bash
npm install @reduxjs/toolkit react-redux
```

## Step 2: Project Structure
```
src/
├── store/
│   ├── index.ts                 # Redux store configuration
│   ├── api/
│   │   ├── baseApi.ts          # RTK Query base API
│   │   ├── authApi.ts          # Auth endpoints
│   │   ├── eventsApi.ts        # Events endpoints
│   │   ├── bookingsApi.ts      # Bookings endpoints
│   │   ├── paymentsApi.ts      # Payments endpoints
│   │   ├── ticketsApi.ts       # Tickets endpoints
│   │   └── usersApi.ts         # Users endpoints
│   └── slices/
│       ├── authSlice.ts        # Auth state (replaces Zustand)
│       ├── eventSlice.ts       # Event state (replaces Zustand)
│       └── bookingSlice.ts     # Booking state (replaces Zustand)
```

## Step 3: Update Providers
- Wrap app with Redux Provider
- Keep existing Zustand stores for backward compatibility (can be phased out gradually)

## Step 4: Backend API Structure
Base URL: http://localhost:5000/api/v1

### Endpoints:
- Auth: /auth/* (register, login, logout, refresh-token, verify-email, forgot-password, reset-password)
- Events: /events/* (GET all, GET by id, GET by slug, POST create, PUT update, DELETE, PATCH publish)
- Bookings: /bookings/* (GET user bookings, POST initiate, GET verify/:orderId, GET details/:orderId)
- Payments: /payments/* (POST create, GET verify/:orderId, GET status/:orderId, POST refund, POST phonepe/webhook)
- Tickets: /tickets/* (GET my-tickets, GET :ticketNumber, POST scan, POST cancel, GET event/:eventId)
- Users: /users/*
- Organizations: /organizations/*
