const prisma = require('../config/prisma');

const list = async (req, res, next) => {
  try {
    const { search, categoria, estoqueMinimo, page = 1, limit = 20, all } = req.query;
    const where = { ativo: true };
    if (categoria) where.categoriaId = categoria;
    if (estoqueMinimo === 'true') where.estoqueAtual = { lte: prisma.peca.fields?.estoqueMinimo };
    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } },
        { codigoBarras: { contains: search } },
        { descricao: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (all === 'true') {
      const data = await prisma.peca.findMany({
        where,
        include: { categoria: { select: { id: true, nome: true } } },
        orderBy: { nome: 'asc' },
      });
      return res.json({ data, total: data.length });
    }

    const [data, total] = await Promise.all([
      prisma.peca.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { nome: 'asc' },
        include: {
          categoria: { select: { id: true, nome: true } },
          fornecedores: { include: { fornecedor: { select: { id: true, nome: true } } } },
        },
      }),
      prisma.peca.count({ where }),
    ]);

    // Flag estoque baixo
    const dataWithFlag = data.map(p => ({
      ...p,
      estoqueBaixo: p.estoqueAtual <= p.estoqueMinimo,
    }));
    res.json({ data: dataWithFlag, total, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const peca = await prisma.peca.findUnique({
      where: { id: req.params.id },
      include: {
        categoria: true,
        fornecedores: { include: { fornecedor: true } },
        movimentacoes: { orderBy: { createdAt: 'desc' }, take: 20 },
      }
    });
    if (!peca) return res.status(404).json({ error: 'Peça não encontrada.' });
    res.json(peca);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { fornecedores, ...data } = req.body;
    // Calcula margem automaticamente
    if (data.precoCompra && data.precoVenda) {
      data.margemLucro = (((Number(data.precoVenda) - Number(data.precoCompra)) / Number(data.precoCompra)) * 100).toFixed(2);
    }
    const peca = await prisma.peca.create({
      data: {
        ...data,
        fornecedores: fornecedores?.length ? {
          create: fornecedores.map(f => ({ fornecedorId: f.id, precoCompra: f.precoCompra, principal: f.principal }))
        } : undefined,
      },
      include: { categoria: true, fornecedores: { include: { fornecedor: true } } }
    });
    res.status(201).json(peca);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { fornecedores, ...data } = req.body;
    if (data.precoCompra && data.precoVenda) {
      data.margemLucro = (((Number(data.precoVenda) - Number(data.precoCompra)) / Number(data.precoCompra)) * 100).toFixed(2);
    }
    const peca = await prisma.peca.update({
      where: { id: req.params.id },
      data,
      include: { categoria: true }
    });
    res.json(peca);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await prisma.peca.update({ where: { id: req.params.id }, data: { ativo: false } });
    res.json({ message: 'Peça inativada com sucesso.' });
  } catch (err) { next(err); }
};

const ajustarEstoque = async (req, res, next) => {
  try {
    const { quantidade, tipo, motivo } = req.body;
    const peca = await prisma.peca.findUnique({ where: { id: req.params.id } });
    if (!peca) return res.status(404).json({ error: 'Peça não encontrada.' });

    const novoEstoque = tipo === 'ENTRADA'
      ? peca.estoqueAtual + quantidade
      : peca.estoqueAtual - quantidade;

    if (novoEstoque < 0) return res.status(400).json({ error: 'Estoque insuficiente.' });

    const [pecaAtualizada] = await prisma.$transaction([
      prisma.peca.update({ where: { id: req.params.id }, data: { estoqueAtual: novoEstoque } }),
      prisma.movimentacaoEstoque.create({
        data: {
          pecaId: req.params.id,
          tipo,
          quantidade,
          estoqueAnterior: peca.estoqueAtual,
          estoqueAtual: novoEstoque,
          motivo: motivo || 'Ajuste manual',
        }
      })
    ]);
    res.json(pecaAtualizada);
  } catch (err) { next(err); }
};

const getEstoqueBaixo = async (req, res, next) => {
  try {
    const pecas = await prisma.$queryRaw`
      SELECT p.*, c.nome as categoria_nome
      FROM pecas p
      LEFT JOIN categorias c ON p."categoriaId" = c.id
      WHERE p.ativo = true AND p."estoqueAtual" <= p."estoqueMinimo"
      ORDER BY (p."estoqueAtual" - p."estoqueMinimo") ASC
    `;
    res.json(pecas);
  } catch (err) { next(err); }
};

module.exports = { list, getById, create, update, remove, ajustarEstoque, getEstoqueBaixo };
