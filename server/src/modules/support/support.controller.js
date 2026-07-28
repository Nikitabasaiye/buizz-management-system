const supportService = require('./support.service');
const logger = require('../../utils/logger');

class SupportController {
  async createTicket(req, res, next) {
    try {
      const result = await supportService.createTicket(req.body, req.user);
      res.status(201).json({ success: true, message: 'Support ticket created successfully', data: result });
    } catch (error) {
      logger.error('Failed to create support ticket', { error: error.message });
      next(error);
    }
  }

  async getAllTickets(req, res, next) {
    try {
      const { page = 1, limit = 20, status, priority, role, search } = req.query;
      const result = await supportService.getAllTickets(parseInt(page), parseInt(limit), { status, priority, role, search });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      logger.error('Failed to get support tickets', { error: error.message });
      next(error);
    }
  }

  async getTicketById(req, res, next) {
    try {
      const ticket = await supportService.getTicketById(req.params.id);
      res.status(200).json({ success: true, data: ticket });
    } catch (error) {
      logger.error('Failed to get support ticket', { error: error.message });
      next(error);
    }
  }

  async updateTicket(req, res, next) {
    try {
      const ticket = await supportService.updateTicket(req.params.id, req.body, req.user);
      res.status(200).json({ success: true, message: 'Support ticket updated successfully', data: ticket });
    } catch (error) {
      logger.error('Failed to update support ticket', { error: error.message });
      next(error);
    }
  }

  async deleteTicket(req, res, next) {
    try {
      await supportService.deleteTicket(req.params.id, req.user);
      res.status(200).json({ success: true, message: 'Support ticket deleted successfully' });
    } catch (error) {
      logger.error('Failed to delete support ticket', { error: error.message });
      next(error);
    }
  }

  async getTicketStats(req, res, next) {
    try {
      const stats = await supportService.getTicketStats();
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      logger.error('Failed to get ticket stats', { error: error.message });
      next(error);
    }
  }
}

module.exports = new SupportController();
