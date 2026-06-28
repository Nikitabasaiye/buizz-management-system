const express = require('express');
const { authenticate, authorize } = require('../../middleware/rbac');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Payments endpoint' });
});

module.exports = router;
