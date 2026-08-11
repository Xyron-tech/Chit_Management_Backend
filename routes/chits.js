const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/multiUpload');           // member / profile photos
const chitImageUpload = require('../middleware/Chitimageupload'); // chit cover photo
const {
  createChit, getAllChits, getChit,
  updateChit, deleteChit,
  addMember, updateMember, deleteMember,
  markPayment, markAllPaid, updatePaymentAmount,downloadMonthPdf
} = require('../controllers/chitController');

router.use(protect);

router.post('/', chitImageUpload.single('image'), createChit);
router.get('/', getAllChits);
router.get('/:id', getChit);
router.put('/:id', chitImageUpload.single('image'), updateChit);
router.delete('/:id', deleteChit);

router.post('/:id/members', upload.single('photo'), addMember);
router.put('/:id/members/:memberId', upload.single('photo'), updateMember);
router.delete('/:id/members/:memberId', deleteMember);

// Payment status
router.put('/:id/members/:memberId/payments/:paymentId', markPayment);
router.put('/:id/payments/month/:month/mark-all-paid', markAllPaid);

// Payment amount (Tallu chits — auto recalculates future months)
router.put('/:id/members/:memberId/payments/month/:month/amount', updatePaymentAmount);

router.get('/:id/months/:month/pdf', downloadMonthPdf);

module.exports = router;