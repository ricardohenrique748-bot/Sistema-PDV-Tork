const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notaFiscal.controller');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.get('/:id/status', ctrl.getStatus);
router.get('/:id/xml', ctrl.downloadXML);
router.get('/:id/pdf', ctrl.downloadPDF);
router.post('/:id/emitir', authorize('ADMIN', 'FINANCEIRO', 'VENDEDOR'), ctrl.emitir);
router.post('/:id/cancelar', authorize('ADMIN', 'FINANCEIRO'), ctrl.cancelar);
router.post('/:id/carta-correcao', authorize('ADMIN', 'FINANCEIRO'), ctrl.cartaCorrecao);
router.delete('/:id', authorize('ADMIN', 'FINANCEIRO'), ctrl.excluir);

module.exports = router;
