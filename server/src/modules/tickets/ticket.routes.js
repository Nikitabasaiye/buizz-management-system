const express = require('express');
const ticketController = require('./ticket.controller');
const { authenticate, requirePermission, auditLog } = require('../../middleware/rbac');
const { validate } = require('../../validators');
const {
  getTicketValidator,
  getEventTicketsValidator,
  getUserTicketsValidator
} = require('./ticket.validator');
const { PERMISSIONS } = require('../../config/permissions');

const router = express.Router();

router.use(authenticate);

router.get('/my-tickets', validate(getUserTicketsValidator), ticketController.getMyTickets);
router.get('/:ticketNumber', validate(getTicketValidator), ticketController.getTicketByNumber);
router.post('/:ticketNumber/scan', requirePermission(PERMISSIONS.TICKET_SCAN), validate(getTicketValidator), auditLog('ticket:scan'), ticketController.scanTicket);
router.post('/:ticketNumber/cancel', validate(getTicketValidator), auditLog('ticket:cancel'), ticketController.cancelTicket);
router.get('/event/:eventId', requirePermission(PERMISSIONS.TICKET_READ), validate(getEventTicketsValidator), ticketController.getEventTickets);

module.exports = router;
