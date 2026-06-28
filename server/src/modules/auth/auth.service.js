const jwt = require('jsonwebtoken');
const userRepository = require('../users/user.repository');
const { AppError } = require('../../middleware/errorHandler');
const {
  generateAccessToken, generateRefreshToken, generateSecureToken,
  blacklistToken, storeRedisToken, getRedisToken, deleteRedisToken,
} = require('../../utils/auth.helper');
const { USER_ROLES } = require('../../constants');
const logger = require('../../utils/logger');

const register = async (userData) => {
  const requestedRole = userData.role || USER_ROLES.USER;
  const publicRoles = [USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.INFLUENCER];
  const adminRoles = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN];

  if (![...publicRoles, ...adminRoles].includes(requestedRole)) {
    throw new AppError('Invalid role', 400);
  }

  if (adminRoles.includes(requestedRole)) {
    if (!process.env.ADMIN_REGISTRATION_SECRET) {
      throw new AppError('Admin registration is disabled', 403);
    }

    if (userData.adminSecret !== process.env.ADMIN_REGISTRATION_SECRET) {
      throw new AppError('Invalid admin registration secret', 403);
    }
  }

  const existing = await userRepository.findByEmail(userData.email);
  if (existing) throw new AppError('Email already registered', 400);

  const { adminSecret, ...safeUserData } = userData;
  const user = await userRepository.create({ ...safeUserData, role: requestedRole });

  const verifyToken = generateSecureToken();
  await storeRedisToken('user_verify', verifyToken, user.id);

  // Send verification email (synchronous for now - can be made async later)
  logger.info('User registered - verification token generated', { userId: user.id, email: user.email });

  const token = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id, user.role);

  const result = {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    token,
    refreshToken,
  };

  if (process.env.NODE_ENV === 'development') {
    result.verificationToken = verifyToken;
  }

  return result;
};

const login = async (email, password) => {
  const user = await userRepository.findByEmailWithPassword(email);

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }
  if (!user.isActive) throw new AppError('Account is deactivated', 403);

  await userRepository.updateLastLogin(user.id);

  const token = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id, user.role);

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role, isVerified: user.isVerified },
    token,
    refreshToken,
  };
};

const logout = async (token) => blacklistToken(token);

const refreshToken = async (refreshTokenValue) => {
  try {
    const decoded = jwt.verify(refreshTokenValue, process.env.JWT_REFRESH_SECRET);
    if (!decoded.id) throw new AppError('Invalid token', 401);
    const user = await userRepository.findById(decoded.id);
    if (!user) throw new AppError('User not found', 404);
    return {
      token: generateAccessToken(user.id, user.role),
      refreshToken: generateRefreshToken(user.id, user.role),
    };
  } catch {
    throw new AppError('Invalid refresh token', 401);
  }
};

const verifyEmail = async (token) => {
  if (!token) throw new AppError('Verification token is required', 400);
  const userId = await getRedisToken('user_verify', token);
  if (!userId) throw new AppError('Invalid or expired verification token', 400);
  await userRepository.verifyUser(userId);
  await deleteRedisToken('user_verify', token);
};

const forgotPassword = async (email) => {
  const user = await userRepository.findByEmail(email);
  if (!user) throw new AppError('No account found with this email', 404);

  const resetToken = generateSecureToken();
  await storeRedisToken('user_reset', resetToken, user.id);

  // Send password reset email (synchronous for now - can be made async later)
  logger.info('Password reset requested', { userId: user.id, email: user.email });

  if (process.env.NODE_ENV === 'development') return { resetToken };
  return {};
};

const resetPassword = async (token, newPassword) => {
  if (!token) throw new AppError('Reset token is required', 400);
  const userId = await getRedisToken('user_reset', token);
  if (!userId) throw new AppError('Invalid or expired reset token', 400);
  await userRepository.updatePassword(userId, newPassword);
  await deleteRedisToken('user_reset', token);
};

module.exports = { register, login, logout, refreshToken, verifyEmail, forgotPassword, resetPassword };
