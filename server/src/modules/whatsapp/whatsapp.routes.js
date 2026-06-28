const express = require('express');
const { body, param, validationResult } = require('express-validator');
const whatsappService = require('../../services/whatsapp.service');
const ticketRepository = require('../../repositories/ticket.repository');
const { getMySQLPool } = require('../../database/mysql');
const { authenticate, requirePermission } = require('../../middleware/rbac');
const { PERMISSIONS } = require('../../config/permissions');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  return next();
};

const resolveTicketPhone = (ticket, fallbackPhone) => fallbackPhone || ticket.user_phone;

router.use(authenticate);

router.get('/status', requirePermission(PERMISSIONS.ADMIN_ACCESS), (req, res) => {
  res.status(200).json({
    success: true,
    data: whatsappService.getStatus(),
  });
});

router.post(
  '/templates/register',
  requirePermission(PERMISSIONS.ADMIN_ACCESS),
  async (req, res, next) => {
    try {
      const data = await whatsappService.createBookingConfirmationTemplate();
      res.status(200).json({
        success: true,
        message: 'Booking confirmation template submitted for Meta review',
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/templates/reminder/register',
  requirePermission(PERMISSIONS.ADMIN_ACCESS),
  async (req, res, next) => {
    try {
      const data = await whatsappService.createEventReminderTemplate();
      res.status(200).json({
        success: true,
        message: 'Event reminder template submitted for Meta review',
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/test',
  requirePermission(PERMISSIONS.ADMIN_ACCESS),
  [
    body('phoneNumber').trim().notEmpty().withMessage('phoneNumber is required'),
    body('message').trim().notEmpty().withMessage('message is required'),
    validate,
  ],
  async (req, res, next) => {
    try {
      const result = await whatsappService.sendTextMessage(req.body.phoneNumber, req.body.message);
      res.status(200).json({ success: true, message: 'Test message sent', data: result });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/tickets/:ticketNumber/send',
  requirePermission(PERMISSIONS.TICKET_READ),
  [
    param('ticketNumber').trim().notEmpty().withMessage('ticketNumber is required'),
    body('phoneNumber').optional().trim().notEmpty(),
    validate,
  ],
  async (req, res, next) => {
    try {
      const ticket = await ticketRepository.findByTicketNumber(req.params.ticketNumber);
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
      }

      const phoneNumber = resolveTicketPhone(ticket, req.body.phoneNumber);
      if (!phoneNumber) {
        return res.status(400).json({ success: false, message: 'No phone number found for this ticket' });
      }

      const data = await whatsappService.sendTicketDetails(phoneNumber, ticket);
      res.status(200).json({ success: true, message: 'Ticket sent on WhatsApp', data });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/tickets/:ticketNumber/reminder',
  requirePermission(PERMISSIONS.TICKET_READ),
  [
    param('ticketNumber').trim().notEmpty().withMessage('ticketNumber is required'),
    body('phoneNumber').optional().trim().notEmpty(),
    validate,
  ],
  async (req, res, next) => {
    try {
      const ticket = await ticketRepository.findByTicketNumber(req.params.ticketNumber);
      if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
      }

      const phoneNumber = resolveTicketPhone(ticket, req.body.phoneNumber);
      if (!phoneNumber) {
        return res.status(400).json({ success: false, message: 'No phone number found for this ticket' });
      }

      const data = await whatsappService.sendEventReminder(phoneNumber, {
        eventName: ticket.event_title,
        eventDate: ticket.event_date,
        eventVenue: [ticket.venue_name, ticket.venue_address].filter(Boolean).join(', ') || 'Venue TBD',
        ticketNumber: ticket.ticket_number,
      });

      res.status(200).json({ success: true, message: 'Reminder sent on WhatsApp', data });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/events/:eventId/reminders',
  requirePermission(PERMISSIONS.TICKET_READ),
  [param('eventId').isInt({ min: 1 }).withMessage('Valid eventId is required'), validate],
  async (req, res, next) => {
    try {
      const pool = getMySQLPool();
      const [tickets] = await pool.query(
        `SELECT t.*, e.title as event_title, e.start_date as event_date, e.venue_name, e.venue_address,
                u.name as user_name, u.phone as user_phone
         FROM tickets t
         JOIN events e ON t.event_id = e.event_id
         JOIN users u ON t.user_id = u.user_id
         WHERE t.event_id = ? AND t.status = 'active' AND u.phone IS NOT NULL`,
        [req.params.eventId]
      );

      const results = [];
      for (const ticket of tickets) {
        const result = await whatsappService.sendEventReminder(ticket.user_phone, {
          eventName: ticket.event_title,
          eventDate: ticket.event_date,
          eventVenue: [ticket.venue_name, ticket.venue_address].filter(Boolean).join(', ') || 'Venue TBD',
          ticketNumber: ticket.ticket_number,
        }).catch((error) => ({
          success: false,
          error: error.response?.data?.error?.message || error.message,
        }));

        results.push({ ticketNumber: ticket.ticket_number, phoneNumber: ticket.user_phone, ...result });
      }

      res.status(200).json({
        success: true,
        message: 'Event reminder sending completed',
        data: {
          total: tickets.length,
          sent: results.filter((result) => result.success).length,
          failed: results.filter((result) => !result.success).length,
          results,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
