const prisma = require('../config/prisma');

const list = async (req, res, next) => {
  try {
    const data = await prisma.fornecedor.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } });
    res.json(data);
  } catch (err) { next(err); }
};
const create = async (req, res, next) => {
  try {
    const f = await prisma.fornecedor.create({ data: req.body });
    res.status(201).json(f);
  } catch (err) { next(err); }
};
const update = async (req, res, next) => {
  try {
    const f = await prisma.fornecedor.update({ where: { id: req.params.id }, data: req.body });
    res.json(f);
  } catch (err) { next(err); }
};
const remove = async (req, res, next) => {
  try {
    await prisma.fornecedor.update({ where: { id: req.params.id }, data: { ativo: false } });
    res.json({ message: 'Fornecedor inativado.' });
  } catch (err) { next(err); }
};

module.exports = { list, create, update, remove };
