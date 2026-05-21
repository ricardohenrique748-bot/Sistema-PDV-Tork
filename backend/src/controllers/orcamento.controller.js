const prisma = require('../config/prisma');
const { criarVenda } = require('./venda.controller');

const list = async (req, res, next) => {
  try {
    const { status, clienteId, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (clienteId) where.clienteId = clienteId;

    const [, data, total] = await Promise.all([
      // Expira automaticamente em paralelo com a busca
      prisma.orcamento.updateMany({
        where: { status: 'PENDENTE', validadeDate: { lt: new Date() } },
        data: { status: 'EXPIRADO' }
      }),
      prisma.orcamento.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          cliente: { select: { id: true, nome: true, razaoSocial: true, cpf: true, cnpj: true } },
          usuario: { select: { id: true, nome: true } },
          itens: { include: { peca: { select: { id: true, nome: true, codigo: true } } } },
        }
      }),
      prisma.orcamento.count({ where }),
    ]);
    res.json({ data, total, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const orc = await prisma.orcamento.findUnique({
      where: { id: req.params.id },
      include: {
        cliente: true,
        usuario: { select: { id: true, nome: true } },
        itens: { include: { peca: true } },
      }
    });
    if (!orc) return res.status(404).json({ error: 'Orçamento não encontrado.' });
    res.json(orc);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { clienteId, itens, desconto = 0, observacoes, validadeDias = 7, tipoDesconto = 'VALOR' } = req.body;
    if (!itens?.length) return res.status(400).json({ error: 'Nenhum item no orçamento.' });

    const pecas = await prisma.peca.findMany({ where: { id: { in: itens.map(i => i.pecaId) } } });
    const pecaMap = Object.fromEntries(pecas.map(p => [p.id, p]));

    let subtotal = 0;
    const orcItens = itens.map(item => {
      const peca = pecaMap[item.pecaId];
      const precoUnitario = Number(item.precoUnitario || peca.precoVenda);
      const itemDesconto = Number(item.desconto || 0);
      const total = (precoUnitario - itemDesconto) * item.quantidade;
      subtotal += total;
      return { pecaId: item.pecaId, quantidade: item.quantidade, precoUnitario, desconto: itemDesconto, total };
    });

    const descontoValor = tipoDesconto === 'PERCENT' ? (subtotal * desconto / 100) : Number(desconto);
    const total = subtotal - descontoValor;
    const validadeDate = new Date();
    validadeDate.setDate(validadeDate.getDate() + validadeDias);

    const orc = await prisma.orcamento.create({
      data: {
        clienteId: clienteId || null,
        usuarioId: req.user.id,
        status: 'PENDENTE',
        subtotal,
        desconto: descontoValor,
        total,
        validadeDate,
        observacoes,
        itens: { create: orcItens },
      },
      include: { itens: true, cliente: true }
    });
    res.status(201).json(orc);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { status } = req.body;
    const orc = await prisma.orcamento.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(orc);
  } catch (err) { next(err); }
};

const converter = async (req, res, next) => {
  try {
    const orc = await prisma.orcamento.findUnique({
      where: { id: req.params.id },
      include: { itens: true }
    });
    if (!orc) return res.status(404).json({ error: 'Orçamento não encontrado.' });
    if (orc.status !== 'APROVADO' && orc.status !== 'PENDENTE') {
      return res.status(400).json({ error: 'Somente orçamentos pendentes ou aprovados podem ser convertidos.' });
    }

    const result = await criarVenda({
      clienteId: orc.clienteId,
      usuarioId: req.user.id,
      itens: orc.itens.map(i => ({ pecaId: i.pecaId, quantidade: i.quantidade, precoUnitario: i.precoUnitario, desconto: i.desconto })),
      pagamentos: req.body.pagamentos,
      desconto: orc.desconto,
      tipoDesconto: 'VALOR',
      observacoes: orc.observacoes,
      emitirNF: req.body.emitirNF,
      modeloNF: req.body.modeloNF,
      pedidoCompra: req.body.pedidoCompra,
      placaCaminhao: req.body.placaCaminhao,
    });

    await prisma.orcamento.update({ where: { id: req.params.id }, data: { status: 'CONVERTIDO' } });

    res.status(201).json({ ...result, message: 'Orçamento convertido em venda!' });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
};

const excluir = async (req, res, next) => {
  try {
    const orc = await prisma.orcamento.findUnique({ where: { id: req.params.id } });
    if (!orc) return res.status(404).json({ error: 'Orçamento não encontrado.' });
    await prisma.orcamento.delete({ where: { id: req.params.id } });
    res.json({ message: 'Orçamento excluído com sucesso.' });
  } catch (err) { next(err); }
};

module.exports = { list, getById, create, update, converter, excluir };
