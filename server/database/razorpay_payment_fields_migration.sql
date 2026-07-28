-- Migration: Add Razorpay-specific fields to payments table
-- This migration adds Razorpay payment ID, order ID, and signature fields
-- to support Razorpay payment integration and verification

-- Add Razorpay-specific fields to payments table
ALTER TABLE payments 
ADD COLUMN razorpay_payment_id VARCHAR(255) NULL COMMENT 'Razorpay payment ID' AFTER transaction_id,
ADD COLUMN razorpay_order_id VARCHAR(255) NULL COMMENT 'Razorpay order ID' AFTER razorpay_payment_id,
ADD COLUMN razorpay_signature VARCHAR(255) NULL COMMENT 'Razorpay signature for verification' AFTER razorpay_order_id,
ADD COLUMN razorpay_created_at DATETIME NULL COMMENT 'Timestamp when Razorpay payment was created' AFTER razorpay_signature,
ADD INDEX idx_razorpay_payment_id (razorpay_payment_id),
ADD INDEX idx_razorpay_order_id (razorpay_order_id);

-- Update existing payment_method enum to include razorpay explicitly
ALTER TABLE payments 
MODIFY COLUMN payment_method ENUM('phonepe', 'razorpay', 'paytm', 'upi', 'card', 'netbanking', 'wallet') NULL;

-- Add comment to clarify the difference between generic and Razorpay-specific fields
ALTER TABLE payments 
MODIFY COLUMN order_id VARCHAR(255) NOT NULL COMMENT 'Gateway order ID (can be Razorpay order ID or other gateway)';

-- Add a composite index for Razorpay-related queries
CREATE INDEX idx_razorpay_payment_lookup ON payments(razorpay_order_id, razorpay_payment_id, status);

-- Add a note column for payment-related metadata
ALTER TABLE payments 
ADD COLUMN payment_notes TEXT NULL COMMENT 'Additional notes about payment processing' AFTER gateway_response;
