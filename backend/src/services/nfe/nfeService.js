/**
 * Integração Focus NF-e
 * Documentação: https://focusnfe.com.br/doc/
 */
const axios = require('axios');
const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');

const FORMA_PAG = {
  DINHEIRO:         '01',
  CHEQUE:           '02',
  CARTAO_CREDITO:   '03',
  CARTAO_DEBITO:    '04',
  CREDIARIO:        '05',
  VALE_ALIMENTACAO: '10',
  VALE_REFEICAO:    '11',
  PIX:              '17',
  BOLETO:           '15',
  SEM_PAGAMENTO:    '90',
};

function mapearStatusFocus(statusFocus) {
  const map = {
    autorizado:  'AUTORIZADA',
    cancelado:   'CANCELADA',
    denegado:    'DENEGADA',
    erro:        'ERRO',
    processando: 'ENVIADA',
    pendente:    'ENVIADA',
  };
  return map[statusFocus] || 'ERRO';
}

function buildPayload(empresa, nf, venda, cliente, itens, pagamentos, infAdic) {
  const isNFCe = nf.modelo === 'NFCE';
  const vProd  = itens.reduce((s, i) => s + Number(i.valorTotal || i.total || 0), 0);
  const vDesc  = Number(venda.desconto || 0);
  const vNF    = vProd - vDesc;

  const payload = {
    natureza_operacao:   'VENDA DE MERCADORIA',
    data_emissao:        new Date(nf.dataEmissao || Date.now()).toISOString(),
    tipo_documento:      1,
    finalidade_emissao:  1,
    consumidor_final:    isNFCe ? 1 : (cliente?.tipoPessoa === 'FISICA' ? 1 : 0),
    presenca_comprador:  1,
    cnpj_emitente:       empresa.cnpj.replace(/\D/g, ''),
    itens:               buildItens(itens, empresa.regimeTributario),
    formas_pagamento:    buildPagamentos(pagamentos, vNF),
  };

  Object.assign(payload, buildDestinatario(cliente, isNFCe, empresa));

  const partes = [venda.observacoes, infAdic].filter(Boolean);
  if (partes.length) {
    payload.informacoes_adicionais_contribuinte = partes.join(' | ').substring(0, 500);
  }

  if (isNFCe && empresa.cscId && empresa.csc) {
    payload.csc_id    = empresa.cscId;
    payload.csc_token = empresa.csc;
  }

  return payload;
}

