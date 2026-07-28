const { getMySQLPool } = require('../../database/mysql');
const { AppError } = require('../../middleware/errorHandler');
const { EVENT_STATUS } = require('../../constants');
const logger = require('../../utils/logger');

const getReviewerById = async (reviewerId) => {
  const pool = getMySQLPool();

  const [admins] = await pool.query('SELECT id, name, email, is_super_admin FROM admins WHERE id = ?', [reviewerId]);
  if (admins.length) {
    return {
      id: admins[0].id,
      name: admins[0].name,
      email: admins[0].email,
      role: admins[0].is_super_admin ? 'super_admin' : 'admin',
      source: 'admins'
    };
  }

  const [users] = await pool.query('SELECT user_id AS id, name, email, role FROM users WHERE user_id = ?', [reviewerId]);
  return users.length ? { ...users[0], source: 'users' } : null;
};

const getReviewerHistoryId = (reviewer) => reviewer?.source === 'users' ? reviewer.id : null;

const getOrganizerById = async (organizerId) => {
  if (!organizerId) return null;

  const pool = getMySQLPool();
  const [users] = await pool.query('SELECT user_id AS id, name, email FROM users WHERE user_id = ?', [organizerId]);
  return users[0] || null;
};

const upsertApprovalHistory = async ({
  approvalRequestId,
  eventId,
  organizerId,
  organizerName,
  organizerEmail,
  reviewerId = null,
  reviewerName = null,
  reviewerEmail = null,
  reviewerRole = null,
  action,
  previousStatus,
  newStatus,
  comments = null,
  rejectionReason = null,
  metadata = null,
}) => {
  const pool = getMySQLPool();
  const [existing] = await pool.execute(
    `SELECT id FROM event_approval_history
     WHERE approval_request_id = ? AND action = ?
     ORDER BY id DESC LIMIT 1`,
    [approvalRequestId, action]
  );

  if (existing.length) {
    await pool.execute(
      `UPDATE event_approval_history
       SET event_id = ?,
           organizer_id = ?,
           organizer_name = ?,
           organizer_email = ?,
           reviewer_id = ?,
           reviewer_name = ?,
           reviewer_email = ?,
           reviewer_role = ?,
           previous_status = ?,
           new_status = ?,
           comments = ?,
           rejection_reason = ?,
           metadata = ?,
           created_at = NOW()
       WHERE id = ?`,
      [
        eventId,
        organizerId,
        organizerName,
        organizerEmail,
        reviewerId,
        reviewerName,
        reviewerEmail,
        reviewerRole,
        previousStatus,
        newStatus,
        comments,
        rejectionReason,
        metadata,
        existing[0].id,
      ]
    );
    return existing[0].id;
  }

  const [result] = await pool.execute(
    `INSERT INTO event_approval_history
       (approval_request_id, event_id, organizer_id, organizer_name, organizer_email,
        reviewer_id, reviewer_name, reviewer_email, reviewer_role, action,
        previous_status, new_status, comments, rejection_reason, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      approvalRequestId,
      eventId,
      organizerId,
      organizerName,
      organizerEmail,
      reviewerId,
      reviewerName,
      reviewerEmail,
      reviewerRole,
      action,
      previousStatus,
      newStatus,
      comments,
      rejectionReason,
      metadata,
    ]
  );
  return result.insertId;
};

const parseJsonValue = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const formatApprovalRequest = (request) => {
  const requestData = parseJsonValue(request.request_data, {});
  const eventImages = parseJsonValue(request.event_images, []);
  const eventTags = parseJsonValue(request.event_tags, []);
  const priceMin = request.ticket_price_min === null || request.ticket_price_min === undefined
    ? null
    : Number(request.ticket_price_min);
  const priceMax = request.ticket_price_max === null || request.ticket_price_max === undefined
    ? null
    : Number(request.ticket_price_max);
  const effectiveStatus = request.status === 'pending'
    ? (request.event_status || request.status)
    : request.status;

  return {
    ...request,
    request_data: requestData,
    requestData,
    eventId: request.event_id,
    organizerId: request.organizer_id,
    organizerName: request.organizer_name,
    organizerEmail: request.organizer_email,
    eventTitle: request.event_title || requestData.title,
    eventStatus: request.event_status,
    submittedAt: request.requested_at,
    updatedAt: request.updated_at,
    reviewedAt: request.processed_at,
    comments: request.rejection_reason,
    eventDetails: {
      id: request.event_id,
      title: request.event_title || requestData.title,
      subtitle: request.event_subtitle || requestData.subtitle,
      description: request.event_description || requestData.description,
      category: request.event_category || requestData.category,
      language: request.event_language || requestData.language,
      ageRestriction: request.event_age_restriction || requestData.ageRestriction,
      duration: request.event_duration || requestData.duration,
      type: request.event_type || requestData.type,
      status: effectiveStatus,
      startDate: request.event_start_date || requestData.startDate,
      endDate: request.event_end_date || requestData.endDate,
      venue: {
        name: request.event_venue_name || requestData.venue?.name,
        address: request.event_venue_address || requestData.venue?.address,
        city: request.event_venue_city || requestData.venue?.city,
        state: request.event_venue_state || requestData.venue?.state,
        country: request.event_venue_country || requestData.venue?.country,
      },
      banner: request.event_banner || requestData.banner,
      images: Array.isArray(eventImages) && eventImages.length ? eventImages : (requestData.images || []),
      tags: Array.isArray(eventTags) && eventTags.length ? eventTags : (requestData.tags || []),
      totalSeats: request.event_total_seats || requestData.totalSeats,
      availableSeats: request.event_available_seats || requestData.availableSeats,
      termsConditions: request.event_terms_conditions || requestData.termsConditions,
      ticketTypesCount: Number(request.ticket_types_count || 0),
      priceMin,
      priceMax,
    },
  };
};

class EventApprovalService {
  async createApprovalRequest(eventData, organizerId, actionType = 'create') {
    const pool = getMySQLPool();

    const eventId = eventData.event_id || eventData.id || null;
    const normalizedActionType = actionType === 'submit' ? 'create' : actionType;
    const previousStatus = eventData.status || eventData.previous_status || 'draft';

    const [existingRequests] = await pool.execute(
      `SELECT id
       FROM event_approval_requests
       WHERE event_id <=> ?
         AND organizer_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [eventId, organizerId]
    );

    let requestId;

    if (existingRequests.length) {
      requestId = existingRequests[0].id;
      await pool.execute(
        `UPDATE event_approval_requests
         SET action_type = ?,
             request_data = ?,
             status = 'pending',
             admin_status = 'pending',
             super_admin_status = 'pending',
             admin_id = NULL,
             super_admin_id = NULL,
             rejection_reason = NULL,
             processed_at = NULL,
             requested_at = NOW(),
             updated_at = NOW()
         WHERE id = ?`,
        [normalizedActionType, JSON.stringify(eventData), requestId]
      );
    } else {
      const [result] = await pool.execute(
        `INSERT INTO event_approval_requests (event_id, organizer_id, action_type, request_data, status, admin_status, super_admin_status)
         VALUES (?, ?, ?, ?, 'pending', 'pending', 'pending')`,
        [eventId, organizerId, normalizedActionType, JSON.stringify(eventData)]
      );
      requestId = result.insertId;
    }

    // Get organizer details for history
    const [organizers] = await pool.query('SELECT name, email FROM users WHERE user_id = ?', [organizerId]);
    const organizer = organizers[0];

    const submittedMetadata = JSON.stringify({ approvalRequestId: requestId, actionType: normalizedActionType, previousStatus });
    const [existingSubmittedHistory] = await pool.execute(
      `SELECT id FROM event_approval_history
       WHERE approval_request_id = ? AND action = 'submitted'
       ORDER BY id DESC LIMIT 1`,
      [requestId]
    );

    if (existingSubmittedHistory.length) {
      await pool.execute(
        `UPDATE event_approval_history
         SET event_id = ?,
             organizer_id = ?,
             organizer_name = ?,
             organizer_email = ?,
             previous_status = ?,
             new_status = 'submitted',
             metadata = ?,
             created_at = NOW()
         WHERE id = ?`,
        [eventId, organizerId, organizer?.name || 'Unknown', organizer?.email || 'unknown', previousStatus, submittedMetadata, existingSubmittedHistory[0].id]
      );
    } else {
      await pool.execute(
        `INSERT INTO event_approval_history (approval_request_id, event_id, organizer_id, organizer_name, organizer_email, action, previous_status, new_status, metadata)
         VALUES (?, ?, ?, ?, ?, 'submitted', ?, 'submitted', ?)`,
        [requestId, eventId, organizerId, organizer?.name || 'Unknown', organizer?.email || 'unknown', previousStatus, submittedMetadata]
      );
    }

    // Emit socket notification to super admins
    const { getIO } = require('../../sockets');
    const io = getIO();
    if (io) {
      io.to('super_admins').emit('event:approval_request', {
        requestId,
        eventId,
        organizerId,
        organizerName: organizer?.name || 'Unknown',
        actionType: normalizedActionType,
        eventData: {
          title: eventData.title || 'Event Update',
          category: eventData.category || 'General'
        }
      });
      logger.info('Socket notification sent to super admins', { requestId });
    }

    logger.info('Approval request saved', { requestId, organizerId, actionType: normalizedActionType, eventId });
    return { id: requestId, requestId, status: 'pending' };
  }

  async approveByAdmin(requestId, adminId, comments = null) {
    const pool = getMySQLPool();

    const [requests] = await pool.query('SELECT * FROM event_approval_requests WHERE id = ?', [requestId]);
    if (!requests.length) throw new AppError('Approval request not found', 404);

    const request = requests[0];

    // Get admin details for history
    const admin = await getReviewerById(adminId);
    const organizer = await getOrganizerById(request.organizer_id);

    // Get event details for history
    const [events] = await pool.query('SELECT status FROM events WHERE event_id = ?', [request.event_id]);
    const event = events[0];

    // Admin approval escalates to super_admin — does NOT publish directly
    await pool.execute(
      `UPDATE event_approval_requests
       SET admin_status = 'approved', admin_id = ?, updated_at = NOW()
       WHERE id = ?`,
      [adminId, requestId]
    );

    // Update event status to under_review so organizer sees progress
    if (request.event_id) {
      await pool.execute(
        `UPDATE events SET status = ? WHERE event_id = ?`,
        [EVENT_STATUS.UNDER_REVIEW, request.event_id]
      );

      await upsertApprovalHistory({
        approvalRequestId: requestId,
        eventId: request.event_id,
        organizerId: request.organizer_id,
        organizerName: organizer?.name || 'Unknown',
        organizerEmail: organizer?.email || 'unknown',
        reviewerId: getReviewerHistoryId(admin),
        reviewerName: admin?.name || 'Unknown',
        reviewerEmail: admin?.email || 'unknown',
        reviewerRole: admin?.role || 'admin',
        action: 'approved',
        previousStatus: event?.status || 'unknown',
        newStatus: EVENT_STATUS.UNDER_REVIEW,
        comments: comments || null,
        metadata: JSON.stringify({ approvalRequestId: requestId, reviewLevel: 'admin' }),
      });
    }

    logger.info('Admin approved event approval request — awaiting super admin', { requestId, adminId, eventId: request.event_id });
    return { success: true, message: 'Admin approval saved. Awaiting Super Admin final approval.' };
  }

  async approveBySuperAdmin(requestId, superAdminId, comments = null) {
    const pool = getMySQLPool();

    const [requests] = await pool.query('SELECT * FROM event_approval_requests WHERE id = ?', [requestId]);
    if (!requests.length) throw new AppError('Approval request not found', 404);

    const request = requests[0];

    // Get super admin details for history
    const admin = await getReviewerById(superAdminId);
    const organizer = await getOrganizerById(request.organizer_id);

    // Get event details for history
    const [events] = await pool.query('SELECT status FROM events WHERE event_id = ?', [request.event_id]);
    const event = events[0];

    // Super admin final approval — changes status to approved (organizer can then publish)
    await pool.execute(
      `UPDATE event_approval_requests
       SET status = 'approved', super_admin_status = 'approved', super_admin_id = ?, processed_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [superAdminId, requestId]
    );

    if (request.event_id) {
      if (request.action_type === 'update') {
        let eventData = {};

        try {
          eventData = typeof request.request_data === 'string'
            ? JSON.parse(request.request_data)
            : request.request_data || {};
        } catch (error) {
          logger.warn('Failed to parse update request_data during super admin approval', {
            requestId,
            error: error.message
          });
          throw new AppError('Invalid event update request data', 400);
        }

        delete eventData.id;
        delete eventData.event_id;
        delete eventData.eventId;
        delete eventData.organizerId;
        delete eventData.organizer_id;

        await this.updateEvent(request.event_id, {
          ...eventData,
          status: EVENT_STATUS.APPROVED
        });
      } else if (request.action_type === 'delete') {
        await pool.execute(
          `UPDATE events SET status = ? WHERE event_id = ?`,
          [EVENT_STATUS.CANCELLED, request.event_id]
        );
      } else {
        await pool.execute(
          `UPDATE events SET status = ? WHERE event_id = ?`,
          [EVENT_STATUS.APPROVED, request.event_id]
        );
      }

      await upsertApprovalHistory({
        approvalRequestId: requestId,
        eventId: request.event_id,
        organizerId: request.organizer_id,
        organizerName: organizer?.name || 'Unknown',
        organizerEmail: organizer?.email || 'unknown',
        reviewerId: getReviewerHistoryId(admin),
        reviewerName: admin?.name || 'Unknown',
        reviewerEmail: admin?.email || 'unknown',
        reviewerRole: admin?.role || 'super_admin',
        action: 'approved',
        previousStatus: event?.status || 'unknown',
        newStatus: request.action_type === 'delete' ? EVENT_STATUS.CANCELLED : EVENT_STATUS.APPROVED,
        comments: comments || null,
        metadata: JSON.stringify({ approvalRequestId: requestId, reviewLevel: 'super_admin' }),
      });
    }

    const updatedEvent = request.event_id ? await require('../events/event.repository').findById(request.event_id) : null;

    logger.info('Super admin approved event - awaiting organizer publish', { requestId, superAdminId, eventId: request.event_id });
    return { success: true, message: 'Event approved by Super Admin. Organizer can now publish the event.', event: updatedEvent };
  }

  async rejectByAdmin(requestId, adminId, reason) {
    const pool = getMySQLPool();
    
    const [requests] = await pool.query('SELECT * FROM event_approval_requests WHERE id = ?', [requestId]);
    if (!requests.length) throw new AppError('Approval request not found', 404);
    const request = requests[0];

    // Get admin details for history
    const admin = await getReviewerById(adminId);
    const organizer = await getOrganizerById(request.organizer_id);

    // Get event details for history
    const [events] = await pool.query('SELECT status FROM events WHERE event_id = ?', [request.event_id]);
    const event = events[0];

    await pool.execute(
      `UPDATE event_approval_requests 
       SET status = 'rejected', admin_status = 'rejected', admin_id = ?, rejection_reason = ?, processed_at = NOW()
       WHERE id = ?`,
      [adminId, reason, requestId]
    );

    // Set event back to changes_requested so organizer can fix and resubmit
    if (request.event_id) {
      await pool.execute(
        `UPDATE events SET status = ? WHERE event_id = ?`,
        [EVENT_STATUS.CHANGES_REQUESTED, request.event_id]
      );

      await upsertApprovalHistory({
        approvalRequestId: requestId,
        eventId: request.event_id,
        organizerId: request.organizer_id,
        organizerName: organizer?.name || 'Unknown',
        organizerEmail: organizer?.email || 'unknown',
        reviewerId: getReviewerHistoryId(admin),
        reviewerName: admin?.name || 'Unknown',
        reviewerEmail: admin?.email || 'unknown',
        reviewerRole: admin?.role || 'admin',
        action: 'rejected',
        previousStatus: event?.status || 'unknown',
        newStatus: EVENT_STATUS.CHANGES_REQUESTED,
        rejectionReason: reason,
        metadata: JSON.stringify({ approvalRequestId: requestId, reviewLevel: 'admin' }),
      });
    }

    logger.info('Admin rejected request', { requestId, adminId, reason });
    return { success: true, message: 'Request rejected' };
  }

  async rejectBySuperAdmin(requestId, superAdminId, reason) {
    const pool = getMySQLPool();

    const [requests] = await pool.query('SELECT * FROM event_approval_requests WHERE id = ?', [requestId]);
    if (!requests.length) throw new AppError('Approval request not found', 404);
    const request = requests[0];

    // Get super admin details for history
    const admin = await getReviewerById(superAdminId);
    const organizer = await getOrganizerById(request.organizer_id);

    // Get event details for history
    const [events] = await pool.query('SELECT status FROM events WHERE event_id = ?', [request.event_id]);
    const event = events[0];

    await pool.execute(
      `UPDATE event_approval_requests 
       SET status = 'rejected', super_admin_status = 'rejected', super_admin_id = ?, rejection_reason = ?, processed_at = NOW()
       WHERE id = ?`,
      [superAdminId, reason, requestId]
    );

    // Set event back to changes_requested so organizer can fix and resubmit
    if (request.event_id) {
      await pool.execute(
        `UPDATE events SET status = ? WHERE event_id = ?`,
        [EVENT_STATUS.CHANGES_REQUESTED, request.event_id]
      );

      await upsertApprovalHistory({
        approvalRequestId: requestId,
        eventId: request.event_id,
        organizerId: request.organizer_id,
        organizerName: organizer?.name || 'Unknown',
        organizerEmail: organizer?.email || 'unknown',
        reviewerId: getReviewerHistoryId(admin),
        reviewerName: admin?.name || 'Unknown',
        reviewerEmail: admin?.email || 'unknown',
        reviewerRole: admin?.role || 'super_admin',
        action: 'rejected',
        previousStatus: event?.status || 'unknown',
        newStatus: EVENT_STATUS.CHANGES_REQUESTED,
        rejectionReason: reason,
        metadata: JSON.stringify({ approvalRequestId: requestId, reviewLevel: 'super_admin' }),
      });
    }

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
      `SELECT ear.*, u.name as organizer_name, u.email as organizer_email,
              e.status as event_status, e.title as event_title, e.subtitle as event_subtitle,
              e.description as event_description, e.category as event_category,
              e.language as event_language, e.age_restriction as event_age_restriction,
              e.duration as event_duration, e.type as event_type,
              e.start_date as event_start_date, e.end_date as event_end_date,
              e.venue_name as event_venue_name, e.venue_address as event_venue_address,
              e.venue_city as event_venue_city, e.venue_state as event_venue_state,
              e.venue_country as event_venue_country, e.banner as event_banner,
              e.images as event_images, e.tags as event_tags,
              e.total_seats as event_total_seats, e.available_seats as event_available_seats,
              e.terms_conditions as event_terms_conditions,
              (SELECT COUNT(*) FROM ticket_types tt WHERE tt.event_id = e.event_id AND tt.is_active = 1) as ticket_types_count,
              (SELECT MIN(tt.price) FROM ticket_types tt WHERE tt.event_id = e.event_id AND tt.is_active = 1) as ticket_price_min,
              (SELECT MAX(tt.price) FROM ticket_types tt WHERE tt.event_id = e.event_id AND tt.is_active = 1) as ticket_price_max
       FROM event_approval_requests ear
       JOIN users u ON ear.organizer_id = u.user_id
       LEFT JOIN events e ON ear.event_id = e.event_id
       WHERE ear.status IN ('pending', 'under_review')
       ORDER BY ear.requested_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const parsedRequests = requests.map(formatApprovalRequest);

    return { requests: parsedRequests, page, limit };
  }

  async getAllRequests(page = 1, limit = 20, status = null, role = null) {
    const pool = getMySQLPool();
    const offset = (page - 1) * limit;

    let query = `SELECT ear.*, u.name as organizer_name, u.email as organizer_email,
                        e.status as event_status, e.title as event_title, e.subtitle as event_subtitle,
                        e.description as event_description, e.category as event_category,
                        e.language as event_language, e.age_restriction as event_age_restriction,
                        e.duration as event_duration, e.type as event_type,
                        e.start_date as event_start_date, e.end_date as event_end_date,
                        e.venue_name as event_venue_name, e.venue_address as event_venue_address,
                        e.venue_city as event_venue_city, e.venue_state as event_venue_state,
                        e.venue_country as event_venue_country, e.banner as event_banner,
                        e.images as event_images, e.tags as event_tags,
                        e.total_seats as event_total_seats, e.available_seats as event_available_seats,
                        e.terms_conditions as event_terms_conditions,
                        (SELECT COUNT(*) FROM ticket_types tt WHERE tt.event_id = e.event_id AND tt.is_active = 1) as ticket_types_count,
                        (SELECT MIN(tt.price) FROM ticket_types tt WHERE tt.event_id = e.event_id AND tt.is_active = 1) as ticket_price_min,
                        (SELECT MAX(tt.price) FROM ticket_types tt WHERE tt.event_id = e.event_id AND tt.is_active = 1) as ticket_price_max
                 FROM event_approval_requests ear
                 JOIN users u ON ear.organizer_id = u.user_id
                 LEFT JOIN events e ON ear.event_id = e.event_id`;
    const params = [];
    const conditions = [];

    if (status) {
      conditions.push('ear.status = ?');
      params.push(status);
    }

    // Super admin sees requests where admin has approved (awaiting super admin)
    // or all pending requests
    if (role === 'super_admin') {
      conditions.push('(ear.super_admin_status = \'pending\' OR ear.status = \'pending\')');
    }

    if (conditions.length) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY ear.requested_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [requests] = await pool.query(query, params);

    const parsedRequests = requests.map(formatApprovalRequest);

    // Return object with requests array to match frontend expectations
    return { requests: parsedRequests, page, limit };
  }

  async getApprovalStats() {
    const pool = getMySQLPool();
    
    const [stats] = await pool.query(
      `SELECT 
         ear.status,
         COUNT(*) as count
       FROM event_approval_requests ear
       GROUP BY ear.status`
    );

    // Also get event status counts
    const [eventStats] = await pool.query(
      `SELECT status, COUNT(*) as count FROM events GROUP BY status`
    );

    const result = {
      pending: 0,
      approved: 0,
      rejected: 0,
      eventStatuses: {}
    };

    stats.forEach(stat => {
      result[stat.status] = stat.count;
    });

    eventStats.forEach(stat => {
      result.eventStatuses[stat.status] = stat.count;
    });

    return result;
  }

  async getMyRequests(userId, page = 1, limit = 20) {
    const pool = getMySQLPool();
    const offset = (page - 1) * limit;

    const [requests] = await pool.query(
      `SELECT ear.*, e.status as event_status, e.title as event_title
       FROM event_approval_requests ear
       LEFT JOIN events e ON ear.event_id = e.event_id
       WHERE ear.organizer_id = ?
       ORDER BY ear.requested_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const parsedRequests = requests.map(formatApprovalRequest);

    return { requests: parsedRequests, page, limit };
  }

  async getRequestById(requestId) {
    const pool = getMySQLPool();
    
    const [requests] = await pool.query(
      `SELECT ear.*, u.name as organizer_name, u.email as organizer_email,
              e.status as event_status, e.title as event_title, e.subtitle as event_subtitle,
              e.description as event_description, e.category as event_category,
              e.language as event_language, e.age_restriction as event_age_restriction,
              e.duration as event_duration, e.type as event_type,
              e.start_date as event_start_date, e.end_date as event_end_date,
              e.venue_name as event_venue_name, e.venue_address as event_venue_address,
              e.venue_city as event_venue_city, e.venue_state as event_venue_state,
              e.venue_country as event_venue_country, e.banner as event_banner,
              e.images as event_images, e.tags as event_tags,
              e.total_seats as event_total_seats, e.available_seats as event_available_seats,
              e.terms_conditions as event_terms_conditions,
              (SELECT COUNT(*) FROM ticket_types tt WHERE tt.event_id = e.event_id AND tt.is_active = 1) as ticket_types_count,
              (SELECT MIN(tt.price) FROM ticket_types tt WHERE tt.event_id = e.event_id AND tt.is_active = 1) as ticket_price_min,
              (SELECT MAX(tt.price) FROM ticket_types tt WHERE tt.event_id = e.event_id AND tt.is_active = 1) as ticket_price_max
       FROM event_approval_requests ear
       JOIN users u ON ear.organizer_id = u.user_id
       LEFT JOIN events e ON ear.event_id = e.event_id
       WHERE ear.id = ?`,
      [requestId]
    );

    if (requests.length === 0) {
      throw new AppError('Request not found', 404);
    }

    return formatApprovalRequest(requests[0]);
  }
}

module.exports = new EventApprovalService();
