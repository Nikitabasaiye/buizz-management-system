const jwt = require('jsonwebtoken');
const influencerRepository = require('./influencer.repository');
const { AppError } = require('../../middleware/errorHandler');
const {
  generateAccessToken, generateRefreshToken, generateSecureToken,
  blacklistToken, storeRedisToken, getRedisToken, deleteRedisToken,
} = require('../../utils/auth.helper');
const logger = require('../../utils/logger');

class InfluencerService {
  async register(data) {
    const existing = await influencerRepository.findByEmail(data.email);
    if (existing) throw new AppError('Email already registered', 400);

    const influencer = await influencerRepository.create(data);
    const verifyToken = generateSecureToken();
    await storeRedisToken('influencer_verify', verifyToken, influencer.id);

    // Send verification email (synchronous for now - can be made async later)
    logger.info('Influencer registered - verification token generated', { influencerId: influencer.id });

    const token = generateAccessToken(influencer.id, 'influencer');
    const refreshToken = generateRefreshToken(influencer.id, 'influencer');

    const result = {
      influencer: { id: influencer.id, name: influencer.name, email: influencer.email, niche: influencer.niche },
      token, refreshToken,
    };
    if (process.env.NODE_ENV === 'development') result.verificationToken = verifyToken;
    logger.info('Influencer registered', { influencerId: influencer.id });
    return result;
  }

  async login(email, password) {
    const influencer = await influencerRepository.findByEmailWithPassword(email);
    if (!influencer || !(await influencer.comparePassword(password))) {
      throw new AppError('Invalid email or password', 401);
    }
    if (!influencer.is_active) throw new AppError('Account is deactivated', 403);

    await influencerRepository.updateLastLogin(influencer.id);
    const token = generateAccessToken(influencer.id, 'influencer');
    const refreshToken = generateRefreshToken(influencer.id, 'influencer');

    return {
      influencer: { id: influencer.id, name: influencer.name, email: influencer.email, isVerified: influencer.is_verified },
      token, refreshToken,
    };
  }

  async logout(token) { await blacklistToken(token); }

  async refreshToken(refreshTokenValue) {
    try {
      const decoded = jwt.verify(refreshTokenValue, process.env.JWT_REFRESH_SECRET);
      if (decoded.type !== 'influencer') throw new AppError('Invalid token type', 401);
      const influencer = await influencerRepository.findById(decoded.id);
      if (!influencer) throw new AppError('Influencer not found', 404);
      return {
        token: generateAccessToken(influencer.id, 'influencer'),
        refreshToken: generateRefreshToken(influencer.id, 'influencer'),
      };
    } catch { throw new AppError('Invalid refresh token', 401); }
  }

  async verifyEmail(token) {
    const influencerId = await getRedisToken('influencer_verify', token);
    if (!influencerId) throw new AppError('Invalid or expired verification token', 400);
    await influencerRepository.verifyInfluencer(influencerId);
    await deleteRedisToken('influencer_verify', token);
  }

  async forgotPassword(email) {
    const influencer = await influencerRepository.findByEmail(email);
    if (!influencer) throw new AppError('No influencer account found with this email', 404);

    const resetToken = generateSecureToken();
    await storeRedisToken('influencer_reset', resetToken, influencer.id);

    // Send password reset email (synchronous for now - can be made async later)
    logger.info('Influencer password reset requested', { influencerId: influencer.id });
    if (process.env.NODE_ENV === 'development') return { resetToken };
    return {};
  }

  async resetPassword(token, newPassword) {
    const influencerId = await getRedisToken('influencer_reset', token);
    if (!influencerId) throw new AppError('Invalid or expired reset token', 400);
    await influencerRepository.updatePassword(influencerId, newPassword);
    await deleteRedisToken('influencer_reset', token);
  }

  async getProfile(id) {
    const influencer = await influencerRepository.findById(id);
    if (!influencer) throw new AppError('Influencer not found', 404);
    return influencer;
  }

  async updateProfile(id, data) {
    await this.getProfile(id);
    return influencerRepository.updateById(id, data);
  }

  async updateBankDetails(id, data) {
    await this.getProfile(id);
    return influencerRepository.updateById(id, data);
  }

  async changePassword(id, currentPassword, newPassword) {
    const influencer = await influencerRepository.findByEmailWithPassword(
      (await influencerRepository.findById(id)).email
    );
    if (!(await influencer.comparePassword(currentPassword))) {
      throw new AppError('Current password is incorrect', 400);
    }
    await influencerRepository.updatePassword(id, newPassword);
    return { message: 'Password changed successfully' };
  }

  async getAllInfluencers(options) { return influencerRepository.findAll(options); }
  async deactivate(id) {
    await this.getProfile(id);
    await influencerRepository.deleteById(id);
    return { message: 'Influencer account deactivated' };
  }
}

module.exports = new InfluencerService();
