const prisma = require('../config/prisma');

const getDashboard = async (req, res, next) => {
  try {
    const hoje = new Date();
    const inicioDia = new Date(hoje.setHours(0, 0, 0, 0));
    const fimDia = new Date(hoje.setHours(23, 59, 59, 999));
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay());
    inicioSemana.setHours(0, 0, 0, 0);
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const inicioAno = new Date(hoje.getFullYear(), 0, 1);

    const [
      vendasDia, vendasSemana, vendasMes,
      nfDia, nfMes, estoqueBaixo, ultimasVendas,
      vendasPorDia
    ] = await Promise.all([
      // Faturamento por período
      prisma.venda.aggregate({ where: { status: 'CONCLUIDA', createdAt: { gte: inicioDia, lte: fimDia } }, _sum: { total: true }, _count: true }),
      prisma.venda.aggregate({ where: { status: 'CONCLUIDA', createdAt: { gte: inicioSemana } }, _sum: { total: true }, _count: true }),
      prisma.venda.aggregate({ where: { status: 'CONCLUIDA', createdAt: { gte: inicioMes } }, _sum: { total: true }, _count: true }),
      // NF
      prisma.notaFiscal.count({ where: { createdAt: { gte: inicioDia }, status: 'AUTORIZADA' } }),
      prisma.notaFiscal.count({ where: { createdAt: { gte: inicioMes }, status: 'AUTORIZADA' } }),
      // Estoque baixo
      prisma.$queryRaw`SELECT COUNT(*)::int as total FROM pecas WHERE ativo = true AND "estoqueAtual" <= "estoqueMinimo"`,
      // Últimas vendas
      prisma.venda.findMany({
        where: { status: 'CONCLUIDA' },
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          cliente: { select: { nome: true, razaoSocial: true } },
          itens: true,
        }
      }),
      // Vendas dos últimos 30 dias
      prisma.$queryRaw`
        SELECT DATE("createdAt") as data, 
               COUNT(*)::int as quantidade,
               COALESCE(SUM(total), 0)::float as faturamento
        FROM vendas
        WHERE status = 'CONCLUIDA' 
          AND "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE("createdAt")
        ORDER BY data ASC
      `,
    ]);

    const ticketMedioDia = vendasDia._count > 0 ? Number(vendasDia._sum.total || 0) / vendasDia._count : 0;
    const ticketMedioMes = vendasMes._count > 0 ? Number(vendasMes._sum.total || 0) / vendasMes._count : 0;

    res.json({
      faturamento: {
        dia: Number(vendasDia._sum.total || 0),
        semana: Number(vendasSemana._sum.total || 0),
        mes: Number(vendasMes._sum.total || 0),
      },
      vendas: {
        dia: vendasDia._count,
        semana: vendasSemana._count,
        mes: vendasMes._count,
      },
      ticketMedio: {
        dia: ticketMedioDia,
        mes: ticketMedioMes,
      },
      nfEmitidas: { dia: nfDia, mes: nfMes },
      estoqueBaixo: estoqueBaixo[0]?.total || 0,
      ultimasVendas,
      graficoVendas: vendasPorDia,
    });
  } catch (err) { next(err); }
};

module.exports = { getDashboard };
