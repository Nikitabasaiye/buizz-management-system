const express = require('express');
const { authenticate } = require('../../middleware/rbac');
const checkinService = require('./checkin.service');

const router = express.Router();

// Validate ticket (read-only, no check-in) — useful for pre-scan preview
router.post('/events/:eventId/validate', authenticate, async (req, res, next) => {
  try {
    const result = await checkinService.validateTicket(req.params.eventId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Check in a single ticket
router.post('/events/:eventId/checkin', authenticate, async (req, res, next) => {
  try {
    const result = await checkinService.checkInTicket(req.params.eventId, req.body, req.user);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Batch check-in
router.post('/events/:eventId/checkin/batch', authenticate, async (req, res, next) => {
  try {
    const results = await checkinService.checkInBatch(req.params.eventId, req.body, req.user);
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

// List check-ins for an event
router.get('/events/:eventId/checkins', authenticate, async (req, res, next) => {
  try {
    const checkins = await checkinService.getEventCheckins(req.params.eventId, req.query);
    res.json({ success: true, data: checkins });
  } catch (error) {
    next(error);
  }
});

// Check-in stats for an event
router.get('/events/:eventId/checkins/stats', authenticate, async (req, res, next) => {
  try {
    const stats = await checkinService.getCheckinStats(req.params.eventId);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

// Get check-in record for a specific ticket
router.get('/tickets/:ticketId/checkin', authenticate, async (req, res, next) => {
  try {
    const checkin = await checkinService.getTicketCheckin(req.params.ticketId);
    res.json({ success: true, data: checkin });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
