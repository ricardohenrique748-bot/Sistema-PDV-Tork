const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/orcamento.controller');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.patch('/:id', ctrl.update);
router.post('/:id/converter', ctrl.converter);
router.delete('/:id', ctrl.excluir);

module.exports = router;
