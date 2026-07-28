const bookingService = require('./booking.service');
const phonePeService = require('../../services/phonepe.service');
const auditService = require('../../services/audit.service');
const logger = require('../../utils/logger');

const initiateBooking = async (req, res, next) => {
  try {
    logger.info('Booking initiation request received', { 
      body: req.body, 
      userId: req.user?.id,
      userEmail: req.user?.email 
    });

    const result = await bookingService.initiateBooking(req.body, req.user);
    
    logger.info('Booking initiated successfully', { orderId: result.orderId });

    res.status(200).json({
      success: true,
      message: 'Booking initiated successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Booking initiation failed', { 
      error: error.message,
      stack: error.stack,
      body: req.body 
    });
    next(error);
  }
};

const handlePhonePeCallback = async (req, res, next) => {
  try {
    logger.info('PhonePe callback received', { body: req.body });

    const authorization = req.headers.authorization || req.headers.Authorization || req.headers['x-verify'] || '';
    const result = await bookingService.handlePaymentCallback(req.body, authorization);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Payment successful',
        data: result.bookingConfirmation,
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: 'Payment failed',
    });
  } catch (error) {
    logger.error('PhonePe callback error', { error: error.message });
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    logger.info('Payment verification requested', { orderId });

    const result = await phonePeService.verifyPayment(orderId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Payment verification failed', { error: error.message });
    next(error);
  }
};

const getBookingDetails = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const result = await bookingService.getBookingDetails(orderId, req.user.id);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getUserBookings = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const result = await bookingService.getUserBookings(req.user.id, parseInt(page, 10), parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get organizer bookings (privacy protected)
 */
const getOrganizerBookings = async (req, res, next) => {
  try {
    const { organizerId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    // Check if user can access this organizer's data
    if (req.user.role === 'organizer' && String(req.user.id) !== String(organizerId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to other organizer data'
      });
    }
    
    const result = await bookingService.getOrganizerBookings(
      organizerId,
      req.user.role,
      parseInt(page),
      parseInt(limit)
    );
    
    // Log access for audit
    await auditService.logAction({
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'organizer_bookings_accessed',
      actionType: 'read',
      resourceType: 'booking',
      resourceId: organizerId,
      description: `Accessed organizer ${organizerId} bookings with ${req.user.role} privileges`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { 
        targetOrganizerId: organizerId,
        privacyLevel: result.privacy?.level,
        recordCount: result.bookings.length
      },
      severity: 'medium'
    });
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get event attendees (privacy protected)
 */
const getEventAttendees = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const result = await bookingService.getEventAttendees(
      eventId,
      req.user.role,
      req.user.id,
      parseInt(page),
      parseInt(limit)
    );
    
    // Log access for audit
    await auditService.logAction({
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      userRole: req.user.role,
      action: 'event_attendees_accessed',
      actionType: 'read',
      resourceType: 'booking',
      resourceId: eventId,
      description: `Accessed event ${eventId} attendees with ${req.user.role} privileges`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { 
        targetEventId: eventId,
        privacyLevel: result.privacy?.level,
        attendeeCount: result.attendees.length
      },
      severity: 'medium'
    });
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all bookings (admin/super admin only)
 */
const getAllBookings = async (req, res, next) => {
  try {
    const { page = 1, limit = 100, status, eventId } = req.query;
    
    const result = await bookingService.getAllBookings(
      req.user.role,
      parseInt(page),
      parseInt(limit),
      status,
      eventId
    );
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  initiateBooking,
  handlePhonePeCallback,
  verifyPayment,
  getBookingDetails,
  getUserBookings,
  getOrganizerBookings,
  getEventAttendees,
  getAllBookings,
};
