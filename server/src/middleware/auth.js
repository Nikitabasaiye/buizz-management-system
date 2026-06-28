const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');
const { getRedisClient } = require('../database/redis');
const userRepository = require('../modules/users/user.repository');

const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new AppError('Authentication required', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is blacklisted
    const redis = getRedisClient();
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    
    if (isBlacklisted) {
      return next(new AppError('Token is invalid', 401));
    }

    const user = await userRepository.findById(decoded.id);
    if (!user || !user.isActive) {
      return next(new AppError('User account is inactive or no longer exists', 401));
    }

    req.auth = decoded;
    req.user = {
      id: user.id,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      kycStatus: user.kycStatus,
      bankVerificationStatus: user.bankVerificationStatus,
      organizationId: user.organizationId
    };

    next();
  } catch (error) {
    next(new AppError('Invalid or expired token', 401));
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    next();
  };
};

const authorizeSelfOrRoles = (getOwnerId, ...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (roles.includes(req.user.role)) {
      return next();
    }

    const ownerId = typeof getOwnerId === 'function' ? getOwnerId(req) : req.params[getOwnerId];
    if (String(ownerId) === String(req.user.id)) {
      return next();
    }

    return next(new AppError('You do not have permission to perform this action', 403));
  };
};

const requireVerifiedEmail = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  if (!req.user.isVerified) {
    return next(new AppError('Please verify your email before performing this action', 403));
  }

  next();
};

module.exports = {
  authenticate,
  authorize,
  authorizeSelfOrRoles,
  requireVerifiedEmail
};
