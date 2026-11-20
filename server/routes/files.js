const express = require('express');
const fileController = require('../controllers/fileController');
const auth = require('../middleware/auth');

// Mount: app.use('/api', fileRoutes). auth har route par alag — warna unknown /api paths 401 dene lagte.
const router = express.Router();

router.get('/documents/:id/download', auth, fileController.downloadDocument);
router.get('/certificates/:id/download', auth, fileController.downloadCertificate);

module.exports = router;
