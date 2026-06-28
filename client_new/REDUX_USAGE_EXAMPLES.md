# Redux Toolkit + RTK Query Usage Examples

## 1. Authentication Examples

### Login Component
```tsx
'use client';

import { useLoginMutation } from '@/store/api/authApi';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [login, { isLoading, error }] = useLoginMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await login({ email, password }).unwrap();
      console.log('Login successful:', result);
      // Redirect to dashboard
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
      {error && <p>Error: {JSON.stringify(error)}</p>}
    </form>
  );
}
```

### Register Component
```tsx
'use client';

import { useRegisterMutation } from '@/store/api/authApi';
import { useState } from 'react';

export default function RegisterPage() {
  const [register, { isLoading, error }] = useRegisterMutation();

  const handleSubmit = async (data: { name: string; email: string; password: string }) => {
    try {
      const result = await register(data).unwrap();
      console.log('Registration successful:', result);
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  // Form implementation...
}
```

### Logout Component
```tsx
'use client';

import { useLogoutMutation } from '@/store/api/authApi';
import { useAppDispatch } from '@/store/reduxStore';
import { logoutAction } from '@/store/slices/authSlice';

export default function LogoutButton() {
  const [logout] = useLogoutMutation();
  const dispatch = useAppDispatch();

  const handleLogout = async () => {
    try {
      await logout().unwrap();
      dispatch(logoutAction());
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

## 2. Events Examples

### Events List Component
```tsx
'use client';

import { useGetEventsQuery } from '@/store/api/eventsApi';
import { useState } from 'react';

export default function EventsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useGetEventsQuery({ 
    page, 
    limit: 10,
    city: 'Bangalore'
  });

  if (isLoading) return <div>Loading events...</div>;
  if (error) return <div>Error loading events</div>;

  return (
    <div>
      {data?.data.events.map((event) => (
        <div key={event.id}>
          <h3>{event.title}</h3>
          <p>{event.city}</p>
        </div>
      ))}
      <button onClick={() => setPage(p => p + 1)}>Next Page</button>
    </div>
  );
}
```

### Event Details Component
```tsx
'use client';

import { useGetEventByIdQuery } from '@/store/api/eventsApi';

export default function EventDetailsPage({ params }: { params: { id: string } }) {
  const { data, isLoading } = useGetEventByIdQuery(params.id);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{data?.data.title}</h1>
      <p>{data?.data.description}</p>
      <p>Location: {data?.data.city}</p>
    </div>
  );
}
```

### Create Event Component
```tsx
'use client';

import { useCreateEventMutation } from '@/store/api/eventsApi';

export default function CreateEventPage() {
  const [createEvent, { isLoading }] = useCreateEventMutation();

  const handleSubmit = async (eventData: any) => {
    try {
      const result = await createEvent(eventData).unwrap();
      console.log('Event created:', result);
    } catch (err) {
      console.error('Failed to create event:', err);
    }
  };

  // Form implementation...
}
```

## 3. Booking Examples

### Initiate Booking Component
```tsx
'use client';

import { useInitiateBookingMutation } from '@/store/api/bookingsApi';
import { useAppDispatch, useAppSelector } from '@/store/reduxStore';
import { resetBooking } from '@/store/slices/bookingSlice';

export default function BookingCheckout() {
  const [initiateBooking, { isLoading }] = useInitiateBookingMutation();
  const dispatch = useAppDispatch();
  const selections = useAppSelector(state => state.booking.selections);

  const handleCheckout = async () => {
    try {
      const result = await initiateBooking({
        eventId: 1,
        ticketTypeId: selections[0].ticketTypeId,
        quantity: selections[0].quantity,
      }).unwrap();

      // Redirect to PhonePe payment
      window.location.href = result.data.payment.redirect_url;
      
      dispatch(resetBooking());
    } catch (err) {
      console.error('Booking failed:', err);
    }
  };

  return (
    <button onClick={handleCheckout} disabled={isLoading}>
      {isLoading ? 'Processing...' : 'Proceed to Payment'}
    </button>
  );
}
```

### User Bookings Component
```tsx
'use client';

import { useGetUserBookingsQuery } from '@/store/api/bookingsApi';

export default function MyBookings() {
  const { data, isLoading, error } = useGetUserBookingsQuery();

  if (isLoading) return <div>Loading bookings...</div>;
  if (error) return <div>Error loading bookings</div>;

  return (
    <div>
      {data?.data.map((booking) => (
        <div key={booking.id}>
          <p>Order: {booking.order_id}</p>
          <p>Status: {booking.status}</p>
          <p>Amount: ₹{booking.total_amount}</p>
        </div>
      ))}
    </div>
  );
}
```

### Payment Verification Component
```tsx
'use client';

import { useLazyVerifyPaymentQuery } from '@/store/api/bookingsApi';
import { useEffect } from 'react';

