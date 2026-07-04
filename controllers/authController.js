const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const cloudinary = require('../config/cloudinary');

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
        tenantId: user.tenantId,
        profilePicture: user.profilePicture
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


const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, email } = req.body;

    if (email && email !== user.email) {
      const emailTaken = await User.findOne({ email, _id: { $ne: user._id } });
      if (emailTaken) {
        return res.status(400).json({ message: 'Email is already in use' });
      }
      user.email = email;
    }

    if (name) user.name = name;

    // A new image was uploaded — replace the old one on Cloudinary
    if (req.file) {
      if (user.profilePicture?.publicId) {
        await cloudinary.uploader.destroy(user.profilePicture.publicId);
      }
      user.profilePicture = {
        url: req.file.path,
        publicId: req.file.filename,
      };
    }

    await user.save();

    res.json({
      message: 'Profile updated',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        profilePicture: user.profilePicture,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @route   DELETE /api/auth/me/profile-picture
// @desc    Remove the logged-in user's profile picture
// @access  Private
const deleteProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.profilePicture?.publicId) {
      await cloudinary.uploader.destroy(user.profilePicture.publicId);
    }

    user.profilePicture = { url: '', publicId: '' };
    await user.save();

    res.json({ message: 'Profile picture removed', profilePicture: user.profilePicture });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { login, getMe, updateProfile, deleteProfilePicture };