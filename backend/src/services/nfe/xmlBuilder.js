/**
 * Geração do XML NF-e v4.00
 * Padrão SEFAZ – NT 2023.001
 */
const { create } = require('xmlbuilder2');
const crypto = require('crypto');
const { getUFCode, getUrlConsulta } = require('./sefazUrls');

// Mapa forma de pagamento → código SEFAZ
const FORMA_PAG = {
  DINHEIRO:       '01',
  CHEQUE:         '02',
  CARTAO_CREDITO: '03',
  CARTAO_DEBITO:  '04',
  CREDIARIO:      '05',
  VALE_ALIMENTACAO: '10',
  VALE_REFEICAO:  '11',
  PIX:            '17',
  BOLETO:         '15',
  SEM_PAGAMENTO:  '90',
};

/**
 * Calcula o dígito verificador da chave de acesso (módulo 11)
 */
function calcDV(chave43) {
  const pesos = [2,3,4,5,6,7,8,9,2,3,4,5,6,7,8,9,2,3,4,5,6,7,8,9,2,3,4,5,6,7,8,9,2,3,4,5,6,7,8,9,2,3,4];
  let soma = 0;
  for (let i = 0; i < 43; i++) soma += parseInt(chave43[i]) * pesos[i];
  const r = soma % 11;
  return r < 2 ? 0 : 11 - r;
}

/**
 * Gera a chave de acesso de 44 dígitos
 */
function gerarChave(empresa, nf) {
  const cUF   = String(getUFCode(empresa.uf)).padStart(2, '0');
  const d     = new Date(nf.dataEmissao || Date.now());
  const AAMM  = String(d.getFullYear()).slice(-2) + String(d.getMonth() + 1).padStart(2, '0');
  const cnpj  = empresa.cnpj.replace(/\D/g, '').padStart(14, '0');
  const mod   = nf.modelo === 'NFCE' ? '65' : '55';
  const serie = String(nf.serie || 1).padStart(3, '0');
  const nNF   = String(nf.numero).padStart(9, '0');
  const tpEmis = '1';
  const cNF   = String(Math.floor(10000000 + Math.random() * 89999999)).padStart(8, '0');
  const chave43 = `${cUF}${AAMM}${cnpj}${mod}${serie}${nNF}${tpEmis}${cNF}`;
  const cDV   = calcDV(chave43);
  return { chave: chave43 + String(cDV), cNF, cDV: String(cDV) };
}

/**
 * Formata data para o padrão SEFAZ: 2024-01-15T10:30:00-03:00
 */
