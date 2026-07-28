const ticketService = require('./ticket.service');
const pdfService = require('../../services/pdf.service');
const ticketRepository = require('../../repositories/ticket.repository');
const eventRepository = require('../events/event.repository');
const userRepository = require('../users/user.repository');
const paymentRepository = require('../../repositories/payment.repository');
const logger = require('../../utils/logger');

class TicketController {
  async getMyTickets(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await ticketService.getUserTickets(req.user.id, parseInt(page), parseInt(limit));
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getTicketByNumber(req, res, next) {
    try {
      const ticket = await ticketService.getTicketByNumber(
        req.params.ticketNumber,
        req.user.id,
        req.user.role
      );
      res.status(200).json({
        success: true,
        data: ticket
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /tickets/:ticketNumber/pdf — download ticket as PDF
  async downloadTicketPdf(req, res, next) {
    try {
      const { ticketNumber } = req.params;
      let ticket;
      
      logger.info('PDF download attempt', { ticketNumber, userId: req.user.id, userRole: req.user.role });
      
      // Try to find by ticket number first, then by ID
      if (ticketNumber.match(/^TKT/)) {
        ticket = await ticketRepository.findByTicketNumber(ticketNumber);
      } else {
        ticket = await ticketRepository.findById(ticketNumber);
      }
      
      if (!ticket) {
        logger.warn('Ticket not found for PDF download', { ticketNumber });
        return res.status(404).json({ success: false, message: 'Ticket not found' });
      }

      // Allow: ticket owner, admin, super_admin, organizer of the event
      const isOwner = String(ticket.user_id) === String(req.user.id);
      const isAdmin = ['admin', 'super_admin', 'super-admin'].includes(req.user.role);
      const event = await eventRepository.findById(ticket.event_id);
      const isOrganizer = req.user.role === 'organizer' && String(event?.organizer_id) === String(req.user.id);
      if (!isOwner && !isAdmin && !isOrganizer) {
        logger.warn('Unauthorized PDF download attempt', { ticketNumber, userId: req.user.id, userRole: req.user.role });
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const user = await userRepository.findById(ticket.user_id);
      const payment = ticket.payment_id ? await paymentRepository.findById(ticket.payment_id) : null;

      const eventDate = event?.start_date
        ? new Date(event.start_date).toLocaleString('en-IN', {
            weekday: 'long', year: 'numeric', month: 'long',
            day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
          })
        : 'Date pending';

      const eventVenue = event?.type === 'online'
        ? 'Online Event'
        : [event?.venue_name, event?.venue_city, event?.venue_state].filter(Boolean).join(', ') || 'Venue TBD';

      const pdfBuffer = await pdfService.generateTicketPdf({
        ticketNumber: ticket.ticket_number,
        eventName: event?.title || `Event #${ticket.event_id}`,
        eventDate,
        eventVenue,
        eventAddress: [event?.venue_address, event?.venue_city, event?.venue_state].filter(Boolean).join(', '),
        userName: user?.name || ticket.user_name || 'Buizz User',
        userEmail: user?.email || ticket.user_email || '',
        ticketType: ticket.ticket_type || 'Entry Pass',
        price: ticket.price,
        orderId: payment?.order_id || ticket.order_id || 'N/A',
        transactionId: payment?.transaction_id || 'N/A',
        qrCodeDataUrl: ticket.qr_code,
        organizerName: 'Buizz',
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Buizz-Ticket-${ticket.ticket_number}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.end(pdfBuffer);
    } catch (error) {
      logger.error('Ticket PDF download failed', { error: error.message, stack: error.stack });
      next(error);
    }
  }

  // GET /tickets/:ticketNumber/scan-info — public QR scan endpoint
  async getScanInfo(req, res, next) {
    try {
      const result = await ticketService.getTicketDetails(req.params.ticketNumber);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async scanTicket(req, res, next) {
    try {
      const result = await ticketService.scanTicket(req.params.ticketNumber, req.user.id);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.ticket
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelTicket(req, res, next) {
    try {
      const result = await ticketService.cancelTicket(
        req.params.ticketNumber,
        req.user.id,
        req.user.role
      );
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  async getEventTickets(req, res, next) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const result = await ticketService.getEventTickets(
        req.params.eventId,
        parseInt(page),
        parseInt(limit)
      );
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TicketController();
