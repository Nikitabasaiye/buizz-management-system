const pool = require('../../database/mysql');
const { AppError } = require('../../middleware/errorHandler');

class AnalyticsService {
  async ensureVisitorTables(connection) {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS visitor_sessions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        visitor_id VARCHAR(128) NOT NULL,
        session_id VARCHAR(128) NOT NULL,
        user_id BIGINT UNSIGNED NULL,
        user_role VARCHAR(40) NULL,
        path VARCHAR(512) NULL,
        referrer VARCHAR(512) NULL,
        user_agent VARCHAR(512) NULL,
        ip_address VARCHAR(64) NULL,
        first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        visit_count INT UNSIGNED NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        UNIQUE KEY visitor_sessions_session_unique (session_id),
        KEY visitor_sessions_visitor_index (visitor_id),
        KEY visitor_sessions_role_index (user_role),
        KEY visitor_sessions_last_seen_index (last_seen_at)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS visitor_page_views (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        visitor_id VARCHAR(128) NOT NULL,
        session_id VARCHAR(128) NOT NULL,
        user_id BIGINT UNSIGNED NULL,
        user_role VARCHAR(40) NULL,
        path VARCHAR(512) NOT NULL,
        referrer VARCHAR(512) NULL,
        user_agent VARCHAR(512) NULL,
        ip_address VARCHAR(64) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY visitor_page_views_session_index (session_id),
        KEY visitor_page_views_path_index (path),
        KEY visitor_page_views_created_index (created_at)
      )
    `);
  }

  normalizeVisitorRole(role) {
    const normalized = String(role || 'guest').trim().toLowerCase().replace('-', '_');
    if (normalized === 'customer') return 'user';
    if (normalized === 'super_admin') return 'super_admin';
    if (['guest', 'user', 'organizer', 'admin', 'super_admin', 'checkin_staff', 'influencer'].includes(normalized)) {
      return normalized;
    }
    return 'guest';
  }

  async trackVisitor(payload, requestMeta = {}) {
    const connection = await pool.getConnection();
    try {
      await this.ensureVisitorTables(connection);

      const visitorId = String(payload.visitorId || '').trim().slice(0, 128);
      const sessionId = String(payload.sessionId || '').trim().slice(0, 128);
      if (!visitorId || !sessionId) throw new AppError('visitorId and sessionId are required', 400);

      const userId = payload.userId && Number.isFinite(Number(payload.userId)) ? Number(payload.userId) : null;
      const userRole = this.normalizeVisitorRole(payload.userRole);
      const path = String(payload.path || '/').trim().slice(0, 512) || '/';
      const referrer = String(payload.referrer || '').trim().slice(0, 512) || null;
      const userAgent = String(requestMeta.userAgent || payload.userAgent || '').trim().slice(0, 512) || null;
      const ipAddress = String(requestMeta.ipAddress || '').trim().slice(0, 64) || null;

      await connection.execute(
        `INSERT INTO visitor_sessions
           (visitor_id, session_id, user_id, user_role, path, referrer, user_agent, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           user_id = COALESCE(VALUES(user_id), user_id),
           user_role = VALUES(user_role),
           path = VALUES(path),
           referrer = COALESCE(VALUES(referrer), referrer),
           user_agent = COALESCE(VALUES(user_agent), user_agent),
           ip_address = COALESCE(VALUES(ip_address), ip_address),
           visit_count = visit_count + 1,
           last_seen_at = CURRENT_TIMESTAMP`,
        [visitorId, sessionId, userId, userRole, path, referrer, userAgent, ipAddress]
      );

      await connection.execute(
        `INSERT INTO visitor_page_views
           (visitor_id, session_id, user_id, user_role, path, referrer, user_agent, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [visitorId, sessionId, userId, userRole, path, referrer, userAgent, ipAddress]
      );

      return { tracked: true };
    } finally {
      connection.release();
    }
  }

