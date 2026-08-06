const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const cloudinary = require('../config/cloudinary');
const ApiError = require('../utils/Apierror');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, tenantId: user.tenantId },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  tenantId: user.tenantId,
  profilePicture: user.profilePicture,
  certificates: user.certificates,
});

const checkTenantStatus = async (tenantId) => {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant || !tenant.isActive) {
    throw new ApiError(403, 'Tenant inactive');
  }

  const now = new Date();

  if (tenant.isTrial && now > tenant.trialEndsAt) {
    throw new ApiError(403, 'Trial expired. Please upgrade.', { trialExpired: true });
  }

  if (!tenant.isTrial && tenant.planExpiry && now > tenant.planExpiry) {
    throw new ApiError(403, 'Plan expired. Please renew.', { planExpired: true });
  }
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(401, 'Invalid credentials');

  const isMatch = await user.matchPassword(password);
  if (!isMatch) throw new ApiError(401, 'Invalid credentials');

  if (user.role === 'tenant_admin') {
    await checkTenantStatus(user.tenantId);
  }

  return {
    token: generateToken(user),
    user: formatUser(user),
  };
};

const getMe = async (userId) => {
  const user = await User.findById(userId).select('-password');
  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

const updateProfile = async (userId, { name, email }, file) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  if (email && email !== user.email) {
    const emailTaken = await User.findOne({ email, _id: { $ne: user._id } });
    if (emailTaken) throw new ApiError(400, 'Email is already in use');
    user.email = email;
  }

  if (name) user.name = name;

  // A new image was uploaded — replace the old one on Cloudinary
  if (file) {
    if (user.profilePicture?.publicId) {
      await cloudinary.uploader.destroy(user.profilePicture.publicId);
    }
    user.profilePicture = {
      url: file.path,
      publicId: file.filename,
    };
  }

  await user.save();

  return formatUser(user);
};

const deleteProfilePicture = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  if (user.profilePicture?.publicId) {
    await cloudinary.uploader.destroy(user.profilePicture.publicId);
  }

  user.profilePicture = { url: '', publicId: '' };
  await user.save();

  return user.profilePicture;
};

// ============================================
// Change password
// ============================================

const changePassword = async (userId, { currentPassword, newPassword }) => {
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current password and new password are required');
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters');
  }

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) throw new ApiError(401, 'Current password is incorrect');

  const isSameAsOld = await user.matchPassword(newPassword);
  if (isSameAsOld) {
    throw new ApiError(400, 'New password must be different from the current password');
  }

  // The pre('save') hook on the User model hashes `password`
  // automatically whenever it's modified — same hook used for
  // registration — so we just assign the plain new password here.
  user.password = newPassword;
  await user.save();

  return { success: true };
};

// ============================================
// Certificates
// ============================================

const addCertificate = async (userId, { name }, file) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  if (!name) throw new ApiError(400, 'Certificate name is required');
  if (!file) throw new ApiError(400, 'Certificate image is required');

  user.certificates.push({
    name,
    url: file.path,
    publicId: file.filename,
  });

  await user.save();

  return user.certificates;
};

const deleteCertificate = async (userId, certificateId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const certificate = user.certificates.id(certificateId);
  if (!certificate) throw new ApiError(404, 'Certificate not found');

  if (certificate.publicId) {
    await cloudinary.uploader.destroy(certificate.publicId);
  }

  user.certificates.pull({ _id: certificateId });
  await user.save();

  return user.certificates;
};

module.exports = {
  login,
  getMe,
  updateProfile,
  deleteProfilePicture,
  changePassword,
  addCertificate,
  deleteCertificate,
};