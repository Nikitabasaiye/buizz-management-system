const express = require('express');
const router = express.Router();
router.post('/scan', (req, res) => res.json({ message: 'QR scan module' }));
module.exports = router;
