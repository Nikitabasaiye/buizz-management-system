const express = require('express');
const router = express.Router();

// TODO: Implement influencer routes
router.get('/', (req, res) => res.json({ message: 'Influencer module' }));

module.exports = router;
