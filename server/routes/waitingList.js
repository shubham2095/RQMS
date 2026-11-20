const express = require('express');
const waitingListController = require('../controllers/waitingListController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.get(
  '/',
  auth,
  requireRole('quarter_clerk', 'estate_officer', 'admin'), // super_admin bypass
  waitingListController.listWaitingList
);

module.exports = router;
