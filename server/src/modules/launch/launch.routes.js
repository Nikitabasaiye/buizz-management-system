const express = require('express');
const { notify } = require('./launch.controller');
const router = express.Router();

router.post('/notify', notify);

module.exports = router;
