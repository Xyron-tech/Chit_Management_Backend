const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getDashboardSummary } = require('../controllers/dashboardController');

router.use(protect);

router.get('/summary', getDashboardSummary);

module.exports = router;

// In your main app.js / server.js, mount it like:
// const dashboardRoutes = require('./routes/dashboardRoutes');
// app.use('/api/dashboard', dashboardRoutes);