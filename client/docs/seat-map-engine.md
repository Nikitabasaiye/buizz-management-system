# Buizz Seat Map Builder and Rendering Engine

The seat-map system is JSON-driven. Booking pages should fetch a `SeatMapLayout` from the API/database and render it with:

```tsx
<SeatMapRenderer layout={venueLayout} selected={selected} onSelectionChange={setSelected} />
```

Phase 1 is wired for `exact-seat`, `section-seat`, and `general-entry`. The same schema already carries `zone`, `table`, `room-hall`, `time-slot`, and `custom-layout` so those layouts can be enabled without creating new React booking pages.

Permissions are currently enabled for Super Admin, Admin, and Organizer:

```ts
permissions = {
  canManageSeatMap: true,
};
```

When Super Admin later sets `canManageSeatMap: false`, dashboard navigation and builder access should be hidden for that role/account.
