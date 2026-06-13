const Tenant = require('../models/Tenant');
const User = require('../models/User');

const bcrypt = require('bcryptjs');

const createTenant = async (req, res) => {
  try {
    const { name, subdomain, email, adminName, password } = req.body;

    const existing = await Tenant.findOne({ subdomain });
    if (existing) 
      return res.status(400).json({ message: 'Subdomain already taken' });

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    const tenant = await Tenant.create({
      name, subdomain,
      plan: 'trial',
      isTrial: true,
      trialEndsAt,
      planExpiry: trialEndsAt,
      isActive: true
    });

    // Manual hash பண்ணு
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      tenantId: tenant._id,
      name: adminName,
      email,
      password: hashedPassword,
      role: 'tenant_admin'
    });

    res.status(201).json({
      message: 'Tenant created ✅',
      tenant,
      admin: { id: user._id, name: user.name, email: user.email },
      trialEndsAt
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get All Tenants
const getAllTenants = async (req, res) => {
  try {
    const tenants = await Tenant.find().sort({ createdAt: -1 });
    res.json(tenants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get Single Tenant
const getTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) 
      return res.status(404).json({ message: 'Tenant not found' });
    res.json(tenant);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Upgrade Plan
const upgradeTenant = async (req, res) => {
  try {
    const { plan } = req.body;

    const planExpiry = new Date();
    if (plan === 'monthly') 
      planExpiry.setMonth(planExpiry.getMonth() + 1);
    else if (plan === 'yearly') 
      planExpiry.setFullYear(planExpiry.getFullYear() + 1);

    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { plan, isTrial: false, planExpiry, isActive: true },
      { new: true }
    );

    res.json({ message: `Upgraded to ${plan} ✅`, tenant, planExpiry });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Toggle Active
const toggleTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) 
      return res.status(404).json({ message: 'Tenant not found' });

    tenant.isActive = !tenant.isActive;
    await tenant.save();

    res.json({ 
      message: `Tenant ${tenant.isActive ? 'activated' : 'deactivated'} ✅`, 
      tenant 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete Tenant
const deleteTenant = async (req, res) => {
  try {
    await Tenant.findByIdAndDelete(req.params.id);
    await User.deleteMany({ tenantId: req.params.id });
    res.json({ message: 'Tenant deleted ✅' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { 
  createTenant, getAllTenants, 
  getTenant, upgradeTenant, 
  toggleTenant, deleteTenant 
};