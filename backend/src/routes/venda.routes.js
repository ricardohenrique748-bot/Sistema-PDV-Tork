const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/venda.controller');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/finalizar', ctrl.finalizar);
router.patch('/:id/cancelar', ctrl.cancelar);
router.post('/:id/nota-fiscal', ctrl.criarNotaFiscal);

module.exports = router;
