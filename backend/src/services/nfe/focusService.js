const axios = require('axios');
const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');

const BASE_URL = process.env.FOCUS_NFE_BASE_URL || 'https://homologacao.focusnfe.com.br/v2';
const TOKEN = process.env.FOCUS_NFE_TOKEN || '';

// Autenticação Basic Auth: token como usuário, senha vazia
const auth = () => ({ username: TOKEN, password: '' });

// Mapeamento forma de pagamento → código Focus NF-e
const FORMA_PAGAMENTO_MAP = {
  DINHEIRO:       '01',
  CARTAO_CREDITO: '03',
  CARTAO_DEBITO:  '04',
  PIX:            '17',
  BOLETO:         '15',
};

// Mapeamento status Focus → status interno
const STATUS_MAP = {
  'processando_autorizacao': 'ENVIADA',
  'autorizado':              'AUTORIZADA',
  'erro_autorizacao':        'ERRO',
  'denegado':                'DENEGADA',
  'cancelado':               'CANCELADA',
};

function mapearStatusFocus(statusFocus) {
  return STATUS_MAP[statusFocus] || 'ERRO';
}

// Formata data para ISO 8601 com fuso horário de Brasília
function formatarData(date) {
  const d = date ? new Date(date) : new Date();
  return d.toISOString().replace('Z', '-03:00');
}

// Monta o payload JSON para a Focus NF-e / NFC-e
function buildPayload({ empresa, nf, cliente, itens, pagamentos }) {
  const isNFCe = nf.modelo === 'NFCE';

  // --- Destinatário ---
  const dest = {};
  if (cliente?.cnpj) {
    dest.cnpj_destinatario = cliente.cnpj.replace(/\D/g, '');
    dest.indicador_ie_destinatario = cliente.inscricaoEstadual ? 1 : 9;
    if (cliente.inscricaoEstadual) dest.inscricao_estadual_destinatario = cliente.inscricaoEstadual;
  } else if (cliente?.cpf) {
    dest.cpf_destinatario = cliente.cpf.replace(/\D/g, '');
    dest.indicador_ie_destinatario = 9;
  } else {
    // Consumidor não identificado (válido apenas para NFC-e)
    dest.indicador_ie_destinatario = 9;
  }

  if (cliente?.nome || cliente?.razaoSocial) {
    dest.nome_destinatario = (cliente.razaoSocial || cliente.nome).substring(0, 60);
  }
  if (cliente?.email) dest.email_destinatario = cliente.email;
  if (cliente?.telefone) dest.telefone_destinatario = cliente.telefone.replace(/\D/g, '');

  // Endereço do destinatário
  if (cliente?.logradouro) {
    dest.logradouro_destinatario   = cliente.logradouro;
    dest.numero_destinatario       = cliente.numero || 'S/N';
    dest.complemento_destinatario  = cliente.complemento || undefined;
    dest.bairro_destinatario       = cliente.bairro;
    dest.municipio_destinatario    = cliente.municipio;
    dest.uf_destinatario           = cliente.uf;
    dest.cep_destinatario          = (cliente.cep || '').replace(/\D/g, '');
    dest.codigo_municipio_destinatario = cliente.codigoMunicipio || undefined;
  }

  // --- Itens ---
  const items = itens.map((item, idx) => {
    const valorBruto    = parseFloat(item.valorTotal);
    const valorDesconto = parseFloat(item.desconto || 0);

    const itemFocus = {
      numero_item:             idx + 1,
      codigo_produto:          item.codigo,
      descricao:               item.descricao,
      codigo_ncm:              item.ncm,
      cfop:                    item.cfop,
      unidade_comercial:       item.unidade,
      quantidade_comercial:    parseFloat(item.quantidade),
      valor_unitario_comercial: parseFloat(item.valorUnitario),
      valor_bruto:             valorBruto,
      icms_origem:             0, // 0 = Nacional
    };

    if (item.cest) itemFocus.codigo_cest = item.cest;
    if (valorDesconto > 0) itemFocus.valor_desconto = valorDesconto;

    // Tributação ICMS
    if (item.csosn) {
      // Simples Nacional — usa CSOSN
      itemFocus.icms_modalidade = parseInt(item.csosn);
      if ([900, 500, 400, 102, 101].includes(parseInt(item.csosn))) {
        // Sem tributação efetiva
      }
      if (parseInt(item.csosn) === 900) {
        itemFocus.icms_base_calculo = parseFloat(item.bcIcms || 0);
        itemFocus.icms_aliquota     = parseFloat(item.aliqIcms || 0);
        itemFocus.icms_valor        = parseFloat(item.valorIcms || 0);
      }
    } else if (item.cst) {
      // Regime Normal — usa CST
      itemFocus.icms_modalidade = parseInt(item.cst);
      if (['00', '10', '20'].includes(item.cst)) {
        itemFocus.icms_base_calculo = parseFloat(item.bcIcms || 0);
        itemFocus.icms_aliquota     = parseFloat(item.aliqIcms || 0);
        itemFocus.icms_valor        = parseFloat(item.valorIcms || 0);
      }
    }

    // PIS / COFINS — CST 07 = isento
    itemFocus.pis_modalidade    = 7;
    itemFocus.cofins_modalidade = 7;

    if (parseFloat(item.valorPis || 0) > 0) {
      itemFocus.pis_modalidade     = 1;
      itemFocus.pis_base_calculo   = valorBruto;
      itemFocus.pis_aliquota_porcentual = (parseFloat(item.valorPis) / valorBruto * 100).toFixed(2);
      itemFocus.pis_valor          = parseFloat(item.valorPis);
    }
    if (parseFloat(item.valorCofins || 0) > 0) {
      itemFocus.cofins_modalidade     = 1;
      itemFocus.cofins_base_calculo   = valorBruto;
      itemFocus.cofins_aliquota_porcentual = (parseFloat(item.valorCofins) / valorBruto * 100).toFixed(2);
      itemFocus.cofins_valor          = parseFloat(item.valorCofins);
    }

    return itemFocus;
  });

  // --- Pagamentos ---
  let formasPagamento = (pagamentos || []).map(p => ({
    forma_pagamento: FORMA_PAGAMENTO_MAP[p.forma] || '99',
    valor_pagamento: parseFloat(p.valor),
  }));

  if (formasPagamento.length === 0) {
    // Fallback: pagamento à vista em dinheiro com total da NF
    formasPagamento = [{ forma_pagamento: '99', valor_pagamento: parseFloat(nf.totalNF) }];
  }

  // --- Payload principal ---
  const payload = {
    natureza_operacao: 'Venda de mercadoria',
    data_emissao:      formatarData(nf.dataEmissao),
    tipo_documento:    1,         // 1 = saída
    finalidade_emissao: 1,        // 1 = NF-e normal
    consumidor_final:  1,
    presenca_comprador: isNFCe ? 1 : 9, // NFC-e = presencial; NF-e = operação não presencial
    ...dest,
    items,
    formas_pagamento: formasPagamento,
  };

  if (nf.pedidoCompra) payload.numero_pedido_compra = nf.pedidoCompra;

  // CSC para NFC-e (QR Code)
  if (isNFCe) {
    if (empresa.csc)   payload.csc    = empresa.csc;
    if (empresa.cscId) payload.csc_id = empresa.cscId;
  }

  return payload;
}

