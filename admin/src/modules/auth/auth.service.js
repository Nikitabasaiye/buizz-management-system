const jwt = require('jsonwebtoken');
const { getMySQLPool } = require('../../database/mysql');
const { AppError } = require('../../middleware/errorHandler');
const {
  generateAccessToken,
  generateRefreshToken,
  generateSecureToken,
  blacklistToken,
  storeRedisToken,
  getRedisToken,
  deleteRedisToken
} = require('../../utils/auth.helper');
const logger = require('../../utils/logger');
const bcrypt = require('bcryptjs');

const register = async (userData) => {
  const pool = getMySQLPool();
  
  // Verify admin secret
  if (userData.adminSecret !== process.env.ADMIN_REGISTRATION_SECRET) {
    throw new AppError('Invalid admin registration secret', 403);
  }

  // Check if user exists
  const [existing] = await pool.query(
    'SELECT user_id FROM users WHERE email = ?',
    [userData.email]
  );

  if (existing.length > 0) {
    throw new AppError('Email already registered', 400);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(userData.password, 10);

  // Insert user
  const [result] = await pool.execute(
    'INSERT INTO users (name, email, password, role, is_active, is_verified) VALUES (?, ?, ?, ?, 1, 1)',
    [userData.name, userData.email, hashedPassword, userData.role]
  );

  const token = generateAccessToken(result.insertId, userData.role);
  const refreshToken = generateRefreshToken(result.insertId, userData.role);

  logger.info('Admin registered', { userId: result.insertId, email: userData.email });

  return {
    user: { id: result.insertId, name: userData.name, email: userData.email, role: userData.role },
    token,
    refreshToken
  };
};

const login = async (email, password) => {
  const pool = getMySQLPool();

  const [users] = await pool.query(
    'SELECT user_id, name, email, password, role, is_active FROM users WHERE email = ? AND role IN (?, ?)',
    [email, 'admin', 'super_admin']
  );

  if (users.length === 0) {
    throw new AppError('Invalid email or password', 401);
  }

  const user = users[0];

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.is_active) {
    throw new AppError('Account is deactivated', 403);
  }

  // Update last login
  await pool.execute(
    'UPDATE users SET last_login = NOW() WHERE user_id = ?',
    [user.user_id]
  );

  const token = generateAccessToken(user.user_id, user.role);
  const refreshToken = generateRefreshToken(user.user_id, user.role);

  logger.info('Admin logged in', { userId: user.user_id });

  return {
    user: { 
      id: user.user_id, 
      name: user.name, 
      email: user.email, 
      role: user.role 
    },
    token,
    refreshToken
  };
};

const logout = async (token) => {
  await blacklistToken(token);
};

const refreshToken = async (refreshTokenValue) => {
  try {
    const decoded = jwt.verify(refreshTokenValue, process.env.JWT_REFRESH_SECRET);
    const pool = getMySQLPool();

    const [users] = await pool.query(
      'SELECT user_id, role FROM users WHERE user_id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      throw new AppError('User not found', 404);
    }

    return {
      token: generateAccessToken(users[0].user_id, users[0].role),
      refreshToken: generateRefreshToken(users[0].user_id, users[0].role)
    };
  } catch {
    throw new AppError('Invalid refresh token', 401);
  }
};

const forgotPassword = async (email) => {
  const pool = getMySQLPool();

  const [users] = await pool.query(
    'SELECT user_id, name, email FROM users WHERE email = ? AND role IN (?, ?)',
    [email, 'admin', 'super_admin']
  );

  if (users.length === 0) {
    throw new AppError('No admin account found with this email', 404);
  }

  const resetToken = generateSecureToken();
  await storeRedisToken('admin_reset', resetToken, users[0].user_id);

  logger.info('Password reset requested', { userId: users[0].user_id });

  if (process.env.NODE_ENV === 'development') {
    return { resetToken };
  }
  return {};
};

const resetPassword = async (token, newPassword) => {
  const userId = await getRedisToken('admin_reset', token);
  if (!userId) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const pool = getMySQLPool();

  await pool.execute(
    'UPDATE users SET password = ? WHERE user_id = ?',
    [hashedPassword, userId]
  );

  await deleteRedisToken('admin_reset', token);
  logger.info('Password reset successful', { userId });
};

const getProfile = async (userId) => {
  const pool = getMySQLPool();

  const [users] = await pool.query(
    'SELECT user_id, name, email, role, phone, created_at, last_login FROM users WHERE user_id = ?',
    [userId]
  );

  if (users.length === 0) {
    throw new AppError('User not found', 404);
  }

  return users[0];
};

const updateProfile = async (userId, data) => {
  const pool = getMySQLPool();

  const updates = [];
  const values = [];

  if (data.name) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.phone) {
    updates.push('phone = ?');
    values.push(data.phone);
  }

  if (updates.length === 0) {
    throw new AppError('No fields to update', 400);
  }

  values.push(userId);

  await pool.execute(
    `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`,
    values
  );

  return getProfile(userId);
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile
};
