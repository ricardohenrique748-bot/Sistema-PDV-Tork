const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/peca.controller');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/nextcode', ctrl.nextCode);
router.get('/estoque-baixo', ctrl.getEstoqueBaixo);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/estoque', ctrl.ajustarEstoque);

module.exports = router;