export default function PaymentSuccessPage({ searchParams }: { searchParams: { orderId: string } }) {
  const [verifyPayment, { data, isLoading }] = useLazyVerifyPaymentQuery();

  useEffect(() => {
    if (searchParams.orderId) {
      verifyPayment(searchParams.orderId);
    }
  }, [searchParams.orderId, verifyPayment]);

  if (isLoading) return <div>Verifying payment...</div>;

  return (
    <div>
      <h1>Payment {data?.data.status === 'confirmed' ? 'Successful' : 'Failed'}</h1>
      <p>Order ID: {data?.data.order_id}</p>
    </div>
  );
}
```

## 4. Tickets Examples

### My Tickets Component
```tsx
'use client';

import { useGetMyTicketsQuery } from '@/store/api/ticketsApi';

export default function MyTickets() {
  const { data, isLoading } = useGetMyTicketsQuery();

  if (isLoading) return <div>Loading tickets...</div>;

  return (
    <div>
      {data?.data.map((ticket) => (
        <div key={ticket.id}>
          <p>Ticket: {ticket.ticket_number}</p>
          <p>Status: {ticket.status}</p>
          {ticket.qr_code && <img src={ticket.qr_code} alt="QR Code" />}
        </div>
      ))}
    </div>
  );
}
```

### Scan Ticket Component
```tsx
'use client';

import { useScanTicketMutation } from '@/store/api/ticketsApi';

export default function ScanTicket() {
  const [scanTicket, { isLoading }] = useScanTicketMutation();

  const handleScan = async (ticketNumber: string) => {
    try {
      const result = await scanTicket(ticketNumber).unwrap();
      console.log('Ticket scanned:', result);
    } catch (err) {
      console.error('Scan failed:', err);
    }
  };

  // Scanner implementation...
}
```

## 5. Redux State Management Examples

### Using Auth State
```tsx
'use client';

import { useAppSelector, useAppDispatch } from '@/store/reduxStore';
import { setCredentials } from '@/store/slices/authSlice';

export default function ProfilePage() {
  const user = useAppSelector(state => state.auth.user);
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  if (!isAuthenticated) {
    return <div>Please login</div>;
  }

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      <p>Email: {user?.email}</p>
    </div>
  );
}
```

### Using Booking State
```tsx
'use client';

import { useAppSelector, useAppDispatch } from '@/store/reduxStore';
import { addSelection, removeSelection } from '@/store/slices/bookingSlice';

export default function TicketSelector() {
  const dispatch = useAppDispatch();
  const selections = useAppSelector(state => state.booking.selections);

  const handleAddTicket = (ticketTypeId: number, price: number) => {
    dispatch(addSelection({
      ticketTypeId,
      ticketTypeName: 'VIP',
      price,
      quantity: 1,
    }));
  };

  const handleRemoveTicket = (ticketTypeId: number) => {
    dispatch(removeSelection(ticketTypeId));
  };

  return (
    <div>
      {selections.map(s => (
        <div key={s.ticketTypeId}>
          <p>{s.ticketTypeName}: ₹{s.price} x {s.quantity}</p>
          <button onClick={() => handleRemoveTicket(s.ticketTypeId)}>Remove</button>
        </div>
      ))}
    </div>
  );
}
```

### Using Event State
```tsx
'use client';

import { useAppSelector, useAppDispatch } from '@/store/reduxStore';
import { setFilters, clearFilters } from '@/store/slices/eventSlice';

export default function EventFilters() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(state => state.event.filters);

  const handleCityChange = (city: string) => {
    dispatch(setFilters({ city }));
  };

  const handleClearFilters = () => {
    dispatch(clearFilters());
  };

  return (
    <div>
      <select onChange={(e) => handleCityChange(e.target.value)}>
        <option value="">All Cities</option>
        <option value="Bangalore">Bangalore</option>
        <option value="Mumbai">Mumbai</option>
      </select>
      <button onClick={handleClearFilters}>Clear Filters</button>
    </div>
  );
}
```

## 6. Optimistic Updates & Cache Invalidation

### Optimistic Update Example
```tsx
'use client';

import { useUpdateEventMutation } from '@/store/api/eventsApi';

export default function UpdateEvent({ eventId }: { eventId: number }) {
  const [updateEvent] = useUpdateEventMutation();

  const handleUpdate = async (data: any) => {
    try {
      await updateEvent({ id: eventId, data }).unwrap();
      // Cache automatically invalidated and refetched
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  // Form implementation...
}
```

## 7. Error Handling

### Global Error Handling
```tsx
'use client';

import { useGetEventsQuery } from '@/store/api/eventsApi';

export default function EventsList() {
  const { data, isLoading, error, isError } = useGetEventsQuery();

  if (isError) {
    const errorMessage = 'data' in error 
      ? JSON.stringify(error.data) 
      : error.message || 'Unknown error';
    
    return <div>Error: {errorMessage}</div>;
  }

  // Success UI...
}
```

## Key Features

1. **Automatic Caching**: RTK Query caches responses and reuses them
2. **Auto Refetch**: Data automatically refetches when invalidated
3. **Loading States**: Built-in loading, error, and success states
4. **Optimistic Updates**: Update UI before server response
5. **Type Safety**: Full TypeScript support
6. **DevTools**: Redux DevTools for debugging
7. **Token Management**: Automatic JWT token injection in headers
8. **Tag-based Invalidation**: Smart cache invalidation using tags
