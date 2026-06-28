const ticketRepository = require('../../repositories/ticket.repository');
const eventRepository = require('../events/event.repository');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

class TicketService {
  async getTicketByNumber(ticketNumber, userId, userRole) {
    const ticket = await ticketRepository.findByTicketNumber(ticketNumber);
    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    if (ticket.user_id !== userId && !['admin', 'organizer'].includes(userRole)) {
      throw new AppError('You do not have permission to view this ticket', 403);
    }

    return ticket;
  }

  async getUserTickets(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const tickets = await ticketRepository.findByUserId(userId, limit, offset);
    return { tickets, page, limit };
  }

  async scanTicket(ticketNumber, scannedBy) {
    const ticket = await ticketRepository.findByTicketNumber(ticketNumber);
    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    if (ticket.status === 'used') {
      throw new AppError('Ticket has already been scanned', 400);
    }

    if (ticket.status === 'cancelled') {
      throw new AppError('Ticket has been cancelled', 400);
    }

    if (ticket.status === 'expired') {
      throw new AppError('Ticket has expired', 400);
    }

    const event = await eventRepository.findById(ticket.event_id);
    if (new Date(event.endDate) < new Date()) {
      throw new AppError('Event has already ended', 400);
    }

    const success = await ticketRepository.scanTicket(ticketNumber, scannedBy);
    if (!success) {
      throw new AppError('Failed to scan ticket', 500);
    }

    logger.info('Ticket scanned', { ticketNumber, scannedBy });
    return { message: 'Ticket scanned successfully', ticket };
  }

  async getTicketDetails(ticketNumber) {
    const ticket = await ticketRepository.findByTicketNumber(ticketNumber);
    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    const event = await eventRepository.findById(ticket.event_id);
    if (!event) {
      throw new AppError('Event not found', 404);
    }

    return {
      ticket: {
        ticketNumber: ticket.ticket_number,
        status: ticket.status,
        price: ticket.price,
        checkedIn: ticket.checked_in,
        checkedInAt: ticket.checked_in_at
      },
      event: {
        id: event.event_id,
        title: event.title,
        description: event.description,
        type: event.type,
        startDate: event.start_date,
        endDate: event.end_date,
        venueName: event.venue_name,
        venueAddress: event.venue_address,
        venueCity: event.venue_city,
        banner: event.banner,
        status: event.status
      }
    };
  }

  async cancelTicket(ticketNumber, userId, userRole) {
    const ticket = await ticketRepository.findByTicketNumber(ticketNumber);
    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    if (ticket.user_id !== userId && userRole !== 'admin') {
      throw new AppError('You do not have permission to cancel this ticket', 403);
    }

    if (ticket.status === 'used') {
      throw new AppError('Cannot cancel a used ticket', 400);
    }

    await ticketRepository.updateStatus(ticketNumber, 'cancelled');
    logger.info('Ticket cancelled', { ticketNumber, userId });
    return { message: 'Ticket cancelled successfully' };
  }

  async getEventTickets(eventId, page = 1, limit = 50) {
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new AppError('Event not found', 404);
    }

    const offset = (page - 1) * limit;
    const tickets = await ticketRepository.findByEventId(eventId, limit, offset);
    return { tickets, page, limit };
  }
}

module.exports = new TicketService();
