const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/multiUpload');           // member / profile photos
const chitImageUpload = require('../middleware/Chitimageupload'); // chit cover photo
const {
  createChit, getAllChits, getChit,
  updateChit, deleteChit,
  addMember, updateMember, deleteMember,
  markPayment, markAllPaid, updatePaymentAmount
} = require('../controllers/chitController');

router.use(protect);

// Chit CRUD — photo (optional) rides along on the same request via multipart/form-data,
// field name "image". To remove a chit photo without changing anything else,
// PUT to updateChit with removeImage: true and no file attached.
router.post('/', chitImageUpload.single('image'), createChit);
router.get('/', getAllChits);
router.get('/:id', getChit);
router.put('/:id', chitImageUpload.single('image'), updateChit);
router.delete('/:id', deleteChit);

// Member CRUD — photo (optional) rides along on the same request via multipart/form-data.
// To remove a photo without changing anything else, PUT to updateMember with
// removePhoto: true and no file attached.
router.post('/:id/members', upload.single('photo'), addMember);
router.put('/:id/members/:memberId', upload.single('photo'), updateMember);
router.delete('/:id/members/:memberId', deleteMember);

// Payment status
router.put('/:id/members/:memberId/payments/:paymentId', markPayment);
router.put('/:id/payments/month/:month/mark-all-paid', markAllPaid);

// Payment amount (Tallu chits — auto recalculates future months)
router.put('/:id/members/:memberId/payments/month/:month/amount', updatePaymentAmount);

module.exports = router;