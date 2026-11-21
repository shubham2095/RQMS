const express = require('express');
const retirementController = require('../controllers/retirementController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(auth, requireRole('estate_officer', 'admin')); // super_admin bypass

router.get('/', retirementController.listRetirements);
router.post('/run-cycle', retirementController.runCycle);

module.exports = router;
