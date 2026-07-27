const analyticsService = require('../services/chitAnalyticsService');
const handleAsync = require('../utils/handleAsync');

// @route   GET /api/analytics?month=1-12&year=YYYY (year optional, defaults to current year)
// @access  Private (tenant scoped)
const getAnalytics = handleAsync(async (req, res) => {
  const data = await analyticsService.getAnalytics(req.user.tenantId, req.query.month, req.query.year);
  res.json(data);
});

module.exports = { getAnalytics };