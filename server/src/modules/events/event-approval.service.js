const { getMySQLPool } = require('../../database/mysql');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

class EventApprovalService {
  async createApprovalRequest(eventData, organizerId, actionType = 'create') {
    const pool = getMySQLPool();
    
    // For 'create' action, event_id should be NULL since event doesn't exist yet
    const eventId = actionType === 'create' ? null : (eventData.event_id || null);
    
    const [result] = await pool.execute(
      `INSERT INTO event_approval_requests (event_id, organizer_id, action_type, request_data, status, admin_status, super_admin_status)
       VALUES (?, ?, ?, ?, 'pending', 'pending', 'pending')`,
      [eventId, organizerId, actionType, JSON.stringify(eventData)]
    );

    logger.info('Approval request created', { requestId: result.insertId, organizerId, actionType });
    return { requestId: result.insertId, status: 'pending' };
  }

  async approveByAdmin(requestId, adminId, comments = null) {
    const pool = getMySQLPool();
    
    const [requests] = await pool.query(
      'SELECT * FROM event_approval_requests WHERE id = ?',
      [requestId]
    );

    if (requests.length === 0) {
      throw new AppError('Approval request not found', 404);
    }

    const request = requests[0];

    await pool.execute(
      `UPDATE event_approval_requests 
       SET admin_status = 'approved', admin_id = ? 
       WHERE id = ?`,
      [adminId, requestId]
    );

    // Check if both admin and super_admin approved
    const [updated] = await pool.query(
      'SELECT * FROM event_approval_requests WHERE id = ?',
      [requestId]
    );

    if (updated[0].admin_status === 'approved' && updated[0].super_admin_status === 'approved') {
      await this.executeApproval(requestId);
    }

    logger.info('Admin approved request', { requestId, adminId });
    return { success: true, message: 'Approved by admin' };
  }

  async approveBySuperAdmin(requestId, superAdminId, comments = null) {
    const pool = getMySQLPool();
    
    const [requests] = await pool.query(
      'SELECT * FROM event_approval_requests WHERE id = ?',
      [requestId]
    );

    if (requests.length === 0) {
      throw new AppError('Approval request not found', 404);
    }

    await pool.execute(
      `UPDATE event_approval_requests 
       SET super_admin_status = 'approved', super_admin_id = ? 
       WHERE id = ?`,
      [superAdminId, requestId]
    );

    // Check if both admin and super_admin approved
    const [updated] = await pool.query(
      'SELECT * FROM event_approval_requests WHERE id = ?',
      [requestId]
    );

    if (updated[0].admin_status === 'approved' && updated[0].super_admin_status === 'approved') {
      await this.executeApproval(requestId);
    }

    logger.info('Super admin approved request', { requestId, superAdminId });
    return { success: true, message: 'Approved by super admin' };
  }

  async rejectByAdmin(requestId, adminId, reason) {
    const pool = getMySQLPool();
    
    await pool.execute(
      `UPDATE event_approval_requests 
       SET status = 'rejected', admin_status = 'rejected', admin_id = ?, rejection_reason = ?, processed_at = NOW()
       WHERE id = ?`,
      [adminId, reason, requestId]
    );

    logger.info('Admin rejected request', { requestId, adminId, reason });
    return { success: true, message: 'Request rejected' };
  }

  async rejectBySuperAdmin(requestId, superAdminId, reason) {
    const pool = getMySQLPool();
    
    await pool.execute(
      `UPDATE event_approval_requests 
       SET status = 'rejected', super_admin_status = 'rejected', super_admin_id = ?, rejection_reason = ?, processed_at = NOW()
       WHERE id = ?`,
      [superAdminId, reason, requestId]
    );

    logger.info('Super admin rejected request', { requestId, superAdminId, reason });
    return { success: true, message: 'Request rejected' };
  }

  async executeApproval(requestId) {
    const pool = getMySQLPool();
    
    const [requests] = await pool.query(
      'SELECT * FROM event_approval_requests WHERE id = ?',
      [requestId]
    );

    const request = requests[0];
    const eventData = JSON.parse(request.request_data);
    
    // Ensure the organizer_id is set correctly from the approval request
    eventData.organizerId = request.organizer_id;

    if (request.action_type === 'create') {
      const createdEvent = await this.createEvent(eventData);
      // If ticket types are included, create them
      if (eventData.ticketTypes && eventData.ticketTypes.length > 0) {
        const eventService = require('./event.service');
        await eventService.createTicketTypes(createdEvent.id, eventData.ticketTypes);
      }
    } else if (request.action_type === 'update') {
      await this.updateEvent(request.event_id, eventData);
    } else if (request.action_type === 'delete') {
      await this.deleteEvent(request.event_id);
    }

    await pool.execute(
      `UPDATE event_approval_requests SET status = 'approved', processed_at = NOW() WHERE id = ?`,
      [requestId]
    );

    logger.info('Approval executed', { requestId, actionType: request.action_type });
  }

