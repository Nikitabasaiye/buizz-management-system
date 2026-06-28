# Buizz Event Booking Platform - Frontend Setup

## Technology Stack
- **Framework**: Next.js 15 (React)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **API Client**: Axios
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Icons**: Lucide React

## Setup Instructions

### 1. Install Dependencies

```bash
cd client_new
npm install
```

### 2. Create Environment Variables

Create `.env.local` file:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000

# App Configuration
NEXT_PUBLIC_APP_NAME=Buizz
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Analytics, etc.
```

### 3. Run Development Server

```bash
npm run dev
```

The app will run on: **http://127.0.0.1:3000**

### 4. Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
client_new/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (public)/             # Public pages (no auth)
│   │   ├── (customer)/           # Customer dashboard
│   │   ├── (organizer)/          # Organizer dashboard
│   │   └── (admin)/              # Admin dashboard
│   ├── components/               # Reusable components
│   │   ├── ui/                   # Base UI components
│   │   ├── common/               # Shared components
│   │   ├── event/                # Event-related components
│   │   ├── booking/              # Booking components
│   │   ├── profile/              # Profile components
│   │   └── layouts/              # Layout components
│   ├── features/                 # Feature modules
│   │   ├── auth/                 # Authentication
│   │   ├── events/               # Events
│   │   ├── booking/              # Booking flow
│   │   └── payments/             # Payments
│   ├── services/                 # API services
│   │   ├── api.ts                # Axios instance
│   │   ├── auth.api.ts           # Auth APIs
│   │   ├── events.api.ts         # Events APIs
│   │   └── booking.api.ts        # Booking APIs
│   ├── store/                    # Zustand stores
│   │   ├── auth.store.ts         # Auth state
│   │   ├── eventStore.ts         # Events state
│   │   └── bookingStore.ts       # Booking state
│   ├── providers/                # React Context providers
│   ├── hooks/                    # Custom hooks
│   ├── types/                    # TypeScript types
│   ├── utils/                    # Utility functions
│   ├── constants/                # Constants
│   └── styles/                   # Global styles
├── public/                       # Static assets
│   ├── images/                   # Images
│   ├── icons/                    # Icons
│   └── fonts/                    # Fonts
└── docs/                         # Documentation
```

## Available Pages

### Public Pages (No Authentication)
- `/` - Homepage
- `/events` - All events listing
- `/events/[id]` - Event details
- `/login` - User login
- `/signup` - User registration
- `/forgot-password` - Password reset
- `/about` - About page
- `/contact` - Contact page
- `/plays` - Plays/Theatre events
- `/activities` - Activities/Workshops

### Customer Dashboard (Authentication Required)
- `/profile` - User profile
- `/profile/bookings` - My bookings
- `/profile/tickets` - My tickets
- `/profile/wishlist` - Saved events
- `/profile/settings` - Account settings
- `/profile/notifications` - Notifications
- `/profile/passport` - Ticket passport

### Organizer Dashboard (Organizer Role)
- `/organizer/dashboard` - Organizer dashboard
- `/organizer/events` - Manage events
- `/organizer/create-event` - Create new event
- `/organizer/attendees` - View attendees
- `/organizer/analytics` - Event analytics
- `/organizer/payouts` - Payment history
- `/organizer/settings` - Organizer settings

### Admin Dashboard (Admin Role)
- `/admin/dashboard` - Admin overview
- `/admin/users` - User management
- `/admin/events` - Event management
- `/admin/bookings` - All bookings
- `/admin/payments` - Payment transactions
- `/admin/analytics` - Platform analytics
- `/admin/settings` - System settings

## API Integration

The frontend connects to backend API at `http://localhost:5000/api/v1`

### API Services Available

```typescript
// Auth
authApi.login(email, password)
authApi.register(userData)
authApi.logout()

// Events
eventsApi.getAll()
eventsApi.getById(id)
eventsApi.create(eventData)

// Booking
bookingApi.initiate(bookingData)
bookingApi.verifyPayment(orderId)

// User
userApi.getProfile()
userApi.updateProfile(data)
```

## Key Features

### Implemented ✅
- Homepage with event discovery
- Event listing and filtering
- Event details page
- User authentication (login/signup)
- Responsive design
- Dark/Light theme toggle
- Multiple user roles (Customer, Organizer, Admin)
- Routing for all dashboards

### Pending Implementation ⏳
- Booking flow integration with backend
- Payment gateway integration (PhonePe)
- Ticket generation and QR codes
- User profile management
- Event creation/editing (Organizer)
- Admin panel functionality
- Real-time notifications
- Search and filters
- Analytics charts

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npx tsc --noEmit

# Lint code
npm run lint
```

## Environment Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### Local Development
1. Clone repository
2. Install dependencies: `npm install`
3. Create `.env.local` file
4. Run: `npm run dev`
5. Open: http://127.0.0.1:3000

## Backend Connection

Make sure backend server is running:
```bash
# In server directory
npm run dev
```

Backend should be running on: http://localhost:5000

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000
```

### Module Not Found
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Type Errors
```bash
# Rebuild TypeScript
npm run build
```

## Next Steps

1. ✅ Install dependencies
2. ✅ Create .env.local file
3. ✅ Run development server
4. ⏳ Connect to backend API
5. ⏳ Test authentication flow
6. ⏳ Test booking flow
7. ⏳ Integrate PhonePe payment

## Support

For issues or questions, check:
- Documentation in `/docs` folder
- Backend API documentation
- Next.js documentation: https://nextjs.org/docs
