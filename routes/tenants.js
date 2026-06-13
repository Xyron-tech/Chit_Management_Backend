const express = require('express');
const router = express.Router();
const { protect, superAdmin } = require('../middleware/auth');
const {
  createTenant, getAllTenants,
  getTenant, upgradeTenant,
  toggleTenant, deleteTenant
} = require('../controllers/tenantController');

router.use(protect, superAdmin);

router.post('/', createTenant);
router.get('/', getAllTenants);
router.get('/:id', getTenant);
router.put('/:id/upgrade', upgradeTenant);
router.put('/:id/toggle', toggleTenant);
router.delete('/:id', deleteTenant);

module.exports = router;