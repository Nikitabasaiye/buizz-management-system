const pool = require('../../database/mysql');
const { AppError } = require('../../middleware/errorHandler');

class AnalyticsService {
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
