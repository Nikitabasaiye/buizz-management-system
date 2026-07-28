# Frontend Integration Guide

## Overview

This guide explains how to integrate the new check-in staff, ticket scanning, and event gallery components into your frontend application.

## Prerequisites

### 1. Install Required Package

```bash
cd client
npm install html5-qrcode
```

### 2. Run Database Migration

Execute the database migration to create the required tables:

```sql
-- Run in your database (phpMyAdmin/MySQL client)
-- File: d:\buizz_management_system\server\database\complete_database_optimization.sql
```

This will create:
- `event_checkin_staff` - Staff assignments
- `qr_scans` - Scan history
- `checkin_staff_performance` - Staff metrics
- `event_gallery` - Event images

## Components

### 1. QR Scanner Component

**Location:** `client/src/components/QRScanner/QRScanner.tsx`

**Features:**
- Google Lens-style scanning interface
- Real-time QR code detection
- Camera permission handling
- Success/failure result display
- Automatic backend API integration

**Usage:**

```tsx
import QRScanner from '@/components/QRScanner/QRScanner';

function CheckinPage() {
  const [showScanner, setShowScanner] = useState(false);

  return (
    <div>
      <button onClick={() => setShowScanner(true)}>
        Open QR Scanner
      </button>
      
      {showScanner && (
        <QRScanner
          eventId="123"
          onClose={() => setShowScanner(false)}
          onScanSuccess={(result) => {
            // Handle successful scan
          }}
        />
      )}
    </div>
  );
}
```

### 2. Check-in Staff Management

**Location:** `client/src/components/CheckinStaff/CheckinStaffManagement.tsx`

**Features:**
- Assign staff to events
- Manage staff permissions (scan, view, manage)
- Remove staff assignments
- View assigned staff list

**Usage:**

```tsx
import CheckinStaffManagement from '@/components/CheckinStaff/CheckinStaffManagement';

function EventDetailsPage({ eventId }) {
  return (
    <div>
      <CheckinStaffManagement eventId={eventId} />
    </div>
  );
}
```

### 3. Event Gallery Upload

**Location:** `client/src/components/EventGallery/EventGalleryUpload.tsx`

**Features:**
- Upload multiple images
- Image previews
- Set featured image
- Drag and drop support

**Usage:**

```tsx
import EventGalleryUpload from '@/components/EventGallery/EventGalleryUpload';

function EventEditPage({ eventId }) {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div>
      <button onClick={() => setShowUpload(true)}>
        Upload Images
      </button>
      
      {showUpload && (
        <EventGalleryUpload
          eventId={eventId}
          onUploadComplete={(image) => {
          }}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
```

### 4. Event Gallery Display

**Location:** `client/src/components/EventGallery/EventGalleryDisplay.tsx`

**Features:**
- Display event images in grid
- Set featured image
- Delete images
- Edit mode for organizers
- Public view for users

**Usage:**

```tsx
import EventGalleryDisplay from '@/components/EventGallery/EventGalleryDisplay';

function EventPage({ eventId, isOrganizer }) {
  return (
    <div>
      <EventGalleryDisplay
        eventId={eventId}
        editable={isOrganizer}
        onImageClick={(image) => {
          // Handle image click (e.g., open lightbox)
        }}
      />
    </div>
  );
}
```

## API Services

### Check-in Staff API

**Location:** `client/src/services/checkinStaffApi.ts`

```typescript
import { checkinStaffApi } from '@/services/checkinStaffApi';

// Assign staff to event
await checkinStaffApi.assignStaff({
  event_id: 123,
  staff_id: 456,
  permissions: { scan: true, view: true }
});

// Get event staff
const staff = await checkinStaffApi.getEventStaff(123);

// Update assignment
await checkinStaffApi.updateAssignment(789, {
  permissions: { scan: true, view: true, manage: true }
});

// Remove staff
await checkinStaffApi.removeStaff(789);

// Get my assigned events
const events = await checkinStaffApi.getMyEvents();
```

### Ticket Scan API

**Location:** `client/src/services/ticketScanApi.ts`

```typescript
import { ticketScanApi } from '@/services/ticketScanApi';

// Scan ticket
const result = await ticketScanApi.scanTicket('17212345678901234', {
  location: 'Main Gate',
  device_info: navigator.userAgent
});

// Verify ticket
const ticket = await ticketScanApi.verifyTicket('17212345678901234');

// Get event stats
const stats = await ticketScanApi.getEventScanStats(123);

// Get recent scans
const scans = await ticketScanApi.getRecentScans(123, 50);
```

