const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createChit, getAllChits, getChit,
  updateChit, deleteChit,
  addMember, updateMember, deleteMember,
  markPayment
} = require('../controllers/chitController');

router.use(protect);

// Chit CRUD
router.post('/', createChit);
router.get('/', getAllChits);
router.get('/:id', getChit);
router.put('/:id', updateChit);
router.delete('/:id', deleteChit);

// Member CRUD
router.post('/:id/members', addMember);
router.put('/:id/members/:memberId', updateMember);
router.delete('/:id/members/:memberId', deleteMember);

// Payment Mark
router.put('/:id/members/:memberId/payments/:paymentId', markPayment);

module.exports = router;