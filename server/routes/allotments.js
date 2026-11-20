const express = require('express');
const allotmentController = require('../controllers/allotmentController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const requirePermission = require('../middleware/requirePermission');

const router = express.Router();

router.use(auth);

// List / detail: service khud scope karti hai (employee = apne, staff = sab)
router.get('/', allotmentController.listAllotments);
router.get('/:id', allotmentController.getAllotment);

// Employee: apne offer par accept / reject
router.post('/:id/respond', requireRole('employee'), allotmentController.respond);

// Clerk / estate officer: possession record
router.post('/:id/possession', requirePermission('allotment.possession'), allotmentController.takePossession);

module.exports = router;
