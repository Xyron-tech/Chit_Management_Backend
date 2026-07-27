const tenantService = require('../services/tenantService');
const handleAsync = require('../utils/handleAsync');

const createTenant = handleAsync(async (req, res) => {
  const result = await tenantService.createTenant(req.body);
  res.status(201).json({ message: 'Tenant created ✅', ...result });
});

const getAllTenants = handleAsync(async (req, res) => {
  const tenants = await tenantService.getAllTenants();
  res.json(tenants);
});

const getTenant = handleAsync(async (req, res) => {
  const tenant = await tenantService.getTenant(req.params.id);
  res.json(tenant);
});

const upgradeTenant = handleAsync(async (req, res) => {
  const { plan } = req.body;
  const { tenant, planExpiry } = await tenantService.upgradeTenant(req.params.id, plan);
  res.json({ message: `Upgraded to ${plan} ✅`, tenant, planExpiry });
});

const toggleTenant = handleAsync(async (req, res) => {
  const tenant = await tenantService.toggleTenant(req.params.id);
  res.json({ message: `Tenant ${tenant.isActive ? 'activated' : 'deactivated'} ✅`, tenant });
});

const deleteTenant = handleAsync(async (req, res) => {
  await tenantService.deleteTenant(req.params.id);
  res.json({ message: 'Tenant deleted ✅' });
});

module.exports = {
  createTenant, getAllTenants,
  getTenant, upgradeTenant,
  toggleTenant, deleteTenant,
};