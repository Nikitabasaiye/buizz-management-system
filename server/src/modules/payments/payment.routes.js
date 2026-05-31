const express = require('express');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

// TODO: Implement payment routes
router.post('/webhook', (req, res) => res.json({ message: 'Payment webhook' }));

router.use(authenticate);
router.post('/create-order', (req, res) => res.json({ message: 'Create payment order' }));
router.post('/verify', (req, res) => res.json({ message: 'Verify payment' }));

module.exports = router;
