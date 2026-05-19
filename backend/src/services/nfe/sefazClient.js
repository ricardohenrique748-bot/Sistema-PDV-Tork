/**
 * Comunicação SOAP com a SEFAZ
 */
const axios = require('axios');
const https = require('https');
const { parseStringPromise } = require('xml2js');
const { getUrls, getUFCode } = require('./sefazUrls');
const { extrairDoPfx } = require('./xmlSigner');
const { decrypt } = require('../certificate/certService');

/**
 * Cria um agente HTTPS usando PEM extraído via node-forge.
 * Envia a cadeia completa (leaf + intermediários ICP-Brasil) para mTLS.
 */
function createHttpsAgent(pfxBuffer, senha) {
  const { privateKeyPem, certChainPem } = extrairDoPfx(pfxBuffer, senha);
  return new https.Agent({
    key: privateKeyPem,
    cert: certChainPem,
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.2',
    ciphers: [
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-SHA384',
      'ECDHE-RSA-AES128-SHA256',
      'AES256-GCM-SHA384',
      'AES128-GCM-SHA256',
      'AES256-SHA256',
      'AES128-SHA256',
      'AES256-SHA',
      'AES128-SHA',
    ].join(':'),
  });
}

/**
 * Envia uma requisição SOAP para a SEFAZ
 */
async function enviarSoap(url, soapAction, xmlCorpo, pfxBuffer, senha, ufCode) {
  const agent = createHttpsAgent(pfxBuffer, senha);

  // Envelope SOAP padrão para NFe Autorizacao 4.00
  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Header>
    <nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/${soapAction}">
      <cUF>${ufCode}</cUF>
      <versaoDados>4.00</versaoDados>
    </nfeCabecMsg>
  </soap12:Header>
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/${soapAction}">
      ${xmlCorpo}
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;

  try {
    const response = await axios.post(url, soapEnvelope, {
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
      },
      httpsAgent: agent,
      timeout: 30000, // 30s
    });

    return await parseStringPromise(response.data, { explicitArray: false, ignoreAttrs: false });
  } catch (err) {
    if (err.response) {
      console.error('Erro na resposta da SEFAZ:', err.response.data);
      throw new Error(`Erro na comunicação com a SEFAZ: HTTP ${err.response.status}`);
    }
    console.error('[SEFAZ] Erro de rede:', err.message, '| code:', err.code, '| errno:', err.errno, '| url:', url);
    throw new Error(`Erro de rede ao comunicar com a SEFAZ: ${err.message} (code: ${err.code})`);
  }
}

/**
 * Envia um lote de NF-e para autorização
 * @param {string} xmlAssinado XML da NF-e assinado
 * @param {string} pfxBase64Cripto PFX em base64 criptografado (AES-256)
 * @param {string} senhaCripto Senha criptografada
 * @param {string} uf Sigla da UF (ex: SP)
 * @param {number} ambiente 1=Producao, 2=Homologacao
 * @param {string} modelo 'NFE' ou 'NFCE'
 */
async function autorizarNFe(xmlAssinado, pfxBase64Cripto, senhaCripto, uf, ambiente, modelo = 'NFE') {
  const pfxBase64 = decrypt(pfxBase64Cripto);
  const senha = decrypt(senhaCripto);
  const pfxBuffer = Buffer.from(pfxBase64, 'base64');
  
  const ufCode = getUFCode(uf);
  const urls = getUrls(uf, ambiente, modelo);

  // Monta o lote enviando apenas 1 NF (síncrono)
  // idLote pode ser qualquer numero único, vamos usar um timestamp simples
  const idLote = Date.now().toString().slice(-15);
  
  const loteXml = `<enviNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <idLote>${idLote}</idLote>
  <indSinc>1</indSinc>
  ${xmlAssinado}
</enviNFe>`;

  const soapResponse = await enviarSoap(
    urls.autorizacao,
    'NFeAutorizacao4',
    loteXml,
    pfxBuffer,
    senha,
    ufCode
  );

  // Parseia a resposta
  const body = soapResponse['soap12:Envelope']['soap12:Body'];
  const retEnviNFe = body.nfeResultMsg?.retEnviNFe || body.nfeResultMsg?.['nfeResultMsg']?.retEnviNFe || body?.retEnviNFe;
  
  if (!retEnviNFe) {
    throw new Error('Resposta inválida da SEFAZ (retEnviNFe não encontrado)');
  }

  return retEnviNFe;
}

/**
 * Envia o evento de cancelamento de uma NF-e para a SEFAZ
 */
async function enviarCancelamento(chave, protocolo, justificativa, pfxBase64Cripto, senhaCripto, uf, ambiente) {
  const { assinarXmlEventoFromDB } = require('./xmlSigner');
  const pfxBase64 = decrypt(pfxBase64Cripto);
  const senha     = decrypt(senhaCripto);
  const pfxBuffer = Buffer.from(pfxBase64, 'base64');

  const ufCode  = getUFCode(uf);
  const urls    = getUrls(uf, ambiente, 'NFE'); // cancelamento sempre usa endpoint NFE
  const tpAmb   = ambiente === 1 ? '1' : '2';
  const cnpj    = chave.substring(6, 20);
  const nSeq    = '01';
  const id      = `ID110111${chave}${nSeq}`;

  const d   = new Date();
  const pad = n => String(n).padStart(2, '0');
  const dhEvento = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}-03:00`;

  const xmlEvento = `<envEvento versao="1.00" xmlns="http://www.portalfiscal.inf.br/nfe"><idLote>1</idLote><evento versao="1.00"><infEvento Id="${id}"><cOrgao>${ufCode}</cOrgao><tpAmb>${tpAmb}</tpAmb><CNPJ>${cnpj}</CNPJ><chNFe>${chave}</chNFe><dhEvento>${dhEvento}</dhEvento><tpEvento>110111</tpEvento><nSeqEvento>${nSeq}</nSeqEvento><verEvento>1.00</verEvento><detEvento versao="1.00"><descEvento>Cancelamento</descEvento><nProt>${protocolo}</nProt><xJust>${justificativa}</xJust></detEvento></infEvento></evento></envEvento>`;

  const xmlAssinado = assinarXmlEventoFromDB(xmlEvento, pfxBase64Cripto, senhaCripto);

  const soapResponse = await enviarSoap(
    urls.recepcaoEvento,
    'NFeRecepcaoEvento4',
    xmlAssinado,
    pfxBuffer,
    senha,
    ufCode
  );

  const body       = soapResponse['soap12:Envelope']['soap12:Body'];
  const retEnvEvento = body.nfeResultMsg?.retEnvEvento || body?.retEnvEvento;
  if (!retEnvEvento) throw new Error('Resposta inválida da SEFAZ (retEnvEvento não encontrado)');

  const infEvento = retEnvEvento.retEvento?.infEvento || retEnvEvento.retEvento?.[0]?.infEvento;
  return { cStat: infEvento?.cStat, xMotivo: infEvento?.xMotivo, nProt: infEvento?.nProt };
}

module.exports = { autorizarNFe, enviarCancelamento };
