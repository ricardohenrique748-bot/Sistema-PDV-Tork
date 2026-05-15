const prisma = require('../config/prisma');

const faturamento = async (req, res, next) => {
  try {
    const { dataInicio, dataFim, agrupamento = 'dia' } = req.query;
    const where = { status: 'CONCLUIDA' };
    if (dataInicio) where.createdAt = { ...where.createdAt, gte: new Date(dataInicio) };
    if (dataFim) where.createdAt = { ...where.createdAt, lte: new Date(dataFim + 'T23:59:59') };

    let groupFormat;
    if (agrupamento === 'mes') groupFormat = `TO_CHAR("createdAt", 'YYYY-MM')`;
    else if (agrupamento === 'semana') groupFormat = `TO_CHAR(DATE_TRUNC('week', "createdAt"), 'YYYY-MM-DD')`;
    else groupFormat = `DATE("createdAt")`;

    const data = await prisma.$queryRawUnsafe(`
      SELECT ${groupFormat} as periodo,
             COUNT(*)::int as quantidade,
             COALESCE(SUM(total), 0)::float as faturamento,
             COALESCE(AVG(total), 0)::float as ticket_medio
      FROM vendas
      WHERE status = 'CONCLUIDA'
        ${dataInicio ? `AND "createdAt" >= '${dataInicio}'` : ''}
        ${dataFim ? `AND "createdAt" <= '${dataFim}T23:59:59'` : ''}
      GROUP BY periodo
      ORDER BY periodo ASC
    `);
    res.json(data);
  } catch (err) { next(err); }
};

const rankingClientes = async (req, res, next) => {
  try {
    const { dataInicio, dataFim, limit = 10 } = req.query;
    const data = await prisma.$queryRaw`
      SELECT c.id, COALESCE(c."razaoSocial", c.nome) as nome,
             COUNT(v.id)::int as total_compras,
             COALESCE(SUM(v.total), 0)::float as valor_total
      FROM clientes c
      JOIN vendas v ON v."clienteId" = c.id
      WHERE v.status = 'CONCLUIDA'
      GROUP BY c.id, c.nome, c."razaoSocial"
      ORDER BY valor_total DESC
      LIMIT ${Number(limit)}
    `;
    res.json(data);
  } catch (err) { next(err); }
};

const rankingPecas = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const data = await prisma.$queryRaw`
      SELECT p.id, p.codigo, p.nome, p."categoriaId",
             SUM(vi.quantidade)::int as total_vendido,
             SUM(vi.total)::float as faturamento
      FROM pecas p
      JOIN venda_itens vi ON vi."pecaId" = p.id
      JOIN vendas v ON v.id = vi."vendaId"
      WHERE v.status = 'CONCLUIDA'
      GROUP BY p.id, p.codigo, p.nome, p."categoriaId"
      ORDER BY total_vendido DESC
      LIMIT ${Number(limit)}
    `;
    res.json(data);
  } catch (err) { next(err); }
};

const estoqueValorizado = async (req, res, next) => {
  try {
    const data = await prisma.$queryRaw`
      SELECT p.id, p.codigo, p.nome,
             c.nome as categoria,
             p."estoqueAtual", p."estoqueMinimo",
             p."precoCompra"::float, p."precoVenda"::float,
             (p."estoqueAtual" * p."precoCompra")::float as valor_custo,
             (p."estoqueAtual" * p."precoVenda")::float as valor_venda,
             (p."estoqueAtual" <= p."estoqueMinimo") as estoque_baixo
      FROM pecas p
      LEFT JOIN categorias c ON c.id = p."categoriaId"
      WHERE p.ativo = true
      ORDER BY valor_custo DESC
    `;
    const totais = {
      totalCusto: data.reduce((s, p) => s + Number(p.valor_custo), 0),
      totalVenda: data.reduce((s, p) => s + Number(p.valor_venda), 0),
      totalItens: data.length,
    };
    res.json({ data, totais });
  } catch (err) { next(err); }
};

const vendasPorCategoria = async (req, res, next) => {
  try {
    const data = await prisma.$queryRaw`
      SELECT cat.nome as categoria,
             COUNT(DISTINCT v.id)::int as vendas,
             SUM(vi.quantidade)::int as pecas_vendidas,
             SUM(vi.total)::float as faturamento
      FROM categorias cat
      JOIN pecas p ON p."categoriaId" = cat.id
      JOIN venda_itens vi ON vi."pecaId" = p.id
      JOIN vendas v ON v.id = vi."vendaId"
      WHERE v.status = 'CONCLUIDA'
      GROUP BY cat.nome
      ORDER BY faturamento DESC
    `;
    res.json(data);
  } catch (err) { next(err); }
};

module.exports = { faturamento, rankingClientes, rankingPecas, estoqueValorizado, vendasPorCategoria };
