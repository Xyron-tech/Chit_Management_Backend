const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getAnalytics } = require('../controllers/chitanalyticscontroller');

router.use(protect);

router.get('/', getAnalytics);

module.exports = router;
