# Buizz User-Side Ticket Booking Flow Documentation

## Overview
This document explains how the booking flow works for users booking tickets for events, movies, and other experiences on the Buizz platform.

## Booking Flow Steps

### 1. Event Discovery
- Users browse events through the discovery interface
- Events can be filtered by category, date, venue, and other criteria
- Each event displays basic information: title, venue, date, time, pricing

### 2. Booking Initiation
- User clicks "Book Now" or selects tickets from an event page
- System checks if user is authenticated
- If not authenticated, user is prompted to login or register

### 3. Venue Selection (if multiple venues)
- For events with multiple venues, user selects the preferred venue
- System shows venue availability and location details

### 4. Date and Time Selection
- User selects the preferred date from available dates
- User selects the preferred time slot for that date
- System shows real-time availability for each slot

### 5. Ticket Selection (Two Modes)

#### A. Capacity-Based Mode (No Seat Map)
- User sees available ticket blocks (e.g., General, VIP, Premium)
- Each block shows:
  - Ticket name
  - Price per ticket
  - Available quantity
  - Status (Available, Fast Filling, Sold Out)
- User can add/remove tickets using +/- buttons
- Maximum 10 tickets per booking
- System validates:
  - Available quantity limits
  - Maximum booking limits
  - Total ticket count

#### B. Seat Map Mode (With Seat Map)
- User first selects how many tickets they want (1-10)
- Interactive venue seat map is displayed
- User selects specific seats from the map
- System shows:
  - Available seats (green)
  - Booked seats (red)
  - Selected seats (blue)
  - Different pricing tiers by section
- User must select exactly the number of seats requested

### 6. Review Step
- System displays booking summary:
  - Event details (name, venue, date, time)
  - Selected tickets with quantities and prices
  - Subtotal calculation
  - Fee breakdown:
    - Platform fee (7% of subtotal)
  - Total amount
- User confirms booking details

### 7. Payment Processing
- System initiates payment through selected gateway (PhonePe/Razorpay)
- Payment modes available:
  - Online payment (UPI, cards, net banking)
  - Mock payment (for testing)
- User completes payment
- System verifies payment status

### 8. Booking Confirmation
- On successful payment:
  - Booking is confirmed
  - Tickets are generated
  - QR codes are created for each ticket
  - Confirmation is sent via email/WhatsApp
- User can view/download tickets immediately

### 9. Ticket Management
- Users can view their booked tickets in profile section
- Tickets show:
  - Event details
  - Seat information
  - QR code for entry
  - Booking status
- Users can download tickets as PDF

## Pricing Calculation

### Fee Structure
- **Platform Fee**: 7% of subtotal (configurable)


### Calculation Formula
```
Subtotal = Σ(Ticket Price × Quantity)
Platform Fee = Subtotal × 7%

Total = Subtotal + Platform Fee + Convenience Fee + Taxes
```

### Example Calculation
For 2 tickets at ₹500 each:
- Subtotal: ₹500 × 2 = ₹1,000
- Platform Fee (7%): ₹1,000 × 0.07 = ₹70

- Total: ₹1,000 + ₹70  = ₹1070

## Technical Implementation

### Frontend Components
- **BookingFlow.tsx**: Main booking flow controller
- **CapacityTicketSelection.tsx**: Ticket selection for capacity-based events
- **PublicSeatMapSelector.tsx**: Interactive seat map selection
- **PaymentSheet.tsx**: Payment processing interface
- **platformFeeSettings.ts**: Fee calculation logic

### State Management
- Ticket quantities stored in React state
- Real-time fee recalculation on quantity changes
- Platform fee settings stored in localStorage
- Fee breakdown calculated using `calculateBookingFees()` function

### API Integration
- Booking initiation: `/bookings/initiate`
- Payment verification: `/bookings/verify/{orderId}`
- Booking details: `/bookings/{orderId}`

## Database Schema Updates

### Platform Fee Migration
- Updated default platform fee from 2% to 7%
- Migration file: `update_platform_fee_to_7_percent.sql`
- Updated tables:
  - `organizer_settlements`
  - `settlement_items`

## User Experience Features

### Real-time Updates
- Ticket quantity changes immediately update totals
- Fee breakdown recalculates automatically
- Available quantities update in real-time

### Validation
- Maximum 10 tickets per booking
- Cannot exceed available inventory
- Sold-out blocks are disabled
- Seat map enforces exact seat selection

### Mobile Responsive
- Full mobile support for booking flow
- Touch-friendly seat selection
- Responsive payment interface

## Error Handling
- Payment failures are handled gracefully
- Inventory conflicts detected and reported
- Session timeout handling
- Network error recovery

## Security
- All bookings require authentication
- Payment processing through secure gateways
- QR codes are unique and tamper-proof
- Booking IDs are unique and non-sequential
