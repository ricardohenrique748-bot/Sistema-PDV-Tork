const prisma = require('../config/prisma');
const { emitirNotaFiscalJob } = require('../services/queue/nfeQueue');

const list = async (req, res, next) => {
  try {
    const { status, clienteId, page = 1, limit = 20, dataInicio, dataFim } = req.query;
    const where = {};
    if (status) where.status = status;
    if (clienteId) where.clienteId = clienteId;
    if (dataInicio || dataFim) {
      where.createdAt = {};
      if (dataInicio) where.createdAt.gte = new Date(dataInicio);
      if (dataFim) where.createdAt.lte = new Date(dataFim + 'T23:59:59');
    }
    const [data, total] = await Promise.all([
      prisma.venda.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          cliente: { select: { id: true, nome: true, razaoSocial: true, cpf: true, cnpj: true } },
          usuario: { select: { id: true, nome: true } },
          itens: { include: { peca: { select: { id: true, nome: true, codigo: true } } } },
          pagamentos: true,
          notaFiscal: { select: { id: true, status: true, modelo: true, chaveAcesso: true, numero: true } },
        }
      }),
      prisma.venda.count({ where }),
    ]);
    res.json({ data, total, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const venda = await prisma.venda.findUnique({
      where: { id: req.params.id },
      include: {
        cliente: true,
        usuario: { select: { id: true, nome: true } },
        itens: { include: { peca: true } },
        pagamentos: true,
        notaFiscal: true,
      }
    });
    if (!venda) return res.status(404).json({ error: 'Venda não encontrada.' });
    res.json(venda);
  } catch (err) { next(err); }
};

// Lógica pura de criação de venda — usada pelo handler HTTP e pelo converter de orçamento
async function criarVenda({ clienteId, usuarioId, itens, pagamentos, desconto = 0, tipoDesconto = 'VALOR', observacoes, emitirNF = false, modeloNF = 'NFCE' }) {
  if (!itens?.length) { const e = new Error('Nenhum item na venda.'); e.status = 400; throw e; }
  if (!pagamentos?.length) { const e = new Error('Forma de pagamento obrigatória.'); e.status = 400; throw e; }

  const pecaIds = itens.map(i => i.pecaId);
  const pecas = await prisma.peca.findMany({ where: { id: { in: pecaIds } } });
  const pecaMap = Object.fromEntries(pecas.map(p => [p.id, p]));

  for (const item of itens) {
    const peca = pecaMap[item.pecaId];
    if (!peca) { const e = new Error(`Peça ${item.pecaId} não encontrada.`); e.status = 400; throw e; }
    if (peca.tipo !== 'SERVICO' && peca.estoqueAtual < item.quantidade) {
      const e = new Error(`Estoque insuficiente para ${peca.nome}. Disponível: ${peca.estoqueAtual}`);
      e.status = 400; throw e;
    }
  }

  let subtotal = 0;
  const vendaItens = itens.map(item => {
    const peca = pecaMap[item.pecaId];
    const precoUnitario = Number(item.precoUnitario || peca.precoVenda);
    const itemDesconto = Number(item.desconto || 0);
    const total = (precoUnitario - itemDesconto) * item.quantidade;
    subtotal += total;
    return { pecaId: item.pecaId, quantidade: item.quantidade, precoUnitario, desconto: itemDesconto, total };
  });

  const descontoValor = tipoDesconto === 'PERCENT' ? (subtotal * desconto / 100) : Number(desconto);
  const total = subtotal - descontoValor;
  const totalPag = pagamentos.reduce((s, p) => s + Number(p.valor), 0);
  if (Math.abs(totalPag - total) > 0.01) {
    const e = new Error(`Soma dos pagamentos (${totalPag.toFixed(2)}) não coincide com o total (${total.toFixed(2)}).`);
    e.status = 400; throw e;
  }

  const venda = await prisma.$transaction(async (tx) => {
    const novaVenda = await tx.venda.create({
      data: {
        clienteId: clienteId || null,
        usuarioId,
        status: 'CONCLUIDA',
        subtotal,
        desconto: descontoValor,
        total,
        observacoes,
        itens: { create: vendaItens },
        pagamentos: { create: pagamentos.map(p => ({ forma: p.forma, valor: Number(p.valor), parcelas: p.parcelas || 1 })) },
      },
      include: { itens: true, pagamentos: true }
    });

    for (const item of vendaItens) {
      const peca = pecaMap[item.pecaId];
      if (peca.tipo === 'SERVICO') continue;
      const novoEstoque = peca.estoqueAtual - item.quantidade;
      await tx.peca.update({ where: { id: item.pecaId }, data: { estoqueAtual: novoEstoque } });
      await tx.movimentacaoEstoque.create({
        data: {
          pecaId: item.pecaId, tipo: 'SAIDA', quantidade: item.quantidade,
          estoqueAnterior: peca.estoqueAtual, estoqueAtual: novoEstoque,
          motivo: `Venda #${novaVenda.numero}`, referenciaId: novaVenda.id,
        }
      });
    }
    return novaVenda;
  });

  if (emitirNF) {
    const nf = await prisma.notaFiscal.create({
      data: {
        vendaId: venda.id,
        clienteId: clienteId || null,
        usuarioId,
        modelo: modeloNF,
        numero: await getProximoNumeroNF(modeloNF),
        status: 'DIGITANDO',
        totalNF: total,
        ambienteNF: parseInt(process.env.FOCUS_NFE_AMBIENTE || '2'),
      }
    });
    await emitirNotaFiscalJob(nf.id);
    return { venda, notaFiscalId: nf.id };
  }

  return { venda };
}

