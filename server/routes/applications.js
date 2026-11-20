const express = require('express');
const applicationController = require('../controllers/applicationController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const requirePermission = require('../middleware/requirePermission');
const handleUpload = require('../middleware/upload');

const router = express.Router();

router.use(auth);

// Employee apply (multipart: fields + files "documents")
router.post('/', requireRole('employee'), handleUpload, applicationController.apply);

// List / detail: service khud scope karti hai (employee = apni, staff = sab)
router.get('/', applicationController.listApplications);
router.get('/:id', applicationController.getApplication);

// Clerk
router.post('/:id/verify', requirePermission('application.verify'), applicationController.verify);
router.post('/:id/run-engine', requirePermission('application.verify'), applicationController.runEngine);

// Estate officer
router.post('/:id/decide', requirePermission('application.decide'), applicationController.decide);

module.exports = router;
