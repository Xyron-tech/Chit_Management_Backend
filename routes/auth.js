const express = require('express');
const router = express.Router();
const { login, getMe, updateProfile, deleteProfilePicture } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/me/profile-picture', protect, upload.single('image'), updateProfile);
router.delete('/me/profile-picture', protect, deleteProfilePicture);

module.exports = router;