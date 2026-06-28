# Project Structure - Redux Integration

## Complete File Tree

```
client_new/
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── (admin)/                   # Admin routes
│   │   ├── (customer)/                # Customer routes
│   │   ├── (organizer)/               # Organizer routes
│   │   └── (public)/                  # Public routes
│   │
│   ├── store/                         # State Management ⭐ NEW
│   │   ├── api/                       # RTK Query APIs
│   │   │   ├── baseApi.ts            # Base API configuration
│   │   │   ├── authApi.ts            # Auth endpoints
│   │   │   ├── eventsApi.ts          # Events endpoints
│   │   │   ├── bookingsApi.ts        # Bookings endpoints
│   │   │   ├── paymentsApi.ts        # Payments endpoints
│   │   │   ├── ticketsApi.ts         # Tickets endpoints
│   │   │   ├── usersApi.ts           # Users endpoints
│   │   │   └── index.ts              # Barrel export
│   │   │
│   │   ├── slices/                    # Redux Slices
│   │   │   ├── authSlice.ts          # Auth state
│   │   │   ├── eventSlice.ts         # Event state
│   │   │   ├── bookingSlice.ts       # Booking state
│   │   │   └── index.ts              # Barrel export
│   │   │
│   │   ├── reduxStore.ts             # Redux store config ⭐
│   │   ├── authStore.ts              # Zustand (legacy)
│   │   ├── eventStore.ts             # Zustand (legacy)
│   │   ├── bookingStore.ts           # Zustand (legacy)
│   │   └── index.ts                  # Main exports
│   │
│   ├── providers/                     # React Providers
│   │   ├── ReduxProvider.tsx         # Redux Provider ⭐ NEW
│   │   ├── GlobalProviders.tsx       # Updated with Redux ⭐
│   │   ├── AuthProvider.tsx          # Auth context
│   │   ├── QueryProvider.tsx         # React Query
│   │   ├── ThemeProvider.tsx         # Theme
│   │   └── ToastProvider.tsx         # Toasts
│   │
│   ├── components/                    # React Components
│   │   ├── booking/                   # Booking components
│   │   ├── common/                    # Shared components
│   │   ├── dashboard/                 # Dashboard components
│   │   ├── event/                     # Event components
│   │   ├── layouts/                   # Layout components
│   │   ├── profile/                   # Profile components
│   │   └── ui/                        # UI primitives
│   │
│   ├── services/                      # API Services (legacy)
│   │   ├── api.ts                     # Axios instance
│   │   ├── auth.api.ts                # Auth service
│   │   ├── events.api.ts              # Events service
│   │   ├── booking.api.ts             # Booking service
│   │   └── payment.api.ts             # Payment service
│   │
│   ├── types/                         # TypeScript Types
│   │   ├── api.ts                     # API types
│   │   ├── auth.ts                    # Auth types
│   │   ├── booking.ts                 # Booking types
│   │   ├── event.ts                   # Event types
│   │   └── user.ts                    # User types
│   │
│   ├── hooks/                         # Custom Hooks
│   │   └── useMounted.ts
│   │
│   ├── utils/                         # Utility Functions
│   │   └── formatCurrency.ts
│   │
│   └── styles/                        # Global Styles
│       ├── globals.css
│       ├── themes.css
│       └── tokens.css
│
├── public/                            # Static Assets
│
├── package.json                       # Dependencies
├── .env.local                         # Environment Variables
├── tsconfig.json                      # TypeScript Config
├── tailwind.config.ts                 # Tailwind Config
├── next.config.mjs                    # Next.js Config
│
├── SETUP.md                           # Setup Instructions
├── REDUX_INTEGRATION_STEPS.md        # Integration Steps ⭐ NEW
├── REDUX_USAGE_EXAMPLES.md           # Usage Examples ⭐ NEW
├── MIGRATION_GUIDE.md                # Migration Guide ⭐ NEW
└── REDUX_INTEGRATION_SUMMARY.md      # Integration Summary ⭐ NEW
```