const finalizar = async (req, res, next) => {
  try {
    const result = await criarVenda({ ...req.body, usuarioId: req.user.id });
    const msg = result.notaFiscalId ? 'Venda finalizada. NF em processamento.' : 'Venda finalizada com sucesso.';
    res.status(201).json({ ...result, message: msg });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
};

async function getProximoNumeroNF(modelo) {
  const last = await prisma.notaFiscal.findFirst({
    where: { modelo },
    orderBy: { numero: 'desc' },
    select: { numero: true }
  });
  return (last?.numero || 0) + 1;
}

const cancelar = async (req, res, next) => {
  try {
    const { motivo } = req.body;
    const venda = await prisma.venda.findUnique({ where: { id: req.params.id }, include: { itens: true } });
    if (!venda) return res.status(404).json({ error: 'Venda não encontrada.' });
    if (venda.status === 'CANCELADA') return res.status(400).json({ error: 'Venda já cancelada.' });

    await prisma.$transaction(async (tx) => {
      await tx.venda.update({ where: { id: req.params.id }, data: { status: 'CANCELADA' } });
      // Devolve estoque (apenas peças, não serviços)
      for (const item of venda.itens) {
        const peca = await tx.peca.findUnique({ where: { id: item.pecaId } });
        if (peca.tipo === 'SERVICO') continue;
        const novoEstoque = peca.estoqueAtual + item.quantidade;
        await tx.peca.update({ where: { id: item.pecaId }, data: { estoqueAtual: novoEstoque } });
        await tx.movimentacaoEstoque.create({
          data: {
            pecaId: item.pecaId, tipo: 'ENTRADA', quantidade: item.quantidade,
            estoqueAnterior: peca.estoqueAtual, estoqueAtual: novoEstoque,
            motivo: `Cancelamento de venda`, referenciaId: req.params.id,
          }
        });
      }
    });
    res.json({ message: 'Venda cancelada e estoque devolvido.' });
  } catch (err) { next(err); }
};

const criarNotaFiscal = async (req, res, next) => {
  try {
    const { modeloNF = 'NFCE' } = req.body;
    const venda = await prisma.venda.findUnique({
      where: { id: req.params.id },
      include: { notaFiscal: true },
    });
    if (!venda) return res.status(404).json({ error: 'Venda não encontrada.' });
    if (venda.status !== 'CONCLUIDA') return res.status(400).json({ error: 'NF só pode ser emitida para vendas concluídas.' });
    if (venda.notaFiscal) return res.status(400).json({ error: 'Esta venda já possui uma nota fiscal.' });

    const nf = await prisma.notaFiscal.create({
      data: {
        vendaId: venda.id,
        clienteId: venda.clienteId || null,
        usuarioId: req.user.id,
        modelo: modeloNF,
        numero: await getProximoNumeroNF(modeloNF),
        status: 'DIGITANDO',
        totalNF: venda.total,
        ambienteNF: parseInt(process.env.FOCUS_NFE_AMBIENTE || '2'),
      },
    });
    await emitirNotaFiscalJob(nf.id);
    res.status(201).json({ message: 'NF criada e enfileirada para emissão.', notaFiscal: nf });
  } catch (err) { next(err); }
};

module.exports = { list, getById, finalizar, cancelar, criarVenda, criarNotaFiscal };
