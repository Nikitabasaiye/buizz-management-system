const express = require('express');
const ticketController = require('./ticket.controller');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.get('/', ticketController.getTickets);

module.exports = router;
