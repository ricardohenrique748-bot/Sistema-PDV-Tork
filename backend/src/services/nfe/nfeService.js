const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');
const { buildXmlNFe } = require('./xmlBuilder');
const { assinarXmlNFeFromDB } = require('./xmlSigner');
const { autorizarNFe } = require('./sefazClient');

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
    const { xml, chave } = buildXmlNFe({ empresa, nf, venda, cliente, itens: venda.itens, pagamentos: venda.pagamentos });

    // Atualiza a chave no banco antes de assinar
    await prisma.notaFiscal.update({
      where: { id: notaFiscalId },
      data: { chaveAcesso: chave, status: 'ENVIADA' }
    });

    // 3. Assina o XML
    const xmlAssinado = assinarXmlNFeFromDB(xml, certAtivo.pfxBase64, certAtivo.senha);

    // 4. Envia para a SEFAZ
    const retEnviNFe = await autorizarNFe(
      xmlAssinado,
      certAtivo.pfxBase64,
      certAtivo.senha,
      empresa.uf,
      empresa.ambienteNF
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
    logger.error(`Erro na emissão direta da NF ${notaFiscalId}:`, err.message);
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
 * Função mock para cancelamento e carta de correção (será implementado os detalhes do evento a seguir)
 */
async function cancelarNF(notaFiscalId, justificativa) {
  // TODO: Emissão do Evento de Cancelamento XML para SEFAZ
  const nf = await prisma.notaFiscal.findUnique({ where: { id: notaFiscalId } });
  if (!nf) throw new Error('Nota fiscal não encontrada.');

  await prisma.notaFiscal.update({
    where: { id: notaFiscalId },
    data: { status: 'CANCELADA', motivoCancelamento: justificativa, xMotivo: 'Cancelamento Registrado Localmente' }
  });

  return { status: 'cancelado' };
}

module.exports = { emitirNF, consultarStatusNF, cancelarNF };
