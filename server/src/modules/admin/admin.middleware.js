const jwt = require('jsonwebtoken');
const { AppError } = require('../../middleware/errorHandler');
const { isTokenBlacklisted } = require('../../utils/auth.helper');
const adminRepository = require('./admin.repository');

const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.cookies.admin_token || req.headers.authorization?.split(' ')[1];
    if (!token) return next(new AppError('Admin authentication required', 401));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'admin') return next(new AppError('Invalid token type', 401));

    if (await isTokenBlacklisted(token)) return next(new AppError('Token has been revoked', 401));

    const admin = await adminRepository.findById(decoded.id);
    if (!admin) return next(new AppError('Admin not found', 401));
    if (!admin.is_active) return next(new AppError('Account is deactivated', 403));

    req.admin = {
      id: String(admin.id),
      name: admin.name,
      email: admin.email,
      role: 'admin',
      isSuperAdmin: !!admin.is_super_admin,
      permissions: admin.permissions || [],
    };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') return next(new AppError('Invalid token', 401));
    if (error.name === 'TokenExpiredError') return next(new AppError('Token has expired', 401));
    next(new AppError('Authentication failed', 401));
  }
};

const requireSuperAdmin = (req, res, next) => {
  if (!req.admin?.isSuperAdmin) {
    return next(new AppError('Super admin access required', 403));
  }
  next();
};

module.exports = { authenticateAdmin, requireSuperAdmin };
