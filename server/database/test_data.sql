-- Insert test data for PhonePe payment testing

-- 1. Insert test event
INSERT INTO events (
  event_id,
  title,
  slug,
  description,
  organizer_id,
  category,
  type,
  status,
  start_date,
  end_date,
  venue_name,
  venue_city,
  total_seats,
  available_seats
) VALUES (
  1,
  'Tech Conference 2024',
  'tech-conference-2024',
  'Annual technology conference with industry leaders',
  1, -- Make sure this user exists
  'Technology',
  'offline',
  'published',
  DATE_ADD(NOW(), INTERVAL 30 DAY),
  DATE_ADD(NOW(), INTERVAL 31 DAY),
  'Convention Center',
  'Mumbai',
  1000,
  1000
) ON DUPLICATE KEY UPDATE
  status = 'published',
  available_seats = 1000;

-- 2. Insert ticket types for the event
INSERT INTO ticket_types (
  id,
  event_id,
  name,
  description,
  price,
  quantity,
  available_quantity,
  is_active
) VALUES
(1, 1, 'Early Bird', 'Early bird special pricing', 500.00, 100, 100, 1),
(2, 1, 'Regular', 'Regular admission', 1000.00, 500, 500, 1),
(3, 1, 'VIP', 'VIP access with premium seating', 2500.00, 50, 50, 1)
ON DUPLICATE KEY UPDATE
  is_active = 1,
  available_quantity = quantity;

-- Verify the data
SELECT 
  e.event_id,
  e.title,
  e.status,
  tt.id as ticket_type_id,
  tt.name as ticket_type_name,
  tt.price,
  tt.available_quantity
FROM events e
LEFT JOIN ticket_types tt ON e.event_id = tt.event_id
WHERE e.event_id = 1;
