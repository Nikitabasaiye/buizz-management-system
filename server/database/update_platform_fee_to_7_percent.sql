-- Migration: Update default platform fee from 2% to 7%
-- Date: 2026-07-16
-- Description: Update platform fee percentage default values in organizer settlements and related tables

-- Update organizer_settlements table
ALTER TABLE organizer_settlements 
MODIFY COLUMN platform_fee_percent DECIMAL(5, 2) NOT NULL DEFAULT 7.00;

-- Update settlement_items table  
ALTER TABLE settlement_items
MODIFY COLUMN platform_fee_percent DECIMAL(5, 2) NOT NULL DEFAULT 7.00;

-- Update existing records with 2% to 7% (optional - only if you want to update existing data)
UPDATE organizer_settlements 
SET platform_fee_percent = 7.00 
WHERE platform_fee_percent = 2.00;

UPDATE settlement_items 
SET platform_fee_percent = 7.00 
WHERE platform_fee_percent = 2.00;

-- Add comment to document the change
ALTER TABLE organizer_settlements 
COMMENT = 'Organizer settlements with platform fee (7% default)';

ALTER TABLE settlement_items 
COMMENT = 'Settlement items with platform fee (7% default)';
