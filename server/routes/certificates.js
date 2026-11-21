const express = require('express');
const documentController = require('../controllers/documentController');
const auth = require('../middleware/auth');

// Har logged-in user: service scope karti hai. Download `routes/files.js` mein.
const router = express.Router();

router.use(auth);
router.get('/', documentController.listCertificates);
router.get('/:id', documentController.getCertificate);

module.exports = router;
