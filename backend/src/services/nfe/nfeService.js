const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');
const { buildXmlNFe, buildInfoNFeSupl } = require('./xmlBuilder');
const { assinarXmlNFeFromDB } = require('./xmlSigner');
const { autorizarNFe, enviarCancelamento } = require('./sefazClient');

async function emitirNF(notaFiscalId) {
  logger.info(`Iniciando emissão SEFAZ Direta: ${notaFiscalId}`);

  const nf = await prisma.notaFiscal.findUnique({
    where: { id: notaFiscalId },
    include: {
      venda: { include: { itens: { include: { peca: true } }, pagamentos: true, cliente: true } },
      cliente: true,
      itens: true
    }
  });

  if (!nf) throw new Error('Nota fiscal não encontrada.');
  if (!nf.venda && (!nf.itens || nf.itens.length === 0)) throw new Error('Nota fiscal sem itens e sem venda vinculada.');

  const empresa = await prisma.empresa.findFirst({
    include: { certificados: { where: { ativo: true }, orderBy: { createdAt: 'desc' }, take: 1 } }
  });

  if (!empresa) throw new Error('Dados da empresa não configurados.');
  const certificado = empresa.certificados[0];
  if (!certificado) throw new Error('Nenhum certificado digital ativo encontrado para a empresa.');

  const venda = nf.venda || {};
  const cliente = nf.cliente || venda.cliente;
  // Fallback para itens da venda caso a nota não possua itens próprios salvos
  const itens = nf.itens?.length > 0 ? nf.itens : (venda.itens || []);
  const pagamentos = venda.pagamentos || [];
  const infAdic = nf.pedidoCompra ? `Pedido de Compra: ${nf.pedidoCompra}` : undefined;

  try {
    await prisma.notaFiscal.update({
      where: { id: notaFiscalId },
      data: { status: 'ENVIADA' },
    });

    // 1. Gerar XML base (sem assinatura)
    const { xml, chave } = buildXmlNFe({ empresa, nf, venda, cliente, itens, pagamentos, infAdic });

    // 2. Assinar XML com o certificado A1
    let xmlAssinado = assinarXmlNFeFromDB(xml, certificado.pfxBase64, certificado.senhaCripto);

    // 3. Para NFC-e, embutir o grupo infNFeSupl (QR Code) LOGO APÓS a assinatura
    if (nf.modelo === 'NFCE') {
      const tpAmb = empresa.ambienteNF === 1 ? '1' : '2';
      const infNFeSupl = buildInfoNFeSupl(chave, tpAmb, empresa);
      // XSD v4.00: infNFeSupl deve vir DEPOIS de </infNFe> e ANTES de <Signature>
      xmlAssinado = xmlAssinado.replace('</infNFe>', `</infNFe>${infNFeSupl}`);
    }

    // 4. Enviar requisição SOAP de Autorização Síncrona
    const retEnviNFe = await autorizarNFe(
      xmlAssinado,
      certificado.pfxBase64,
      certificado.senhaCripto,
      empresa.uf,
      empresa.ambienteNF,
      nf.modelo
    );

    const cStat = retEnviNFe.cStat ? parseInt(retEnviNFe.cStat) : 0;
    const xMotivo = retEnviNFe.xMotivo;
    const protNFe = retEnviNFe.protNFe?.infProt;

    // Se Lote Processado (104), avaliamos o status do protocolo interno
    if (cStat === 104 && protNFe) {
      const cStatProt = parseInt(protNFe.cStat);
      
      if (cStatProt === 100) {
        // Autorizado o uso da NF-e
        await prisma.notaFiscal.update({
          where: { id: notaFiscalId },
          data: {
            status: 'AUTORIZADA',
            chaveAcesso: chave,
            protocolo: protNFe.nProt,
            xMotivo: protNFe.xMotivo,
            cStat: cStatProt,
            dataAutorizacao: new Date(protNFe.dhRecbto || Date.now()),
            xmlConteudo: xmlAssinado // Salvamos o XML gerado/assinado
          },
        });
        logger.info(`NF ${notaFiscalId} autorizada na SEFAZ: chave=${chave}`);
        return { success: true, cStat: cStatProt, xMotivo: protNFe.xMotivo };
      } else {
        // Rejeição ou Denegada
        const status = ['110', '205', '301', '302'].includes(String(cStatProt)) ? 'DENEGADA' : 'ERRO';
        await prisma.notaFiscal.update({
          where: { id: notaFiscalId },
          data: { status, xMotivo: protNFe.xMotivo, cStat: cStatProt, chaveAcesso: chave, xmlConteudo: xmlAssinado },
        });
        throw new Error(`SEFAZ [${cStatProt}]: ${protNFe.xMotivo}`);
      }
    } else {
      // Rejeição do Lote inteiro
      await prisma.notaFiscal.update({
        where: { id: notaFiscalId },
        data: { status: 'ERRO', xMotivo, cStat, chaveAcesso: chave, xmlConteudo: xmlAssinado },
      });
      throw new Error(`SEFAZ Lote Rejeitado [${cStat}]: ${xMotivo}`);
    }

  } catch (err) {
    logger.error(`Erro na emissão NF ${notaFiscalId}: ${err.message}`);
    await prisma.notaFiscal.update({
      where: { id: notaFiscalId },
      data: { status: 'ERRO', xMotivo: err.message },
    }).catch(() => {});
    throw err;
  }
}

async function consultarStatusNF(notaFiscalId) {
  return prisma.notaFiscal.findUnique({ where: { id: notaFiscalId } });
}

async function cancelarNF(notaFiscalId, justificativa) {
  const nf = await prisma.notaFiscal.findUnique({ where: { id: notaFiscalId } });
  if (!nf) throw new Error('Nota fiscal não encontrada.');
  if (nf.status !== 'AUTORIZADA') throw new Error('Apenas NF autorizadas podem ser canceladas.');
  if (!nf.chaveAcesso || !nf.protocolo) throw new Error('NF sem chave de acesso ou protocolo para cancelamento.');

  const empresa = await prisma.empresa.findFirst({
    include: { certificados: { where: { ativo: true }, orderBy: { createdAt: 'desc' }, take: 1 } }
  });
  if (!empresa || !empresa.certificados[0]) throw new Error('Empresa sem certificado digital configurado.');

  try {
    const cert = empresa.certificados[0];
    const result = await enviarCancelamento(
      nf.chaveAcesso,
      nf.protocolo,
      justificativa,
      cert.pfxBase64,
      cert.senhaCripto,
      empresa.uf,
      empresa.ambienteNF
    );

    const cStat = parseInt(result.cStat);
    if (cStat === 135 || cStat === 155) {
      // 135: Evento registrado e vinculado a NF-e, 155: Cancelamento homologado fora de prazo
      await prisma.notaFiscal.update({
        where: { id: notaFiscalId },
        data: { status: 'CANCELADA', motivoCancelamento: justificativa, xMotivo: result.xMotivo }
      });
      return { status: 'cancelado', xMotivo: result.xMotivo };
    } else {
      throw new Error(`SEFAZ Rejeição Cancelamento [${cStat}]: ${result.xMotivo}`);
    }
  } catch (err) {
    logger.error(`Erro no cancelamento NF ${notaFiscalId}: ${err.message}`);
    throw err;
  }
}

function mapearStatusFocus(status) { return status; }

module.exports = { emitirNF, consultarStatusNF, cancelarNF, mapearStatusFocus };
