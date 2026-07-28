-- Migration to add language, age_restriction, duration, subtitle, and terms_conditions columns to events table

CALL add_column_if_missing(
  'events',
  'language',
  'VARCHAR(100) NULL COMMENT ''Event language (e.g., Hindi, English, Mixed)'' AFTER category'
);

CALL add_column_if_missing(
  'events',
  'age_restriction',
  'VARCHAR(50) NULL COMMENT ''Age restriction (e.g., 18+, All Ages, 16+)'' AFTER language'
);

CALL add_column_if_missing(
  'events',
  'duration',
  'VARCHAR(50) NULL COMMENT ''Event duration (e.g., 2h 30m, 3 hours)'' AFTER age_restriction'
);

CALL add_column_if_missing(
  'events',
  'subtitle',
  'VARCHAR(255) NULL COMMENT ''Event subtitle/tagline'' AFTER title'
);

CALL add_column_if_missing(
  'events',
  'terms_conditions',
  'TEXT NULL COMMENT ''Terms and conditions including refund policy, cancellation policy, custom terms'' AFTER description'
);

-- Update existing events with default values if needed
UPDATE events 
SET language = 'Mixed' 
WHERE language IS NULL AND category IN ('music-events', 'cultural-events');

UPDATE events 
SET age_restriction = 'All Ages' 
WHERE age_restriction IS NULL;