// Aguarda a Focus processar a NF (polling até 40s)
async function aguardarAutorizacao(ref, modelo, maxTentativas = 8) {
  const endpoint = modelo === 'NFCE' ? 'nfce' : 'nfe';
  for (let i = 0; i < maxTentativas; i++) {
    await new Promise(r => setTimeout(r, 5000));
    try {
      const resp = await axios.get(`${BASE_URL}/${endpoint}/${ref}`, { auth: auth() });
      const data = resp.data;
      if (data.status !== 'processando_autorizacao') return data;
    } catch (err) {
      if (err.response?.status === 404) throw new Error('NF não encontrada na Focus após envio.');
      logger.warn(`Polling Focus [${i + 1}/${maxTentativas}]: ${err.message}`);
    }
  }
  throw new Error('Timeout: Focus não retornou autorização após 40 segundos.');
}

// ─── Emissão NF-e / NFC-e ────────────────────────────────────────────────────

async function emitirNF(notaFiscalId) {
  logger.info(`[Focus] Iniciando emissão: ${notaFiscalId}`);

  const nf = await prisma.notaFiscal.findUnique({
    where: { id: notaFiscalId },
    include: {
      venda: { include: { itens: { include: { peca: true } }, pagamentos: true, cliente: true } },
      cliente: true,
      itens:   true,
    }
  });
  if (!nf) throw new Error('Nota fiscal não encontrada.');

  const empresa = await prisma.empresa.findFirst();
  if (!empresa) throw new Error('Dados da empresa não configurados.');
  if (!TOKEN)   throw new Error('FOCUS_NFE_TOKEN não configurado no .env');

  const cliente   = nf.cliente || nf.venda?.cliente;
  const itens     = nf.itens?.length > 0 ? nf.itens : (nf.venda?.itens || []);
  const pagamentos = nf.venda?.pagamentos || [];

  if (itens.length === 0) throw new Error('Nota fiscal sem itens.');

  const ref      = `tork_${notaFiscalId}`;
  const endpoint = nf.modelo === 'NFCE' ? 'nfce' : 'nfe';
  const payload  = buildPayload({ empresa, nf, cliente, itens, pagamentos });

  await prisma.notaFiscal.update({
    where: { id: notaFiscalId },
    data:  { status: 'ENVIADA', focusNFeId: ref },
  });

  try {
    logger.info(`[Focus] POST /${endpoint}?ref=${ref}`);
    await axios.post(`${BASE_URL}/${endpoint}?ref=${ref}`, payload, { auth: auth() });
  } catch (err) {
    // 422 = NF já enviada com essa ref (idempotente) — continua para polling
    if (err.response?.status !== 422) {
      const msg = err.response?.data?.mensagem || err.message;
      await prisma.notaFiscal.update({
        where: { id: notaFiscalId },
        data:  { status: 'ERRO', xMotivo: msg },
      });
      throw new Error(`Focus rejeição: ${msg}`);
    }
    logger.warn(`[Focus] ref ${ref} já existia (422), consultando status.`);
  }

  // Aguarda processamento pela Focus / SEFAZ
  const resultado = await aguardarAutorizacao(ref, nf.modelo);
  const statusInterno = mapearStatusFocus(resultado.status);

  const updateData = {
    status:          statusInterno,
    chaveAcesso:     resultado.chave_nfe    || resultado.chave_nfce    || null,
    protocolo:       resultado.numero_protocolo || null,
    xMotivo:         resultado.mensagem_sefaz  || resultado.erros?.[0]?.mensagem || null,
    dataAutorizacao: resultado.data_autorizacao ? new Date(resultado.data_autorizacao) : null,
  };

  // Baixa o XML autorizado da Focus para salvar no banco
  if (statusInterno === 'AUTORIZADA') {
    try {
      const xmlResp = await axios.get(
        `${BASE_URL}/${endpoint}/${ref}`,
        { auth: auth(), params: { completa: 1 } }
      );
      const xmlConteudo = xmlResp.data?.caminho_xml_nota_fiscal
        ? (await axios.get(xmlResp.data.caminho_xml_nota_fiscal)).data
        : null;
      if (xmlConteudo) updateData.xmlConteudo = xmlConteudo;
    } catch (e) {
      logger.warn(`[Focus] Falha ao baixar XML da NF ${notaFiscalId}: ${e.message}`);
    }
  }

  await prisma.notaFiscal.update({ where: { id: notaFiscalId }, data: updateData });

  if (statusInterno !== 'AUTORIZADA') {
    throw new Error(`Focus/SEFAZ [${resultado.status}]: ${updateData.xMotivo || 'Erro desconhecido'}`);
  }

  logger.info(`[Focus] NF ${notaFiscalId} autorizada: chave=${updateData.chaveAcesso}`);
  return { success: true, status: statusInterno, chaveAcesso: updateData.chaveAcesso };
}

