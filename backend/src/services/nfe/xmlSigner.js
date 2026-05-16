/**
 * Assinatura XMLDsig para NF-e
 * Padrão: RSA-SHA1 + C14N + enveloped-signature
 */
const { SignedXml } = require('xml-crypto');
const forge = require('node-forge');
const { decrypt } = require('../certificate/certService');

/**
 * Extrai chave privada PEM e certificado PEM de um buffer .pfx
 */
function extrairDoPfx(pfxBuffer, senha) {
  const pfxDer  = forge.util.decode64(pfxBuffer.toString('base64'));
  const pfxAsn1 = forge.asn1.fromDer(pfxDer);
  const pfx     = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, senha);

  // Chave privada
  const keyBags  = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key;
  if (!privateKey) throw new Error('Chave privada não encontrada no certificado .pfx');

  // Certificado público
  const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag });
  const cert     = certBags[forge.pki.oids.certBag]?.[0]?.cert;
  if (!cert) throw new Error('Certificado público não encontrado no .pfx');

  const privateKeyPem = forge.pki.privateKeyToPem(privateKey);
  const certPem       = forge.pki.certificateToPem(cert);

  // Certificado em base64 puro (sem headers PEM) para o X509Certificate
  const certB64 = certPem
    .replace('-----BEGIN CERTIFICATE-----', '')
    .replace('-----END CERTIFICATE-----', '')
    .replace(/\n/g, '');

  return { privateKeyPem, certPem, certB64 };
}

/**
 * Assina o XML da NF-e com XMLDsig (padrão SEFAZ)
 * @param {string} xmlString - XML sem assinatura
 * @param {Buffer} pfxBuffer  - conteúdo do arquivo .pfx
 * @param {string} senha      - senha do certificado
 * @returns {string} XML assinado
 */
function assinarXmlNFe(xmlString, pfxBuffer, senha) {
  const { privateKeyPem, certB64 } = extrairDoPfx(pfxBuffer, senha);

  // Extrai a chave de acesso do XML para montar o xpath de referência
  const match = xmlString.match(/Id="NFe(\d{44})"/);
  if (!match) throw new Error('Id da NF-e não encontrado no XML para assinatura');
  const chave = match[1];

  const sig = new SignedXml({
    privateKey: privateKeyPem,
    signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
    canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
  });

  sig.addReference({
    xpath: `//*[@Id='NFe${chave}']`,
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    ],
    digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
    uri: `#NFe${chave}`,
    isEmptyUri: false,
  });

  // KeyInfo com o certificado X.509
  sig.keyInfoProvider = {
    getKeyInfo: () =>
      `<X509Data><X509Certificate>${certB64}</X509Certificate></X509Data>`,
    getKey: () => Buffer.from(privateKeyPem),
  };

  sig.computeSignature(xmlString, {
    location: {
      reference: `//*[local-name(.)='infNFe']`,
      action: 'after',
    },
    prefix: '',
  });

  return sig.getSignedXml();
}

/**
 * Assina a partir de um certificado armazenado no banco (criptografado)
 * @param {string} xmlString
 * @param {string} pfxBase64Cripto - PFX em base64 criptografado (AES-256)
 * @param {string} senhaCripto     - senha criptografada
 */
function assinarXmlNFeFromDB(xmlString, pfxBase64Cripto, senhaCripto) {
  const pfxBase64 = decrypt(pfxBase64Cripto);
  const senha     = decrypt(senhaCripto);
  const pfxBuffer = Buffer.from(pfxBase64, 'base64');
  return assinarXmlNFe(xmlString, pfxBuffer, senha);
}

module.exports = { assinarXmlNFe, assinarXmlNFeFromDB, extrairDoPfx };
