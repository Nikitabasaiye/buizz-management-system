const crypto = require('crypto');

/**
 * Generate BigInt order ID
 * Format: 18-19 digit number (BigInt)
 * Example: 1234567890123456789
 */
const generateBigIntOrderId = () => {
  const timestamp = BigInt(Date.now());
  const random = BigInt(crypto.randomInt(100000, 999999));
  return (timestamp * 1000000n + random).toString();
};

/**
 * Generate snowflake-style BigInt ID
 * Format: Timestamp (42 bits) + Machine ID (10 bits) + Sequence (12 bits)
 */
const generateSnowflakeOrderId = () => {
  const epoch = 1609459200000n; // 2021-01-01
  const timestamp = BigInt(Date.now()) - epoch;
  const machineId = BigInt(crypto.randomInt(0, 1024));
  const sequence = BigInt(crypto.randomInt(0, 4096));
  
  return ((timestamp << 22n) | (machineId << 12n) | sequence).toString();
};

/**
 * Generate simple sequential BigInt ID
 */
const generateSequentialBigIntOrderId = () => {
  return BigInt(Date.now()).toString() + crypto.randomInt(1000, 9999).toString();
};

/**
 * Validate BigInt order ID
 */
const isValidBigIntOrderId = (orderId) => {
  try {
    const id = BigInt(orderId);
    return id > 0n && orderId.length >= 15 && orderId.length <= 20;
  } catch {
    return false;
  }
};

module.exports = {
  generateBigIntOrderId,
  generateSnowflakeOrderId,
  generateSequentialBigIntOrderId,
  isValidBigIntOrderId
};
