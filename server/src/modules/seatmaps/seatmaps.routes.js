const express = require('express');
const { authenticate, authorize } = require('../../middleware/rbac');
const seatmapsService = require('./seatmaps.service');
const { AppError } = require('../../middleware/errorHandler');

const router = express.Router();

// Template routes
router.post('/templates', authenticate, authorize('admin', 'super_admin'), async (req, res, next) => {
  try {
    const template = await seatmapsService.createSeatMapTemplate(req.body);
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
});

router.get('/templates', authenticate, async (req, res, next) => {
  try {
    const templates = await seatmapsService.listSeatMapTemplates(req.query);
    res.json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
});

router.get('/templates/:id', authenticate, async (req, res, next) => {
  try {
    const template = await seatmapsService.getSeatMapTemplate(req.params.id);
    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
});

router.put('/templates/:id', authenticate, authorize('admin', 'super_admin'), async (req, res, next) => {
  try {
    const template = await seatmapsService.updateSeatMapTemplate(req.params.id, req.body);
    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
});

router.delete('/templates/:id', authenticate, authorize('admin', 'super_admin'), async (req, res, next) => {
  try {
    const result = await seatmapsService.deleteSeatMapTemplate(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Override routes
router.post('/events/:eventId/override', authenticate, async (req, res, next) => {
  try {
    const override = await seatmapsService.createSeatMapOverride({
      event_id: req.params.eventId,
      ...req.body
    });
    res.status(201).json({ success: true, data: override });
  } catch (error) {
    next(error);
  }
});

router.get('/events/:eventId/override', authenticate, async (req, res, next) => {
  try {
    const override = await seatmapsService.getSeatMapOverride(req.params.eventId);
    res.json({ success: true, data: override });
  } catch (error) {
    next(error);
  }
});

router.put('/events/:eventId/override', authenticate, async (req, res, next) => {
  try {
    const override = await seatmapsService.updateSeatMapOverride(req.params.eventId, req.body);
    res.json({ success: true, data: override });
  } catch (error) {
    next(error);
  }
});

router.delete('/events/:eventId/override', authenticate, async (req, res, next) => {
  try {
    const result = await seatmapsService.deleteSeatMapOverride(req.params.eventId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Seat status routes
router.patch('/events/:eventId/seats', authenticate, async (req, res, next) => {
  try {
    const updated = await seatmapsService.updateSeatStatus(req.params.eventId, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

router.get('/events/:eventId/seats/available', authenticate, async (req, res, next) => {
  try {
    const available = await seatmapsService.getAvailableSeats(req.params.eventId);
    res.json({ success: true, data: available });
  } catch (error) {
    next(error);
  }
});

// Get complete seat map for event
router.get('/events/:eventId/seatmap', authenticate, async (req, res, next) => {
  try {
    const seatmap = await seatmapsService.getEventSeatMap(req.params.eventId);
    res.json({ success: true, data: seatmap });
  } catch (error) {
    next(error);
  }
});

// Error handler middleware
function next(error) {
  if (error instanceof AppError) {
    res.status(error.statusCode || 500).json({ 
      success: false, 
      message: error.message,
      ...error.data
    });
  } else {
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message
    });
  }
}

module.exports = router;
