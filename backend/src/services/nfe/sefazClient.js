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
 * Cria um agente HTTPS configurado com o certificado cliente para autenticação mútua TLS (mTLS)
 */
function createHttpsAgent(pfxBuffer, senha) {
  const { privateKeyPem, certPem } = extrairDoPfx(pfxBuffer, senha);
  return new https.Agent({
    cert: certPem,
    key: privateKeyPem,
    rejectUnauthorized: false, // Em homologação às vezes a cadeia da SEFAZ não é reconhecida
    secureProtocol: 'TLSv1_2_method',
    ciphers: 'DEFAULT:@SECLEVEL=1'
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
    throw new Error(`Erro de rede ao comunicar com a SEFAZ: ${err.message}`);
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

module.exports = { autorizarNFe };
