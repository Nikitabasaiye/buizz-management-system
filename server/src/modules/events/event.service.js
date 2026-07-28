const eventRepository = require('./event.repository');
const eventApprovalService = require('./event-approval.service');
const { AppError } = require('../../middleware/errorHandler');
const { EVENT_STATUS } = require('../../constants');
const { getIO } = require('../../sockets');
const { getMySQLPool } = require('../../database/mysql');
const logger = require('../../utils/logger');

const checkKycVerification = async (userId, userRole) => {
  if (userRole === 'admin' || userRole === 'super_admin' || userRole === 'super-admin') return { verified: true };

  const pool = getMySQLPool();
  const [users] = await pool.query(
    'SELECT kyc_status, bank_verification_status FROM users WHERE user_id = ?',
    [userId]
  );
  if (!users || !users.length) throw new AppError('User not found', 404);

  const user = users[0];
  // Accept both 'verified' (legacy DB value) and 'approved' (new status)
  const kycOk = user.kyc_status === 'verified' || user.kyc_status === 'approved';
  const bankOk = user.bank_verification_status === 'verified' || user.bank_verification_status === 'approved';

  if (!kycOk) return { verified: false, reason: 'kyc_not_verified', message: 'Complete KYC verification before publishing events.', kycStatus: user.kyc_status };
  if (!bankOk) return { verified: false, reason: 'bank_not_verified', message: 'Complete bank verification before publishing events.', bankStatus: user.bank_verification_status };

  return { verified: true, kycStatus: user.kyc_status, bankStatus: user.bank_verification_status };
};

const generateSlug = (title) => {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
};

const PUBLISHED_LIKE_STATUSES = [
  EVENT_STATUS.PUBLISHED,
  EVENT_STATUS.ONGOING,
  EVENT_STATUS.COMPLETED,
];

const ORGANIZER_SUBMITTABLE_STATUSES = [
  EVENT_STATUS.DRAFT,
  EVENT_STATUS.SUBMITTED,
  EVENT_STATUS.UNDER_REVIEW,
  EVENT_STATUS.CHANGES_REQUESTED,
  EVENT_STATUS.APPROVED,
  EVENT_STATUS.REJECTED,
];

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
  const { ticketTypes, submitForReview = true, ...eventInfo } = eventData;

  eventInfo.organizerId = userId;
  eventInfo.slug = generateSlug(eventInfo.title);
  eventInfo.availableSeats = eventInfo.totalSeats;

  // Admin/super_admin create directly as published
  if (userRole === 'admin' || userRole === 'super_admin' || userRole === 'super-admin') {
    const event = await eventRepository.create({ ...eventInfo, status: EVENT_STATUS.PUBLISHED });
    const createdTicketTypes = ticketTypes?.length ? await createTicketTypes(event.id, ticketTypes) : [];
    return { event: { ...event, ticketTypes: createdTicketTypes }, requiresApproval: false };
  }

  // Organizer: check KYC first, then create and submit for review
  const kycCheck = await checkKycVerification(userId, userRole);
  if (!kycCheck.verified) {
    throw new AppError(kycCheck.message, 403);
  }

  // Create event as draft first
  const event = await eventRepository.create({ ...eventInfo, status: EVENT_STATUS.DRAFT });
  const createdTicketTypes = ticketTypes?.length ? await createTicketTypes(event.id, ticketTypes) : [];

  // Automatically submit for review
  await submitEventForReview(event.id, userId, userRole);
  const submitted = await eventRepository.findById(event.id);
  
  return { event: { ...submitted, ticketTypes: createdTicketTypes }, requiresApproval: true };
};

const submitEventForReview = async (eventId, userId, userRole) => {
  const event = await eventRepository.findById(eventId);
  if (!event) throw new AppError('Event not found', 404);

  if (String(event.organizerId) !== String(userId) && userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'super-admin') {
    throw new AppError('Not authorized to submit this event', 403);
  }

  if (!ORGANIZER_SUBMITTABLE_STATUSES.includes(event.status)) {
    throw new AppError(`Event cannot be submitted from status: ${event.status}`, 400);
  }

  // KYC check required to submit for review
  const kycCheck = await checkKycVerification(userId, userRole);
  if (!kycCheck.verified) {
    throw new AppError(kycCheck.message, 403, { reason: kycCheck.reason, kycStatus: kycCheck.kycStatus });
  }

  await eventRepository.updateById(eventId, { status: EVENT_STATUS.SUBMITTED });
  await eventApprovalService.createApprovalRequest({ event_id: eventId, ...event, previous_status: event.status }, userId, 'create');

  logger.info('Event submitted for review', { eventId, userId });
  return eventRepository.findById(eventId);
};

