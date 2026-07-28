const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const organizerRepository = require('./organizer.repository');
const sessionRepository = require('../../repositories/session.repository');
const { AppError }        = require('../../middleware/errorHandler');
const {
  blacklistToken,
  storeRedisToken,
  getRedisToken,
  deleteRedisToken,
} = require('../../utils/auth.helper');
const { sendPasswordResetEmail } = require('../../utils/email');
const logger = require('../../utils/logger');
const UserAgentParser = require('../../utils/userAgentParser');
const verificationCodeService = require('../../services/verification-code.service');

const generateToken = (id, role) =>
  jwt.sign({ id, role, type: 'organizer' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

const generateRefreshToken = (id) =>
  jwt.sign({ id, type: 'organizer' }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  });

const register = async (data) => {
  const existing = await organizerRepository.findByEmail(data.email);
  if (existing) throw new AppError('Email already registered', 400);

  if (data.phone) {
    const existingPhone = await organizerRepository.findByPhone(data.phone);
    if (existingPhone) throw new AppError('Phone number already registered', 400);
  }

  if (!data.phone) throw new AppError('Phone number is required', 400);
  await verificationCodeService.consumeMany([
    { channel: 'email', destination: data.email, verificationToken: data.emailVerificationToken },
    { channel: 'phone', destination: data.phone, verificationToken: data.phoneVerificationToken },
  ]);

  const organizer = await organizerRepository.create({
    ...data,
    isEmailVerified: true,
    isPhoneVerified: true,
  });

  const token        = generateToken(organizer.id, organizer.role);
  const refreshToken = generateRefreshToken(organizer.id);

  const result = {
    organizer: {
      id: organizer.id, displayId: organizer.displayId, name: organizer.name, email: organizer.email,
      businessName: organizer.businessName, isVerified: !!organizer.isVerified,
      isKycVerified: !!organizer.isKycVerified,
    },
    token, refreshToken,
  };

  return result;
};

const login = async (email, password, ipAddress = null, userAgent = null) => {
  try {
    const organizer = await organizerRepository.findByEmailWithPassword(email);
    if (!organizer || !(await organizer.comparePassword(password))) {
      throw new AppError('Invalid email or password', 401);
    }
    if (!organizer.isActive) throw new AppError('Account is deactivated', 403);

    await organizerRepository.updateLastLogin(organizer.id);

    const token        = generateToken(organizer.id, organizer.role);
    const refreshToken = generateRefreshToken(organizer.id);

    // Store session in database
    try {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const deviceInfo = UserAgentParser.parse(userAgent);
      const locationData = await UserAgentParser.getLocation(ipAddress);

      await sessionRepository.create({
        user_id: organizer.id,
        session_token: token,
        refresh_token: refreshToken,
        role: organizer.role,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        device_type: deviceInfo.device_type,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        expires_at: expiresAt,
        session_data: { loginMethod: 'email' },
        location_data: locationData,
      });

      await sessionRepository.logActivity({
        session_id: null,
        user_id: organizer.id,
        action: 'login',
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        action_details: { method: 'email', email: organizer.email },
      });
    } catch (error) {
      logger.error('Failed to create session after organizer login', { error: error.message, organizerId: organizer.id });
      // Continue with login even if session creation fails
    }

    return {
      organizer: {
        id: organizer.id, displayId: organizer.displayId, name: organizer.name, email: organizer.email,
        businessName: organizer.businessName,
        isVerified: !!organizer.isVerified, isKycVerified: !!organizer.isKycVerified,
      },
      token, refreshToken,
    };
  } catch (error) {
    logger.error('Organizer login failed', { error: error.message, email });
    throw error;
  }
};

const logout = async (token, organizerId = null) => {
  // Blacklist token in Redis
  if (token) await blacklistToken(token);

  // Revoke session in database if organizerId provided
  if (organizerId && token) {
    try {
      const session = await sessionRepository.findByToken(token);
      if (session && String(session.user_id) === String(organizerId)) {
        await sessionRepository.revoke(session.session_id, organizerId, 'Organizer logout');
        await sessionRepository.logActivity({
          session_id: session.session_id,
          user_id: organizerId,
          action: 'logout',
          action_details: { method: 'manual' },
        });
      }
    } catch (error) {
      logger.error('Failed to revoke session during organizer logout', { error: error.message, organizerId });
    }
  }
};

const refreshToken = async (refreshTokenValue, ipAddress = null, userAgent = null) => {
  try {
    const decoded = jwt.verify(refreshTokenValue, process.env.JWT_REFRESH_SECRET);
    if (decoded.type !== 'organizer') throw new AppError('Invalid token type', 401);
    
    const organizer = await organizerRepository.findById(decoded.id);
    if (!organizer) throw new AppError('Organizer not found', 404);
    if (!organizer.isActive) throw new AppError('Account is deactivated', 403);

    // Find session by refresh token
    const session = await sessionRepository.findByRefreshToken(refreshTokenValue);
    if (!session || !session.is_active) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    // Check if session belongs to the organizer
    if (String(session.user_id) !== String(organizer.id)) {
      throw new AppError('Token does not belong to organizer', 401);
    }

    // Generate new tokens
    const newToken = generateToken(organizer.id, organizer.role);
    const newRefreshToken = generateRefreshToken(organizer.id);

    // Update session with new tokens
    await sessionRepository.updateTokens(session.session_id, newToken, newRefreshToken);
    await sessionRepository.updateLastActivity(session.session_id);

    await sessionRepository.logActivity({
      session_id: session.session_id,
      user_id: organizer.id,
      action: 'refresh',
      ip_address: ipAddress,
      user_agent: userAgent,
      action_details: { previousToken: refreshTokenValue?.substring(0, 20) + '...' },
    });

    return { token: newToken, refreshToken: newRefreshToken };
  } catch (error) {
    logger.error('Organizer refresh token failed', { error: error.message });
    throw new AppError('Invalid refresh token', 401);
  }
};

const verifyEmail = async (token) => {
  if (!token) throw new AppError('Verification token is required', 400);
  const organizerId = await getRedisToken('org_verify', token);
  if (!organizerId) throw new AppError('Invalid or expired verification token', 400);
  await organizerRepository.verifyOrganizer(organizerId);
  await deleteRedisToken('org_verify', token);
};

const forgotPassword = async (email) => {
  const organizer = await organizerRepository.findByEmail(email);
  if (!organizer) throw new AppError('No organizer account found with this email', 404);

  const resetToken = crypto.randomBytes(32).toString('hex');
  await storeRedisToken('org_reset', resetToken, organizer.id);

  try {
    await sendPasswordResetEmail({
      to: organizer.email,
      name: organizer.name,
      token: resetToken,
    });
    logger.info(`Password reset email sent to ${organizer.email}`);
  } catch (e) {
    logger.error('Failed to send password reset email', { error: e.message, email });
    // Continue even if email fails - token is still stored
  }

  if (process.env.NODE_ENV === 'production') return { resetToken };
  return {};
};

const resetPassword = async (token, newPassword) => {
  if (!token) throw new AppError('Reset token is required', 400);
  const organizerId = await getRedisToken('org_reset', token);
  if (!organizerId) throw new AppError('Invalid or expired reset token', 400);
  await organizerRepository.updatePassword(organizerId, newPassword);
  await deleteRedisToken('org_reset', token);
};

module.exports = { register, login, logout, refreshToken, verifyEmail, forgotPassword, resetPassword };