function fmtDate(d) {
  const dt = new Date(d || Date.now());
  // Offset -03:00
  const pad = n => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}-03:00`;
}

/**
 * Gera o bloco infNFeSupl com QR Code para NFC-e.
 * Deve ser injetado no XML após a assinatura (entre </infNFe> e <Signature>).
 */
function buildInfoNFeSupl(chave, tpAmb, empresa) {
  const cscId = (empresa.cscId || '000001').padStart(6, '0');
  const csc   = empresa.csc || '';
  const urlConsulta = getUrlConsulta(empresa.uf, empresa.ambienteNF === 1 ? 1 : 2, 'NFCE')
    || 'https://nfce.svrs.rs.gov.br/consultarNFCe';

  const hashInput = chave + cscId + csc;
  const hash = crypto.createHash('sha1').update(hashInput).digest('hex').toUpperCase();
  const qrCode = `${urlConsulta}?p=${chave}|${tpAmb}|${cscId}|${hash}`;

  return `<infNFeSupl><qrCode><![CDATA[${qrCode}]]></qrCode><urlFe><![CDATA[${urlConsulta}]]></urlFe></infNFeSupl>`;
}

/**
 * Bloco destinatário (omitido em NFC-e sem identificação)
 */
function buildDest(cliente, isNFCe, empresa) {
  // Em NFC-e homologação, o destinatário pode ser omitido ou ter CPF fictício
  if (isNFCe && !cliente) return {};

  const dest = {};

  if (cliente) {
    const cpf  = cliente.cpf  ? cliente.cpf.replace(/\D/g, '')  : null;
    const cnpj = cliente.cnpj ? cliente.cnpj.replace(/\D/g, '') : null;

    if (cnpj && cnpj.length === 14) dest.CNPJ = cnpj;
    else if (cpf && cpf.length === 11) dest.CPF = cpf;

    dest.xNome = (cliente.razaoSocial || cliente.nome || 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO').substring(0, 60);

    if (cliente.logradouro) {
      dest.enderDest = {
        xLgr:   (cliente.logradouro || 'NAO INFORMADO').substring(0, 60),
        nro:    (cliente.numero     || 'S/N').substring(0, 60),
        xBairro:(cliente.bairro     || 'NAO INFORMADO').substring(0, 60),
        cMun:   cliente.codigoMunicipio || '9999999',
        xMun:   (cliente.municipio  || empresa.municipio || 'SAO PAULO').substring(0, 60),
        UF:     cliente.uf || empresa.uf || 'SP',
        CEP:    (cliente.cep || '').replace(/\D/g, ''),
        cPais:  '1058',
        xPais:  'BRASIL',
      };
    }

    if (cliente.inscricaoEstadual && cliente.inscricaoEstadual.toUpperCase() !== 'ISENTO') {
      dest.indIEDest = '1';
      dest.IE = cliente.inscricaoEstadual.replace(/\D/g, '');
    } else {
      dest.indIEDest = '9';
    }

    if (cliente.email) dest.email = cliente.email.substring(0, 60);
  }

  return Object.keys(dest).length ? { dest } : {};
}

/**
 * Bloco de itens — retorna array para que xmlbuilder2 gere múltiplos <det>
 */
function buildItens(itens, crt = 1) {
  return itens.map((item, idx) => {
    const peca    = item.peca || {};
    const vlUnit  = Number(item.valorUnitario || item.precoUnitario || 0);
    const qtd     = Number(item.quantidade || 1);
    const vlTotal = Number(item.valorTotal || item.total || vlUnit * qtd);
    const vlDesc  = Number(item.desconto || 0);

    return {
      '@nItem': String(idx + 1),
      prod: {
        cProd:    item.codigo    || peca.codigo    || String(idx + 1).padStart(6, '0'),
        cEAN:     item.codigoBarras || peca.codigoBarras || 'SEM GTIN',
        xProd:    (item.descricao || peca.nome || 'PRODUTO').substring(0, 120),
        NCM:      (item.ncm  || peca.ncm  || '87089990').replace(/\D/g, '').padStart(8, '0'),
        ...((item.cest || peca.cest) ? { CEST: (item.cest || peca.cest).replace(/\D/g, '').padStart(7, '0') } : {}),
        CFOP:     item.cfop  || peca.cfop  || '5102',
        uCom:     (item.unidade || peca.unidade || 'UN').substring(0, 6),
        qCom:     qtd.toFixed(4),
        vUnCom:   vlUnit.toFixed(4),
        vProd:    vlTotal.toFixed(2),
        cEANTrib: item.codigoBarras || peca.codigoBarras || 'SEM GTIN',
        uTrib:    (item.unidade || peca.unidade || 'UN').substring(0, 6),
        qTrib:    qtd.toFixed(4),
        vUnTrib:  vlUnit.toFixed(4),
        ...(vlDesc > 0 ? { vDesc: vlDesc.toFixed(2) } : {}),
        indTot:   '1',
      },
      imposto: buildImpostoItem(item, peca, crt),
    };
  });
}

/**
 * Impostos por item
 * CRT 1/2 → Simples Nacional → CSOSN
 * CRT 3   → Regime Normal    → CST
 *
 * Mapeamento correto NF-e v4.00 XSD:
 *   CST 00          → ICMS00
 *   CST 40/41/50    → ICMS40  (único elemento para os três no XSD v4.00)
 *   CST 60          → ICMS60
 *   CSOSN 102/300/400 → ICMSSN102
 *   CSOSN 101       → ICMSSN101
 *   CSOSN 201       → ICMSSN201
 *   CSOSN 202       → ICMSSN202
 *   CSOSN 500       → ICMSSN500
 *   CSOSN 900       → ICMSSN900
 */
function buildImpostoItem(item, peca = {}, crt = 1) {
  const orig = item.icmsOrigem || peca.icmsOrigem || '0';
  let icmsGrupo;

  if (Number(crt) === 3) {
    const cst = String(item.cst || peca.cst || '41');
    if (cst === '00') {
      icmsGrupo = { ICMS00: { orig, CST: '00', modBC: '3', vBC: '0.00', pICMS: '0.00', vICMS: '0.00' } };
    } else if (cst === '60') {
      icmsGrupo = { ICMS60: { orig, CST: '60' } };
    } else {
      // CST 40, 41, 50 → mesmo elemento ICMS40 no XSD v4.00
      const cstValido = ['40', '41', '50'].includes(cst) ? cst : '41';
      icmsGrupo = { ICMS40: { orig, CST: cstValido } };
    }
  } else {
    const csosn = String(item.csosn || peca.csosn || '400');
    if (csosn === '101') {
      icmsGrupo = { ICMSSN101: { orig, CSOSN: '101', pCredSN: '0.00', vCredICMSSN: '0.00' } };
    } else if (csosn === '201') {
      icmsGrupo = { ICMSSN201: { orig, CSOSN: '201', modBCST: '3', vBCST: '0.00', pICMSST: '0.00', vICMSST: '0.00', vBCFCPST: '0.00', pFCPST: '0.00', vFCPST: '0.00', pCredSN: '0.00', vCredICMSSN: '0.00' } };
    } else if (csosn === '202') {
      icmsGrupo = { ICMSSN202: { orig, CSOSN: '202', modBCST: '3', vBCST: '0.00', pICMSST: '0.00', vICMSST: '0.00', vBCFCPST: '0.00', pFCPST: '0.00', vFCPST: '0.00' } };
    } else if (csosn === '500') {
      icmsGrupo = { ICMSSN500: { orig, CSOSN: '500' } };
    } else if (csosn === '900') {
      icmsGrupo = { ICMSSN900: { orig, CSOSN: '900' } };
    } else {
      // CSOSN 102, 300, 400 → ICMSSN102 (único elemento para os três no XSD v4.00)
      icmsGrupo = { ICMSSN102: { orig, CSOSN: ['102', '300', '400'].includes(csosn) ? csosn : '400' } };
    }
  }

  return {
    ICMS: icmsGrupo,
    PIS: {
      PISOutr: { CST: '99', vBC: '0.00', pPIS: '0.0000', vPIS: '0.00' },
    },
    COFINS: {
      COFINSOutr: { CST: '99', vBC: '0.00', pCOFINS: '0.0000', vCOFINS: '0.00' },
    },
  };
}

/**
 * Monta e retorna o XML da NF-e (sem assinatura)
 */
function buildXmlNFe({ empresa, nf, venda, cliente, itens, pagamentos, infAdic }) {
  const { chave, cNF, cDV } = gerarChave(empresa, nf);
  const cUF    = getUFCode(empresa.uf);
  const isNFCe = nf.modelo === 'NFCE';
  const mod    = isNFCe ? '65' : '55';
  const tpAmb  = empresa.ambienteNF === 1 ? '1' : '2';
  const dhEmi  = fmtDate(nf.dataEmissao || new Date());

  // Totais
  let vProd = 0, vICMS = 0, vPIS = 0, vCOFINS = 0;
  itens.forEach(i => {
    vProd += Number(i.valorTotal || i.total || 0);
    vICMS += Number(i.valorIcms || 0);
    vPIS += Number(i.valorPis || 0);
    vCOFINS += Number(i.valorCofins || 0);
  });
  const vDesc  = Number(venda.desconto || 0);
  const vNF    = vProd - vDesc;

  // Pagamentos
  const detsPag = (pagamentos || []).map(p => ({
    indPag: '0', // 0=A vista, 1=A prazo
    tPag: FORMA_PAG[p.forma] || '01',
    vPag: Number(p.valor).toFixed(2),
  }));
  if (!detsPag.length) detsPag.push({ indPag: '0', tPag: '01', vPag: vNF.toFixed(2) });

  const obj = {
    NFe: {
      '@xmlns': 'http://www.portalfiscal.inf.br/nfe',
      infNFe: {
        '@versao': '4.00',
        '@Id': `NFe${chave}`,
        ide: {
          cUF:     String(cUF),
          cNF,
          natOp:   'VENDA DE MERCADORIA',
          mod,
          serie:   String(nf.serie || 1),
          nNF:     String(nf.numero),
          dhEmi,
          tpNF:    '1',
          idDest:  '1',
          cMunFG:  String(empresa.codigoMunicipio || '3550308'),
          tpImp:   isNFCe ? '4' : '1',
          tpEmis:  '1',
          cDV,
          tpAmb,
          finNFe:  '1',
          indFinal: isNFCe ? '1' : (cliente?.tipoPessoa === 'FISICA' ? '1' : '0'),
          indPres: '1',
          procEmi: '0',
          verProc: '1.0.0',
        },
        emit: {
          CNPJ:   empresa.cnpj.replace(/\D/g, ''),
          xNome:  empresa.razaoSocial.substring(0, 60),
          ...(empresa.nomeFantasia ? { xFant: empresa.nomeFantasia.substring(0, 60) } : {}),
          enderEmit: {
            xLgr:    (empresa.logradouro  || 'NAO INFORMADO').substring(0, 60),
            nro:     (empresa.numero      || 'S/N').substring(0, 60),
            ...(empresa.complemento ? { xCpl: empresa.complemento.substring(0, 60) } : {}),
            xBairro: (empresa.bairro      || 'NAO INFORMADO').substring(0, 60),
            cMun:    String(empresa.codigoMunicipio || '3550308'),
            xMun:    (empresa.municipio   || 'SAO PAULO').substring(0, 60),
            UF:      empresa.uf || 'SP',
            CEP:     (empresa.cep || '').replace(/\D/g, ''),
            cPais:   '1058',
            xPais:   'BRASIL',
            ...(empresa.telefone ? { fone: empresa.telefone.replace(/\D/g, '') } : {}),
          },
          IE: (empresa.inscricaoEstadual && empresa.inscricaoEstadual.replace(/\D/g, '')) || 'ISENTO',
          ...(empresa.inscricaoMunicipal ? { IM: empresa.inscricaoMunicipal } : {}),
          ...(empresa.cnae ? { CNAE: empresa.cnae.replace(/\D/g, '') } : {}),
          CRT: String(empresa.regimeTributario || 1),
        },
        ...buildDest(cliente, isNFCe, empresa),
        det: buildItens(itens, empresa.regimeTributario || 1),
        total: {
          ICMSTot: {
            vBC:        '0.00',
            vICMS:      vICMS.toFixed(2),
            vICMSDeson: '0.00',
            vFCPUFDest: '0.00',
            vICMSUFDest:'0.00',
            vICMSUFRemet:'0.00',
            vFCP:       '0.00',
            vBCST:      '0.00',
            vST:        '0.00',
            vFCPST:     '0.00',
            vFCPSTRet:  '0.00',
            vProd:      vProd.toFixed(2),
            vFrete:     '0.00',
            vSeg:       '0.00',
            vDesc:      vDesc.toFixed(2),
            vII:        '0.00',
            vIPI:       '0.00',
            vIPIDevol:  '0.00',
            vPIS:       vPIS.toFixed(2),
            vCOFINS:    vCOFINS.toFixed(2),
            vOutro:     '0.00',
            vNF:        vNF.toFixed(2),
          },
        },
        transp: { modFrete: '9' },
        pag: { detPag: detsPag, vTroco: '0.00' },
        infRespTec: {
          CNPJ: '00000000000000', // Preencher com CNPJ da Sofware House
          xContato: 'Suporte Tork',
          email: 'suporte@sistematork.com.br',
          fone: '11999999999'
        },
        ...(() => {
          const partes = [venda.observacoes, infAdic].filter(Boolean);
          return partes.length ? { infAdic: { infCpl: partes.join(' | ').substring(0, 500) } } : {};
        })(),
      },
    },
  };

  const doc = create({ version: '1.0', encoding: 'UTF-8' }, obj);
  return { xml: doc.end({ prettyPrint: false }), chave };
}

module.exports = { buildXmlNFe, buildInfoNFeSupl };
