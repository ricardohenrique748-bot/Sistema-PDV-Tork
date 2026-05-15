const prisma = require('../config/prisma');

const list = async (req, res, next) => {
  try {
    const agora = new Date();
    const em24h = new Date(agora.getTime() + 24 * 60 * 60 * 1000);

    const [pecasBaixoEstoque, orcamentosExpirando, nfsComErro] = await Promise.all([
      // Peças com estoque <= mínimo (field-to-field comparison via raw)
      prisma.$queryRaw`
        SELECT id, codigo, nome, "estoqueAtual", "estoqueMinimo"
        FROM pecas
        WHERE ativo = true AND "estoqueAtual" <= "estoqueMinimo"
        ORDER BY "estoqueAtual" ASC
        LIMIT 10
      `,
      // Orçamentos pendentes expirando nas próximas 24h ou já expirados (não marcados ainda)
      prisma.orcamento.findMany({
        where: { status: 'PENDENTE', validadeDate: { lte: em24h } },
        select: { id: true, numero: true, validadeDate: true, cliente: { select: { nome: true, razaoSocial: true } } },
        orderBy: { validadeDate: 'asc' },
        take: 10,
      }),
      // Notas fiscais com erro
      prisma.notaFiscal.findMany({
        where: { status: 'ERRO' },
        select: { id: true, numero: true, xMotivo: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const notificacoes = [];

    for (const p of pecasBaixoEstoque) {
      notificacoes.push({
        id: `estoque-${p.id}`,
        tipo: 'ESTOQUE',
        nivel: p.estoqueAtual === 0 ? 'CRITICO' : 'AVISO',
        titulo: p.estoqueAtual === 0 ? 'Sem estoque' : 'Estoque baixo',
        descricao: `${p.nome} (${p.codigo}): ${p.estoqueAtual} un. (mín. ${p.estoqueMinimo})`,
        link: '/pecas',
      });
    }

    for (const o of orcamentosExpirando) {
      const expirado = new Date(o.validadeDate) < agora;
      const nomeCliente = o.cliente?.razaoSocial || o.cliente?.nome || 'Sem cliente';
      notificacoes.push({
        id: `orc-${o.id}`,
        tipo: 'ORCAMENTO',
        nivel: expirado ? 'AVISO' : 'INFO',
        titulo: expirado ? 'Orçamento expirado' : 'Orçamento expirando hoje',
        descricao: `#${String(o.numero).padStart(4, '0')} · ${nomeCliente}`,
        link: '/orcamentos',
      });
    }

    for (const nf of nfsComErro) {
      notificacoes.push({
        id: `nf-${nf.id}`,
        tipo: 'NF',
        nivel: 'CRITICO',
        titulo: 'Erro na emissão de NF',
        descricao: `NF #${nf.numero}: ${nf.xMotivo || 'Erro desconhecido'}`,
        link: '/notas-fiscais',
      });
    }

    res.json({ data: notificacoes, total: notificacoes.length });
  } catch (err) { next(err); }
};

module.exports = { list };
