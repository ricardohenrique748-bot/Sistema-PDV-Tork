const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/relatorio.controller');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);
router.get('/faturamento', ctrl.faturamento);
router.get('/ranking-clientes', ctrl.rankingClientes);
router.get('/ranking-pecas', ctrl.rankingPecas);
router.get('/estoque-valorizado', ctrl.estoqueValorizado);
router.get('/vendas-por-categoria', ctrl.vendasPorCategoria);

module.exports = router;
