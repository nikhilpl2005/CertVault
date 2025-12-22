const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');

// Define routes
router.post('/upload', certificateController.uploadCertificate);
router.get('/', certificateController.getAllCertificates);
router.get('/:id', certificateController.getCertificate);
router.delete('/:id', certificateController.deleteCertificate);
router.get('/download/:id', certificateController.downloadCertificate);

module.exports = router;