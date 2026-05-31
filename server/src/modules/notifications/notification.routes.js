const express = require('express');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.get('/', (req, res) => res.json({ message: 'Notifications module' }));

module.exports = router;
