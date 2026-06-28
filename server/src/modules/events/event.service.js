const eventRepository = require('./event.repository');
const eventApprovalService = require('./event-approval.service');
const { AppError } = require('../../middleware/errorHandler');
const { EVENT_STATUS } = require('../../constants');
const { getIO } = require('../../sockets');
const { getMySQLPool } = require('../../database/mysql');
const logger = require('../../utils/logger');

/**
 * Check if user has completed KYC and bank verification
 * Required for organizers to publish events
 */
const checkKycVerification = async (userId, userRole) => {
  // Skip check for admin and super_admin
  if (userRole === 'admin' || userRole === 'super_admin') {
    return { verified: true };
  }

  const pool = getMySQLPool();
  
  const [users] = await pool.query(
    `SELECT kyc_status, bank_verification_status FROM users WHERE user_id = ?`,
    [userId]
  );

  if (!users || users.length === 0) {
    throw new AppError('User not found', 404);
  }

  const user = users[0];

  // Check if KYC is verified
  if (user.kyc_status !== 'verified') {
    return {
      verified: false,
      reason: 'kyc_not_verified',
      message: 'Your KYC is not verified. Please complete KYC verification before publishing events.',
      kycStatus: user.kyc_status
    };
  }

  // Check if bank verification is complete
  if (user.bank_verification_status !== 'verified') {
    return {
      verified: false,
      reason: 'bank_not_verified',
      message: 'Your bank account is not verified. Please complete bank verification before publishing events.',
      bankStatus: user.bank_verification_status
    };
  }

  return { 
    verified: true,
    kycStatus: user.kyc_status,
    bankStatus: user.bank_verification_status
  };
};

const generateSlug = (title) => {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
};

