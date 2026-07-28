const organizerAuthService = require('./organizer.auth.service');
const organizerService     = require('./organizer.service');

class OrganizerController {
  async register(req, res, next) {
    try {
      const result = await organizerAuthService.register(req.body);
      res.status(201).json({ success: true, message: 'Organizer registered. Email and phone are verified.', data: result });
    } catch (e) { next(e); }
  }

  async login(req, res, next) {
    try {
      const ipAddress = req.ip;
      const userAgent = req.get('user-agent');
      const result = await organizerAuthService.login(req.body.email, req.body.password, ipAddress, userAgent);
      res.cookie('organizer_token', result.token, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.status(200).json({ success: true, message: 'Login successful', data: result });
    } catch (e) { next(e); }
  }

  async logout(req, res, next) {
    try {
      const token = req.cookies.organizer_token || req.headers.authorization?.split(' ')[1];
      const organizerId = req.organizer?.id || null;
      await organizerAuthService.logout(token, organizerId);
      res.clearCookie('organizer_token');
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (e) { next(e); }
  }

  async refreshToken(req, res, next) {
    try {
      const ipAddress = req.ip;
      const userAgent = req.get('user-agent');
      const result = await organizerAuthService.refreshToken(req.body.refreshToken, ipAddress, userAgent);
      res.status(200).json({ success: true, data: result });
    } catch (e) { next(e); }
  }

  async verifyEmail(req, res, next) {
    try {
      await organizerAuthService.verifyEmail(req.params.token || req.query.token);
      res.status(200).json({ success: true, message: 'Email verified successfully' });
    } catch (e) { next(e); }
  }

  async forgotPassword(req, res, next) {
    try {
      const result = await organizerAuthService.forgotPassword(req.body.email);
      const response = { success: true, message: 'Password reset link sent to your email' };
      if (result?.resetToken) response.data = { resetToken: result.resetToken };
      res.status(200).json(response);
    } catch (e) { next(e); }
  }

  async resetPassword(req, res, next) {
    try {
      await organizerAuthService.resetPassword(req.params.token || req.query.token, req.body.password);
      res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (e) { next(e); }
  }

  async getProfile(req, res, next) {
    try {
      const organizer = await organizerService.getProfile(req.organizer.id);
      res.status(200).json({ success: true, data: organizer });
    } catch (e) { next(e); }
  }

  async updateProfile(req, res, next) {
    try {
      const organizer = await organizerService.updateProfile(req.organizer.id, req.body);
      res.status(200).json({ success: true, message: 'Profile updated', data: organizer });
    } catch (e) { next(e); }
  }

  async updateBankDetails(req, res, next) {
    try {
      const organizer = await organizerService.updateBankDetails(req.organizer.id, req.body);
      res.status(200).json({ success: true, message: 'Bank details updated', data: organizer });
    } catch (e) { next(e); }
  }

  async changePassword(req, res, next) {
    try {
      const result = await organizerService.changePassword(req.organizer.id, req.body.currentPassword, req.body.newPassword);
      res.status(200).json({ success: true, message: result.message });
    } catch (e) { next(e); }
  }

  async getAllOrganizers(req, res, next) {
    try {
      const result = await organizerService.getAllOrganizers(req.query);
      res.status(200).json({ success: true, data: result });
    } catch (e) { next(e); }
  }

  async getOrganizerById(req, res, next) {
    try {
      const organizer = await organizerService.getOrganizerById(req.params.id);
      res.status(200).json({ success: true, data: organizer });
    } catch (e) { next(e); }
  }

  async verifyKyc(req, res, next) {
    try {
      const result = await organizerService.verifyKyc(req.params.id);
      res.status(200).json({ success: true, message: result.message });
    } catch (e) { next(e); }
  }

  async deactivate(req, res, next) {
    try {
      const result = await organizerService.deactivate(req.params.id);
      res.status(200).json({ success: true, message: result.message });
    } catch (e) { next(e); }
  }

  async getAnalytics(req, res, next) {
    try {
      const analytics = await organizerService.getAnalytics(req.organizer.id, req.query);
      res.status(200).json({ success: true, data: analytics });
    } catch (e) { next(e); }
  }

  async getEvents(req, res, next) {
    try {
      const result = await organizerService.getEvents(req.organizer.id, req.query);
      res.status(200).json({ success: true, data: result.events, pagination: result.pagination });
    } catch (e) { next(e); }
  }

  async getBookings(req, res, next) {
    try {
      const result = await organizerService.getBookings(req.organizer.id, req.query);
      res.status(200).json({ success: true, data: result.bookings, pagination: result.pagination });
    } catch (e) { next(e); }
  }

  async getRevenue(req, res, next) {
    try {
      const revenue = await organizerService.getRevenue(req.organizer.id, req.query);
      res.status(200).json({ success: true, data: revenue });
    } catch (e) { next(e); }
  }

  async getAttendees(req, res, next) {
    try {
      const result = await organizerService.getAttendees(req.organizer.id, req.query);
      res.status(200).json({ success: true, data: result.attendees, pagination: result.pagination });
    } catch (e) { next(e); }
  }
}

module.exports = new OrganizerController();
