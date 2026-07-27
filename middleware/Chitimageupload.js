const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Chit cover photo — not a face, so no face-crop here; just fit it inside
// a reasonable box and keep the aspect ratio. Own folder, separate from
// member/profile photos so cleanup and browsing stay simple.
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'chitsaas/chit-photos',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

module.exports = upload;