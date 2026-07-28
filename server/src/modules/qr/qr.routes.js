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

// Public QR redirect endpoint - when user scans QR with phone camera
// Redirects to frontend ticket page
router.get('/redirect/:ticketNumber', async (req, res, next) => {
  try {
    const { ticketNumber } = req.params;
    const baseUrl = process.env.FRONTEND_URL || 'https://buizz.com';
    
    // Verify ticket exists before redirecting
    const ticket = await ticketService.getTicketDetails(ticketNumber);
    
    if (!ticket) {
      return res.status(404).send(`
        <html>
          <head><title>Ticket Not Found</title></head>
          <body>
            <h1>Ticket Not Found</h1>
            <p>The ticket you're looking for doesn't exist or has been cancelled.</p>
            <a href="${baseUrl}">Return to Home</a>
          </body>
        </html>
      `);
    }

    // Redirect to frontend ticket page
    res.redirect(`${baseUrl}/ticket/${ticketNumber}`);
  } catch (error) {
    const baseUrl = process.env.FRONTEND_URL || 'https://buizz.com';
    res.status(404).send(`
      <html>
        <head><title>Ticket Not Found</title></head>
        <body>
          <h1>Ticket Not Found</h1>
          <p>The ticket you're looking for doesn't exist or has been cancelled.</p>
          <a href="${baseUrl}">Return to Home</a>
        </body>
      </html>
    `);
  }
});

router.use(authenticate);

// Check-in staff scan endpoint - scans and validates ticket
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

// Verify ticket without scanning (for check-in staff to view details)
router.post('/verify', requirePermission(PERMISSIONS.TICKET_SCAN), auditLog('qr:verify'), async (req, res, next) => {
  try {
    const ticketNumber = resolveTicketNumber(req.body);
    if (!ticketNumber) throw new AppError('ticketNumber or qrData is required', 400);

    const result = await ticketService.verifyTicket(ticketNumber);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Get ticket details (public endpoint for frontend)
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
