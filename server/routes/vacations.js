const express = require('express');
const vacationController = require('../controllers/vacationController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const requirePermission = require('../middleware/requirePermission');
const { vacationStepPermissions } = require('../config/rqms');

const router = express.Router();

router.use(auth);

// Employee apne active allotment ke liye request shuru karta hai
router.post('/', requireRole('employee'), vacationController.initiate);

// List / detail: service khud scope karti hai (employee = apni, staff = sab)
router.get('/', vacationController.listRequests);
router.get('/:id', vacationController.getRequest);

// Current step par approve / reject. Route par koi bhi vacation.* permission; us STEP ki permission service check karti hai.
router.post('/:id/act', requirePermission(...Object.values(vacationStepPermissions)), vacationController.act);

module.exports = router;
