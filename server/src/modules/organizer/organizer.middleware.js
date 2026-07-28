const jwt = require('jsonwebtoken');
const { AppError }       = require('../../middleware/errorHandler');
const organizerRepository = require('./organizer.repository');

const authenticateOrganizer = async (req, res, next) => {
  try {
    const token = req.cookies.organizer_token || req.headers.authorization?.split(' ')[1];
    if (!token) {
      return next(new AppError('Organizer authentication required', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'organizer') {
      return next(new AppError('Invalid token type', 401));
    }

    const organizer = await organizerRepository.findById(decoded.id);
    if (!organizer) {
      return next(new AppError('Organizer not found', 401));
    }
    if (!organizer.isActive) {
      return next(new AppError('Account is deactivated', 403));
    }
    if (organizer.role !== 'organizer') {
      return next(new AppError('User is not an organizer', 403));
    }

    req.organizer = {
      id:           String(organizer.id),
      name:         organizer.name,
      email:        organizer.email,
      businessName: organizer.businessName,
      isVerified:   !!organizer.isVerified,
      isKycVerified:!!organizer.isKycVerified,
      role:         'organizer',
    };

    // Also set req.user for compatibility with controllers that expect it
    req.user = {
      id:           String(organizer.id),
      name:         organizer.name,
      email:        organizer.email,
      role:         'organizer',
      isVerified:   !!organizer.isVerified,
      kycStatus:    organizer.kycStatus,
      bankVerificationStatus: organizer.bankVerificationStatus,
    };

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

module.exports = { authenticateOrganizer };
