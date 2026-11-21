const express = require('express');
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/auth');

const router = express.Router();

// Har logged-in user sirf apni notifications dekhta hai (service user.id se scope karti hai).
router.use(auth);

router.get('/', notificationController.listNotifications);
router.post('/read-all', notificationController.markAllRead); // /:id/read se pehle
router.post('/:id/read', notificationController.markRead);

module.exports = router;
