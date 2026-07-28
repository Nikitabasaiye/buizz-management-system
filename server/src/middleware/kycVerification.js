const { getMySQLPool } = require('../database/mysql');
const { AppError } = require('./errorHandler');
const logger = require('../utils/logger');

/**
 * Middleware to check if user has completed KYC and bank verification
 * Should be used after authenticate middleware
 */
const requireKycVerification = async (req, res, next) => {
  try {
    // Skip check for admin and super_admin
    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      return next();
    }

    const pool = getMySQLPool();
    
    const [users] = await pool.query(
      `SELECT user_id, name, email, role, kyc_status, bank_verification_status 
       FROM users 
       WHERE user_id = ? AND is_active = 1`,
      [req.user.id]
    );

    if (!users || users.length === 0) {
      return next(new AppError('User not found', 404));
    }

    const user = users[0];

    // Accept both 'verified' (legacy) and 'approved' (new status)
    const kycOk = user.kyc_status === 'verified' || user.kyc_status === 'approved';
    const bankOk = user.bank_verification_status === 'verified' || user.bank_verification_status === 'approved';

    if (!kycOk) {
      logger.warn('Access blocked - KYC not verified', { 
        userId: req.user.id, 
        path: req.path,
        kycStatus: user.kyc_status 
      });
      
      return next(new AppError(
        'Complete KYC verification before publishing events.',
        403,
        { reason: 'kyc_not_verified', kycStatus: user.kyc_status, bankStatus: user.bank_verification_status }
      ));
    }

    if (!bankOk) {
      logger.warn('Access blocked - Bank not verified', { 
        userId: req.user.id, 
        path: req.path,
        bankStatus: user.bank_verification_status 
      });
      
      return next(new AppError(
        'Complete bank verification before publishing events.',
        403,
        { reason: 'bank_not_verified', kycStatus: user.kyc_status, bankStatus: user.bank_verification_status }
      ));
    }

    // KYC and bank both verified - allow access
    logger.info('KYC verification check passed', { 
      userId: req.user.id,
      path: req.path 
    });
    
    // Attach KYC info to request for use in controllers
    req.user.kycVerified = true;
    req.user.bankVerified = true;
    
    next();
  } catch (error) {
    logger.error('KYC verification middleware error', { 
      error: error.message,
      userId: req.user?.id 
    });
    next(error);
  }
};

/**
 * Middleware to check KYC status and attach to request (doesn't block)
 * Use this when you need KYC info but don't want to block the request
 */
const attachKycStatus = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next();
    }

    const pool = getMySQLPool();
    
    const [users] = await pool.query(
      `SELECT kyc_status, bank_verification_status 
       FROM users 
       WHERE user_id = ?`,
      [req.user.id]
    );

    if (users && users.length > 0) {
      req.user.kycStatus = users[0].kyc_status;
      req.user.bankVerificationStatus = users[0].bank_verification_status;
      req.user.kycVerified = users[0].kyc_status === 'verified';
      req.user.bankVerified = users[0].bank_verification_status === 'verified';
    }

    next();
  } catch (error) {
    logger.error('Attach KYC status middleware error', { error: error.message });
    // Don't block the request on error
    next();
  }
};

/**
 * Check if KYC is required for specific action
 * Use in service layer for flexible checks
 */
const isKycRequired = (userRole) => {
  // Only organizers need KYC verification
  return userRole === 'organizer';
};

/**
 * Get user KYC status
 */
const getUserKycStatus = async (userId) => {
  const pool = getMySQLPool();
  
  const [users] = await pool.query(
    `SELECT kyc_status, bank_verification_status, kyc_verified_at, kyc_verified_by
     FROM users 
     WHERE user_id = ?`,
    [userId]
  );

  if (!users || users.length === 0) {
    return null;
  }

  return {
    kycStatus: users[0].kyc_status,
    bankStatus: users[0].bank_verification_status,
    verifiedAt: users[0].kyc_verified_at,
    verifiedBy: users[0].kyc_verified_by,
    isKycVerified: users[0].kyc_status === 'verified',
    isBankVerified: users[0].bank_verification_status === 'verified',
    isFullyVerified: users[0].kyc_status === 'verified' && users[0].bank_verification_status === 'verified'
  };
};

module.exports = {
  requireKycVerification,
  attachKycStatus,
  isKycRequired,
  getUserKycStatus
};
