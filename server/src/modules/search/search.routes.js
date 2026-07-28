const express = require('express');
const { authenticate, authorize } = require('../../middleware/rbac');
const searchService = require('./search.service');
const { AppError } = require('../../middleware/errorHandler');

const router = express.Router();

// Public search (no auth required)
router.get('/events', async (req, res, next) => {
  try {
    const results = await searchService.searchEvents(req.query);
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

router.get('/organizers', authenticate, async (req, res, next) => {
  try {
    const results = await searchService.searchOrganizers(req.query);
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

router.get('/users', authenticate, authorize('admin', 'super_admin'), async (req, res, next) => {
  try {
    const results = await searchService.searchUsers(req.query);
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

// Advanced search
router.post('/events/advanced', async (req, res, next) => {
  try {
    const results = await searchService.advancedEventSearch(req.body);
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

// Autocomplete
router.get('/autocomplete', async (req, res, next) => {
  try {
    const results = await searchService.autocomplete(req.query);
    res.json({ success: true, data: results });
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
