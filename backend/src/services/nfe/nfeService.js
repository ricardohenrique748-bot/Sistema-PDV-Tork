const axios = require('axios');
const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');

const FOCUS_BASE_URL = process.env.FOCUS_NFE_BASE_URL || 'https://homologacao.focusnfe.com.br/v2';
const FOCUS_TOKEN = process.env.FOCUS_NFE_TOKEN || '';

const focusApi = axios.create({
  baseURL: FOCUS_BASE_URL,
  auth: { username: FOCUS_TOKEN, password: '' },
  timeout: 30000,
});

/**
 * Monta o payload da NF-e/NFC-e para a Focus NF-e
 */
async function montarPayloadNFe(notaFiscalId) {
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

  const venda = nf.venda;
  const cliente = nf.cliente || venda.cliente;
  const isNFCe = nf.modelo === 'NFCE';

  // Mapeamento de formas de pagamento Focus
  const mapaForma = {
    DINHEIRO: '01',
    CARTAO_CREDITO: '03',
    CARTAO_DEBITO: '04',
    PIX: '17',
    BOLETO: '15',
    CREDIARIO: '99',
  };

  const itens = venda.itens.map((item, idx) => {
    const peca = item.peca;
    return {
      numero_item: String(idx + 1).padStart(3, '0'),
      codigo_produto: peca.codigo,
      descricao: peca.nome,
      codigo_ncm: peca.ncm || '87089990',
      codigo_cest: peca.cest || undefined,
      cfop: peca.cfop || '5102',
      unidade_comercial: peca.unidade || 'UN',
      quantidade_comercial: item.quantidade,
      valor_unitario_comercial: Number(item.precoUnitario),
      valor_unitario_tributavel: Number(item.precoUnitario),
      unidade_tributavel: peca.unidade || 'UN',
      quantidade_tributavel: item.quantidade,
      valor_bruto: Number(item.total),
      codigo_barras_comercial: peca.codigoBarras || undefined,
      indicador_total: '1',
      // ICMS Simples Nacional (CSOSN 400 = tributado pelo Simples Nacional sem permissão de crédito)
      icms_origem: '0',
      icms_csosn: peca.csosn || '400',
      // PIS/COFINS - alíquota zero para SN
      pis_situacao_tributaria: '07',
      pis_valor: '0.00',
      cofins_situacao_tributaria: '07',
      cofins_valor: '0.00',
    };
  });

  const pagamentos = venda.pagamentos.map(p => ({
    forma_pagamento: mapaForma[p.forma] || '99',
    valor_pagamento: Number(p.valor),
  }));

  const payload = {
    // Emitente
    cnpj_emitente: empresa.cnpj,
    // Identificação
    natureza_operacao: 'VENDA DE MERCADORIA',
    forma_pagamento: '0',
    tipo_documento: isNFCe ? '65' : '55',
    local_destino: '1', // 1=Operação interna
    codigo_municipio_fato_gerador: empresa.codigoMunicipio || '3550308',
    formato_impressao_danfe: isNFCe ? '4' : '1',
    tipo_emissao: '1',
    finalidade_emissao: '1',
    consumidor_final: isNFCe ? '1' : (cliente?.tipoPessoa === 'FISICA' ? '1' : '0'),
    presenca_comprador: '1',
    // Destinatário
    ...(cliente ? {
      nome_destinatario: cliente.nome || cliente.razaoSocial,
      ...(cliente.cpf ? { cpf_destinatario: cliente.cpf.replace(/\D/g, '') } : {}),
      ...(cliente.cnpj ? { cnpj_destinatario: cliente.cnpj.replace(/\D/g, '') } : {}),
      indicador_ie_destinatario: '9',
      logradouro_destinatario: cliente.logradouro || 'Não informado',
      numero_destinatario: cliente.numero || 'S/N',
      bairro_destinatario: cliente.bairro || 'Não informado',
      municipio_destinatario: cliente.municipio || empresa.municipio,
      uf_destinatario: cliente.uf || empresa.uf,
      cep_destinatario: (cliente.cep || empresa.cep || '').replace(/\D/g, ''),
      codigo_municipio_destinatario: cliente.codigoMunicipio || empresa.codigoMunicipio || '3550308',
      email_destinatario: cliente.email || undefined,
    } : {}),
    // Itens
    items: itens,
    // Totais
    valor_frete: '0.00',
    valor_seguro: '0.00',
    valor_desconto: Number(venda.desconto).toFixed(2),
    // Pagamentos
    formas_pagamento: pagamentos,
    // Informações Adicionais
    informacoes_adicionais_contribuinte: venda.observacoes || undefined,
    // NFC-e específico
    ...(isNFCe ? { modalidade_frete: '9' } : {}),
  };

  return payload;
}

