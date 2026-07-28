const { getMySQLPool } = require('../database/mysql');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const parseJson = (val, fallback) => {
  if (!val) return fallback;
  if (typeof val !== 'string') return val;
  try { return JSON.parse(val); } catch { return fallback; }
};

class OrganizerAnalyticsService {
  async getOrganizerDashboard(organizerId) {
    try {
      const organizer = await this.getOrganizerProfile(organizerId);
      if (!organizer) throw new AppError('Organizer not found', 404);

      const [
        events,
        bookingSummary,
        revenueAnalysis,
        eventPerformance,
        kycDetails,
        settlementHistory,
        auditHistory,
      ] = await Promise.all([
        this.getOrganizerEvents(organizerId),
        this.getBookingSummary(organizerId),
        this.getRevenueAnalysis(organizerId),
        this.getEventPerformance(organizerId),
        this.getKycDetails(organizerId),
        this.getSettlementHistory(organizerId),
        this.getAuditHistory(organizerId),
      ]);

      return {
        organizer,
        events,
        bookingSummary,
        revenueAnalysis,
        eventPerformance,
        kycDetails,
        settlementHistory,
        auditHistory,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get organizer dashboard', { error: error.message, organizerId });
      throw error;
    }
  }

  async getOrganizerProfile(organizerId) {
    const pool = getMySQLPool();
    const [users] = await pool.query(
      `SELECT
         u.*,
         COUNT(DISTINCT e.event_id) as total_events,
         COUNT(DISTINCT CASE WHEN e.status = 'published' THEN e.event_id END) as published_events,
         COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.event_id END) as completed_events,
         COUNT(DISTINCT b.booking_id) as total_bookings,
         COALESCE(SUM(p.amount), 0) as total_revenue,
         MAX(e.created_at) as last_event_created,
         MIN(e.created_at) as first_event_created
       FROM users u
       LEFT JOIN events e ON u.user_id = e.organizer_id
       LEFT JOIN bookings b ON e.event_id = b.event_id
       LEFT JOIN payments p ON b.booking_id = p.booking_id AND p.status = 'completed'
       WHERE u.user_id = ? AND u.role = 'organizer'
       GROUP BY u.user_id`,
      [organizerId]
    );
    return users[0] || null;
  }

  async getOrganizerEvents(organizerId) {
    const pool = getMySQLPool();
    const [events] = await pool.query(
      `SELECT
         e.*,
         COUNT(DISTINCT b.booking_id) as total_bookings,
         COUNT(DISTINCT CASE WHEN b.status = 'confirmed' THEN b.booking_id END) as confirmed_bookings,
         COUNT(DISTINCT CASE WHEN b.status = 'cancelled' THEN b.booking_id END) as cancelled_bookings,
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as gross_revenue,
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN b.quantity END), 0) as tickets_sold,
         COALESCE(AVG(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as avg_ticket_price,
         (e.total_seats - e.available_seats) as seats_booked,
         ROUND(((e.total_seats - e.available_seats) / NULLIF(e.total_seats, 0) * 100), 2) as occupancy_rate
       FROM events e
       LEFT JOIN bookings b ON e.event_id = b.event_id
       LEFT JOIN payments p ON b.booking_id = p.booking_id
       WHERE e.organizer_id = ?
       GROUP BY e.event_id
       ORDER BY e.created_at DESC`,
      [organizerId]
    );
    return events;
  }

  async getBookingSummary(organizerId) {
    const pool = getMySQLPool();

    const [[bookingStats]] = await pool.query(
      `SELECT
         COUNT(DISTINCT b.booking_id) as total_bookings,
         COUNT(DISTINCT CASE WHEN b.status = 'confirmed' THEN b.booking_id END) as confirmed_bookings,
         COUNT(DISTINCT CASE WHEN b.status = 'cancelled' THEN b.booking_id END) as cancelled_bookings,
         COUNT(DISTINCT CASE WHEN b.status = 'pending' THEN b.booking_id END) as pending_bookings,
         COALESCE(SUM(b.quantity), 0) as total_tickets_booked,
         COALESCE(AVG(b.quantity), 0) as avg_tickets_per_booking,
         COUNT(DISTINCT b.user_id) as unique_customers
       FROM bookings b
       JOIN events e ON b.event_id = e.event_id
       WHERE e.organizer_id = ?`,
      [organizerId]
    );

    const [monthlyTrends] = await pool.query(
      `SELECT
         DATE_FORMAT(b.created_at, '%Y-%m') as month,
         COUNT(b.booking_id) as bookings_count,
         SUM(b.quantity) as tickets_sold,
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as revenue
       FROM bookings b
       JOIN events e ON b.event_id = e.event_id
       LEFT JOIN payments p ON b.booking_id = p.booking_id
       WHERE e.organizer_id = ?
       GROUP BY DATE_FORMAT(b.created_at, '%Y-%m')
       ORDER BY month DESC
       LIMIT 12`,
      [organizerId]
    );

    const [topCustomers] = await pool.query(
      `SELECT
         u.user_id,
         u.name,
         u.email,
         COUNT(b.booking_id) as total_bookings,
         SUM(b.quantity) as total_tickets,
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as total_spent
       FROM bookings b
       JOIN events e ON b.event_id = e.event_id
       JOIN users u ON b.user_id = u.user_id
       LEFT JOIN payments p ON b.booking_id = p.booking_id
       WHERE e.organizer_id = ?
       GROUP BY u.user_id, u.name, u.email
       ORDER BY total_spent DESC
       LIMIT 10`,
      [organizerId]
    );

    return { stats: bookingStats, monthlyTrends, topCustomers };
  }

  async getRevenueAnalysis(organizerId) {
    const pool = getMySQLPool();

    const [[revenueStats]] = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as total_gross_revenue,
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.platform_fee END), 0) as total_platform_fees,
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN (p.amount - p.platform_fee) END), 0) as total_net_revenue,
         COALESCE(SUM(CASE WHEN p.status = 'refunded' THEN p.amount END), 0) as total_refunds,
         COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.payment_id END) as successful_payments,
         COUNT(DISTINCT CASE WHEN p.status = 'failed' THEN p.payment_id END) as failed_payment_count,
         ROUND(AVG(CASE WHEN p.status = 'completed' THEN p.amount END), 2) as avg_transaction_value
       FROM payments p
       JOIN bookings b ON p.booking_id = b.booking_id
       JOIN events e ON b.event_id = e.event_id
       WHERE e.organizer_id = ?`,
      [organizerId]
    );

    const [eventRevenue] = await pool.query(
      `SELECT
         e.event_id,
         e.title as event_title,
         e.status as event_status,
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as gross_revenue,
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.platform_fee END), 0) as platform_fees,
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN (p.amount - p.platform_fee) END), 0) as net_revenue,
         COUNT(CASE WHEN p.status = 'completed' THEN p.payment_id END) as successful_payments
       FROM events e
       LEFT JOIN bookings b ON e.event_id = b.event_id
       LEFT JOIN payments p ON b.booking_id = p.booking_id
       WHERE e.organizer_id = ?
       GROUP BY e.event_id, e.title, e.status
       ORDER BY gross_revenue DESC`,
      [organizerId]
    );

    const [monthlyRevenue] = await pool.query(
      `SELECT
         DATE_FORMAT(p.created_at, '%Y-%m') as month,
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as gross_revenue,
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.platform_fee END), 0) as platform_fees,
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN (p.amount - p.platform_fee) END), 0) as net_revenue,
         COUNT(CASE WHEN p.status = 'completed' THEN p.payment_id END) as transactions
       FROM payments p
       JOIN bookings b ON p.booking_id = b.booking_id
       JOIN events e ON b.event_id = e.event_id
       WHERE e.organizer_id = ?
       GROUP BY DATE_FORMAT(p.created_at, '%Y-%m')
       ORDER BY month DESC
       LIMIT 12`,
      [organizerId]
    );

    return { stats: revenueStats, eventRevenue, monthlyRevenue };
  }

  async getEventPerformance(organizerId) {
    const pool = getMySQLPool();
    const [performance] = await pool.query(
      `SELECT
         e.event_id,
         e.title,
         e.status,
         e.start_date,
         e.end_date,
         e.total_seats,
         e.available_seats,
         (e.total_seats - e.available_seats) as seats_sold,
         ROUND(((e.total_seats - e.available_seats) / NULLIF(e.total_seats, 0) * 100), 2) as occupancy_rate,
         COUNT(DISTINCT b.booking_id) as total_bookings,
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as revenue
       FROM events e
       LEFT JOIN bookings b ON e.event_id = b.event_id
       LEFT JOIN payments p ON b.booking_id = p.booking_id
       WHERE e.organizer_id = ?
       GROUP BY e.event_id
       ORDER BY occupancy_rate DESC`,
      [organizerId]
    );
    return performance;
  }

  async getKycDetails(organizerId) {
    const pool = getMySQLPool();
    const [kycData] = await pool.query(
      `SELECT
         u.kyc_status,
         u.bank_verification_status,
         k.id,
         k.user_id,
         k.role,
         k.status,
         k.bank_status,
         k.legal_name,
         k.business_name,
         k.pan_number,
         k.gst_number,
         k.aadhaar_last4,
         k.address_line,
         k.city,
         k.state,
         k.pincode,
         k.documents,
         k.bank_documents,
         k.submitted_at,
         k.reviewed_at,
         k.rejection_reason,
         k.review_notes,
         k.created_at,
         bank.account_holder_name,
         bank.bank_name,
         bank.bank_ifsc_code,
         bank.verification_status as bank_account_status,
         bank.verified_at as bank_verified_at
       FROM users u
       LEFT JOIN user_kyc_verifications k ON u.user_id = k.user_id
       LEFT JOIN organizer_bank_accounts bank ON u.user_id = bank.organizer_id
       WHERE u.user_id = ?
       ORDER BY k.created_at DESC
       LIMIT 1`,
      [organizerId]
    );

    if (!kycData[0]) return null;

    const row = kycData[0];
    return {
      ...row,
      documents: parseJson(row.documents, []),
      bank_documents: parseJson(row.bank_documents, []),
    };
  }

  async getSettlementHistory(organizerId) {
    const pool = getMySQLPool();
    const [settlements] = await pool.query(
      `SELECT
         s.*,
         e.title as event_title,
         COUNT(si.id) as settlement_items_count,
         COALESCE(SUM(si.gross_amount), 0) as total_gross_amount,
         COALESCE(SUM(si.platform_fee_amount), 0) as total_platform_fees,
         COALESCE(SUM(si.net_amount), 0) as total_net_amount
       FROM organizer_settlements s
       LEFT JOIN events e ON s.event_id = e.event_id
       LEFT JOIN settlement_items si ON s.settlement_id = si.settlement_id
       WHERE s.organizer_id = ?
       GROUP BY s.settlement_id
       ORDER BY s.created_at DESC`,
      [organizerId]
    );
    return settlements;
  }

  async getAuditHistory(organizerId) {
    const pool = getMySQLPool();
    const [auditLogs] = await pool.query(
      `SELECT action, action_type, description, ip_address, created_at, metadata
       FROM audit_logs
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
      [organizerId]
    );
    return auditLogs.map((log) => ({
      ...log,
      metadata: parseJson(log.metadata, null),
    }));
  }

  async getAllOrganizers(filters = {}) {
    const pool = getMySQLPool();
    const { page = 1, limit = 20, status, search } = filters;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE u.role = 'organizer'";
    const params = [];

    if (status) {
      whereClause += ' AND u.kyc_status = ?';
      params.push(status);
    }
    if (search) {
      whereClause += ' AND (u.name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const [organizers] = await pool.query(
      `SELECT
         u.user_id,
         u.name,
         u.email,
         u.phone,
         u.kyc_status,
         u.bank_verification_status,
         u.created_at,
         u.last_login,
         COUNT(DISTINCT e.event_id) as total_events,
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as total_revenue
       FROM users u
       LEFT JOIN events e ON u.user_id = e.organizer_id
       LEFT JOIN bookings b ON e.event_id = b.event_id
       LEFT JOIN payments p ON b.booking_id = p.booking_id
       ${whereClause}
       GROUP BY u.user_id
       ORDER BY total_revenue DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(DISTINCT u.user_id) as total FROM users u ${whereClause}`,
      params
    );

    return {
      organizers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        pages: Math.ceil(total / limit),
      },
    };
  }

  async exportOrganizerData(organizerId, format = 'json') {
    const dashboard = await this.getOrganizerDashboard(organizerId);
    if (format === 'csv') return this.convertToCSV(dashboard);
    return dashboard;
  }

  convertToCSV(data) {
    const csv = ['Field,Value'];
    csv.push(`Organizer Name,${data.organizer?.name ?? ''}`);
    csv.push(`Email,${data.organizer?.email ?? ''}`);
    csv.push(`Total Events,${data.organizer?.total_events ?? 0}`);
    csv.push(`Total Revenue,${data.organizer?.total_revenue ?? 0}`);
    csv.push(`KYC Status,${data.organizer?.kyc_status ?? ''}`);
    csv.push(`Bank Verification,${data.organizer?.bank_verification_status ?? ''}`);
    return csv.join('\n');
  }
}

module.exports = new OrganizerAnalyticsService();