const getEvents = async (filters) => {
  return await eventRepository.findAll(filters);
};

const isPubliclyExpiredOrCompleted = (event) => {
  if (!event) return false;
  if (
    event.status === EVENT_STATUS.COMPLETED ||
    event.status === EVENT_STATUS.CANCELLED ||
    event.status === 'expired'
  ) {
    return true;
  }

  const endValue = event.endDate || event.startDate;
  if (!endValue) return false;
  const endTime = new Date(endValue).getTime();
  return Number.isFinite(endTime) && endTime < Date.now();
};

const getDraftEvents = async (userId, userRole) => {
  const workflowStatuses = [
    EVENT_STATUS.DRAFT,
    EVENT_STATUS.SUBMITTED,
    EVENT_STATUS.UNDER_REVIEW,
    EVENT_STATUS.CHANGES_REQUESTED,
    EVENT_STATUS.APPROVED,
    EVENT_STATUS.REJECTED,
    EVENT_STATUS.PUBLISHED,
    EVENT_STATUS.CANCELLED,
  ];

  if (userRole === 'super_admin' || userRole === 'super-admin' || userRole === 'admin') {
    return await eventRepository.findAll({ includeAllStatuses: true, limit: 100 });
  }
  
  // Organizers can manage their own events after draft, submission, approval, publish, or rejection.
  if (userRole === 'organizer') {
    const result = await eventRepository.findAll({
      organizerId: userId,
      limit: 100,
      includeAllStatuses: true 
    });

    result.events = result.events.filter((event) => workflowStatuses.includes(event.status));
    result.pagination.total = result.events.length;
    result.pagination.pages = 1;
    return result;
  }
  
  throw new AppError('Not authorized to view draft events', 403);
};

const saveDraft = async (eventData, userId, userRole) => {
  // If eventId is provided, update existing draft
  if (eventData.eventId) {
    const event = await eventRepository.findById(eventData.eventId);
    
    if (!event) {
      throw new AppError('Event not found', 404);
    }
    
    // Authorization check
    if (String(event.organizerId) !== String(userId) && userRole !== 'admin' && userRole !== 'super_admin') {
      throw new AppError('Not authorized to update this event', 403);
    }
    
    // Only allow saving as draft
    const updateData = { ...eventData, status: EVENT_STATUS.DRAFT };
    delete updateData.eventId;
    
    const updatedEvent = await eventRepository.updateById(eventData.eventId, updateData);
    return { event: updatedEvent, isDraft: true };
  }
  
  // Create new draft event
  const { ticketTypes, ...eventInfo } = eventData;
  eventInfo.organizerId = userId;
  eventInfo.slug = generateSlug(eventInfo.title || 'draft-event');
  eventInfo.status = EVENT_STATUS.DRAFT;
  eventInfo.availableSeats = eventInfo.totalSeats;
  
  const event = await eventRepository.create(eventInfo);
  const createdTicketTypes = ticketTypes?.length ? await createTicketTypes(event.id, ticketTypes) : [];
  
  return { event: { ...event, ticketTypes: createdTicketTypes }, isDraft: true };
};

const getEventById = async (id) => {
  await eventRepository.markPastPublishedEventsCompleted();
  const event = await eventRepository.findById(id);
  if (!event) {
    throw new AppError('Event not found', 404);
  }
  if (isPubliclyExpiredOrCompleted(event)) {
    throw new AppError('Event completed and is no longer available for booking', 410);
  }
  
  await eventRepository.incrementViews(id);
  return event;
};

const getEventBySlug = async (slug) => {
  await eventRepository.markPastPublishedEventsCompleted();
  const event = await eventRepository.findBySlug(slug);
  if (!event) {
    throw new AppError('Event not found', 404);
  }
  if (isPubliclyExpiredOrCompleted(event)) {
    throw new AppError('Event completed and is no longer available for booking', 410);
  }
  
  await eventRepository.incrementViews(event.id);
  return event;
};

