const { AppError } = require('./errorHandler');
const { sanitizeInput, detectSuspiciousActivity, isValidObjectId } = require('../utils/security');
const logger = require('../utils/logger');

/**
 * Sanitize all request inputs
 */
const sanitizeRequest = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }
  if (req.params) {
    req.params = sanitizeInput(req.params);
  }
  next();
};

/**
 * Detect and block suspicious activity
 */
const detectAttacks = (req, res, next) => {
  if (detectSuspiciousActivity(req)) {
    logger.warn(`Suspicious activity detected from IP: ${req.ip}`, {
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
    });
    return next(new AppError('Suspicious activity detected', 400));
  }
  next();
};

/**
 * Validate MySQL integer ID in route params
 */
const validateObjectId = (...paramNames) => {
  return (req, res, next) => {
    for (const paramName of paramNames) {
      const id = req.params[paramName];
      if (id !== undefined && !isValidObjectId(id)) {
        return next(new AppError(`Invalid ${paramName}`, 400));
      }
    }
    next();
  };
};

/**
 * Prevent parameter pollution
 */
const preventParameterPollution = (req, res, next) => {
  const checkPollution = (obj) => {
    for (const key in obj) {
      if (Array.isArray(obj[key]) && obj[key].length > 10) {
        return true;
      }
    }
    return false;
  };

  if (checkPollution(req.query) || checkPollution(req.body)) {
    return next(new AppError('Parameter pollution detected', 400));
  }

  next();
};

/**
 * Content Security Policy headers
 */
const setSecurityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

/**
 * Prevent brute force attacks on sensitive endpoints
 */
const bruteForceProtection = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const identifier = req.body.email || req.ip;
    const key = `${req.path}:${identifier}`;
    
    const now = Date.now();
    const userAttempts = attempts.get(key) || { count: 0, resetTime: now + windowMs };

    if (now > userAttempts.resetTime) {
      attempts.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (userAttempts.count >= maxAttempts) {
      logger.warn(`Brute force attempt detected: ${identifier} on ${req.path}`);
      return next(new AppError('Too many attempts, please try again later', 429));
    }

    userAttempts.count++;
    attempts.set(key, userAttempts);
    next();
  };
};

/**
 * Validate request origin
 */
const validateOrigin = (req, res, next) => {
  const origin = req.get('origin');
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173',
  ].filter(Boolean);

  if (origin && !allowedOrigins.includes(origin)) {
    logger.warn(`Request from unauthorized origin: ${origin}`);
    return next(new AppError('Unauthorized origin', 403));
  }

  next();
};

/**
 * Log security events
 */
const logSecurityEvent = (eventType) => {
  return (req, res, next) => {
    logger.info(`Security Event: ${eventType}`, {
      user: req.user?.email,
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('user-agent'),
    });
    next();
  };
};

/**
 * Prevent NoSQL injection
 */
const preventNoSQLInjection = (req, res, next) => {
  const checkForInjection = (obj) => {
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (key.startsWith('$') || key.includes('.')) {
          return true;
        }
        if (typeof obj[key] === 'object') {
          if (checkForInjection(obj[key])) {
            return true;
          }
        }
      }
    }
    return false;
  };

  if (checkForInjection(req.body) || checkForInjection(req.query)) {
    logger.warn(`NoSQL injection attempt detected from IP: ${req.ip}`);
    return next(new AppError('Invalid request format', 400));
  }

  next();
};

/**
 * Require HTTPS in production
 */
const requireHTTPS = (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
};

module.exports = {
  sanitizeRequest,
  detectAttacks,
  validateObjectId,
  preventParameterPollution,
  setSecurityHeaders,
  bruteForceProtection,
  validateOrigin,
  logSecurityEvent,
  preventNoSQLInjection,
  requireHTTPS,
};
