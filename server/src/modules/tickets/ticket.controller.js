const ticketService = require('./ticket.service');

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
