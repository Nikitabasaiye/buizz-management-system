const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { USER_ROLES } = require('../../constants');

const router = express.Router();

router.use(authenticate, authorize(USER_ROLES.ADMIN));
router.get('/dashboard', (req, res) => res.json({ message: 'Admin module' }));

module.exports = router;