### Event Gallery API

**Location:** `client/src/services/eventGalleryApi.ts`

```typescript
import { eventGalleryApi } from '@/services/eventGalleryApi';

// Add image
const image = await eventGalleryApi.addImage({
  event_id: 123,
  image_url: 'https://example.com/image.jpg',
  caption: 'Event photo',
  is_featured: true
});

// Get event images
const images = await eventGalleryApi.getEventImages(123);

// Update image
await eventGalleryApi.updateImage(456, {
  caption: 'Updated caption',
  is_featured: true
});

// Delete image
await eventGalleryApi.deleteImage(456);

// Reorder images
await eventGalleryApi.reorderImages(123, [
  { id: 1, sort_order: 0 },
  { id: 2, sort_order: 1 }
]);

// Set featured image
await eventGalleryApi.setFeaturedImage(123, 456);

// Get featured image
const featured = await eventGalleryApi.getFeaturedImage(123);
```

## Integration Steps

### Step 1: Install Dependencies

```bash
cd client
npm install html5-qrcode
```

### Step 2: Run Database Migration

Execute the SQL migration file in your database:
- File: `server/database/complete_database_optimization.sql`

### Step 3: Import Components

Add the components to your pages where needed:

```tsx
// In your event details page
import CheckinStaffManagement from '@/components/CheckinStaff/CheckinStaffManagement';
import EventGalleryDisplay from '@/components/EventGallery/EventGalleryDisplay';

// In your check-in page
import QRScanner from '@/components/QRScanner/QRScanner';
```

### Step 4: Add to Routes

Update your routing configuration to include the new components:

```tsx
// Example in your router configuration
<Route path="/events/:eventId/staff" element={<CheckinStaffManagement eventId={eventId} />} />
<Route path="/checkin" element={<CheckinPage />} />
```

### Step 5: Test Integration

1. **Test QR Scanner:**
   - Open check-in page
   - Click "Open Scanner"
   - Allow camera permissions
   - Scan a test QR code

2. **Test Staff Management:**
   - Go to event details
   - Add staff members
   - Set permissions
   - Remove staff

3. **Test Event Gallery:**
   - Upload images to event
   - Set featured image
   - Delete images
   - View in public mode

## Backend API Endpoints

### Check-in Staff Management
- `POST /api/v1/checkin-staff-management/assign` - Assign staff
- `GET /api/v1/checkin-staff-management/event/:eventId` - Get event staff
- `PUT /api/v1/checkin-staff-management/assignment/:assignmentId` - Update assignment
- `DELETE /api/v1/checkin-staff-management/assignment/:assignmentId` - Remove staff
- `GET /api/v1/checkin-staff-management/my-events` - Get my events

### Ticket Scanning
- `POST /api/v1/ticket-scan/scan/:ticketNumber` - Scan ticket
- `GET /api/v1/ticket-scan/verify/:ticketNumber` - Verify ticket
- `GET /api/v1/ticket-scan/stats/event/:eventId` - Get stats
- `GET /api/v1/ticket-scan/recent/event/:eventId` - Get recent scans

### Event Gallery
- `POST /api/v1/event-gallery/event/:eventId` - Add image
- `GET /api/v1/event-gallery/event/:eventId` - Get images
- `PUT /api/v1/event-gallery/image/:imageId` - Update image
- `DELETE /api/v1/event-gallery/image/:imageId` - Delete image
- `PUT /api/v1/event-gallery/event/:eventId/reorder` - Reorder images
- `PUT /api/v1/event-gallery/event/:eventId/featured/:imageId` - Set featured
- `GET /api/v1/event-gallery/event/:eventId/featured` - Get featured

## Troubleshooting

### Camera Not Working
- Ensure camera permissions are granted
- Check if using HTTPS (required for camera access on mobile)
- Verify html5-qrcode package is installed

### API Errors
- Check that database migration was run
- Verify backend routes are registered in app.js
- Check authentication token in localStorage

### Image Upload Issues
- Ensure image upload endpoint is configured
- Check Cloudinary/S3 configuration if using external storage
- Verify file size limits

## Notes

- The QR scanner requires HTTPS on mobile browsers
- All components use TypeScript for type safety
- API services handle authentication automatically
- Components are responsive and mobile-friendly
- Error handling is built into all components
