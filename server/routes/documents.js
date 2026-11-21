const express = require('express');
const documentController = require('../controllers/documentController');
const auth = require('../middleware/auth');

// Har logged-in user: service scope karti hai (staff = sab, baaki = sirf apne). Download `routes/files.js` mein.
const router = express.Router();

router.use(auth);
router.get('/', documentController.listDocuments);
router.get('/:id', documentController.getDocument);

module.exports = router;
