const adminService = require('./admin.service');
const userRepository = require('../users/user.repository');
const eventRepository = require('../events/event.repository');
const paymentRepository = require('../../repositories/payment.repository');
const { getMySQLPool } = require('../../database/mysql');

class AdminController {
  async register(req, res, next) {
    try {
      const result = await adminService.register(req.body);
      res.status(201).json({ success: true, message: 'Admin registered successfully', data: result });
    } catch (error) { next(error); }
  }

  async googleLogin(req, res, next) {
    try {
      const { idToken } = req.body;
      if (!idToken) return next(new (require('../../middleware/errorHandler').AppError)('Google ID token is required', 400));
      const ipAddress = req.ip;
      const userAgent = req.get('user-agent');
      const result = await adminService.googleLogin(idToken, ipAddress, userAgent);
      res.cookie('admin_token', result.token, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.status(200).json({ success: true, message: 'Login successful', data: result });
    } catch (error) { next(error); }
  }

  async login(req, res, next) {
    try {
      const ipAddress = req.ip;
      const userAgent = req.get('user-agent');
      const result = await adminService.login(req.body.email, req.body.password, ipAddress, userAgent);
      res.cookie('admin_token', result.token, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.status(200).json({ success: true, message: 'Login successful', data: result });
    } catch (error) { next(error); }
  }

  async logout(req, res, next) {
    try {
      const token = req.cookies.admin_token || req.headers.authorization?.split(' ')[1];
      const adminId = req.admin?.id || null;
      await adminService.logout(token, adminId);
      res.clearCookie('admin_token');
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) { next(error); }
  }

  async refreshToken(req, res, next) {
    try {
      const ipAddress = req.ip;
      const userAgent = req.get('user-agent');
      const result = await adminService.refreshToken(req.body.refreshToken, ipAddress, userAgent);
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async forgotPassword(req, res, next) {
    try {
      const result = await adminService.forgotPassword(req.body.email);
      const response = { success: true, message: 'Password reset link sent to your email' };
      if (result?.resetToken) response.data = { resetToken: result.resetToken };
      res.status(200).json(response);
    } catch (error) { next(error); }
  }

  async resetPassword(req, res, next) {
    try {
      const token = req.params.token || req.query.token;
      await adminService.resetPassword(token, req.body.password);
      res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (error) { next(error); }
  }

  async getProfile(req, res, next) {
    try {
      const admin = await adminService.getProfile(req.admin.id);
      res.status(200).json({ success: true, data: admin });
    } catch (error) { next(error); }
  }

  async updateProfile(req, res, next) {
    try {
      const admin = await adminService.updateProfile(req.admin.id, req.body);
      res.status(200).json({ success: true, message: 'Profile updated successfully', data: admin });
    } catch (error) { next(error); }
  }

  async changePassword(req, res, next) {
    try {
      const result = await adminService.changePassword(
        req.admin.id, req.body.currentPassword, req.body.newPassword
      );
      res.status(200).json({ success: true, message: result.message });
    } catch (error) { next(error); }
  }

  async getAllAdmins(req, res, next) {
    try {
      const result = await adminService.getAllAdmins(req.query);
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async deactivateAdmin(req, res, next) {
    try {
      const result = await adminService.deactivateAdmin(req.params.id, req.admin.id);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) { next(error); }
  }

  async getOverview(req, res, next) {
    try {
      const pool = getMySQLPool();
      const [[users]] = await pool.query('SELECT COUNT(*) total, SUM(role = "organizer") organizers FROM users WHERE is_active = 1');
      const [[events]] = await pool.query('SELECT COUNT(*) total, SUM(status = "published") published, SUM(status = "draft") drafts FROM events');
      const [[bookings]] = await pool.query('SELECT COUNT(*) total, SUM(booking_status = "confirmed") confirmed FROM bookings');
      const [[payments]] = await pool.query('SELECT COUNT(*) total, SUM(status = "completed") completed, COALESCE(SUM(CASE WHEN status = "completed" THEN amount ELSE 0 END), 0) revenue FROM payments');
      res.status(200).json({ success: true, data: { users, events, bookings, payments } });
    } catch (error) { next(error); }
  }

  async getUsers(req, res, next) {
    try {
      const result = await userRepository.findAll(req.query);
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async updateUser(req, res, next) {
    try {
      const user = await userRepository.updateById(req.params.id, req.body);
      res.status(200).json({ success: true, data: user });
    } catch (error) { next(error); }
  }

  async getEvents(req, res, next) {
    try {
      const result = await eventRepository.findAll(req.query);
      res.status(200).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async updateEventStatus(req, res, next) {
    try {
      const event = await eventRepository.updateById(req.params.id, { status: req.body.status });
      res.status(200).json({ success: true, data: event });
    } catch (error) { next(error); }
  }

  async getPayments(req, res, next) {
    try {
      const pool = getMySQLPool();
      const { page = 1, limit = 20, status } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      const params = [];
      let where = 'WHERE 1=1';
      if (status) { where += ' AND p.status = ?'; params.push(status); }

      const [rows] = await pool.query(
        `SELECT p.*, u.name user_name, u.email user_email, e.title event_title
         FROM payments p
         LEFT JOIN users u ON p.user_id = u.user_id
         LEFT JOIN events e ON p.event_id = e.event_id
         ${where}
         ORDER BY p.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, Number(limit), offset]
      );
      const [[count]] = await pool.query(`SELECT COUNT(*) total FROM payments p ${where}`, params);
      res.status(200).json({ success: true, data: { payments: rows, pagination: { page: Number(page), limit: Number(limit), total: count.total, pages: Math.ceil(count.total / Number(limit)) } } });
    } catch (error) { next(error); }
  }

  async getBookings(req, res, next) {
    try {
      const pool = getMySQLPool();
      const { page = 1, limit = 20, status, eventId } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      const params = [];
      let where = 'WHERE 1=1';

      if (status) {
        where += ' AND b.booking_status = ?';
        params.push(status);
      }

      if (eventId) {
        where += ' AND b.event_id = ?';
        params.push(eventId);
      }

      const [rows] = await pool.query(
        `SELECT b.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
                e.title as event_title, e.start_date as event_date,
                COALESCE(e.venue_name, e.venue_address, e.venue_city) as event_venue,
                e.type as event_type,
                p.payment_id, p.transaction_id, p.status as payment_status, p.amount as payment_amount, p.currency,
                (SELECT COUNT(*) FROM tickets t WHERE t.booking_id = b.booking_id) as total_tickets
         FROM bookings b
         LEFT JOIN users u ON b.user_id = u.user_id
         LEFT JOIN events e ON b.event_id = e.event_id
         LEFT JOIN payments p ON p.booking_id = b.booking_id
         ${where}
         ORDER BY b.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, Number(limit), offset]
      );

      const [[count]] = await pool.query(
        `SELECT COUNT(*) total FROM bookings b ${where}`,
        params
      );

      // Transform data to match frontend expected structure
        const transformedData = rows.map(row => ({
          id: row.booking_id,
          orderId: row.order_id || row.booking_number,
          bookingNumber: row.booking_number,
          status: row.booking_status,
          amount: row.payment_amount || row.total_amount,
          currency: row.currency || 'INR',
          transactionId: row.transaction_id || row.payment_id,
        event: {
          id: row.event_id,
          title: row.event_title,
          startDate: row.event_date,
          venue: row.event_type === 'online' ? 'Online Event' : row.event_venue,
          type: row.event_type,
        },
        user: {
          id: row.user_id,
          name: row.user_name,
          email: row.user_email,
          phone: row.user_phone,
        },
        totalTickets: row.total_tickets,
        paymentStatus: row.payment_status,
        createdAt: row.created_at,
      }));

      res.status(200).json({
        success: true,
        data: transformedData,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count.total,
          pages: Math.ceil(count.total / Number(limit))
        }
      });
    } catch (error) { next(error); }
  }

  async getAllOrganizers(req, res, next) {
    try {
      const pool = getMySQLPool();
      const { page = 1, limit = 20, status, search } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      const params = [];
      let where = 'WHERE u.role = "organizer"';

      if (status) {
        where += ' AND u.kyc_status = ?';
        params.push(status);
      }

      if (search) {
        where += ' AND (u.name LIKE ? OR u.email LIKE ? OR o.name LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      const [rows] = await pool.query(
        `SELECT u.*, o.name as organization_name, o.description as organization_description, o.website, o.logo,
                (SELECT COUNT(*) FROM events e WHERE e.organizer_id = u.user_id) as total_events,
                (SELECT COUNT(*) FROM bookings b JOIN events e ON b.event_id = e.event_id WHERE e.organizer_id = u.user_id AND b.booking_status = 'confirmed') as total_bookings
         FROM users u
         LEFT JOIN organizations o ON u.user_id = o.owner_id
         ${where}
         ORDER BY u.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, Number(limit), offset]
      );

      const [[count]] = await pool.query(
        `SELECT COUNT(*) total FROM users u LEFT JOIN organizations o ON u.user_id = o.owner_id ${where}`,
        params
      );

      // Transform data to match frontend expected structure
      const transformedData = rows.map(row => ({
        id: row.user_id,
        displayId: row.display_id,
        title: row.organization_name || row.name,
        city: row.organization_name ? 'Organization' : 'Individual',
        owner: row.name,
        submittedAt: row.created_at,
        status: row.kyc_status === 'verified' ? 'approved' : row.kyc_status === 'rejected' ? 'rejected' : 'pending',
        email: row.email,
        phone: row.phone,
        totalEvents: row.total_events,
        totalBookings: row.total_bookings,
        organizationName: row.organization_name,
        organizationDescription: row.organization_description,
        website: row.website,
        logo: row.logo,
      }));

      res.status(200).json({
        success: true,
        data: transformedData,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count.total,
          pages: Math.ceil(count.total / Number(limit))
        }
      });
    } catch (error) { next(error); }
  }
}

module.exports = new AdminController();
