const jwt = require('jsonwebtoken');
const { AppError } = require('../../middleware/errorHandler');
const { isTokenBlacklisted } = require('../../utils/auth.helper');
const influencerRepository = require('./influencer.repository');

const authenticateInfluencer = async (req, res, next) => {
  try {
    const token = req.cookies.influencer_token || req.headers.authorization?.split(' ')[1];
    if (!token) return next(new AppError('Influencer authentication required', 401));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'influencer') return next(new AppError('Invalid token type', 401));

    if (await isTokenBlacklisted(token)) return next(new AppError('Token has been revoked', 401));

    const influencer = await influencerRepository.findById(decoded.id);
    if (!influencer) return next(new AppError('Influencer not found', 401));
    if (!influencer.is_active) return next(new AppError('Account is deactivated', 403));

    req.influencer = {
      id: String(influencer.id),
      name: influencer.name,
      email: influencer.email,
      role: 'influencer',
      isVerified: !!influencer.is_verified,
      niche: influencer.niche,
    };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') return next(new AppError('Invalid token', 401));
    if (error.name === 'TokenExpiredError') return next(new AppError('Token has expired', 401));
    next(new AppError('Authentication failed', 401));
  }
};

const requireVerifiedInfluencer = (req, res, next) => {
  if (!req.influencer?.isVerified) {
    return next(new AppError('Please verify your email before continuing', 403));
  }
  next();
};

module.exports = { authenticateInfluencer, requireVerifiedInfluencer };
