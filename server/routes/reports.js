const express = require('express');
const reportController = require('../controllers/reportController');
const auth = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');

const router = express.Router();

router.use(auth);

// Dashboard landing: har logged-in user ko apna "work queue" (service permissions se scope karti hai)
router.get('/work-queue', reportController.workQueue);

// Reports: reports.view (estate_officer, admin; super_admin bypass)
router.get('/summary', requirePermission('reports.view'), reportController.summary);
router.get('/vacant-quarters', requirePermission('reports.view'), reportController.vacantQuarters);
router.get('/overstaying', requirePermission('reports.view'), reportController.overstaying);

module.exports = router;
