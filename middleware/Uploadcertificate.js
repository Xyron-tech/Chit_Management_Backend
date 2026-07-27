const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Certificates are documents (often rectangular scans/photos), not faces —
// so no 400x400 face-crop here. Just cap the size and keep the original
// aspect ratio, in a separate folder from profile pictures.
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'chitsaas/certificates',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 1600, height: 1600, crop: 'limit' }],
  },
});

const uploadCertificate = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB — documents can be larger than a face photo
});

module.exports = uploadCertificate;