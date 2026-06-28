# Migration Guide: Zustand to Redux Toolkit

## Overview
This guide shows how to migrate existing Zustand stores to Redux Toolkit. Both can coexist during the migration.

## Before (Zustand) vs After (Redux Toolkit)

### Authentication

#### Zustand (OLD - Still works)
```tsx
import { useAuthStore } from '@/store';

export default function Component() {
  const user = useAuthStore(state => state.user);
  const setUser = useAuthStore(state => state.setUser);
  
  return <div>{user?.name}</div>;
}
```

#### Redux Toolkit (NEW)
```tsx
import { useAppSelector } from '@/store/reduxStore';
import { useLoginMutation } from '@/store/api/authApi';

export default function Component() {
  const user = useAppSelector(state => state.auth.user);
  const [login] = useLoginMutation();
  
  return <div>{user?.name}</div>;
}
```

### Events

#### Zustand (OLD)
```tsx
import { useEventStore } from '@/store';

export default function Component() {
  const selectedEvent = useEventStore(state => state.selectedEvent);
  const setSelectedEvent = useEventStore(state => state.setSelectedEvent);
}
```

#### Redux Toolkit (NEW)
```tsx
import { useAppSelector, useAppDispatch } from '@/store/reduxStore';
import { setSelectedEvent } from '@/store/slices/eventSlice';
import { useGetEventsQuery } from '@/store/api/eventsApi';

export default function Component() {
  const selectedEvent = useAppSelector(state => state.event.selectedEvent);
  const dispatch = useAppDispatch();
  const { data: events } = useGetEventsQuery();
  
  const handleSelect = (event) => {
    dispatch(setSelectedEvent(event));
  };
}
```

### Bookings

#### Zustand (OLD)
```tsx
import { useBookingStore } from '@/store';

export default function Component() {
  const selections = useBookingStore(state => state.selections);
  const setSelections = useBookingStore(state => state.setSelections);
}
```

#### Redux Toolkit (NEW)
```tsx
import { useAppSelector, useAppDispatch } from '@/store/reduxStore';
import { setSelections, addSelection } from '@/store/slices/bookingSlice';

export default function Component() {
  const selections = useAppSelector(state => state.booking.selections);
  const dispatch = useAppDispatch();
  
  const handleAdd = (selection) => {
    dispatch(addSelection(selection));
  };
}
```

## API Calls Migration

### Before (Axios)
```tsx
import { api } from '@/services/api';

export default function EventsList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const response = await api.get('/events');
        setEvents(response.data.data.events);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, []);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {events.map(event => <div key={event.id}>{event.title}</div>)}
    </div>
  );
}
```

### After (RTK Query)
```tsx
import { useGetEventsQuery } from '@/store/api/eventsApi';

export default function EventsList() {
  const { data, isLoading } = useGetEventsQuery();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      {data?.data.events.map(event => <div key={event.id}>{event.title}</div>)}
    </div>
  );
}
```

## Benefits of RTK Query

1. **Automatic Caching**: No need to manually store API responses
2. **Loading States**: Built-in loading/error/success states
3. **Auto Refetch**: Automatically refetches when data is invalidated
4. **Deduplication**: Multiple components requesting same data = single request
5. **Type Safety**: Full TypeScript inference
6. **DevTools**: Better debugging with Redux DevTools

## Gradual Migration Strategy

### Phase 1: Add Redux (DONE ✅)
- Install dependencies
- Set up store
- Add Redux Provider
- Keep Zustand stores

### Phase 2: New Features Use Redux
- All new components use RTK Query
- All new state uses Redux slices
- Existing components continue using Zustand

### Phase 3: Migrate Existing Components (Optional)
- Gradually replace Zustand with Redux
- Update component by component
- Test each migration

### Phase 4: Remove Zustand (Optional)
- Once all components migrated
- Remove Zustand dependencies
- Remove old store files

## Coexistence Pattern (Current Setup)

```tsx
'use client';

// OLD: Zustand (still available)
import { useAuthStore } from '@/store/authStore';

// NEW: Redux (recommended)
import { useAppSelector } from '@/store/reduxStore';
import { useLoginMutation } from '@/store/api/authApi';

export default function Component() {
  // Both work at the same time!
  const zustandUser = useAuthStore(state => state.user);
  const reduxUser = useAppSelector(state => state.auth.user);
  
  // Use Redux for new features
  const [login] = useLoginMutation();
}
```

## Quick Reference

### State Management
- **Zustand**: `useAuthStore(state => state.user)`
- **Redux**: `useAppSelector(state => state.auth.user)`

### State Updates
- **Zustand**: `setUser(newUser)`
- **Redux**: `dispatch(setCredentials(newUser))`

### API Calls
- **Axios**: Manual `useEffect` + `useState`
- **RTK Query**: `useGetEventsQuery()`

### Mutations
- **Axios**: Manual `try/catch` + `loading` state
- **RTK Query**: `const [login, { isLoading }] = useLoginMutation()`

## Common Patterns

### Pattern 1: Fetch and Display
```tsx
// RTK Query
const { data, isLoading, error } = useGetEventsQuery();

if (isLoading) return <Loader />;
if (error) return <Error />;
return <EventList events={data.data.events} />;
```

### Pattern 2: Form Submission
```tsx
const [createEvent, { isLoading }] = useCreateEventMutation();

const handleSubmit = async (formData) => {
  try {
    await createEvent(formData).unwrap();
    // Success
  } catch (err) {
    // Error
  }
};
```

### Pattern 3: Update Local State
```tsx
const dispatch = useAppDispatch();

const handleSelect = (event) => {
  dispatch(setSelectedEvent(event));
};
```

## Recommended Approach

For this project, I recommend:

1. **Keep existing Zustand code** - No need to break anything
2. **Use Redux for all new features** - Better long-term maintainability
3. **Migrate gradually** - Update components when you touch them
4. **Focus on API calls first** - RTK Query provides biggest benefit

## File Structure

```
src/
├── store/
│   ├── api/                 # NEW: RTK Query APIs
│   │   ├── authApi.ts
│   │   ├── eventsApi.ts
│   │   ├── bookingsApi.ts
│   │   └── ...
│   ├── slices/             # NEW: Redux slices
│   │   ├── authSlice.ts
│   │   ├── eventSlice.ts
│   │   └── bookingSlice.ts
│   ├── reduxStore.ts       # NEW: Redux store
│   ├── authStore.ts        # OLD: Zustand (still works)
│   ├── eventStore.ts       # OLD: Zustand (still works)
│   └── bookingStore.ts     # OLD: Zustand (still works)
```

## Next Steps

1. ✅ Redux Toolkit is set up
2. ✅ RTK Query APIs are ready
3. ✅ Redux slices are created
4. ⏭️ Start using Redux in new components
5. ⏭️ Optionally migrate existing components
6. ⏭️ Remove Zustand when fully migrated (optional)