## Backend Structure

```
server/
├── src/
│   ├── config/
│   │   ├── phonepe.js                 # PhonePe config
│   │   └── permissions.js
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.js     # Auth handlers
│   │   │   ├── auth.routes.js         # Auth routes
│   │   │   ├── auth.service.js        # Auth logic
│   │   │   └── auth.validator.js      # Validation
│   │   │
│   │   ├── events/
│   │   │   ├── event.controller.js    # Event handlers
│   │   │   ├── event.routes.js        # Event routes
│   │   │   ├── event.service.js       # Event logic
│   │   │   └── event.repository.js    # DB queries
│   │   │
│   │   ├── bookings/
│   │   │   ├── booking.controller.js  # Booking handlers
│   │   │   ├── booking.routes.js      # Booking routes
│   │   │   ├── booking.service.js     # Booking logic
│   │   │   └── booking.validator.js   # Validation
│   │   │
│   │   ├── payments/
│   │   │   ├── payment.controller.js  # Payment handlers
│   │   │   ├── payment.routes.js      # Payment routes
│   │   │   └── payment.validator.js   # Validation
│   │   │
│   │   ├── tickets/
│   │   │   ├── ticket.controller.js   # Ticket handlers
│   │   │   ├── ticket.routes.js       # Ticket routes
│   │   │   ├── ticket.service.js      # Ticket logic
│   │   │   └── ticket.repository.js   # DB queries
│   │   │
│   │   └── users/
│   │       ├── user.controller.js     # User handlers
│   │       ├── user.routes.js         # User routes
│   │       ├── user.service.js        # User logic
│   │       └── user.repository.js     # DB queries
│   │
│   ├── services/
│   │   ├── phonepe.service.js         # PhonePe integration
│   │   ├── pdf.service.js             # PDF generation
│   │   └── whatsapp.service.js        # WhatsApp service
│   │
│   ├── middleware/
│   │   ├── auth.js                    # Auth middleware
│   │   ├── rbac.js                    # RBAC middleware
│   │   └── errorHandler.js            # Error handling
│   │
│   ├── utils/
│   │   ├── orderId.js                 # Order ID generator
│   │   └── logger.js                  # Logger
│   │
│   └── app.js                         # Express app
│
├── database/
│   └── test_data.sql                  # Test data
│
├── .env                               # Environment vars
├── package.json
└── server.js                          # Entry point
```

## API Routes Mapping

### Frontend → Backend

```
Frontend Hook                          Backend Route
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Authentication
useLoginMutation()                  →  POST   /api/v1/auth/login
useRegisterMutation()               →  POST   /api/v1/auth/register
useLogoutMutation()                 →  POST   /api/v1/auth/logout
useForgotPasswordMutation()         →  POST   /api/v1/auth/forgot-password
useResetPasswordMutation()          →  POST   /api/v1/auth/reset-password/:token

Events
useGetEventsQuery()                 →  GET    /api/v1/events
useGetEventByIdQuery()              →  GET    /api/v1/events/:id
useGetEventBySlugQuery()            →  GET    /api/v1/events/slug/:slug
useCreateEventMutation()            →  POST   /api/v1/events
useUpdateEventMutation()            →  PUT    /api/v1/events/:id
useDeleteEventMutation()            →  DELETE /api/v1/events/:id
usePublishEventMutation()           →  PATCH  /api/v1/events/:id/publish

Bookings
useGetUserBookingsQuery()           →  GET    /api/v1/bookings
useInitiateBookingMutation()        →  POST   /api/v1/bookings/initiate
useVerifyPaymentQuery()             →  GET    /api/v1/bookings/verify/:orderId
useGetBookingDetailsQuery()         →  GET    /api/v1/bookings/:orderId

Payments
useCreatePaymentMutation()          →  POST   /api/v1/payments/create
useVerifyPaymentQuery()             →  GET    /api/v1/payments/verify/:orderId
useGetPaymentStatusQuery()          →  GET    /api/v1/payments/status/:orderId
useInitiateRefundMutation()         →  POST   /api/v1/payments/refund

Tickets
useGetMyTicketsQuery()              →  GET    /api/v1/tickets/my-tickets
useGetTicketByNumberQuery()         →  GET    /api/v1/tickets/:ticketNumber
useScanTicketMutation()             →  POST   /api/v1/tickets/:ticketNumber/scan
useCancelTicketMutation()           →  POST   /api/v1/tickets/:ticketNumber/cancel
useGetEventTicketsQuery()           →  GET    /api/v1/tickets/event/:eventId

Users
useGetProfileQuery()                →  GET    /api/v1/users/profile
useUpdateProfileMutation()          →  PUT    /api/v1/users/profile
useGetUserByIdQuery()               →  GET    /api/v1/users/:id
```

