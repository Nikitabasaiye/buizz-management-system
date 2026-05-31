const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { USER_ROLES } = require('../../constants');

const router = express.Router();

router.use(authenticate, authorize(USER_ROLES.ADMIN, USER_ROLES.ORGANIZER));
router.get('/', (req, res) => res.json({ message: 'Analytics module' }));

module.exports = router;
