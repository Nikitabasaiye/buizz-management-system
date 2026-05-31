const express = require('express');
const router = express.Router();

// TODO: Implement user routes
router.get('/profile', (req, res) => res.json({ message: 'User profile' }));

module.exports = router;
