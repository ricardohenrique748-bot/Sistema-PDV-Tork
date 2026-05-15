const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ctrl = require('../controllers/empresa.controller');

const { authenticate, authorize } = require('../middlewares/auth');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads/certificados'),
  filename: (req, file, cb) => cb(null, `cert_${Date.now()}.pfx`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.pfx$/i)) return cb(new Error('Apenas arquivos .pfx são aceitos.'));
    cb(null, true);
  }
});

router.use(authenticate, authorize('ADMIN'));
router.get('/', ctrl.getEmpresa);
router.put('/', ctrl.upsertEmpresa);
router.get('/certificados', ctrl.listCertificados);
router.post('/certificados/upload', upload.single('pfx'), ctrl.uploadCertificado);
router.get('/database/stats', ctrl.getDatabaseStats);

module.exports = router;
