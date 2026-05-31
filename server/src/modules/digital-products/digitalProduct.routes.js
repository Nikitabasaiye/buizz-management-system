const express = require('express');
const router = express.Router();
router.get('/', (req, res) => res.json({ message: 'Digital products module' }));
module.exports = router;
