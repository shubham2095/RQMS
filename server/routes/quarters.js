const express = require('express');
const quarterController = require('../controllers/quarterController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const requirePermission = require('../middleware/requirePermission');

const router = express.Router();

router.use(auth);

// Dekhna: quarter_clerk | estate_officer | admin (super_admin bypass)
const canView = requireRole('quarter_clerk', 'estate_officer', 'admin');
router.get('/', canView, quarterController.listQuarters);
router.get('/:id', canView, quarterController.getQuarter);

// Banana/badalna: quarter.manage permission
router.post('/', requirePermission('quarter.manage'), quarterController.createQuarter);
router.put('/:id', requirePermission('quarter.manage'), quarterController.updateQuarter);

module.exports = router;