const updateEvent = async (id, updateData, userId, userRole) => {
  const event = await eventRepository.findById(id);
  
  if (!event) {
    throw new AppError('Event not found', 404);
  }
  
  // Authorization check
  if (String(event.organizerId) !== String(userId) && userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'super-admin') {
    throw new AppError('Not authorized to update this event', 403);
  }

  // Super admins and admins can update any event directly
  if (userRole === 'super_admin' || userRole === 'super-admin' || userRole === 'admin') {
    const updatedEvent = await eventRepository.updateById(id, updateData);
    
    // Emit socket event for live updates
    const io = getIO();
    io.to(`event:${id}`).emit('event:updated', updatedEvent);
    
    return { event: updatedEvent, requiresApproval: false };
  }

  // Organizers can update draft events directly without approval
  if (userRole === 'organizer' && event.status === EVENT_STATUS.DRAFT) {
    const updatedEvent = await eventRepository.updateById(id, updateData);
    
    // Emit socket event for live updates
    const io = getIO();
    io.to(`event:${id}`).emit('event:updated', updatedEvent);
    
    return { event: updatedEvent, requiresApproval: false };
  }

  // Organizers updating non-draft events need approval.
  if (userRole === 'organizer') {
    // Temporarily disabled: allow organizer update requests inside the old 2-day lock window.
    // const eventStartDate = new Date(event.start_date);
    // const now = new Date();
    // const twoDaysBeforeEvent = new Date(eventStartDate);
    // twoDaysBeforeEvent.setDate(twoDaysBeforeEvent.getDate() - 2);
    //
    // if (now >= twoDaysBeforeEvent) {
    //   throw new AppError('Event can only be updated at least 2 days before the event start date', 403);
    // }

    const approval = await eventApprovalService.createApprovalRequest(
      { ...updateData, event_id: id, previous_status: event.status },
      userId,
      'update'
    );

    if (!PUBLISHED_LIKE_STATUSES.includes(event.status)) {
      await eventRepository.updateById(id, { status: EVENT_STATUS.SUBMITTED });
    }

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
  
  // Authorization check
  if (String(event.organizerId) !== String(userId) && userRole !== 'admin' && userRole !== 'super_admin' && userRole !== 'super-admin') {
    throw new AppError('Not authorized to delete this event', 403);
  }

  // Super admins and admins can delete any event directly
  if (userRole === 'super_admin' || userRole === 'super-admin' || userRole === 'admin') {
    await eventRepository.updateById(id, { status: EVENT_STATUS.CANCELLED });
    return { requiresApproval: false };
  }

  // Organizers can delete draft events directly without approval
  if (userRole === 'organizer' && event.status === EVENT_STATUS.DRAFT) {
    await eventRepository.updateById(id, { status: EVENT_STATUS.CANCELLED });
    return { requiresApproval: false };
  }

  // Organizers deleting non-draft events need approval
  if (userRole === 'organizer') {
    const approval = await eventApprovalService.createApprovalRequest(
      { event_id: id, title: event.title, previous_status: event.status },
      userId,
      'delete'
    );

    if (!PUBLISHED_LIKE_STATUSES.includes(event.status)) {
      await eventRepository.updateById(id, { status: EVENT_STATUS.SUBMITTED });
    }

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

  // Super admins can publish any event directly
  if (userRole === 'super_admin' || userRole === 'super-admin') {
    logger.info('Publishing event by Super Admin', { userId, eventId: id, userRole });
    return await eventRepository.updateById(id, { status: EVENT_STATUS.PUBLISHED });
  }

  // Organizers can only publish events that have been approved by super admin
  if (userRole === 'organizer') {
    if (String(event.organizerId) !== String(userId)) {
      throw new AppError('Not authorized to publish this event', 403);
    }

    // Check if event has been approved by super admin
    if (event.status !== 'approved') {
      throw new AppError('Event must be approved by Super Admin before publishing. Current status: ' + event.status, 403);
    }

    // KYC check temporarily disabled so organizer can publish immediately after Super Admin event approval.
    // const kycCheck = await checkKycVerification(userId, userRole);
    // if (!kycCheck.verified) {
    //   logger.warn('Event publishing blocked - KYC not verified', {
    //     userId,
    //     eventId: id,
    //     reason: kycCheck.reason
    //   });
    //   throw new AppError(kycCheck.message, 403, {
    //     reason: kycCheck.reason,
    //     kycStatus: kycCheck.kycStatus,
    //     bankStatus: kycCheck.bankStatus
    //   });
    // }

    logger.info('Publishing event by Organizer after Super Admin approval', { userId, eventId: id, userRole });
    return await eventRepository.updateById(id, { status: EVENT_STATUS.PUBLISHED });
  }

  throw new AppError('Not authorized to publish events', 403);
};

module.exports = {
  createEvent,
  createTicketTypes,
  submitEventForReview,
  getEvents,
  getDraftEvents,
  saveDraft,
  getEventById,
  getEventBySlug,
  updateEvent,
  deleteEvent,
  publishEvent,
  checkKycVerification
};
