const express = require('express');
const router = express.Router();
const { listCategorias, createCategoria, updateCategoria, deleteCategoria } = require('../controllers/categoria.controller');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);
router.get('/', listCategorias);
router.post('/', createCategoria);
router.put('/:id', updateCategoria);
router.delete('/:id', deleteCategoria);
module.exports = router;
