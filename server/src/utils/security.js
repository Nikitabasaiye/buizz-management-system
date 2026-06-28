const crypto = require('crypto');
const { AppError } = require('../middleware/errorHandler');

/**
 * Sanitize user input to prevent XSS attacks
 */
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input
      .replace(/[<>]/g, '')
      .trim();
  }
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeInput(item));
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  return input;
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
const isStrongPassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Generate secure random token
 */
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash sensitive data
 */
const hashData = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Verify HMAC signature
 */
const verifySignature = (data, signature, secret) => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

/**
 * Mask sensitive data for logging
 */
const maskSensitiveData = (data) => {
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
  
  if (typeof data === 'object' && data !== null) {
    const masked = { ...data };
    for (const key in masked) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        masked[key] = '***REDACTED***';
      } else if (typeof masked[key] === 'object') {
        masked[key] = maskSensitiveData(masked[key]);
      }
    }
    return masked;
  }
  return data;
};

/**
 * Validate MySQL integer ID
 */
const isValidObjectId = (id) => {
  return /^[1-9][0-9]*$/.test(String(id));
};

/**
 * Prevent SQL injection in raw queries
 */
const escapeSQLInput = (input) => {
  if (typeof input === 'string') {
    return input.replace(/['";\\]/g, '');
  }
  return input;
};

/**
 * Rate limit key generator
 */
const generateRateLimitKey = (identifier, action) => {
  return `ratelimit:${action}:${identifier}`;
};

/**
 * Check if IP is in whitelist
 */
const isWhitelistedIP = (ip, whitelist = []) => {
  return whitelist.includes(ip);
};

/**
 * Validate file upload
 */
const validateFileUpload = (file, options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'],
  } = options;

  if (!file) {
    throw new AppError('No file provided', 400);
  }

  if (file.size > maxSize) {
    throw new AppError(`File size exceeds ${maxSize / 1024 / 1024}MB limit`, 400);
  }

  if (!allowedTypes.includes(file.mimetype)) {
    throw new AppError(`File type ${file.mimetype} is not allowed`, 400);
  }

  return true;
};

/**
 * Generate CSRF token
 */
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('base64');
};

/**
 * Verify CSRF token
 */
const verifyCSRFToken = (token, sessionToken) => {
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(sessionToken)
  );
};

/**
 * Encrypt sensitive data
 */
const encryptData = (data, key) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

/**
 * Decrypt sensitive data
 */
const decryptData = (encryptedData, key) => {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encrypted = parts.join(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

/**
 * Check for suspicious patterns
 */
const detectSuspiciousActivity = (req) => {
  const suspiciousPatterns = [
    /<script>/i,
    /javascript:/i,
    /on\w+=/i,
    /eval\(/i,
    /union.*select/i,
    /drop.*table/i,
  ];

  const checkString = JSON.stringify(req.body) + JSON.stringify(req.query);
  
  return suspiciousPatterns.some(pattern => pattern.test(checkString));
};

module.exports = {
  sanitizeInput,
  isValidEmail,
  isStrongPassword,
  generateSecureToken,
  hashData,
  verifySignature,
  maskSensitiveData,
  isValidObjectId,
  escapeSQLInput,
  generateRateLimitKey,
  isWhitelistedIP,
  validateFileUpload,
  generateCSRFToken,
  verifyCSRFToken,
  encryptData,
  decryptData,
  detectSuspiciousActivity,
};
