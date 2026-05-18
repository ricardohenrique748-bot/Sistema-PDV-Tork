const prisma = require('../config/prisma');
const axios = require('axios');

const list = async (req, res, next) => {
  try {
    const { search, tipo, page = 1, limit = 20 } = req.query;
    const where = { ativo: true };
    if (tipo) where.tipoPessoa = tipo;
    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { razaoSocial: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: search } },
        { cnpj: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { nome: 'asc' },
      }),
      prisma.cliente.count({ where }),
    ]);
    res.json({ data, total, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: req.params.id },
      include: {
        vendas: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { itens: { include: { peca: { select: { nome: true, codigo: true } } } } }
        }
      }
    });
    if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado.' });
    res.json(cliente);
  } catch (err) { next(err); }
};

const sanitizeCliente = (body) => {
  const n = (v) => (v === '' || v == null ? null : v);
  return {
    tipoPessoa: body.tipoPessoa,
    nome: body.nome || '',
    razaoSocial: n(body.razaoSocial),
    cpf: n(body.cpf),
    cnpj: n(body.cnpj),
    inscricaoEstadual: n(body.inscricaoEstadual),
    email: n(body.email),
    telefone: n(body.telefone),
    celular: n(body.celular),
    logradouro: n(body.logradouro),
    numero: n(body.numero),
    complemento: n(body.complemento),
    bairro: n(body.bairro),
    municipio: n(body.municipio),
    uf: n(body.uf),
    cep: n(body.cep),
    codigoMunicipio: n(body.codigoMunicipio),
    observacoes: n(body.observacoes),
    limiteCredito: body.limiteCredito !== '' && body.limiteCredito != null ? Number(body.limiteCredito) : null,
  };
};

const create = async (req, res, next) => {
  try {
    const cliente = await prisma.cliente.create({ data: sanitizeCliente(req.body) });
    res.status(201).json(cliente);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const cliente = await prisma.cliente.update({ where: { id: req.params.id }, data: sanitizeCliente(req.body) });
    res.json(cliente);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await prisma.cliente.update({ where: { id: req.params.id }, data: { ativo: false } });
    res.json({ message: 'Cliente inativado com sucesso.' });
  } catch (err) { next(err); }
};

const buscarCnpj = async (req, res, next) => {
  try {
    const { cnpj } = req.params;
    const cnpjClean = cnpj.replace(/\D/g, '');
    const { data } = await axios.get(`https://receitaws.com.br/v1/cnpj/${cnpjClean}`, { timeout: 10000 });
    if (data.status === 'ERROR') return res.status(404).json({ error: data.message });
    res.json({
      razaoSocial: data.nome,
      nomeFantasia: data.fantasia,
      cnpj: cnpjClean,
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      municipio: data.municipio,
      uf: data.uf,
      cep: data.cep?.replace(/\D/g, ''),
      email: data.email,
      telefone: data.telefone,
    });
  } catch (err) {
    if (err.response?.status === 429) return res.status(429).json({ error: 'Limite de consultas CNPJ atingido. Tente novamente em 1 minuto.' });
    next(err);
  }
};

const buscarCep = async (req, res, next) => {
  try {
    const { cep } = req.params;
    const cepClean = cep.replace(/\D/g, '');
    const { data } = await axios.get(`https://viacep.com.br/ws/${cepClean}/json/`, { timeout: 5000 });
    if (data.erro) return res.status(404).json({ error: 'CEP não encontrado.' });
    res.json({
      logradouro: data.logradouro,
      bairro: data.bairro,
      municipio: data.localidade,
      uf: data.uf,
      cep: cepClean,
      codigoMunicipio: data.ibge,
    });
  } catch (err) { next(err); }
};

module.exports = { list, getById, create, update, remove, buscarCnpj, buscarCep };
