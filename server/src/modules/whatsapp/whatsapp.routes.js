const express = require('express');
const router = express.Router();
router.post('/send', (req, res) => res.json({ message: 'WhatsApp module' }));
module.exports = router;
