const express = require('express');
const { authenticate, requirePermission, auditLog } = require('../../middleware/rbac');
const { PERMISSIONS } = require('../../config/permissions');
const ticketService = require('../tickets/ticket.service');
const { AppError } = require('../../middleware/errorHandler');

const router = express.Router();

const resolveTicketNumber = (body) => {
  if (body.ticketNumber) return body.ticketNumber;
  if (!body.qrData) return null;

  try {
    const parsed = typeof body.qrData === 'string' ? JSON.parse(body.qrData) : body.qrData;
    return parsed.ticket_number || parsed.ticketNumber || null;
  } catch {
    return body.qrData;
  }
};

router.use(authenticate);

router.post('/scan', requirePermission(PERMISSIONS.TICKET_SCAN), auditLog('qr:scan'), async (req, res, next) => {
  try {
    const ticketNumber = resolveTicketNumber(req.body);
    if (!ticketNumber) throw new AppError('ticketNumber or qrData is required', 400);

    const result = await ticketService.scanTicket(ticketNumber, req.user.id);
    res.status(200).json({
      success: true,
      message: result.message,
      data: result.ticket
    });
  } catch (error) {
    next(error);
  }
});

router.get('/details/:ticketNumber', async (req, res, next) => {
  try {
    const { ticketNumber } = req.params;
    const result = await ticketService.getTicketDetails(ticketNumber);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
