const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');
const { getRedisClient } = require('../database/redis');
const userRepository = require('../modules/users/user.repository');
const { hasPermission, hasAnyPermission, hasAllPermissions } = require('../config/permissions');
const logger = require('../utils/logger');

/**
 * Authenticate user with JWT token
 * Validates token, checks blacklist, and loads user data
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from cookie or Authorization header
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new AppError('Authentication required', 401));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is blacklisted (logout)
    const redis = getRedisClient();
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    
    if (isBlacklisted) {
      return next(new AppError('Token has been revoked', 401));
    }

    // Load user from database
    const user = await userRepository.findById(decoded.id);
    
    if (!user) {
      return next(new AppError('User not found', 401));
    }

    if (!user.isActive) {
      return next(new AppError('Account is deactivated', 403));
    }

    // Attach user data to request
    req.auth = decoded;
    req.user = {
      id: String(user.id),
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      kycStatus: user.kycStatus,
      bankVerificationStatus: user.bankVerificationStatus,
      organizationId: user.organizationId,
      permissions: require('../config/permissions').getRolePermissions(user.role)
    };

    logger.info(`User authenticated: ${user.email} (${user.role})`);
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token has expired', 401));
    }
    next(new AppError('Authentication failed', 401));
  }
};

/**
 * Authorize user based on roles
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by ${req.user.email} to ${req.path}`);
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    next();
  };
};

/**
 * Authorize user based on permissions
 * @param {...string} permissions - Required permissions
 */
const requirePermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const hasRequiredPermission = permissions.every(permission => 
      hasPermission(req.user.role, permission)
    );

    if (!hasRequiredPermission) {
      logger.warn(`Permission denied for ${req.user.email}: Required ${permissions.join(', ')}`);
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

/**
 * Authorize user if they have ANY of the specified permissions
 * @param {...string} permissions - Any of these permissions
 */
const requireAnyPermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const hasAny = hasAnyPermission(req.user.role, permissions);

    if (!hasAny) {
      logger.warn(`Permission denied for ${req.user.email}: Required any of ${permissions.join(', ')}`);
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

/**
 * Authorize user to access their own resources or if they have specific roles
 * @param {string|function} getOwnerId - Parameter name or function to get owner ID
 * @param {...string} roles - Roles that can access any resource
 */
const authorizeSelfOrRoles = (getOwnerId, ...roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    // Check if user has privileged role
    if (roles.includes(req.user.role)) {
      return next();
    }

    // Get owner ID from request
    let ownerId;
    if (typeof getOwnerId === 'function') {
      ownerId = await getOwnerId(req);
    } else {
      ownerId = req.params[getOwnerId] || req.body[getOwnerId];
    }

    // Check if user is the owner
    if (String(ownerId) === String(req.user.id)) {
      return next();
    }

    logger.warn(`Unauthorized resource access by ${req.user.email}`);
    return next(new AppError('You do not have permission to access this resource', 403));
  };
};

/**
 * Require verified email
 */
const requireVerifiedEmail = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  if (!req.user.isVerified) {
    return next(new AppError('Please verify your email before performing this action', 403));
  }

  next();
};

/**
 * Require organization membership
 */
const requireOrganization = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  if (!req.user.organizationId) {
    return next(new AppError('You must be part of an organization to perform this action', 403));
  }

  next();
};

/**
 * Check if user owns the organization
 */
const requireOrganizationOwnership = async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  const organizationId = req.params.organizationId || req.body.organizationId || req.user.organizationId;

  if (!organizationId) {
    return next(new AppError('Organization ID is required', 400));
  }

  // Admin can access any organization
  if (req.user.role === 'admin') {
    return next();
  }

  // Check if user's organization matches
  if (String(req.user.organizationId) !== String(organizationId)) {
    return next(new AppError('You do not have access to this organization', 403));
  }

  next();
};

/**
 * Rate limiting per user
 */
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const redis = getRedisClient();
    const key = `ratelimit:user:${req.user.id}`;
    
    const requests = await redis.incr(key);
    
    if (requests === 1) {
      await redis.expire(key, Math.floor(windowMs / 1000));
    }

    if (requests > maxRequests) {
      return next(new AppError('Too many requests, please try again later', 429));
    }

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - requests));

    next();
  };
};

/**
 * Audit log middleware
 */
const auditLog = (action) => {
  return (req, res, next) => {
    const logData = {
      action,
      user: req.user ? {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      } : null,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date(),
      path: req.path,
      method: req.method,
      params: req.params,
      query: req.query,
    };

    logger.info('Audit Log:', logData);

    // Store in database or separate audit log system
    // await AuditLog.create(logData);

    next();
  };
};

/**
 * Check if user can modify resource
 */
const canModifyResource = (resourceType) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    // Admin can modify anything
    if (req.user.role === 'admin') {
      return next();
    }

    // Load resource and check ownership
    const resourceId = req.params.id;
    
    // This should be implemented based on resource type
    // For now, we'll pass through and let the service layer handle it
    
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  requirePermission,
  requireAnyPermission,
  authorizeSelfOrRoles,
  requireVerifiedEmail,
  requireOrganization,
  requireOrganizationOwnership,
  userRateLimit,
  auditLog,
  canModifyResource,
};
