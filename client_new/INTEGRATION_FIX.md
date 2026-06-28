# Backend-Frontend Integration Fix & Verification

## Issues Fixed

### 1. Environment Configuration ✅
**Created:** `client_new/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

### 2. CORS Configuration ✅
**Updated:** `server/src/app.js`
- Added `http://127.0.0.1:3000` to allowed origins
- Frontend runs on 127.0.0.1 by default (Next.js)

**Updated:** `server/.env`
```env
FRONTEND_URL=http://localhost:3000
```

### 3. Redux Provider Integration ✅
**Updated:** `client_new/src/providers/GlobalProviders.tsx`
- Added ReduxProvider wrapping all other providers
- Order: Redux → Query → Auth → Theme → Toast

## Verification Steps

### Step 1: Start Backend
```bash
cd server
npm start
```
**Expected Output:**
```
✓ MySQL Connected
✓ Redis Connected
Server running on http://localhost:5000
```

### Step 2: Start Frontend
```bash
cd client_new
npm run dev
```
**Expected Output:**
```
- ready started server on 127.0.0.1:3000, url: http://127.0.0.1:3000
```

### Step 3: Test Integration Page
Open browser: http://127.0.0.1:3000/test-integration

**What to Check:**
1. ✅ API URL shows: `http://localhost:5000/api/v1`
2. ✅ Events load successfully or show specific error
3. ✅ Redux DevTools show API requests
4. ✅ Network tab shows request to backend

### Step 4: Test Backend Directly
Open: http://localhost:5000/api/v1/events

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "events": [...],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

## Common Issues & Solutions

### Issue 1: "Network Error" or "Failed to Fetch"
**Cause:** Backend not running
**Solution:**
```bash
cd server
npm start
```

### Issue 2: CORS Error
**Cause:** Origin not allowed
**Solution:** Already fixed - server/src/app.js includes 127.0.0.1:3000

### Issue 3: API URL is "NOT SET"
**Cause:** .env.local not created or Next.js not restarted
**Solution:**
```bash
# Stop Next.js (Ctrl+C)
# Verify .env.local exists with NEXT_PUBLIC_API_URL
npm run dev
```

### Issue 4: 401 Unauthorized on Protected Routes
**Cause:** No auth token
**Solution:** Login first or use public routes like GET /events

### Issue 5: Redux DevTools Not Working
**Cause:** Extension not installed
**Solution:** Install Redux DevTools extension in Chrome/Firefox

## Quick Integration Test

### Test 1: Public API (No Auth Required)
```tsx
import { useGetEventsQuery } from '@/store/api/eventsApi';

function EventsList() {
  const { data, isLoading } = useGetEventsQuery();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      {data?.data.events.map(event => (
        <div key={event.id}>{event.title}</div>
      ))}
    </div>
  );
}
```

### Test 2: Authentication
```tsx
import { useLoginMutation } from '@/store/api/authApi';

function LoginForm() {
  const [login, { isLoading }] = useLoginMutation();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await login({ 
        email: 'test@example.com', 
        password: 'password123' 
      }).unwrap();
      console.log('Login success:', result);
    } catch (err) {
      console.error('Login failed:', err);
    }
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Test 3: Booking Flow
```tsx
import { useInitiateBookingMutation } from '@/store/api/bookingsApi';

function BookingCheckout() {
  const [initiateBooking, { isLoading }] = useInitiateBookingMutation();
  
  const handleCheckout = async () => {
    try {
      const result = await initiateBooking({
        eventId: 1,
        ticketTypeId: 1,
        quantity: 2,
      }).unwrap();
      
      // Redirect to PhonePe
      window.location.href = result.data.payment.redirect_url;
    } catch (err) {
      console.error('Booking failed:', err);
    }
  };
  
  return <button onClick={handleCheckout}>Book Now</button>;
}
```

## Backend API Endpoints Ready

### Public Routes (No Auth)
- GET /api/v1/events
- GET /api/v1/events/:id
- GET /api/v1/events/slug/:slug
- POST /api/v1/auth/login
- POST /api/v1/auth/register
- POST /api/v1/auth/forgot-password

### Protected Routes (Require Auth Token)
- GET /api/v1/bookings
- POST /api/v1/bookings/initiate
- GET /api/v1/tickets/my-tickets
- GET /api/v1/users/profile
- POST /api/v1/events (create event)
- PUT /api/v1/events/:id (update event)

## Integration Architecture

```
Frontend (Next.js)                  Backend (Express)
http://127.0.0.1:3000              http://localhost:5000

User Action
    ↓
React Component
    ↓
RTK Query Hook
    ↓
Redux Store (baseApi)
    ↓
HTTP Request
headers: { 
  Authorization: Bearer TOKEN,
  Content-Type: application/json 
}
    ↓
CORS Check (✅ Allowed)
    ↓
Express Router
    ↓
Controller → Service → Repository
    ↓
MySQL Database
    ↓
JSON Response
    ↓
Redux Cache Updated
    ↓
Component Re-renders
    ↓
UI Updates
```

## Redux Store State Structure

```typescript
{
  auth: {
    user: { id, name, email, role } | null,
    token: string | null,
    isAuthenticated: boolean
  },
  event: {
    selectedEvent: Event | null,
    filters: { category?, city?, search? }
  },
  booking: {
    selections: TicketSelection[],
    customerDetails: { name?, email?, phone? },
    currentBookingId?: string
  },
  api: {
    queries: {
      'getEvents({"page":1})': { data, status, ... }
    },
    mutations: { ... }
  }
}
```

## Testing Checklist

Before using in production components:

- [ ] Backend server is running (http://localhost:5000)
- [ ] Frontend server is running (http://127.0.0.1:3000)
- [ ] .env.local file exists with correct API URL
- [ ] Test page loads: http://127.0.0.1:3000/test-integration
- [ ] Events API returns data successfully
- [ ] Redux DevTools shows API requests and state
- [ ] Browser console shows no CORS errors
- [ ] Network tab shows requests going to localhost:5000

## Next Steps

1. Visit http://127.0.0.1:3000/test-integration
2. Check if events load successfully
3. Open Redux DevTools to inspect state
4. Start integrating Redux hooks in actual components
5. Replace existing Axios calls with RTK Query hooks

## Support

If integration still not working:

1. Check backend logs for errors
2. Check browser console for errors
3. Check Network tab for failed requests
4. Verify .env.local has correct URL
5. Restart both servers
6. Clear browser cache

---

**Status:** Integration configured and ready to test at http://127.0.0.1:3000/test-integration
