const { getMySQLPool } = require('../../database/mysql');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');
const { emailQueue } = require('../../queues');

class SupportMessageService {
  /**
   * Send a message in a support ticket (2-way communication)
   */
  async sendMessage(ticketId, senderId, senderRole, messageData) {
    const pool = getMySQLPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Verify ticket exists
      const [tickets] = await connection.query(
        'SELECT * FROM support_tickets WHERE ticket_id = ? AND status != ?',
        [ticketId, 'deleted']
      );

      if (!tickets[0]) {
        await connection.rollback();
        throw new AppError('Support ticket not found', 404);
      }

      const ticket = tickets[0];

      // Create message
      const [result] = await connection.execute(
        `INSERT INTO support_messages 
         (ticket_id, sender_id, sender_role, message, message_type, is_internal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          ticketId,
          senderId,
          senderRole,
          messageData.message,
          messageData.messageType || 'text',
          messageData.isInternal ? 1 : 0
        ]
      );

      const messageId = result.insertId;

      // Update ticket's last_message_at and unread_count
      await connection.execute(
        `UPDATE support_tickets 
         SET last_message_at = NOW(),
             unread_count = unread_count + 1,
             updated_at = NOW()
         WHERE ticket_id = ?`,
        [ticketId]
      );

      // Log activity
      await connection.execute(
        `INSERT INTO support_ticket_activities 
         (ticket_id, user_id, user_role, action, notes)
         VALUES (?, ?, ?, 'message_sent', ?)`,
        [ticketId, senderId, senderRole, messageData.message.substring(0, 200)]
      );

      await connection.commit();

      // Send notification to recipient (not internal messages)
      if (!messageData.isInternal) {
        try {
          const recipientId = senderRole === 'customer' || senderRole === 'organizer' 
            ? ticket.assigned_to || null 
            : ticket.user_id;

          if (recipientId) {
            await emailQueue.add('support_message_received', {
              ticketId,
              recipientId,
              senderRole,
              subject: `New message in support ticket ${ticketId}`,
            });
          }
        } catch (emailError) {
          logger.error('Failed to send support message notification', { error: emailError.message });
        }
      }

      logger.info('Support message sent', { ticketId, senderId, messageId });

      return {
        id: messageId,
        ticketId,
        senderId,
        senderRole,
        message: messageData.message,
        messageType: messageData.messageType || 'text',
        isInternal: messageData.isInternal || false,
        createdAt: new Date(),
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get all messages for a support ticket
   */
  async getTicketMessages(ticketId, userId, userRole) {
    const pool = getMySQLPool();

    // Verify ticket exists and user has access
    const [tickets] = await pool.query(
      'SELECT * FROM support_tickets WHERE ticket_id = ? AND status != ?',
      [ticketId, 'deleted']
    );

    if (!tickets[0]) {
      throw new AppError('Support ticket not found', 404);
    }

    const ticket = tickets[0];

    // Check access: ticket owner, assigned admin, or super admin
    const hasAccess = 
      String(ticket.user_id) === String(userId) ||
      String(ticket.assigned_to) === String(userId) ||
      userRole === 'super_admin';

    if (!hasAccess) {
      throw new AppError('Access denied to this ticket', 403);
    }

    // Get messages
    const [messages] = await pool.query(
      `SELECT sm.*, 
              u.name as sender_name, u.email as sender_email,
              sa.file_name, sa.file_url, sa.file_type
       FROM support_messages sm
       LEFT JOIN users u ON sm.sender_id = u.user_id
       LEFT JOIN support_attachments sa ON sm.id = sa.message_id
       WHERE sm.ticket_id = ? AND (sm.is_internal = 0 OR ? = 1)
       ORDER BY sm.created_at ASC`,
      [ticketId, userRole === 'admin' || userRole === 'super_admin' ? 1 : 0]
    );

    // Mark messages as read for the recipient
    if (String(ticket.user_id) === String(userId) || String(ticket.assigned_to) === String(userId)) {
      await pool.execute(
        `UPDATE support_messages 
         SET is_read = 1, read_at = NOW()
         WHERE ticket_id = ? AND sender_id != ? AND is_read = 0`,
        [ticketId, userId]
      );

      // Reset unread count
      await pool.execute(
        `UPDATE support_tickets 
         SET unread_count = 0
         WHERE ticket_id = ?`,
        [ticketId]
      );
    }

    // Group messages with attachments
    const messageMap = {};
    messages.forEach(msg => {
      if (!messageMap[msg.id]) {
        messageMap[msg.id] = {
          id: msg.id,
          ticketId: msg.ticket_id,
          senderId: msg.sender_id,
          senderRole: msg.sender_role,
          senderName: msg.sender_name,
          senderEmail: msg.sender_email,
          message: msg.message,
          messageType: msg.message_type,
          isInternal: msg.is_internal === 1,
          isRead: msg.is_read === 1,
          readAt: msg.read_at,
          createdAt: msg.created_at,
          attachments: [],
        };
      }

      if (msg.file_name) {
        messageMap[msg.id].attachments.push({
          fileName: msg.file_name,
          fileUrl: msg.file_url,
          fileType: msg.file_type,
        });
      }
    });

    return Object.values(messageMap);
  }

  /**
   * Upload attachment to a message
   */
  async uploadAttachment(messageId, ticketId, fileData, uploadedBy) {
    const pool = getMySQLPool();

    // Verify message exists and belongs to ticket
    const [messages] = await pool.query(
      'SELECT * FROM support_messages WHERE id = ? AND ticket_id = ?',
      [messageId, ticketId]
    );

    if (!messages[0]) {
      throw new AppError('Message not found', 404);
    }

    const [result] = await pool.execute(
      `INSERT INTO support_attachments 
       (message_id, ticket_id, file_name, file_url, file_size, file_type, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        messageId,
        ticketId,
        fileData.fileName,
        fileData.fileUrl,
        fileData.fileSize,
        fileData.fileType,
        uploadedBy
      ]
    );

    logger.info('Support attachment uploaded', { messageId, ticketId, uploadedBy });

    return {
      id: result.insertId,
      messageId,
      ticketId,
      fileName: fileData.fileName,
      fileUrl: fileData.fileUrl,
      fileSize: fileData.fileSize,
      fileType: fileData.fileType,
    };
  }