/**
 * Emite uma NF-e ou NFC-e via Focus NF-e
 */
async function emitirNF(notaFiscalId) {
  logger.info(`Iniciando emissão da NF ${notaFiscalId}`);

  await prisma.notaFiscal.update({
    where: { id: notaFiscalId },
    data: { status: 'ENVIADA' }
  });

  try {
    const payload = await montarPayloadNFe(notaFiscalId);
    const nf = await prisma.notaFiscal.findUnique({ where: { id: notaFiscalId } });
    const isNFCe = nf.modelo === 'NFCE';
    const endpoint = isNFCe ? '/nfce' : '/nfe';
    const refId = `tork_${notaFiscalId.replace(/-/g, '').substring(0, 20)}`;

    const response = await focusApi.post(`${endpoint}?ref=${refId}`, payload);
    logger.info(`Focus NF-e response:`, response.data);

    const focusData = response.data;
    await prisma.notaFiscal.update({
      where: { id: notaFiscalId },
      data: {
        focusNFeId: refId,
        status: mapearStatusFocus(focusData.status || 'processando'),
        chaveAcesso: focusData.chave_nfe || null,
        protocolo: focusData.protocolo || null,
        xMotivo: focusData.mensagem_sefaz || null,
        dataAutorizacao: focusData.data_autorizacao ? new Date(focusData.data_autorizacao) : null,
        xmlPath: focusData.caminho_xml_nota_fiscal || null,
        danfePath: focusData.caminho_danfe || null,
      }
    });

    return { success: true, data: focusData };
  } catch (err) {
    const errorMsg = err.response?.data?.mensagem || err.message;
    logger.error(`Erro na emissão da NF ${notaFiscalId}:`, errorMsg);

    await prisma.notaFiscal.update({
      where: { id: notaFiscalId },
      data: { status: 'ERRO', xMotivo: errorMsg }
    });

    throw new Error(errorMsg);
  }
}

/**
 * Consulta o status de uma NF na Focus
 */
async function consultarStatusNF(focusNFeId, modelo) {
  const endpoint = modelo === 'NFCE' ? '/nfce' : '/nfe';
  const { data } = await focusApi.get(`${endpoint}/${focusNFeId}`);
  return data;
}

/**
 * Cancela uma NF autorizada via Focus
 */
async function cancelarNF(notaFiscalId, justificativa) {
  const nf = await prisma.notaFiscal.findUnique({ where: { id: notaFiscalId } });
  if (!nf?.focusNFeId) throw new Error('Nota fiscal não encontrada ou não possui ID Focus.');
  if (nf.status !== 'AUTORIZADA') throw new Error('Apenas NF autorizadas podem ser canceladas.');

  const endpoint = nf.modelo === 'NFCE' ? '/nfce' : '/nfe';
  const { data } = await focusApi.delete(`${endpoint}/${nf.focusNFeId}`, {
    data: { justificativa }
  });

  await prisma.notaFiscal.update({
    where: { id: notaFiscalId },
    data: { status: 'CANCELADA', motivoCancelamento: justificativa }
  });

  return data;
}

function mapearStatusFocus(status) {
  const mapa = {
    'autorizado': 'AUTORIZADA',
    'cancelado': 'CANCELADA',
    'denegado': 'DENEGADA',
    'processando': 'ENVIADA',
    'erro_autorizacao': 'ERRO',
  };
  return mapa[status?.toLowerCase()] || 'ENVIADA';
}

module.exports = { emitirNF, consultarStatusNF, cancelarNF, montarPayloadNFe, mapearStatusFocus };
