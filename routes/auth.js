const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const upload = require('../middleware/upload');                     // profile picture — face-crop 400x400
const uploadCertificate = require('../middleware/Uploadcertificate'); // certificates — no crop, own folder

const { protect } = require('../middleware/auth');

// ===== Auth =====
router.post('/login', authController.login);
router.get('/me', protect, authController.getMe);

// ===== Profile picture (uses `upload` — face-crop) =====
router.put('/me/profile-picture', protect, upload.single('image'), authController.updateProfile);
router.delete('/me/profile-picture', protect, authController.deleteProfilePicture);

// ===== Change password =====
router.put('/me/change-password', protect, authController.changePassword);

// ===== Certificates (uses `uploadCertificate` — no crop, separate folder) =====
router.post('/me/certificates', protect, uploadCertificate.single('image'), authController.addCertificate);
router.delete('/me/certificates/:certificateId', protect, authController.deleteCertificate);

module.exports = router;