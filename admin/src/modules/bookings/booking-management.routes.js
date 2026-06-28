const express = require('express');
const { authenticate, authorize } = require('../../middleware/rbac');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

// Import from server
const bookingController = require('../../../../server/src/modules/bookings/booking.controller');

router.get('/', bookingController.getAllBookings || ((req, res) => {
  res.json({ success: true, data: [], message: 'Bookings endpoint' });
}));

module.exports = router;