  async createEvent(eventData) {
    const pool = getMySQLPool();
    const eventRepository = require('../events/event.repository');
    return await eventRepository.create(eventData);
  }

  async updateEvent(eventId, eventData) {
    const pool = getMySQLPool();
    const eventRepository = require('../events/event.repository');
    return await eventRepository.updateById(eventId, eventData);
  }

  async deleteEvent(eventId) {
    const pool = getMySQLPool();
    await pool.execute(
      'UPDATE events SET status = ? WHERE event_id = ?',
      ['cancelled', eventId]
    );
  }

  async getPendingRequests(page = 1, limit = 20) {
    const pool = getMySQLPool();
    const offset = (page - 1) * limit;

    const [requests] = await pool.query(
      `SELECT ear.*, u.name as organizer_name, u.email as organizer_email
       FROM event_approval_requests ear
       JOIN users u ON ear.organizer_id = u.user_id
       WHERE ear.status = 'pending'
       ORDER BY ear.requested_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // Parse JSON request_data for all requests
    const parsedRequests = requests.map(request => {
      try {
        request.request_data = JSON.parse(request.request_data);
      } catch (error) {
        logger.warn('Failed to parse request_data JSON', { requestId: request.id, error: error.message });
      }
      return request;
    });

    return { requests: parsedRequests, page, limit };
  }

  async getAllRequests(page = 1, limit = 20, status = null) {
    const pool = getMySQLPool();
    const offset = (page - 1) * limit;

    let query = `SELECT ear.*, u.name as organizer_name, u.email as organizer_email
                 FROM event_approval_requests ear
                 JOIN users u ON ear.organizer_id = u.user_id`;
    const params = [];

    if (status) {
      query += ' WHERE ear.status = ?';
      params.push(status);
    }

    query += ' ORDER BY ear.requested_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [requests] = await pool.query(query, params);
    
    // Parse JSON request_data for all requests
    const parsedRequests = requests.map(request => {
      try {
        request.request_data = JSON.parse(request.request_data);
      } catch (error) {
        logger.warn('Failed to parse request_data JSON', { requestId: request.id, error: error.message });
      }
      return request;
    });
    
    return { requests: parsedRequests, page, limit };
  }

  async getApprovalStats() {
    const pool = getMySQLPool();
    
    const [stats] = await pool.query(
      `SELECT 
         status,
         COUNT(*) as count
       FROM event_approval_requests
       GROUP BY status`
    );

    const result = {
      pending: 0,
      approved: 0,
      rejected: 0
    };

    stats.forEach(stat => {
      result[stat.status] = stat.count;
    });

    return result;
  }

  async getMyRequests(userId, page = 1, limit = 20) {
    const pool = getMySQLPool();
    const offset = (page - 1) * limit;

    const [requests] = await pool.query(
      `SELECT ear.*
       FROM event_approval_requests ear
       WHERE ear.organizer_id = ?
       ORDER BY ear.requested_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    // Parse JSON request_data for all requests
    const parsedRequests = requests.map(request => {
      try {
        request.request_data = JSON.parse(request.request_data);
      } catch (error) {
        logger.warn('Failed to parse request_data JSON', { requestId: request.id, error: error.message });
      }
      return request;
    });

    return { requests: parsedRequests, page, limit };
  }

  async getRequestById(requestId) {
    const pool = getMySQLPool();
    
    const [requests] = await pool.query(
      `SELECT ear.*, u.name as organizer_name, u.email as organizer_email
       FROM event_approval_requests ear
       JOIN users u ON ear.organizer_id = u.user_id
       WHERE ear.id = ?`,
      [requestId]
    );

    if (requests.length === 0) {
      throw new AppError('Request not found', 404);
    }

    const request = requests[0];
    
    // Parse the JSON request_data for better readability
    try {
      request.request_data = JSON.parse(request.request_data);
    } catch (error) {
      logger.warn('Failed to parse request_data JSON', { requestId, error: error.message });
    }

    return request;
  }
}

module.exports = new EventApprovalService();
