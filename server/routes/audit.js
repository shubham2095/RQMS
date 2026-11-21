const express = require('express');
const auditController = require('../controllers/auditController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.get('/', auth, requireRole('admin'), auditController.listAudit); // super_admin bypass

module.exports = router;
