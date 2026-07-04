const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

cloudinary.uploader.upload(
  'https://res.cloudinary.com/demo/image/upload/sample.jpg',
  { folder: 'chitsaas/test' }
)
  .then(res => console.log('✅ Upload test success'))
  .catch(err => {
    console.log('❌ Upload test failed - FULL ERROR:');
    console.log(JSON.stringify(err, null, 2));
  });

module.exports = cloudinary;