const dashboardService = require('../services/dashboardService');
const handleAsync = require('../utils/handleasync');

const getDashboardSummary = handleAsync(async (req, res) => {
  const summary = await dashboardService.getDashboardSummary(req.user.tenantId);
  res.json(summary);
});

module.exports = { getDashboardSummary };