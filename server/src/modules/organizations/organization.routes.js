const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { USER_ROLES } = require('../../constants');

const router = express.Router();

// TODO: Implement organization routes
router.get('/', authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.ORGANIZER), (req, res) => {
  res.json({ message: 'Organizations list' });
});

module.exports = router;
