const Tenant = require('../models/Tenant');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const ApiError = require('../utils/Apierror');

const TRIAL_DAYS = 7;

const findTenantOrThrow = async (id) => {
  const tenant = await Tenant.findById(id);
  if (!tenant) throw new ApiError(404, 'Tenant not found');
  return tenant;
};

const createTenant = async ({ name, subdomain, email, adminName, password }) => {
  const existing = await Tenant.findOne({ subdomain });
  if (existing) throw new ApiError(400, 'Subdomain already taken');

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  const tenant = await Tenant.create({
    name, subdomain,
    plan: 'trial',
    isTrial: true,
    trialEndsAt,
    planExpiry: trialEndsAt,
    isActive: true,
  });

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    tenantId: tenant._id,
    name: adminName,
    email,
    password: hashedPassword,
    role: 'tenant_admin',
  });

  return {
    tenant,
    admin: { id: user._id, name: user.name, email: user.email },
    trialEndsAt,
  };
};

const getAllTenants = () => {
  return Tenant.find().sort({ createdAt: -1 });
};

const getTenant = (id) => findTenantOrThrow(id);

const calculatePlanExpiry = (plan) => {
  const planExpiry = new Date();
  if (plan === 'monthly') planExpiry.setMonth(planExpiry.getMonth() + 1);
  else if (plan === 'yearly') planExpiry.setFullYear(planExpiry.getFullYear() + 1);
  return planExpiry;
};

const upgradeTenant = async (id, plan) => {
  const planExpiry = calculatePlanExpiry(plan);

  const tenant = await Tenant.findByIdAndUpdate(
    id,
    { plan, isTrial: false, planExpiry, isActive: true },
    { new: true }
  );

  if (!tenant) throw new ApiError(404, 'Tenant not found');

  return { tenant, planExpiry };
};

const toggleTenant = async (id) => {
  const tenant = await findTenantOrThrow(id);
  tenant.isActive = !tenant.isActive;
  await tenant.save();
  return tenant;
};

const deleteTenant = async (id) => {
  await Tenant.findByIdAndDelete(id);
  await User.deleteMany({ tenantId: id });
};

module.exports = {
  createTenant, getAllTenants,
  getTenant, upgradeTenant,
  toggleTenant, deleteTenant,
};