const { getMySQLPool } = require('../../database/mysql');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

class SupportService {
  async createTicket(ticketData, user) {
    const pool = getMySQLPool();
    const { subject, description, priority, category, orderId, eventId } = ticketData;

    const ticketId = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const [result] = await pool.execute(
      `INSERT INTO support_tickets 
       (ticket_id, user_id, subject, description, priority, category, order_id, event_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', NOW())`,
      [ticketId, user.id, subject, description, priority || 'medium', category || 'general', orderId || null, eventId || null]
    );

    logger.info('Support ticket created', { ticketId, userId: user.id });
    return { ticketId, id: result.insertId };
  }

  async getAllTickets(page = 1, limit = 20, filters = {}) {
    const pool = getMySQLPool();
    const offset = (page - 1) * limit;
    const { status, priority, role, search } = filters;

    let where = 'WHERE 1=1';
    const params = [];

    if (status) {
      where += ' AND st.status = ?';
      params.push(status);
    }

    if (priority) {
      where += ' AND st.priority = ?';
      params.push(priority);
    }

    if (role) {
      where += ' AND u.role = ?';
      params.push(role);
    }

    if (search) {
      where += ' AND (st.subject LIKE ? OR st.description LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const [rows] = await pool.query(
      `SELECT st.*, u.name as user_name, u.email as user_email, u.role as user_role,
              e.title as event_title, o.booking_number as order_number
       FROM support_tickets st
       LEFT JOIN users u ON st.user_id = u.user_id
       LEFT JOIN events e ON st.event_id = e.event_id
       LEFT JOIN bookings o ON st.order_id = o.booking_id
       ${where}
       ORDER BY st.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[count]] = await pool.query(
      `SELECT COUNT(*) as total FROM support_tickets st LEFT JOIN users u ON st.user_id = u.user_id ${where}`,
      params
    );

    // Transform data to match frontend expected structure
    const transformedData = rows.map(row => ({
      id: row.ticket_id,
      ticketId: row.ticket_id,
      subject: row.subject,
      description: row.description,
      priority: row.priority,
      category: row.category,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      user: {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
        role: row.user_role,
      },
      event: row.event_title ? { id: row.event_id, title: row.event_title } : null,
      order: row.order_number ? { id: row.order_id, orderId: row.order_number } : null,
    }));

    return {
      tickets: transformedData,
      pagination: {
        page,
        limit,
        total: count.total,
        pages: Math.ceil(count.total / limit)
      }
    };
  }

  async getTicketById(ticketId) {
    const pool = getMySQLPool();

    const [rows] = await pool.query(
      `SELECT st.*, u.name as user_name, u.email as user_email, u.phone as user_phone, u.role as user_role,
              e.title as event_title, e.start_date as event_date,
              COALESCE(e.venue_name, e.venue_address, e.venue_city) as event_venue,
              o.booking_number as order_number, o.total_amount as order_amount
       FROM support_tickets st
       LEFT JOIN users u ON st.user_id = u.user_id
       LEFT JOIN events e ON st.event_id = e.event_id
       LEFT JOIN bookings o ON st.order_id = o.booking_id
       WHERE st.ticket_id = ?`,
      [ticketId]
    );

    if (rows.length === 0) {
      throw new AppError('Support ticket not found', 404);
    }

    const row = rows[0];

    return {
      id: row.ticket_id,
      ticketId: row.ticket_id,
      subject: row.subject,
      description: row.description,
      priority: row.priority,
      category: row.category,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      resolvedAt: row.resolved_at,
      resolution: row.resolution,
      user: {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
        phone: row.user_phone,
        role: row.user_role,
      },
      event: row.event_title ? {
        id: row.event_id,
        title: row.event_title,
        date: row.event_date,
        venue: row.event_venue,
      } : null,
      order: row.order_number ? {
        id: row.order_id,
        orderId: row.order_number,
        amount: row.order_amount,
      } : null,
    };
  }

  async updateTicket(ticketId, updateData, user) {
    const pool = getMySQLPool();

    const [rows] = await pool.query('SELECT * FROM support_tickets WHERE ticket_id = ?', [ticketId]);
    if (rows.length === 0) {
      throw new AppError('Support ticket not found', 404);
    }

    const ticket = rows[0];
    const allowedFields = ['status', 'priority', 'resolution', 'assigned_to'];
    const updates = [];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updates.push(`${field} = ?`);
      }
    });

    if (updates.length === 0) {
      return await this.getTicketById(ticketId);
    }

    const values = allowedFields.filter(field => updateData[field] !== undefined).map(field => updateData[field]);
    values.push(ticketId);

    if (updateData.status === 'resolved') {
      updates.push('resolved_at = NOW()');
    }

    if (updateData.assigned_to) {
      updates.push('assigned_at = NOW()');
    }

    await pool.execute(
      `UPDATE support_tickets SET ${updates.join(', ')} WHERE ticket_id = ?`,
      values
    );

    logger.info('Support ticket updated', { ticketId, updatedBy: user.id });
    return await this.getTicketById(ticketId);
  }

  async deleteTicket(ticketId, user) {
    const pool = getMySQLPool();

    const [rows] = await pool.query('SELECT * FROM support_tickets WHERE ticket_id = ?', [ticketId]);
    if (rows.length === 0) {
      throw new AppError('Support ticket not found', 404);
    }

    await pool.execute('UPDATE support_tickets SET status = ? WHERE ticket_id = ?', ['deleted', ticketId]);

    logger.info('Support ticket deleted', { ticketId, deletedBy: user.id });
  }

  async getTicketStats() {
    const pool = getMySQLPool();

    const [stats] = await pool.query(
      `SELECT 
         status,
         priority,
         COUNT(*) as count
       FROM support_tickets
       WHERE status != 'deleted'
       GROUP BY status, priority`
    );

    const result = {
      byStatus: { open: 0, in_progress: 0, resolved: 0, closed: 0 },
      byPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
      total: 0
    };

    stats.forEach(stat => {
      if (result.byStatus[stat.status] !== undefined) {
        result.byStatus[stat.status] += stat.count;
      }
      if (result.byPriority[stat.priority] !== undefined) {
        result.byPriority[stat.priority] += stat.count;
      }
      result.total += stat.count;
    });

    return result;
  }
}

module.exports = new SupportService();