## Data Flow

```
User Action
    ↓
React Component
    ↓
RTK Query Hook (e.g., useLoginMutation)
    ↓
Redux Store (baseApi)
    ↓
HTTP Request with Token
    ↓
Backend API (Express)
    ↓
Controller → Service → Repository
    ↓
MySQL Database
    ↓
Response
    ↓
Redux Cache Updated
    ↓
Component Re-renders
    ↓
UI Updates
```

## State Management Flow

```
User Login
    ↓
useLoginMutation() called
    ↓
API request to /auth/login
    ↓
Response received
    ↓
authSlice extraReducer updates state
    ↓
{
  auth: {
    user: { id, name, email, role },
    token: "jwt_token",
    isAuthenticated: true
  }
}
    ↓
Token automatically added to all future requests
    ↓
Protected routes accessible
```

## Cache Management

```
Query/Mutation                      Cache Tags              Invalidates
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
useGetEventsQuery()                ['Events']               -
useCreateEventMutation()           -                       ['Events']
useUpdateEventMutation()           -                       ['Events', id]
useDeleteEventMutation()           -                       ['Events']

useInitiateBookingMutation()       -                       ['Bookings', 'Payments']
useGetUserBookingsQuery()          ['Bookings']             -

useCreatePaymentMutation()         -                       ['Payments']
useInitiateRefundMutation()        -                       ['Payments', 'Bookings']

useGetMyTicketsQuery()             ['Tickets']              -
useScanTicketMutation()            -                       ['Tickets', id]
```

## Environment Configuration

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

### Backend (.env)
```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=buizz_events

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# PhonePe
PHONEPE_MERCHANT_ID=M22V5Y6OTVZY0
PHONEPE_SALT_KEY=705d48c5-ef76-45fc-b9f0-5d172c9acad4
PHONEPE_SALT_INDEX=1
PHONEPE_API_URL=https://api.phonepe.com/apis/hermes
PHONEPE_CHECKOUT_URL=https://api.phonepe.com/apis/hermes/pg/v1/pay

# Server
PORT=5000
NODE_ENV=development
API_VERSION=v1
FRONTEND_URL=http://localhost:3000
```

## Redux DevTools

Install browser extension to debug:
- Chrome: Redux DevTools Extension
- Firefox: Redux DevTools Extension

Features:
- View all API requests
- Inspect cached data
- Track state changes
- Time-travel debugging
- Export/import state

## Quick Start Commands

### Backend
```bash
cd server
npm install
npm start
# Runs on http://localhost:5000
```

### Frontend
```bash
cd client_new
npm install
npm run dev
# Runs on http://127.0.0.1:3000
```

## Testing Checklist

- [ ] Backend server running (http://localhost:5000)
- [ ] Frontend running (http://127.0.0.1:3000)
- [ ] .env.local file created with NEXT_PUBLIC_API_URL
- [ ] Redux DevTools extension installed
- [ ] Test login flow
- [ ] Test event listing
- [ ] Test booking flow
- [ ] Test payment initiation
- [ ] Check Redux DevTools for API calls
- [ ] Verify token in request headers

---

**Integration Status**: ✅ Complete and Ready for Development
