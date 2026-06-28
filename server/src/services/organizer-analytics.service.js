const { getMySQLPool } = require('../database/mysql');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

class OrganizerAnalyticsService {
  /**
   * Get comprehensive organizer dashboard data
   */
  async getOrganizerDashboard(organizerId) {
    try {
      const pool = getMySQLPool();
      
      // Get organizer profile
      const organizer = await this.getOrganizerProfile(organizerId);
      if (!organizer) {
        throw new AppError('Organizer not found', 404);
      }

      // Get all organizer data in parallel
      const [
        events,
        bookingSummary,
        revenueAnalysis,
        eventPerformance,
        kycDetails,
        settlementHistory,
        auditHistory
      ] = await Promise.all([
        this.getOrganizerEvents(organizerId),
        this.getBookingSummary(organizerId),
        this.getRevenueAnalysis(organizerId),
        this.getEventPerformance(organizerId),
        this.getKycDetails(organizerId),
        this.getSettlementHistory(organizerId),
        this.getAuditHistory(organizerId)
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
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get organizer dashboard', { error: error.message, organizerId });
      throw error;
    }
  }

  /**
   * Get organizer profile details
   */
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

  /**
   * Get all organizer events with detailed stats
   */
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
         ROUND(((e.total_seats - e.available_seats) / e.total_seats * 100), 2) as occupancy_rate
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

  /**
   * Get booking summary and statistics
   */
  async getBookingSummary(organizerId) {
    const pool = getMySQLPool();
    
    // Overall booking stats
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

    // Monthly booking trends
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

    // Top customers
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

    return {
      stats: bookingStats,
      monthlyTrends,
      topCustomers
    };
  }

  /**
   * Get detailed revenue analysis with profit/loss
   */
  async getRevenueAnalysis(organizerId) {
    const pool = getMySQLPool();
    
    // Overall revenue stats
    const [[revenueStats]] = await pool.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as total_gross_revenue,
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.platform_fee END), 0) as total_platform_fees,
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN (p.amount - p.platform_fee) END), 0) as total_net_revenue,
         COALESCE(SUM(CASE WHEN p.status = 'refunded' THEN p.amount END), 0) as total_refunds,
         COALESCE(SUM(CASE WHEN p.status = 'failed' THEN p.amount END), 0) as failed_payments,
         COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.payment_id END) as successful_payments,
         COUNT(DISTINCT CASE WHEN p.status = 'failed' THEN p.payment_id END) as failed_payment_count,
         ROUND(AVG(CASE WHEN p.status = 'completed' THEN p.amount END), 2) as avg_transaction_value
       FROM payments p
       JOIN bookings b ON p.booking_id = b.booking_id
       JOIN events e ON b.event_id = e.event_id
       WHERE e.organizer_id = ?`,
      [organizerId]
    );

    // Revenue by event
    const [eventRevenue] = await pool.query(
      `SELECT 
         e.event_id,
         e.title as event_title,
         e.status as event_status,
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as gross_revenue,
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.platform_fee END), 0) as platform_fees,
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN (p.amount - p.platform_fee) END), 0) as net_revenue,
         COUNT(CASE WHEN p.status = 'completed' THEN p.payment_id END) as successful_payments,
         ROUND(AVG(CASE WHEN p.status = 'completed' THEN p.amount END), 2) as avg_ticket_price
       FROM events e
       LEFT JOIN bookings b ON e.event_id = b.event_id
       LEFT JOIN payments p ON b.booking_id = p.booking_id
       WHERE e.organizer_id = ?
       GROUP BY e.event_id, e.title, e.status
       ORDER BY gross_revenue DESC`,
      [organizerId]
    );

    // Monthly revenue trends
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

    // Calculate profit/loss (simplified - you can add more cost factors)
    const platformFeePercent = process.env.PLATFORM_FEE_PERCENT || 2;
    const profitLoss = {
      totalRevenue: parseFloat(revenueStats.total_net_revenue),
      totalCosts: parseFloat(revenueStats.total_platform_fees),
      netProfit: parseFloat(revenueStats.total_net_revenue),
      profitMargin: revenueStats.total_gross_revenue > 0 
        ? ((revenueStats.total_net_revenue / revenueStats.total_gross_revenue) * 100).toFixed(2)
        : 0,
      platformFeePercent: parseFloat(platformFeePercent)
    };

    return {
      stats: revenueStats,
      eventRevenue,
      monthlyRevenue,
      profitLoss
    };
  }

  /**
   * Get event performance metrics
   */
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
         ROUND(((e.total_seats - e.available_seats) / e.total_seats * 100), 2) as occupancy_rate,
         COUNT(DISTINCT b.booking_id) as total_bookings,
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as revenue,
         COALESCE(AVG(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as avg_ticket_price,
         e.views,
         ROUND((COUNT(DISTINCT b.booking_id) / NULLIF(e.views, 0) * 100), 2) as conversion_rate
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

  /**
   * Get KYC and verification details
   */
  async getKycDetails(organizerId) {
    const pool = getMySQLPool();
    
    const [kycData] = await pool.query(
      `SELECT 
         u.kyc_status,
         u.bank_verification_status,
         kyc.*,
         bank.account_holder_name,
         bank.bank_name,
         bank.bank_ifsc_code,
         bank.verification_status as bank_account_status,
         bank.verified_at as bank_verified_at
       FROM users u
       LEFT JOIN user_kyc_verifications kyc ON u.user_id = kyc.user_id
       LEFT JOIN organizer_bank_accounts bank ON u.user_id = bank.organizer_id
       WHERE u.user_id = ?
       ORDER BY kyc.created_at DESC
       LIMIT 1`,
      [organizerId]
    );

    return kycData[0] || null;
  }

  /**
   * Get settlement history
   */
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

  /**
   * Get audit history
   */
  async getAuditHistory(organizerId) {
    const pool = getMySQLPool();
    
    const [auditLogs] = await pool.query(
      `SELECT 
         action,
         action_type,
         description,
         ip_address,
         created_at,
         metadata
       FROM audit_logs
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
      [organizerId]
    );

    return auditLogs.map(log => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null
    }));
  }

  /**
   * Get all organizers list with summary stats
   */
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
         COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.event_id END) as completed_events,
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount END), 0) as total_revenue,
         COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.platform_fee END), 0) as platform_fees_paid
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
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Export organizer data for reports
   */
  async exportOrganizerData(organizerId, format = 'json') {
    const dashboard = await this.getOrganizerDashboard(organizerId);
    
    if (format === 'csv') {
      // Convert to CSV format - implement as needed
      return this.convertToCSV(dashboard);
    }
    
    return dashboard;
  }

  convertToCSV(data) {
    // Simple CSV conversion - expand as needed
    const csv = [];
    csv.push('Field,Value');
    csv.push(`Organizer Name,${data.organizer.name}`);
    csv.push(`Email,${data.organizer.email}`);
    csv.push(`Total Events,${data.organizer.total_events}`);
    csv.push(`Total Revenue,${data.organizer.total_revenue}`);
    csv.push(`KYC Status,${data.organizer.kyc_status}`);
    csv.push(`Bank Verification,${data.organizer.bank_verification_status}`);
    
    return csv.join('\n');
  }
}

module.exports = new OrganizerAnalyticsService();