const prisma = require('../config/prisma');

// Categorias
const listCategorias = async (req, res, next) => {
  try {
    const data = await prisma.categoria.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } });
    res.json(data);
  } catch (err) { next(err); }
};
const createCategoria = async (req, res, next) => {
  try {
    const c = await prisma.categoria.create({ data: req.body });
    res.status(201).json(c);
  } catch (err) { next(err); }
};
const updateCategoria = async (req, res, next) => {
  try {
    const c = await prisma.categoria.update({ where: { id: req.params.id }, data: req.body });
    res.json(c);
  } catch (err) { next(err); }
};
const deleteCategoria = async (req, res, next) => {
  try {
    await prisma.categoria.update({ where: { id: req.params.id }, data: { ativo: false } });
    res.json({ message: 'Categoria inativada.' });
  } catch (err) { next(err); }
};

module.exports = { listCategorias, createCategoria, updateCategoria, deleteCategoria };