// ─── Cancelamento ─────────────────────────────────────────────────────────────

async function cancelarNF(notaFiscalId, justificativa) {
  const nf = await prisma.notaFiscal.findUnique({ where: { id: notaFiscalId } });
  if (!nf)                    throw new Error('Nota fiscal não encontrada.');
  if (nf.status !== 'AUTORIZADA') throw new Error('Apenas NF autorizadas podem ser canceladas.');

  const ref      = nf.focusNFeId || `tork_${notaFiscalId}`;
  const endpoint = nf.modelo === 'NFCE' ? 'nfce' : 'nfe';

  logger.info(`[Focus] Cancelando NF ${notaFiscalId}, ref=${ref}`);

  try {
    await axios.delete(`${BASE_URL}/${endpoint}/${ref}`, {
      auth: auth(),
      data: { justificativa },
    });
  } catch (err) {
    const msg = err.response?.data?.mensagem || err.message;
    throw new Error(`Focus cancelamento: ${msg}`);
  }

  // Aguarda processamento
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const resp = await axios.get(`${BASE_URL}/${endpoint}/${ref}`, { auth: auth() });
    if (resp.data.status === 'cancelado') {
      await prisma.notaFiscal.update({
        where: { id: notaFiscalId },
        data:  { status: 'CANCELADA', motivoCancelamento: justificativa, xMotivo: resp.data.mensagem_sefaz },
      });
      return { status: 'cancelado', xMotivo: resp.data.mensagem_sefaz };
    }
    if (resp.data.status !== 'processando_autorizacao') {
      throw new Error(`Focus cancelamento inesperado: ${resp.data.status} — ${resp.data.mensagem_sefaz}`);
    }
  }
  throw new Error('Timeout aguardando confirmação de cancelamento na Focus.');
}

// ─── Carta de Correção ────────────────────────────────────────────────────────

async function enviarCartaCorrecao(notaFiscalId, correcao, sequencia) {
  const nf = await prisma.notaFiscal.findUnique({ where: { id: notaFiscalId } });
  if (!nf || nf.status !== 'AUTORIZADA') throw new Error('NF não autorizada.');

  const ref      = nf.focusNFeId || `tork_${notaFiscalId}`;
  const endpoint = 'nfe'; // CC-e não existe para NFC-e

  logger.info(`[Focus] Enviando CC-e seq=${sequencia} para NF ${notaFiscalId}`);

  const resp = await axios.post(
    `${BASE_URL}/${endpoint}/${ref}/carta_correcao`,
    { correcao, sequencia_evento: sequencia },
    { auth: auth() }
  );

  return resp.data;
}

module.exports = { emitirNF, cancelarNF, enviarCartaCorrecao, mapearStatusFocus };