function buildDestinatario(cliente, isNFCe, empresa) {
  if (isNFCe && !cliente) return {};
  if (!cliente) return {};

  const d = {};
  const cpf  = cliente.cpf  ? cliente.cpf.replace(/\D/g, '')  : null;
  const cnpj = cliente.cnpj ? cliente.cnpj.replace(/\D/g, '') : null;

  if (cnpj && cnpj.length === 14) d.cnpj_destinatario = cnpj;
  else if (cpf && cpf.length === 11) d.cpf_destinatario = cpf;

  d.nome_destinatario        = (cliente.razaoSocial || cliente.nome || 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO').substring(0, 60);
  d.indicador_ie_destinatario = 9;

  if (cliente.logradouro) {
    d.logradouro_destinatario           = (cliente.logradouro || 'NAO INFORMADO').substring(0, 60);
    d.numero_destinatario               = (cliente.numero     || 'S/N').substring(0, 60);
    d.bairro_destinatario               = (cliente.bairro     || 'NAO INFORMADO').substring(0, 60);
    d.municipio_destinatario            = (cliente.municipio  || empresa.municipio || 'SAO PAULO').substring(0, 60);
    d.uf_destinatario                   = cliente.uf || empresa.uf || 'SP';
    d.cep_destinatario                  = (cliente.cep || '').replace(/\D/g, '');
    d.codigo_municipio_destinatario     = cliente.codigoMunicipio || '9999999';
    d.pais_destinatario                 = 'Brasil';
    d.codigo_pais_destinatario          = '1058';
  }

  if (cliente.email) d.email_destinatario = cliente.email;

  return d;
}

function buildItens(itens, crt = 1) {
  return itens.map((item, idx) => {
    const peca    = item.peca || {};
    const vlUnit  = Number(item.valorUnitario || item.precoUnitario || 0);
    const qtd     = Number(item.quantidade || 1);
    const vlTotal = Number(item.valorTotal || item.total || vlUnit * qtd);
    const vlDesc  = Number(item.desconto || 0);

    const i = {
      numero_item:               String(idx + 1),
      codigo_produto:            item.codigo    || peca.codigo    || String(idx + 1).padStart(6, '0'),
      descricao:                 (item.descricao || peca.nome || 'PRODUTO').substring(0, 120),
      codigo_ncm:                (item.ncm  || peca.ncm  || '87089990').replace(/\D/g, '').padStart(8, '0'),
      cfop:                      item.cfop  || peca.cfop  || '5102',
      unidade_comercial:         (item.unidade || peca.unidade || 'UN').substring(0, 6),
      quantidade_comercial:      qtd.toFixed(4),
      valor_unitario_comercial:  vlUnit.toFixed(4),
      valor_bruto:               vlTotal.toFixed(2),
      codigo_ean:                item.codigoBarras || peca.codigoBarras || 'SEM GTIN',
      unidade_tributavel:        (item.unidade || peca.unidade || 'UN').substring(0, 6),
      quantidade_tributavel:     qtd.toFixed(4),
      valor_unitario_tributavel: vlUnit.toFixed(4),
      codigo_ean_tributavel:     item.codigoBarras || peca.codigoBarras || 'SEM GTIN',
      inclui_no_total:           1,
      icms_origem:               String(item.icmsOrigem || peca.icmsOrigem || '0'),
    };

    if (vlDesc > 0) i.valor_desconto = vlDesc.toFixed(2);
    if (item.cest || peca.cest) {
      i.codigo_cest = (item.cest || peca.cest).replace(/\D/g, '').padStart(7, '0');
    }

    if (Number(crt) === 3) {
      i.icms_modalidade = String(item.cst || peca.cst || '41'); // CST Regime Normal
    } else {
      i.icms_csosn = String(item.csosn || peca.csosn || '400'); // CSOSN Simples Nacional
    }

    i.pis_situacao_tributaria    = '07';
    i.cofins_situacao_tributaria = '07';

    return i;
  });
}

function buildPagamentos(pagamentos, vNF) {
  const dets = (pagamentos || []).map(p => ({
    forma_pagamento: FORMA_PAG[p.forma] || '01',
    valor_pagamento: Number(p.valor).toFixed(2),
  }));
  if (!dets.length) dets.push({ forma_pagamento: '01', valor_pagamento: vNF.toFixed(2) });
  return dets;
}

function getFocusConfig() {
  const token = process.env.FOCUS_NFE_TOKEN;
  if (!token || token === 'seu-token-focus-nfe') {
    throw new Error('FOCUS_NFE_TOKEN não configurado. Acesse app.focusnfe.com.br, crie uma conta e configure o token no .env do servidor.');
  }
  const baseUrl = (process.env.FOCUS_NFE_BASE_URL || 'https://homologacao.focusnfe.com.br/v2').replace(/\/$/, '');
  return { token, baseUrl };
}

async function focusGet(url, token) {
  const resp = await axios.get(url, { auth: { username: token, password: '' }, timeout: 15000 });
  return resp.data;
}

async function emitirNF(notaFiscalId) {
  logger.info(`Iniciando emissão Focus NF-e: ${notaFiscalId}`);

  const nf = await prisma.notaFiscal.findUnique({
    where: { id: notaFiscalId },
    include: {
      venda: { include: { itens: { include: { peca: true } }, pagamentos: true, cliente: true } },
      cliente: true,
    }
  });

  if (!nf)       throw new Error('Nota fiscal não encontrada.');
  if (!nf.venda) throw new Error('Venda não vinculada à nota fiscal.');

  const empresa = await prisma.empresa.findFirst();
  if (!empresa) throw new Error('Dados da empresa não configurados.');

  const { token, baseUrl } = getFocusConfig();

  const venda   = nf.venda;
  const cliente = nf.cliente || venda.cliente;
  const infAdic = nf.pedidoCompra ? `Pedido de Compra: ${nf.pedidoCompra}` : undefined;
  const endpoint = nf.modelo === 'NFCE' ? 'nfce' : 'nfe';
  const ref = `tork_${notaFiscalId}`;

  const payload = buildPayload(empresa, nf, venda, cliente, venda.itens, venda.pagamentos, infAdic);

  try {
    await prisma.notaFiscal.update({
      where: { id: notaFiscalId },
      data: { status: 'ENVIADA', focusNFeId: ref },
    });

    logger.info(`Focus NF-e POST ${baseUrl}/${endpoint}?ref=${ref}`);

    await axios.post(
      `${baseUrl}/${endpoint}?ref=${ref}`,
      payload,
      { auth: { username: token, password: '' }, timeout: 30000 }
    );

    // Polling: aguarda até 30s pela resposta da SEFAZ
    for (let attempt = 1; attempt <= 10; attempt++) {
      await new Promise(r => setTimeout(r, 3000));

      const data = await focusGet(`${baseUrl}/${endpoint}/${ref}`, token);
      logger.info(`Focus poll ${attempt}/10: status=${data.status}`);

      if (data.status === 'autorizado') {
        let xmlConteudo = null;
        if (data.caminho_xml_nota_fiscal) {
          try {
            const xmlResp = await axios.get(data.caminho_xml_nota_fiscal, {
              auth: { username: token, password: '' }, timeout: 15000,
            });
            xmlConteudo = typeof xmlResp.data === 'string' ? xmlResp.data : null;
          } catch (e) {
            logger.warn('Não foi possível baixar XML da Focus: ' + e.message);
          }
        }

        await prisma.notaFiscal.update({
          where: { id: notaFiscalId },
          data: {
            status:          'AUTORIZADA',
            chaveAcesso:     data.chave_nfe,
            protocolo:       data.protocolo,
            xMotivo:         data.mensagem_sefaz,
            cStat:           data.status_sefaz ? parseInt(data.status_sefaz) : 100,
            dataAutorizacao: data.data_autorizacao ? new Date(data.data_autorizacao) : new Date(),
            ...(xmlConteudo ? { xmlConteudo } : {}),
          },
        });

        logger.info(`NF ${notaFiscalId} autorizada: chave=${data.chave_nfe}`);
        return { success: true, cStat: data.status_sefaz, xMotivo: data.mensagem_sefaz };
      }

      if (['erro', 'denegado', 'cancelado'].includes(data.status)) {
        await prisma.notaFiscal.update({
          where: { id: notaFiscalId },
          data: {
            status:  mapearStatusFocus(data.status),
            xMotivo: data.mensagem_sefaz,
            cStat:   data.status_sefaz ? parseInt(data.status_sefaz) : null,
          },
        });
        throw new Error(`Focus NF-e [${data.status_sefaz}]: ${data.mensagem_sefaz}`);
      }
    }

    // Ainda processando — webhook vai finalizar
    logger.info(`NF ${notaFiscalId} ainda processando após polling. Aguardando webhook Focus.`);
    return { success: true, pending: true };

  } catch (err) {
    if (err.response) {
      const errData  = err.response.data;
      const mensagem = (errData?.erros?.[0]?.mensagem) || errData?.mensagem || JSON.stringify(errData).substring(0, 200);
      logger.error(`Focus NF-e HTTP ${err.response.status}: ${mensagem}`);
      await prisma.notaFiscal.update({
        where: { id: notaFiscalId },
        data: { status: 'ERRO', xMotivo: `Focus: ${mensagem}` },
      });
      throw new Error(`Erro Focus NF-e: ${mensagem}`);
    }
    // Erro de rede ou de negócio já tratado
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

  const { token, baseUrl } = getFocusConfig();
  const endpoint = nf.modelo === 'NFCE' ? 'nfce' : 'nfe';
  const ref = nf.focusNFeId || `tork_${notaFiscalId}`;

  try {
    const resp = await axios.delete(
      `${baseUrl}/${endpoint}/${ref}`,
      { auth: { username: token, password: '' }, data: { justificativa }, timeout: 30000 }
    );

    const data = resp.data;
    if (data.status !== 'cancelado') {
      throw new Error(`Cancelamento não aceito pela Focus: ${data.mensagem_sefaz || data.status}`);
    }

    await prisma.notaFiscal.update({
      where: { id: notaFiscalId },
      data: {
        status:             'CANCELADA',
        motivoCancelamento: justificativa,
        xMotivo:            data.mensagem_sefaz,
      },
    });

    logger.info(`NF ${notaFiscalId} cancelada via Focus NF-e`);
    return { status: 'cancelado', xMotivo: data.mensagem_sefaz };

  } catch (err) {
    if (err.response) {
      const mensagem = err.response.data?.mensagem || JSON.stringify(err.response.data);
      throw new Error(`Erro Focus cancelamento: ${mensagem}`);
    }
    throw err;
  }
}

module.exports = { emitirNF, consultarStatusNF, cancelarNF, mapearStatusFocus };
