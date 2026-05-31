const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const userRepository = require('../users/user.repository');
const { AppError } = require('../../middleware/errorHandler');
const { getRedisClient } = require('../../database/redis');
const { emailQueue } = require('../../queues');
const { USER_ROLES } = require('../../constants');

const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE
  });
};

const register = async (userData) => {
  const requestedRole = userData.role || USER_ROLES.USER;
  const publicRoles = [USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.INFLUENCER];

  if (requestedRole === USER_ROLES.ADMIN) {
    if (!process.env.ADMIN_REGISTRATION_SECRET || userData.adminSecret !== process.env.ADMIN_REGISTRATION_SECRET) {
      throw new AppError('Admin registration is not allowed', 403);
    }
  } else if (!publicRoles.includes(requestedRole)) {
    throw new AppError('Invalid role for public registration', 400);
  }

  userData.role = requestedRole;

  const existingUser = await userRepository.findByEmail(userData.email);
  if (existingUser) {
    throw new AppError('Email already registered', 400);
  }

  const user = await userRepository.create(userData);
  
  // Generate verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const redis = getRedisClient();
  await redis.setEx(`verify:${verificationToken}`, 3600, user._id.toString());

  // Send verification email
  await emailQueue.add('verification', {
    to: user.email,
    subject: 'Verify your email',
    token: verificationToken
  });

  const token = generateToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  const result = {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    token,
    refreshToken
  };

  if (process.env.NODE_ENV === 'development') {
    result.verificationToken = verificationToken;
  }

  return result;
};

const login = async (email, password) => {
  const user = await userRepository.findByEmailWithPassword(email);
  
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated', 403);
  }

  await userRepository.updateLastLogin(user._id);

  const token = generateToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified
    },
    token,
    refreshToken
  };
};

const logout = async (token) => {
  const redis = getRedisClient();
  await redis.setEx(`blacklist:${token}`, 900, 'true');
};

const refreshToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await userRepository.findById(decoded.id);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const newToken = generateToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);

    return { token: newToken, refreshToken: newRefreshToken };
  } catch (error) {
    throw new AppError('Invalid refresh token', 401);
  }
};

const verifyEmail = async (token) => {
  if (!token) {
    throw new AppError('Verification token is required', 400);
  }

  const redis = getRedisClient();
  const userId = await redis.get(`verify:${token}`);
  
  if (!userId) {
    if (process.env.NODE_ENV === 'development') {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        await userRepository.verifyUser(decoded.id);
        return;
      } catch (error) {
        // Fall through to the normal verification-token error below.
      }
    }

    throw new AppError('Invalid or expired verification token', 400);
  }

  await userRepository.verifyUser(userId);
  await redis.del(`verify:${token}`);
};

const forgotPassword = async (email) => {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const redis = getRedisClient();
  await redis.setEx(`reset:${resetToken}`, 3600, user._id.toString());

  await emailQueue.add('passwordReset', {
    to: user.email,
    subject: 'Password Reset',
    token: resetToken
  });

  if (process.env.NODE_ENV === 'development') {
    return { resetToken };
  }

  return {};
};

const resetPassword = async (token, newPassword) => {
  if (!token) {
    throw new AppError('Reset token is required', 400);
  }

  const redis = getRedisClient();
  const userId = await redis.get(`reset:${token}`);
  
  if (!userId) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  await userRepository.updatePassword(userId, newPassword);
  await redis.del(`reset:${token}`);
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  verifyEmail,
  forgotPassword,
  resetPassword
};
