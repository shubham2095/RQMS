const express = require('express');
const profileController = require('../controllers/profileController');
const auth = require('../middleware/auth');

const router = express.Router();

// Self-service: har logged-in user sirf apna profile dekhta/badalta hai.
router.use(auth);

router.get('/', profileController.getProfile);
router.put('/', profileController.saveProfile);
router.post('/family', profileController.addFamilyMember);
router.delete('/family/:id', profileController.removeFamilyMember);

module.exports = router;
