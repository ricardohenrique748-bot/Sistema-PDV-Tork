const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cliente.controller');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);
router.get('/', ctrl.list);
router.get('/buscar-cnpj/:cnpj', ctrl.buscarCnpj);
router.get('/buscar-cep/:cep', ctrl.buscarCep);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