  async getVisitorSummary(days = 30) {
    const connection = await pool.getConnection();
    try {
      await this.ensureVisitorTables(connection);
      const safeDays = Math.min(Math.max(parseInt(days, 10) || 30, 1), 365);

      const [totals] = await connection.execute(
        `SELECT
           COUNT(DISTINCT visitor_id) AS total_visitors,
           COUNT(DISTINCT session_id) AS total_sessions,
           SUM(visit_count) AS total_visits,
           COUNT(DISTINCT CASE WHEN user_role = 'guest' THEN visitor_id END) AS guest_visitors,
           COUNT(DISTINCT CASE WHEN user_role = 'user' THEN user_id END) AS signed_users,
           COUNT(DISTINCT CASE WHEN user_role = 'organizer' THEN user_id END) AS signed_organizers,
           COUNT(DISTINCT CASE WHEN user_role = 'admin' THEN user_id END) AS signed_admins,
           COUNT(DISTINCT CASE WHEN user_role = 'super_admin' THEN user_id END) AS signed_super_admins
         FROM visitor_sessions
         WHERE last_seen_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [safeDays]
      );

      const [topPages] = await connection.execute(
        `SELECT path, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors
         FROM visitor_page_views
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY path
         ORDER BY views DESC
         LIMIT 10`,
        [safeDays]
      );

      return { days: safeDays, totals: totals[0], topPages };
    } finally {
      connection.release();
    }
  }

  async getDashboardStats(userId, userRole) {
    const connection = await pool.getConnection();
    try {
      let stats = {};

      if (userRole === 'admin') {
        stats = await this.getAdminStats(connection);
      } else if (userRole === 'organizer') {
        stats = await this.getOrganizerStats(connection, userId);
      } else {
        stats = await this.getUserStats(connection, userId);
      }

      return stats;
    } finally {
      connection.release();
    }
  }

  async getAdminStats(connection) {
    const [userStats] = await connection.execute(
      `SELECT COUNT(*) as total_users,
              SUM(CASE WHEN role = 'organizer' THEN 1 ELSE 0 END) as total_organizers,
              SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as verified_users
       FROM users WHERE is_active = 1`
    );

    const [eventStats] = await connection.execute(
      `SELECT COUNT(*) as total_events,
              SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published_events,
              SUM(CASE WHEN status = 'ongoing' THEN 1 ELSE 0 END) as ongoing_events,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_events
       FROM events`
    );

    const [ticketStats] = await connection.execute(
      `SELECT COUNT(*) as total_tickets,
              SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_tickets,
              SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) as used_tickets
       FROM tickets`
    );

    const [paymentStats] = await connection.execute(
      `SELECT COUNT(*) as total_payments,
              SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_payments
       FROM payments`
    );

    const [recentEvents] = await connection.execute(
      `SELECT event_id as id, title, start_date, status, views
       FROM events
       ORDER BY created_at DESC
       LIMIT 5`
    );

    return {
      users: userStats[0],
      events: eventStats[0],
      tickets: ticketStats[0],
      payments: {
        ...paymentStats[0],
        total_revenue: parseFloat(paymentStats[0].total_revenue || 0)
      },
      recentEvents
    };
  }

  async getOrganizerStats(connection, userId) {
    const [eventStats] = await connection.execute(
      `SELECT COUNT(*) as total_events,
              SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published_events,
              SUM(views) as total_views
       FROM events WHERE organizer_id = ?`,
      [userId]
    );

    const [ticketStats] = await connection.execute(
      `SELECT COUNT(*) as total_tickets_sold,
              SUM(CASE WHEN t.status = 'used' THEN 1 ELSE 0 END) as tickets_used
       FROM tickets t
       JOIN events e ON t.event_id = e.event_id
       WHERE e.organizer_id = ?`,
      [userId]
    );

    const [revenueStats] = await connection.execute(
      `SELECT SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) as total_revenue,
              COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as successful_bookings
       FROM payments p
       JOIN events e ON p.event_id = e.event_id
       WHERE e.organizer_id = ?`,
      [userId]
    );

    const [upcomingEvents] = await connection.execute(
      `SELECT event_id as id, title, start_date, status, available_seats, total_seats
       FROM events
       WHERE organizer_id = ? AND start_date > NOW()
       ORDER BY start_date ASC
       LIMIT 5`,
      [userId]
    );

    return {
      events: eventStats[0],
      tickets: ticketStats[0],
      revenue: {
        ...revenueStats[0],
        total_revenue: parseFloat(revenueStats[0].total_revenue || 0)
      },
      upcomingEvents
    };
  }

  async getUserStats(connection, userId) {
    const [ticketStats] = await connection.execute(
      `SELECT COUNT(*) as total_tickets,
              SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_tickets,
              SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) as used_tickets
       FROM tickets WHERE user_id = ?`,
      [userId]
    );

    const [bookingStats] = await connection.execute(
      `SELECT COUNT(*) as total_bookings,
              SUM(amount) as total_spent
       FROM payments
       WHERE user_id = ? AND status = 'completed'`,
      [userId]
    );

    const [upcomingEvents] = await connection.execute(
      `SELECT DISTINCT e.event_id as id, e.title, e.start_date, e.venue_name, e.banner
       FROM events e
       JOIN tickets t ON e.event_id = t.event_id
       WHERE t.user_id = ? AND e.start_date > NOW() AND t.status = 'active'
       ORDER BY e.start_date ASC
       LIMIT 5`,
      [userId]
    );

    return {
      tickets: ticketStats[0],
      bookings: {
        ...bookingStats[0],
        total_spent: parseFloat(bookingStats[0].total_spent || 0)
      },
      upcomingEvents
    };
  }

  async getEventAnalytics(eventId, userId, userRole) {
    const connection = await pool.getConnection();
    try {
      const [event] = await connection.execute(
        'SELECT * FROM events WHERE event_id = ?',
        [eventId]
      );

      if (!event[0]) {
        throw new AppError('Event not found', 404);
      }

      if (userRole !== 'admin' && event[0].organizer_id !== userId) {
        throw new AppError('You do not have permission to view this analytics', 403);
      }

      const [ticketStats] = await connection.execute(
        `SELECT COUNT(*) as total_sold,
                SUM(price) as total_revenue,
                ticket_type,
                COUNT(*) as count
         FROM tickets
         WHERE event_id = ?
         GROUP BY ticket_type`,
        [eventId]
      );

      const [dailySales] = await connection.execute(
        `SELECT DATE(created_at) as date,
                COUNT(*) as tickets_sold,
                SUM(price) as revenue
         FROM tickets
         WHERE event_id = ?
         GROUP BY DATE(created_at)
         ORDER BY date DESC
         LIMIT 30`,
        [eventId]
      );

      const [scanStats] = await connection.execute(
        `SELECT COUNT(*) as total_scanned,
                COUNT(DISTINCT DATE(scanned_at)) as scan_days
         FROM tickets
         WHERE event_id = ? AND status = 'used'`,
        [eventId]
      );

      return {
        event: event[0],
        ticketStats,
        dailySales,
        scanStats: scanStats[0]
      };
    } finally {
      connection.release();
    }
  }
}

module.exports = new AnalyticsService();
