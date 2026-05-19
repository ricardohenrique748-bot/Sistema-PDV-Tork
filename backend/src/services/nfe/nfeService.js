const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');
const { buildXmlNFe, buildInfoNFeSupl } = require('./xmlBuilder');
const { assinarXmlNFeFromDB } = require('./xmlSigner');
const { autorizarNFe, enviarCancelamento } = require('./sefazClient');

/**
 * Monta, Assina e Emite a NF-e via SEFAZ
 */
async function emitirNF(notaFiscalId) {
  logger.info(`Iniciando emissão direta SEFAZ da NF ${notaFiscalId}`);

  // 1. Busca os dados no banco
  const nf = await prisma.notaFiscal.findUnique({
    where: { id: notaFiscalId },
    include: {
      venda: {
        include: {
          itens: { include: { peca: true } },
          pagamentos: true,
          cliente: true,
        }
      },
      cliente: true,
      usuario: true,
    }
  });

  if (!nf) throw new Error('Nota fiscal não encontrada.');
  if (!nf.venda) throw new Error('Venda não vinculada à nota fiscal.');

  const empresa = await prisma.empresa.findFirst();
  if (!empresa) throw new Error('Dados da empresa não configurados.');

  // Verifica se o certificado está configurado
  const certAtivo = await prisma.certificado.findFirst({ where: { ativo: true } });
  if (!certAtivo) {
    throw new Error('Nenhum certificado digital ativo foi encontrado. Configure em Configurações > NF-e / Certificado.');
  }

  const venda = nf.venda;
  const cliente = nf.cliente || venda.cliente;

  try {
    // 2. Monta o XML
    const infAdic = nf.pedidoCompra ? `Pedido de Compra: ${nf.pedidoCompra}` : undefined;
    const { xml, chave } = buildXmlNFe({ empresa, nf, venda, cliente, itens: venda.itens, pagamentos: venda.pagamentos, infAdic });

    // Atualiza a chave no banco antes de assinar
    await prisma.notaFiscal.update({
      where: { id: notaFiscalId },
      data: { chaveAcesso: chave, status: 'ENVIADA' }
    });

    // 3. Assina o XML
    let xmlAssinado = assinarXmlNFeFromDB(xml, certAtivo.pfxBase64, certAtivo.senhaCripto);

    // 3b. Para NFC-e injeta infNFeSupl (QR Code) entre </infNFe> e <Signature>
    if (nf.modelo === 'NFCE') {
      const tpAmb = empresa.ambienteNF === 1 ? '1' : '2';
      const supl = buildInfoNFeSupl(chave, tpAmb, empresa);
      xmlAssinado = xmlAssinado.replace('</infNFe>', '</infNFe>' + supl);
    }

    // 4. Envia para a SEFAZ
    const retEnviNFe = await autorizarNFe(
      xmlAssinado,
      certAtivo.pfxBase64,
      certAtivo.senhaCripto,
      empresa.uf,
      empresa.ambienteNF,
      nf.modelo
    );

    // 5. Analisa a resposta
    const status = retEnviNFe.cStat;
    const motivo = retEnviNFe.xMotivo;
    const protocoloObj = retEnviNFe.protNFe?.infProt;
    const procStatus = protocoloObj?.cStat || status;
    const procMotivo = protocoloObj?.xMotivo || motivo;

    logger.info(`SEFAZ Resposta para ${chave}: cStat=${procStatus} xMotivo=${procMotivo}`);

    // Em processamento sincrono:
    // 104 = Lote processado (tem que olhar o protNFe)
    // 100 = Autorizado o uso da NF-e
    if (procStatus === '100' || procStatus === '150') { // 100=Autorizada, 150=Autorizada Fora Prazo
      await prisma.notaFiscal.update({
        where: { id: notaFiscalId },
        data: {
          status: 'AUTORIZADA',
          protocolo: protocoloObj?.nProt,
          xMotivo: procMotivo,
          cStat: parseInt(procStatus),
          dataAutorizacao: protocoloObj?.dhRecbto ? new Date(protocoloObj.dhRecbto) : new Date(),
          xmlConteudo: xmlAssinado // Salvamos o XML no banco
        }
      });
      return { success: true, cStat: procStatus, xMotivo: procMotivo };
    } else if (procStatus === '110' || procStatus === '301' || procStatus === '302') {
      // Uso denegado
      await prisma.notaFiscal.update({
        where: { id: notaFiscalId },
        data: {
          status: 'DENEGADA',
          xMotivo: procMotivo,
          cStat: parseInt(procStatus),
        }
      });
      throw new Error(`Uso denegado pela SEFAZ: ${procMotivo}`);
    } else {
      // Rejeição
      await prisma.notaFiscal.update({
        where: { id: notaFiscalId },
        data: {
          status: 'ERRO',
          xMotivo: procMotivo,
          cStat: parseInt(procStatus),
        }
      });
      throw new Error(`Rejeição SEFAZ [${procStatus}]: ${procMotivo}`);
    }

  } catch (err) {
    logger.error(`Erro na emissão direta da NF ${notaFiscalId}: ${err.message}`, err);
    await prisma.notaFiscal.update({
      where: { id: notaFiscalId },
      data: { status: 'ERRO', xMotivo: err.message }
    });
    throw new Error(err.message);
  }
}

/**
 * Consulta status local/SEFAZ (adaptado do Focus)
 */
async function consultarStatusNF(notaFiscalId) {
  const nf = await prisma.notaFiscal.findUnique({ where: { id: notaFiscalId } });
  return nf;
}

/**
 * Envia o evento de cancelamento para a SEFAZ e atualiza o banco
 */
async function cancelarNF(notaFiscalId, justificativa) {
  const nf = await prisma.notaFiscal.findUnique({ where: { id: notaFiscalId } });
  if (!nf) throw new Error('Nota fiscal não encontrada.');
  if (nf.status !== 'AUTORIZADA') throw new Error('Apenas NF autorizadas podem ser canceladas.');
  if (!nf.chaveAcesso) throw new Error('Chave de acesso não encontrada na NF.');
  if (!nf.protocolo) throw new Error('Protocolo de autorização não encontrado na NF.');

  const empresa = await prisma.empresa.findFirst();
  if (!empresa) throw new Error('Dados da empresa não configurados.');

  const certAtivo = await prisma.certificado.findFirst({ where: { ativo: true } });
  if (!certAtivo) throw new Error('Nenhum certificado digital ativo encontrado.');

  const resultado = await enviarCancelamento(
    nf.chaveAcesso,
    nf.protocolo,
    justificativa,
    certAtivo.pfxBase64,
    certAtivo.senhaCripto,
    empresa.uf,
    empresa.ambienteNF
  );

  // 135 = Evento Registrado e Vinculado a NF-e  |  136 = Registrado mas não vinculado
  if (!['135', '136'].includes(String(resultado.cStat))) {
    throw new Error(`Cancelamento rejeitado pela SEFAZ [${resultado.cStat}]: ${resultado.xMotivo}`);
  }

  await prisma.notaFiscal.update({
    where: { id: notaFiscalId },
    data: {
      status: 'CANCELADA',
      motivoCancelamento: justificativa,
      xMotivo: resultado.xMotivo,
      cStat: parseInt(resultado.cStat),
    }
  });

  logger.info(`NF ${nf.chaveAcesso} cancelada na SEFAZ: [${resultado.cStat}] ${resultado.xMotivo}`);
  return { status: 'cancelado', cStat: resultado.cStat, xMotivo: resultado.xMotivo };
}

module.exports = { emitirNF, consultarStatusNF, cancelarNF };