  /**
   * Get ticket activity log
   */
  async getTicketActivity(ticketId, userId, userRole) {
    const pool = getMySQLPool();

    // Verify ticket exists and user has access
    const [tickets] = await pool.query(
      'SELECT * FROM support_tickets WHERE ticket_id = ? AND status != ?',
      [ticketId, 'deleted']
    );

    if (!tickets[0]) {
      throw new AppError('Support ticket not found', 404);
    }

    const ticket = tickets[0];

    // Check access
    const hasAccess = 
      String(ticket.user_id) === String(userId) ||
      String(ticket.assigned_to) === String(userId) ||
      userRole === 'super_admin';

    if (!hasAccess) {
      throw new AppError('Access denied to this ticket', 403);
    }

    const [activities] = await pool.query(
      `SELECT sta.*, u.name as user_name
       FROM support_ticket_activities sta
       LEFT JOIN users u ON sta.user_id = u.user_id
       WHERE sta.ticket_id = ?
       ORDER BY sta.created_at DESC`,
      [ticketId]
    );

    return activities.map(a => ({
      id: a.id,
      ticketId: a.ticket_id,
      userId: a.user_id,
      userName: a.user_name,
      userRole: a.user_role,
      action: a.action,
      oldValue: a.old_value,
      newValue: a.new_value,
      notes: a.notes,
      createdAt: a.created_at,
    }));
  }

  /**
   * Mark messages as read
   */
  async markAsRead(ticketId, userId) {
    const pool = getMySQLPool();

    await pool.execute(
      `UPDATE support_messages 
       SET is_read = 1, read_at = NOW()
       WHERE ticket_id = ? AND sender_id != ? AND is_read = 0`,
      [ticketId, userId]
    );

    await pool.execute(
      `UPDATE support_tickets 
       SET unread_count = 0
       WHERE ticket_id = ?`,
      [ticketId]
    );

    logger.info('Messages marked as read', { ticketId, userId });

    return { success: true };
  }

  /**
   * Escalate ticket to higher level
   */
  async escalateTicket(ticketId, escalationLevel, escalatedBy, notes = null) {
    const pool = getMySQLPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [tickets] = await connection.query(
        'SELECT * FROM support_tickets WHERE ticket_id = ?',
        [ticketId]
      );

      if (!tickets[0]) {
        await connection.rollback();
        throw new AppError('Support ticket not found', 404);
      }

      const ticket = tickets[0];

      await connection.execute(
        `UPDATE support_tickets 
         SET escalation_level = ?, 
             escalated_at = NOW(),
             escalated_by = ?,
             status = 'in_progress'
         WHERE ticket_id = ?`,
        [escalationLevel, escalatedBy, ticketId]
      );

      // Log activity
      await connection.execute(
        `INSERT INTO support_ticket_activities 
         (ticket_id, user_id, user_role, action, old_value, new_value, notes)
         VALUES (?, ?, ?, 'priority_changed', ?, ?, ?)`,
        [ticketId, escalatedBy, 'admin', ticket.escalation_level, escalationLevel, notes]
      );

      await connection.commit();

      logger.info('Ticket escalated', { ticketId, escalationLevel, escalatedBy });

      return await this.getTicketById(ticketId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Submit customer satisfaction rating
   */
  async submitSatisfaction(ticketId, userId, satisfaction, notes = null) {
    const pool = getMySQLPool();

    const [tickets] = await pool.query(
      'SELECT * FROM support_tickets WHERE ticket_id = ? AND user_id = ?',
      [ticketId, userId]
    );

    if (!tickets[0]) {
      throw new AppError('Support ticket not found', 404);
    }

    if (tickets[0].status !== 'resolved' && tickets[0].status !== 'closed') {
      throw new AppError('Can only rate resolved or closed tickets', 400);
    }

    await pool.execute(
      `UPDATE support_tickets 
       SET customer_satisfaction = ?, satisfaction_notes = ?
       WHERE ticket_id = ?`,
      [satisfaction, notes, ticketId]
    );

    logger.info('Customer satisfaction submitted', { ticketId, satisfaction });

    return { success: true };
  }

  /**
   * Helper method to get ticket with all details
   */
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
      escalationLevel: row.escalation_level,
      category: row.category,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      resolvedAt: row.resolved_at,
      resolution: row.resolution,
      firstResponseTime: row.first_response_time,
      resolutionTime: row.resolution_time,
      customerSatisfaction: row.customer_satisfaction,
      satisfactionNotes: row.satisfaction_notes,
      lastMessageAt: row.last_message_at,
      unreadCount: row.unread_count,
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
}

module.exports = new SupportMessageService();
