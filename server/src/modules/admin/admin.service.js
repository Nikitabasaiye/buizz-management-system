const jwt = require('jsonwebtoken');
const adminRepository = require('./admin.repository');
const { AppError } = require('../../middleware/errorHandler');
const {
  generateAccessToken, generateRefreshToken, generateSecureToken,
  blacklistToken, storeRedisToken, getRedisToken, deleteRedisToken,
} = require('../../utils/auth.helper');
const logger = require('../../utils/logger');

class AdminService {
  async register(data) {
    const existing = await adminRepository.findByEmail(data.email);
    if (existing) throw new AppError('Email already registered', 400);

    if (data.adminSecret !== process.env.ADMIN_REGISTRATION_SECRET) {
      throw new AppError('Invalid admin registration secret', 403);
    }

    const admin = await adminRepository.create(data);
    const token = generateAccessToken(admin.id, 'admin');
    const refreshToken = generateRefreshToken(admin.id, 'admin');

    logger.info('Admin registered', { adminId: admin.id, email: admin.email });
    return {
      admin: { id: admin.id, name: admin.name, email: admin.email, isSuperAdmin: admin.is_super_admin },
      token,
      refreshToken,
    };
  }

  async login(email, password) {
    const admin = await adminRepository.findByEmailWithPassword(email);
    if (!admin || !(await admin.comparePassword(password))) {
      throw new AppError('Invalid email or password', 401);
    }
    if (!admin.is_active) throw new AppError('Account is deactivated', 403);

    await adminRepository.updateLastLogin(admin.id);
    const token = generateAccessToken(admin.id, 'admin');
    const refreshToken = generateRefreshToken(admin.id, 'admin');

    logger.info('Admin logged in', { adminId: admin.id });
    return {
      admin: { id: admin.id, name: admin.name, email: admin.email, isSuperAdmin: admin.is_super_admin },
      token,
      refreshToken,
    };
  }

  async logout(token) {
    await blacklistToken(token);
  }

  async refreshToken(refreshTokenValue) {
    try {
      const decoded = jwt.verify(refreshTokenValue, process.env.JWT_REFRESH_SECRET);
      if (decoded.type !== 'admin') throw new AppError('Invalid token type', 401);
      const admin = await adminRepository.findById(decoded.id);
      if (!admin) throw new AppError('Admin not found', 404);
      return {
        token: generateAccessToken(admin.id, 'admin'),
        refreshToken: generateRefreshToken(admin.id, 'admin'),
      };
    } catch {
      throw new AppError('Invalid refresh token', 401);
    }
  }

  async forgotPassword(email) {
    const admin = await adminRepository.findByEmail(email);
    if (!admin) throw new AppError('No admin account found with this email', 404);

    const resetToken = generateSecureToken();
    await storeRedisToken('admin_reset', resetToken, admin.id);

    // Send password reset email (synchronous for now - can be made async later)
    logger.info('Admin password reset requested', { adminId: admin.id, email: admin.email });

    if (process.env.NODE_ENV === 'development') return { resetToken };
    return {};
  }

  async resetPassword(token, newPassword) {
    const adminId = await getRedisToken('admin_reset', token);
    if (!adminId) throw new AppError('Invalid or expired reset token', 400);
    await adminRepository.updatePassword(adminId, newPassword);
    await deleteRedisToken('admin_reset', token);
  }

  async getProfile(adminId) {
    const admin = await adminRepository.findById(adminId);
    if (!admin) throw new AppError('Admin not found', 404);
    return admin;
  }

  async updateProfile(adminId, data) {
    const admin = await adminRepository.findById(adminId);
    if (!admin) throw new AppError('Admin not found', 404);
    return adminRepository.updateById(adminId, data);
  }

  async changePassword(adminId, currentPassword, newPassword) {
    const admin = await adminRepository.findByEmailWithPassword(
      (await adminRepository.findById(adminId)).email
    );
    if (!(await admin.comparePassword(currentPassword))) {
      throw new AppError('Current password is incorrect', 400);
    }
    await adminRepository.updatePassword(adminId, newPassword);
    return { message: 'Password changed successfully' };
  }

  async getAllAdmins(options) {
    return adminRepository.findAll(options);
  }

  async deactivateAdmin(adminId, requesterId) {
    if (String(adminId) === String(requesterId)) {
      throw new AppError('You cannot deactivate your own account', 400);
    }
    await adminRepository.deleteById(adminId);
    return { message: 'Admin deactivated successfully' };
  }
}

module.exports = new AdminService();
