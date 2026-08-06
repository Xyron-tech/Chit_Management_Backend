const authService = require('../services/authService');
const ApiError = require('../utils/Apierror');

// Small wrapper so we don't repeat try/catch in every handler.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ===== Login =====
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password });
  res.status(200).json(result);
});

// ===== Get current user =====
const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  res.status(200).json(user);
});

// ===== Update profile (name/email + optional profile picture) =====
// Route: PUT /auth/me/profile-picture  (upload.single('image'))
const updateProfile = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  const user = await authService.updateProfile(req.user.id, { name, email }, req.file);
  res.status(200).json({ user });
});

// ===== Remove profile picture =====
const deleteProfilePicture = asyncHandler(async (req, res) => {
  const profilePicture = await authService.deleteProfilePicture(req.user.id);
  res.status(200).json({ profilePicture });
});

// ===== Change password =====
// Route: PUT /auth/me/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user.id, { currentPassword, newPassword });
  res.status(200).json({ message: 'Password updated successfully' });
});

// ============================================
// Certificates
// ============================================

// Route: POST /auth/me/certificates  (uploadCertificate.single('image'))
const addCertificate = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!req.file) throw new ApiError(400, 'Certificate image is required');

  const certificates = await authService.addCertificate(req.user.id, { name }, req.file);
  res.status(201).json({ certificates });
});

// Route: DELETE /auth/me/certificates/:certificateId
const deleteCertificate = asyncHandler(async (req, res) => {
  const { certificateId } = req.params;
  const certificates = await authService.deleteCertificate(req.user.id, certificateId);
  res.status(200).json({ certificates });
});

module.exports = {
  login,
  getMe,
  updateProfile,
  deleteProfilePicture,
  changePassword,
  addCertificate,
  deleteCertificate,
};