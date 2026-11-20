const express = require('express');
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const requirePermission = require('../middleware/requirePermission');

const router = express.Router();

router.use(auth, requirePermission('users.manage'));

router.get('/users', adminController.listUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.get('/roles', adminController.listRoles); // user form ke role checkboxes ke liye

module.exports = router;