const createTicketTypes = async (eventId, ticketTypes) => {
  if (!ticketTypes || ticketTypes.length === 0) {
    throw new AppError('At least one ticket type is required', 400);
  }

  const pool = getMySQLPool();
  const createdTicketTypes = [];

  for (const ticketType of ticketTypes) {
    const { name, description, price, quantity, saleStartDate, saleEndDate, isFree } = ticketType;
    
    if (!name || price === undefined || !quantity) {
      throw new AppError('Ticket type must have name, price, and quantity', 400);
    }

    const finalPrice = isFree ? 0 : parseFloat(price);
    const isFreeFlag = isFree || finalPrice === 0 ? 1 : 0;

    const [result] = await pool.execute(
      `INSERT INTO ticket_types (event_id, name, description, price, quantity, available_quantity, sale_start_date, sale_end_date, is_free, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        eventId,
        name,
        description || null,
        finalPrice,
        quantity,
        quantity, // available_quantity same as quantity initially
        saleStartDate || null,
        saleEndDate || null,
        isFreeFlag
      ]
    );

    createdTicketTypes.push({
      id: result.insertId,
      name,
      price: finalPrice,
      quantity,
      isFree: Boolean(isFreeFlag)
    });
  }

  return createdTicketTypes;
};

const createEvent = async (eventData, userId, userRole) => {
  const { ticketTypes, ...eventInfo } = eventData;
  
  // Check KYC verification for organizers
  if (userRole === 'organizer') {
    const kycCheck = await checkKycVerification(userId, userRole);
    if (!kycCheck.verified) {
      logger.warn('Event creation blocked - KYC not verified', { userId, reason: kycCheck.reason });
      throw new AppError(kycCheck.message, 403, { 
        reason: kycCheck.reason,
        kycStatus: kycCheck.kycStatus,
        bankStatus: kycCheck.bankStatus
      });
    }
    logger.info('KYC verified for event creation', { userId });
  }
  
  eventInfo.organizerId = userId;
  eventInfo.slug = generateSlug(eventInfo.title);
  eventInfo.availableSeats = eventInfo.totalSeats;
  
  // Organizers need approval, admin/super_admin can create directly
  if (userRole === 'organizer') {
    // Include ticket types in approval request
    const approvalData = { ...eventInfo, ticketTypes };
    const approval = await eventApprovalService.createApprovalRequest(approvalData, userId, 'create');
    return { 
      message: 'Event submitted for approval', 
      approvalRequest: approval,
      requiresApproval: true 
    };
  }
  
  // Admin/Super Admin can create directly
  const event = await eventRepository.create(eventInfo);
  
  // Create ticket types
  const createdTicketTypes = await createTicketTypes(event.id, ticketTypes);
  
  return { 
    event: { ...event, ticketTypes: createdTicketTypes },
    requiresApproval: false 
  };
};

const getEvents = async (filters) => {
  return await eventRepository.findAll(filters);
};

const getEventById = async (id) => {
  const event = await eventRepository.findById(id);
  if (!event) {
    throw new AppError('Event not found', 404);
  }
  
  await eventRepository.incrementViews(id);
  return event;
};

const getEventBySlug = async (slug) => {
  const event = await eventRepository.findBySlug(slug);
  if (!event) {
    throw new AppError('Event not found', 404);
  }
  
  await eventRepository.incrementViews(event.id);
  return event;
};

const updateEvent = async (id, updateData, userId, userRole) => {
  const event = await eventRepository.findById(id);
  
  if (!event) {
    throw new AppError('Event not found', 404);
  }
  
  if (String(event.organizerId) !== String(userId) && userRole !== 'admin' && userRole !== 'super_admin') {
    throw new AppError('Not authorized to update this event', 403);
  }

  // Organizers need approval for updates
  if (userRole === 'organizer') {
    updateData.event_id = id;
    const approval = await eventApprovalService.createApprovalRequest(updateData, userId, 'update');
    return { 
      message: 'Update submitted for approval', 
      approvalRequest: approval,
      requiresApproval: true 
    };
  }

  const updatedEvent = await eventRepository.updateById(id, updateData);
  
  // Emit socket event for live updates
  const io = getIO();
  io.to(`event:${id}`).emit('event:updated', updatedEvent);
  
  return { event: updatedEvent, requiresApproval: false };
};

const deleteEvent = async (id, userId, userRole) => {
  const event = await eventRepository.findById(id);
  
  if (!event) {
    throw new AppError('Event not found', 404);
  }
  
  if (String(event.organizerId) !== String(userId) && userRole !== 'admin' && userRole !== 'super_admin') {
    throw new AppError('Not authorized to delete this event', 403);
  }

  // Organizers need approval for deletion
  if (userRole === 'organizer') {
    const approval = await eventApprovalService.createApprovalRequest({ event_id: id }, userId, 'delete');
    return { 
      message: 'Delete request submitted for approval', 
      approvalRequest: approval,
      requiresApproval: true 
    };
  }

  await eventRepository.updateById(id, { status: EVENT_STATUS.CANCELLED });
  return { requiresApproval: false };
};

const publishEvent = async (id, userId, userRole) => {
  const event = await eventRepository.findById(id);
  
  if (!event) {
    throw new AppError('Event not found', 404);
  }
  
  // Allow organizers to publish their own events, or admins/super_admins to publish any event
  if (String(event.organizerId) !== String(userId) && userRole !== 'admin' && userRole !== 'super_admin') {
    throw new AppError('Not authorized to publish this event', 403);
  }

  // Check KYC verification before publishing (skip for admin/super_admin)
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    const kycCheck = await checkKycVerification(userId, userRole);
    if (!kycCheck.verified) {
      logger.warn('Event publishing blocked - KYC not verified', { 
        userId, 
        eventId: id, 
        reason: kycCheck.reason 
      });
      throw new AppError(kycCheck.message, 403, { 
        reason: kycCheck.reason,
        kycStatus: kycCheck.kycStatus,
        bankStatus: kycCheck.bankStatus
      });
    }
  }

  logger.info('Publishing event', { userId, eventId: id, userRole });
  return await eventRepository.updateById(id, { status: EVENT_STATUS.PUBLISHED });
};

module.exports = {
  createEvent,
  createTicketTypes,
  getEvents,
  getEventById,
  getEventBySlug,
  updateEvent,
  deleteEvent,
  publishEvent,
  checkKycVerification
};
