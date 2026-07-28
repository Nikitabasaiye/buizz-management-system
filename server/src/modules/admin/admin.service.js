const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const adminRepository = require('./admin.repository');
const sessionRepository = require('../../repositories/session.repository');
const { AppError } = require('../../middleware/errorHandler');
const {
  generateAccessToken, generateRefreshToken, generateSecureToken,
  blacklistToken, storeRedisToken, getRedisToken, deleteRedisToken,
} = require('../../utils/auth.helper');
const logger = require('../../utils/logger');
const UserAgentParser = require('../../utils/userAgentParser');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

  async googleLogin(idToken) {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    }).catch(() => { throw new AppError('Invalid Google token', 401); });

    const { email } = ticket.getPayload();

    const admin = await adminRepository.findByEmail(email);
    if (!admin) throw new AppError('No admin account found for this Google account', 403);
    if (!admin.is_active) throw new AppError('Account is deactivated', 403);

    await adminRepository.updateLastLogin(admin.id);
    const token = generateAccessToken(admin.id, 'admin');
    const refreshToken = generateRefreshToken(admin.id, 'admin');

    logger.info('Admin Google login', { adminId: admin.id });
    return {
      admin: { id: admin.id, name: admin.name, email: admin.email, isSuperAdmin: admin.is_super_admin },
      token,
      refreshToken,
    };
  }

  async login(email, password, ipAddress = null, userAgent = null) {
    const admin = await adminRepository.findByEmailWithPassword(email);
    if (!admin || !(await admin.comparePassword(password))) {
      throw new AppError('Invalid email or password', 401);
    }
    if (!admin.is_active) throw new AppError('Account is deactivated', 403);

    await adminRepository.updateLastLogin(admin.id);
    const token = generateAccessToken(admin.id, 'admin');
    const refreshToken = generateRefreshToken(admin.id, 'admin');

    // Store session in database
    try {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const deviceInfo = UserAgentParser.parse(userAgent);
      const locationData = await UserAgentParser.getLocation(ipAddress);

      await sessionRepository.create({
        user_id: admin.id,
        session_token: token,
        refresh_token: refreshToken,
        role: admin.is_super_admin ? 'super_admin' : 'admin',
        ip_address: ipAddress,
        user_agent: userAgent,
        device_type: deviceInfo.device_type,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        expires_at: expiresAt,
        session_data: { loginMethod: 'email', isSuperAdmin: admin.is_super_admin },
        location_data: locationData,
      });

      await sessionRepository.logActivity({
        session_id: null,
        user_id: admin.id,
        action: 'login',
        ip_address: ipAddress,
        user_agent: userAgent,
        action_details: { method: 'email', email: admin.email, isSuperAdmin: admin.is_super_admin },
      });
    } catch (error) {
      logger.error('Failed to create session after admin login', { error: error.message, adminId: admin.id });
      // Continue with login even if session creation fails
    }

    logger.info('Admin logged in', { adminId: admin.id });
    return {
      admin: { id: admin.id, name: admin.name, email: admin.email, isSuperAdmin: admin.is_super_admin },
      token,
      refreshToken,
    };
  }

  async logout(token, adminId = null) {
    // Blacklist token in Redis
    await blacklistToken(token);

    // Revoke session in database if adminId provided
    if (adminId && token) {
      try {
        const session = await sessionRepository.findByToken(token);
        if (session && String(session.user_id) === String(adminId)) {
          await sessionRepository.revoke(session.session_id, adminId, 'Admin logout');
          await sessionRepository.logActivity({
            session_id: session.session_id,
            user_id: adminId,
            action: 'logout',
            action_details: { method: 'manual' },
          });
        }
      } catch (error) {
        logger.error('Failed to revoke session during admin logout', { error: error.message, adminId });
      }
    }
  }

  async refreshToken(refreshTokenValue, ipAddress = null, userAgent = null) {
    try {
      const decoded = jwt.verify(refreshTokenValue, process.env.JWT_REFRESH_SECRET);
      if (decoded.type !== 'admin') throw new AppError('Invalid token type', 401);
      
      const admin = await adminRepository.findById(decoded.id);
      if (!admin) throw new AppError('Admin not found', 404);
      if (!admin.is_active) throw new AppError('Account is deactivated', 403);

      // Find session by refresh token
      const session = await sessionRepository.findByRefreshToken(refreshTokenValue);
      if (!session || !session.is_active) {
        throw new AppError('Invalid or expired refresh token', 401);
      }

      // Check if session belongs to the admin
      if (String(session.user_id) !== String(admin.id)) {
        throw new AppError('Token does not belong to admin', 401);
      }

      // Generate new tokens
      const newToken = generateAccessToken(admin.id, 'admin');
      const newRefreshToken = generateRefreshToken(admin.id, 'admin');

      // Update session with new tokens
      await sessionRepository.updateTokens(session.session_id, newToken, newRefreshToken);
      await sessionRepository.updateLastActivity(session.session_id);

      await sessionRepository.logActivity({
        session_id: session.session_id,
        user_id: admin.id,
        action: 'refresh',
        ip_address: ipAddress,
        user_agent: userAgent,
        action_details: { previousToken: refreshTokenValue?.substring(0, 20) + '...' },
      });

      return {
        token: newToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      logger.error('Admin refresh token failed', { error: error.message });
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
