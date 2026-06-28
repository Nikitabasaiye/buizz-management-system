const influencerService = require('./influencer.service');

class InfluencerController {
  async register(req, res, next) {
    try {
      const result = await influencerService.register(req.body);
      res.status(201).json({ success: true, message: 'Registered successfully. Please verify your email.', data: result });
    } catch (error) { next(error); }
  }

  async login(req, res, next) {
    try {
      const result = await influencerService.login(req.body.email, req.body.password);
      res.cookie('influencer_token', result.token, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.status(200).json({ success: true, message: 'Login successful', data: result });
    } catch (error) { next(error); }
  }

  async logout(req, res, next) {
    try {
      const token = req.cookies.influencer_token || req.headers.authorization?.split(' ')[1];
      await influencerService.logout(token);
      res.clearCookie('influencer_token');
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) { next(error); }
  }

  async refreshToken(req, res, next) {
    try {
      const result = await influencerService.refreshToken(req.body.refreshToken);
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async verifyEmail(req, res, next) {
    try {
      await influencerService.verifyEmail(req.params.token || req.query.token);
      res.status(200).json({ success: true, message: 'Email verified successfully' });
    } catch (error) { next(error); }
  }

  async forgotPassword(req, res, next) {
    try {
      const result = await influencerService.forgotPassword(req.body.email);
      const response = { success: true, message: 'Password reset link sent to your email' };
      if (result?.resetToken) response.data = { resetToken: result.resetToken };
      res.status(200).json(response);
    } catch (error) { next(error); }
  }

  async resetPassword(req, res, next) {
    try {
      await influencerService.resetPassword(req.params.token || req.query.token, req.body.password);
      res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (error) { next(error); }
  }

  async getProfile(req, res, next) {
    try {
      const influencer = await influencerService.getProfile(req.influencer.id);
      res.status(200).json({ success: true, data: influencer });
    } catch (error) { next(error); }
  }

  async updateProfile(req, res, next) {
    try {
      const influencer = await influencerService.updateProfile(req.influencer.id, req.body);
      res.status(200).json({ success: true, message: 'Profile updated successfully', data: influencer });
    } catch (error) { next(error); }
  }

  async updateBankDetails(req, res, next) {
    try {
      const influencer = await influencerService.updateBankDetails(req.influencer.id, req.body);
      res.status(200).json({ success: true, message: 'Bank details updated successfully', data: influencer });
    } catch (error) { next(error); }
  }

  async changePassword(req, res, next) {
    try {
      const result = await influencerService.changePassword(
        req.influencer.id, req.body.currentPassword, req.body.newPassword
      );
      res.status(200).json({ success: true, message: result.message });
    } catch (error) { next(error); }
  }

  async getAllInfluencers(req, res, next) {
    try {
      const result = await influencerService.getAllInfluencers(req.query);
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async deactivate(req, res, next) {
    try {
      const result = await influencerService.deactivate(req.params.id);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) { next(error); }
  }
}

module.exports = new InfluencerController();
