const prisma = require('../config/prisma');
const { emitirNF, cancelarNF, enviarCartaCorrecao } = require('../services/nfe/focusService');
const path = require('path');
const fs = require('fs');

const list = async (req, res, next) => {
  try {
    const { status, modelo, clienteId, dataInicio, dataFim, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (modelo) where.modelo = modelo;
    if (clienteId) where.clienteId = clienteId;
    if (dataInicio || dataFim) {
      where.createdAt = {};
      if (dataInicio) where.createdAt.gte = new Date(dataInicio);
      if (dataFim) where.createdAt.lte = new Date(dataFim + 'T23:59:59');
    }

    const [data, total] = await Promise.all([
      prisma.notaFiscal.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          cliente: { select: { id: true, nome: true, razaoSocial: true, cpf: true, cnpj: true } },
          usuario: { select: { id: true, nome: true } },
          venda: { select: { id: true, numero: true, total: true } },
        }
      }),
      prisma.notaFiscal.count({ where }),
    ]);
    res.json({ data, total, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const nf = await prisma.notaFiscal.findUnique({
      where: { id: req.params.id },
      include: {
        cliente: true,
        usuario: { select: { id: true, nome: true } },
        venda: { include: { itens: { include: { peca: true } }, pagamentos: true } },
        itens: true,
        cce: true,
      }
    });
    if (!nf) return res.status(404).json({ error: 'Nota fiscal não encontrada.' });
    res.json(nf);
  } catch (err) { next(err); }
};

const getStatus = async (req, res, next) => {
  try {
    const nf = await prisma.notaFiscal.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true, chaveAcesso: true, protocolo: true, xMotivo: true, cStat: true, modelo: true }
    });
    if (!nf) return res.status(404).json({ error: 'NF não encontrada.' });
    res.json(nf);
  } catch (err) { next(err); }
};

const emitir = async (req, res, next) => {
  try {
    const nf = await prisma.notaFiscal.findUnique({ where: { id: req.params.id } });
    if (!nf) return res.status(404).json({ error: 'NF não encontrada.' });
    if (!['DIGITANDO', 'ERRO'].includes(nf.status)) {
      return res.status(400).json({ error: `NF com status "${nf.status}" não pode ser emitida.` });
    }

    const { pedidoCompra } = req.body;
    if (pedidoCompra !== undefined) {
      await prisma.notaFiscal.update({ where: { id: nf.id }, data: { pedidoCompra: pedidoCompra || null } });
    }

    // Emissão síncrona: aguarda resposta da SEFAZ e retorna resultado imediato
    const resultado = await emitirNF(nf.id);
    const nfAtualizada = await prisma.notaFiscal.findUnique({
      where: { id: nf.id },
      select: { id: true, status: true, chaveAcesso: true, protocolo: true, xMotivo: true, cStat: true }
    });
    res.json({ message: 'NF autorizada com sucesso.', resultado, notaFiscal: nfAtualizada });
  } catch (err) { next(err); }
};

const cancelar = async (req, res, next) => {
  try {
    const { justificativa } = req.body;
    if (!justificativa || justificativa.length < 15) {
      return res.status(400).json({ error: 'Justificativa de cancelamento com mínimo de 15 caracteres.' });
    }
    const result = await cancelarNF(req.params.id, justificativa);
    res.json({ message: 'NF cancelada com sucesso.', data: result });
  } catch (err) { next(err); }
};

const downloadXML = async (req, res, next) => {
  try {
    const nf = await prisma.notaFiscal.findUnique({ where: { id: req.params.id } });
    if (!nf) return res.status(404).json({ error: 'NF não encontrada.' });
    if (!nf.xmlPath && !nf.xmlConteudo) return res.status(404).json({ error: 'XML não disponível.' });

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="nf_${nf.chaveAcesso || nf.id}.xml"`);

    if (nf.xmlConteudo) return res.send(nf.xmlConteudo);
    res.sendFile(path.resolve(nf.xmlPath));
  } catch (err) { next(err); }
};

const cartaCorrecao = async (req, res, next) => {
  try {
    const { correcao } = req.body;
    if (!correcao || correcao.length < 15) {
      return res.status(400).json({ error: 'Texto da correção deve ter mínimo 15 caracteres.' });
    }
    const nf = await prisma.notaFiscal.findUnique({ where: { id: req.params.id } });
    if (nf?.status !== 'AUTORIZADA') return res.status(400).json({ error: 'Carta de correção só pode ser emitida para NF autorizadas.' });

    const ultima = await prisma.cartaCorrecao.findFirst({
      where: { notaFiscalId: req.params.id },
      orderBy: { sequencia: 'desc' }
    });

    const cce = await prisma.cartaCorrecao.create({
      data: {
        notaFiscalId: req.params.id,
        sequencia: (ultima?.sequencia || 0) + 1,
        correcao,
        status: 'PENDENTE',
      }
    });

    const resultadoFocus = await enviarCartaCorrecao(req.params.id, correcao, cce.sequencia);
    await prisma.cartaCorrecao.update({
      where: { id: cce.id },
      data: { status: 'ENVIADA', protocolo: resultadoFocus?.numero_protocolo || null },
    });
    res.status(201).json({ message: 'Carta de Correção enviada com sucesso.', cce });
  } catch (err) { next(err); }
};

const downloadPDF = async (req, res, next) => {
  try {
    const nf = await prisma.notaFiscal.findUnique({ where: { id: req.params.id } });
    if (!nf) return res.status(404).json({ error: 'NF não encontrada.' });

    let xml = nf.xmlConteudo;
    if (!xml && nf.xmlPath) {
      if (fs.existsSync(path.resolve(nf.xmlPath))) {
        xml = fs.readFileSync(path.resolve(nf.xmlPath), 'utf8');
      }
    }

    if (!xml) return res.status(404).json({ error: 'XML não disponível para gerar PDF.' });

    const { DANFe, DANFCe } = require('node-sped-pdf');
    let pdfBuffer;
    
    if (nf.modelo === 'NFE') {
      pdfBuffer = await DANFe({ xml });
    } else {
      pdfBuffer = await DANFCe({ xml });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="danfe_${nf.chaveAcesso || nf.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { next(err); }
};

const excluir = async (req, res, next) => {
  try {
    const nf = await prisma.notaFiscal.findUnique({ where: { id: req.params.id } });
    if (!nf) return res.status(404).json({ error: 'NF não encontrada.' });

    if (!['DIGITANDO', 'ERRO'].includes(nf.status)) {
      return res.status(400).json({ error: 'Apenas notas em digitação ou com erro podem ser excluídas.' });
    }

    await prisma.notaFiscal.delete({ where: { id: req.params.id } });
    res.json({ message: 'NF excluída com sucesso.' });
  } catch (err) { next(err); }
};

module.exports = { list, getById, getStatus, emitir, cancelar, downloadXML, downloadPDF, cartaCorrecao, excluir };
