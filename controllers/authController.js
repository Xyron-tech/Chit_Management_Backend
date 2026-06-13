const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, tenantId: user.tenantId },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    if (user.role === 'tenant_admin') {
      const tenant = await Tenant.findById(user.tenantId);
      if (!tenant || !tenant.isActive)
        return res.status(403).json({ message: 'Tenant inactive' });

      const now = new Date();
      if (tenant.isTrial && now > tenant.trialEndsAt)
        return res.status(403).json({ 
          message: 'Trial expired. Please upgrade.',
          trialExpired: true 
        });

      if (!tenant.isTrial && tenant.planExpiry && now > tenant.planExpiry)
        return res.status(403).json({ 
          message: 'Plan expired. Please renew.',
          planExpired: true 
        });
    }

    res.json({
      token: generateToken(user),
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        tenantId: user.tenantId 
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { login, getMe };