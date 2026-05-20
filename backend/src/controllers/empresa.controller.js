const prisma = require('../config/prisma');
const { encrypt, processarCertificado } = require('../services/certificate/certService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Empresa
const getEmpresa = async (req, res, next) => {
  try {
    const empresa = await prisma.empresa.findFirst({ include: { certificados: { where: { ativo: true } } } });
    res.json(empresa || {});
  } catch (err) { next(err); }
};

const upsertEmpresa = async (req, res, next) => {
  try {
    const data = { ...req.body };
    delete data.certificados;
    if (data.cnpj) data.cnpj = data.cnpj.replace(/\D/g, '');

    const empresa = await prisma.empresa.findFirst();
    if (empresa) {
      const updated = await prisma.empresa.update({ where: { id: empresa.id }, data });
      return res.json(updated);
    }
    const created = await prisma.empresa.create({ data });
    res.status(201).json(created);
  } catch (err) { next(err); }
};

// Certificados
const listCertificados = async (req, res, next) => {
  try {
    const empresa = await prisma.empresa.findFirst();
    if (!empresa) return res.json([]);
    const certs = await prisma.certificado.findMany({
      where: { empresaId: empresa.id },
      select: { id: true, nome: true, validade: true, ativo: true, createdAt: true }
    });
    res.json(certs);
  } catch (err) { next(err); }
};

const uploadCertificado = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo .pfx não enviado.' });
    const { senha } = req.body;
    if (!senha) return res.status(400).json({ error: 'Senha do certificado obrigatória.' });

    const pfxBuffer = fs.readFileSync(req.file.path);
    const { validade, cn } = processarCertificado(pfxBuffer, senha);

    const pfxBase64 = pfxBuffer.toString('base64');
    const pfxCripto = encrypt(pfxBase64);
    const senhaCripto = encrypt(senha);

    fs.unlinkSync(req.file.path); // Remove arquivo temporário

    const empresa = await prisma.empresa.findFirst();
    if (!empresa) return res.status(400).json({ error: 'Configure os dados da empresa antes de enviar o certificado.' });

    // Desativa certificados anteriores
    await prisma.certificado.updateMany({ where: { empresaId: empresa.id }, data: { ativo: false } });

    const cert = await prisma.certificado.create({
      data: {
        empresaId: empresa.id,
        nome: cn,
        pfxBase64: pfxCripto,
        senhaCripto,
        validade,
        ativo: true,
      },
      select: { id: true, nome: true, validade: true, ativo: true, createdAt: true }
    });
    res.status(201).json({ message: 'Certificado importado com sucesso.', certificado: cert });
  } catch (err) { next(err); }
};

const getDatabaseStats = async (req, res, next) => {
  try {
    const [
      clientes, pecas, categorias, fornecedores,
      vendas, orcamentos, notasFiscais, usuarios,
    ] = await Promise.all([
      prisma.cliente.count(),
      prisma.peca.count(),
      prisma.categoria.count(),
      prisma.fornecedor.count(),
      prisma.venda.count(),
      prisma.orcamento.count(),
      prisma.notaFiscal.count(),
      prisma.usuario.count(),
    ]);

    // Tamanho aproximado do banco via pg_database_size
    let dbSize = null;
    try {
      const result = await prisma.$queryRaw`
        SELECT pg_size_pretty(pg_database_size(current_database())) AS size,
               version() AS version,
               current_database() AS name
      `;
      dbSize = result[0];
    } catch { /* não crítico */ }

    res.json({
      tabelas: { clientes, pecas, categorias, fornecedores, vendas, orcamentos, notasFiscais, usuarios },
      banco: dbSize,
      timestamp: new Date().toISOString(),
    });
  } catch (err) { next(err); }
};

module.exports = { getEmpresa, upsertEmpresa, listCertificados, uploadCertificado, getDatabaseStats };
