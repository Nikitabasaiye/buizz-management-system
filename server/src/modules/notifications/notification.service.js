const { AppError } = require('../../middleware/errorHandler');
const { getMySQLPool } = require('../../database/mysql');
const { getIO } = require('../../sockets');
const logger = require('../../utils/logger');

/**
 * Notification Service
 * Handles notification creation, delivery, and management
 */

const createNotification = async (notificationData) => {
  const pool = getMySQLPool();
  
  const { 
    user_id, 
    title, 
    message, 
    channel, 
    related_type, 
    related_id, 
    metadata = {} 
  } = notificationData;
  
  if (!user_id || !title || !message) {
    throw new AppError('User ID, title, and message are required', 400);
  }
  
  const [result] = await pool.execute(
    `INSERT INTO notifications (user_id, title, message, channel, related_type, related_id, metadata, is_read)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [user_id, title, message, channel, related_type || null, related_id || null, JSON.stringify(metadata)]
  );
  
  // Emit socket event for real-time delivery
  const io = getIO();
  if (io) {
    io.to(`user:${user_id}`).emit('notification:new', {
      id: result.insertId,
      user_id,
      title,
      message,
      channel,
      related_type,
      related_id,
      metadata,
      created_at: new Date()
    });
  }
  
  logger.info('Notification created', {
    notificationId: result.insertId,
    userId: user_id,
    channel
  });
  
  return {
    id: result.insertId,
    user_id,
    title,
    message,
    channel,
    related_type,
    related_id,
    metadata,
    is_read: false,
    created_at: new Date()
  };
};

const getUserNotifications = async (userId, filters = {}) => {
  const pool = getMySQLPool();
  
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT * 
    FROM notifications 
    WHERE user_id = ?
  `;
  const params = [userId];
  
  if (filters.channel) {
    query += ' AND channel = ?';
    params.push(filters.channel);
  }
  
  if (filters.is_read !== undefined) {
    query += ' AND is_read = ?';
    params.push(filters.is_read ? 1 : 0);
  }
  
  if (filters.relatedType) {
    query += ' AND related_type = ?';
    params.push(filters.relatedType);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const [notifications] = await pool.query(query, params);
  
  // Get total count
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?',
    [userId]
  );
  
  return {
    notifications: notifications.map(n => ({
      id: n.id,
      user_id: n.user_id,
      title: n.title,
      message: n.message,
      channel: n.channel,
      related_type: n.related_type,
      related_id: n.related_id,
      metadata: n.metadata ? JSON.parse(n.metadata) : {},
      is_read: n.is_read === 1,
      created_at: n.created_at
    })),
    pagination: {
      page,
      limit,
      total: parseInt(total),
      pages: Math.ceil(total / limit)
    }
  };
};

const getNotification = async (notificationId, userId) => {
  const pool = getMySQLPool();
  
  const [notification] = await pool.query(
    'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  );
  
  if (!notification[0]) {
    throw new AppError('Notification not found', 404);
  }
  
  return {
    id: notification[0].id,
    user_id: notification[0].user_id,
    title: notification[0].title,
    message: notification[0].message,
    channel: notification[0].channel,
    related_type: notification[0].related_type,
    related_id: notification[0].related_id,
    metadata: notification[0].metadata ? JSON.parse(notification[0].metadata) : {},
    is_read: notification[0].is_read === 1,
    created_at: notification[0].created_at
  };
};

const markAsRead = async (notificationId, userId) => {
  const pool = getMySQLPool();
  
  const [notification] = await pool.query(
    'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  );
  
  if (!notification[0]) {
    throw new AppError('Notification not found', 404);
  }
  
  if (notification[0].is_read === 1) {
    return getNotification(notificationId, userId);
  }
  
  await pool.execute(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  );
  
  return getNotification(notificationId, userId);
};

const markAllAsRead = async (userId) => {
  const pool = getMySQLPool();
  
  await pool.execute(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
    [userId]
  );
  
  // Emit socket event
  const io = getIO();
  if (io) {
    io.to(`user:${userId}`).emit('notification:read-all', { userId });
  }
  
  logger.info('All notifications marked as read', { userId });
};

const deleteNotification = async (notificationId, userId) => {
  const pool = getMySQLPool();
  
  const [notification] = await pool.query(
    'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  );
  
  if (!notification[0]) {
    throw new AppError('Notification not found', 404);
  }
  
  await pool.execute(
    'DELETE FROM notifications WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  );
  
  logger.info('Notification deleted', { notificationId, userId });
};

const deleteAllNotifications = async (userId) => {
  const pool = getMySQLPool();
  
  await pool.execute(
    'DELETE FROM notifications WHERE user_id = ?',
    [userId]
  );
  
  logger.info('All notifications deleted', { userId });
};

const getUnreadCount = async (userId) => {
  const pool = getMySQLPool();
  
  const [[{ count }]] = await pool.query(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId]
  );
  
  return count;
};

// Booking-related notifications
const sendBookingConfirmation = async (booking, user) => {
  const pool = getMySQLPool();
  
  // Get event details
  const [events] = await pool.query(
    'SELECT * FROM events WHERE event_id = ?',
    [booking.event_id]
  );
  
  if (!events[0]) {
    throw new AppError('Event not found', 404);
  }
  
  const event = events[0];
  
  // Get ticket details
  const [tickets] = await pool.query(
    'SELECT * FROM tickets WHERE booking_id = ?',
    [booking.booking_id]
  );
  
  const ticketNumbers = tickets.map(t => t.ticket_number).join(', ');
  
  // Create notification
  const notification = await createNotification({
    user_id: user.user_id,
    title: 'Booking Confirmed!',
    message: `Your booking for "${event.title}" has been confirmed. Ticket numbers: ${ticketNumbers}`,
    channel: 'booking_confirmed',
    related_type: 'booking',
    related_id: booking.booking_id,
    metadata: {
      eventId: event.event_id,
      eventName: event.title,
      eventDate: event.start_date,
      ticketNumbers,
      amount: booking.total_amount
    }
  });
  
  return notification;
};

const sendBookingReminder = async (booking, user) => {
  const pool = getMySQLPool();
  
  const [events] = await pool.query(
    'SELECT * FROM events WHERE event_id = ?',
    [booking.event_id]
  );
  
  if (!events[0]) {
    throw new AppError('Event not found', 404);
  }
  
  const event = events[0];
  
  const notification = await createNotification({
    user_id: user.user_id,
    title: 'Event Reminder',
    message: `Don\'t forget! Your booking for "${event.title}" is coming up soon.`,
    channel: 'ticket_reminder',
    related_type: 'booking',
    related_id: booking.booking_id,
    metadata: {
      eventId: event.event_id,
      eventName: event.title,
      eventDate: event.start_date
    }
  });
  
  return notification;
};

const sendEventUpdate = async (event, user, updateType) => {
  const notification = await createNotification({
    user_id: user.user_id,
    title: `Event Update: ${event.title}`,
    message: `The event "${event.title}" has been ${updateType}.`,
    channel: 'event_update',
    related_type: 'event',
    related_id: event.event_id,
    metadata: {
      eventId: event.event_id,
      eventName: event.title,
      updateType
    }
  });
  
  return notification;
};

const sendEventApprovalNotification = async (approvalRequest, user) => {
  const pool = getMySQLPool();
  
  const [events] = await pool.query(
    'SELECT * FROM events WHERE event_id = ?',
    [approvalRequest.event_id]
  );
  
  const event = events[0];
  
  const notification = await createNotification({
    user_id: user.user_id,
    title: `Approval ${approvalRequest.status}`,
    message: `Your event "${event?.title || 'event'}" approval has been ${approvalRequest.status}.`,
    channel: 'event_approval',
    related_type: 'event_approval',
    related_id: approvalRequest.id,
    metadata: {
      approvalId: approvalRequest.id,
      eventId: approvalRequest.event_id,
      status: approvalRequest.status,
      rejectionReason: approvalRequest.rejection_reason
    }
  });
  
  return notification;
};

module.exports = {
  createNotification,
  getUserNotifications,
  getNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount,
  sendBookingConfirmation,
  sendBookingReminder,
  sendEventUpdate,
  sendEventApprovalNotification
};
