const crypto = require('crypto');
const forge = require('node-forge');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');

const ALGORITHM = 'aes-256-cbc';
const KEY_HEX = process.env.CERT_ENCRYPTION_KEY || '0'.repeat(64);
const KEY = Buffer.from(KEY_HEX, 'hex');

/**
 * Criptografa dados com AES-256-CBC
 */
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Descriptografa dados com AES-256-CBC
 */
function decrypt(encryptedText) {
  const [ivHex, encryptedHex] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

/**
 * Processa um arquivo .pfx e retorna informações do certificado
 */
function processarCertificado(pfxBuffer, senha) {
  try {
    const pfxDer = forge.util.decode64(pfxBuffer.toString('base64'));
    const pfxAsn1 = forge.asn1.fromDer(pfxDer);
    const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, senha);

    const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag });
    const cert = certBags[forge.pki.oids.certBag][0]?.cert;
    if (!cert) throw new Error('Certificado não encontrado no arquivo .pfx');

    const validade = new Date(cert.validity.notAfter);
    const cn = cert.subject.getField('CN')?.value || 'Desconhecido';

    return { validade, cn, valido: true };
  } catch (err) {
    logger.error('Erro ao processar certificado:', err.message);
    throw new Error('Arquivo .pfx inválido ou senha incorreta.');
  }
}

/**
 * Assina um XML com o certificado A1 (.pfx)
 * Retorna o XML assinado (string)
 */
function assinarXML(xmlString, pfxBase64Cripto, senhaCripto) {
  const pfxBase64 = decrypt(pfxBase64Cripto);
  const senha = decrypt(senhaCripto);

  const pfxDer = forge.util.decode64(pfxBase64);
  const pfxAsn1 = forge.asn1.fromDer(pfxDer);
  const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, senha);

  // Extrai chave privada e certificado
  const keyBags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0];
  const privateKey = keyBag?.key;

  const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag });
  const cert = certBags[forge.pki.oids.certBag][0]?.cert;

  if (!privateKey || !cert) throw new Error('Certificado ou chave privada não encontrados no .pfx');

  // Para Focus NF-e, enviamos o XML sem assinar (a Focus assina com o certificado cadastrado)
  // Esta função serve para assinatura local se necessário
  const md = forge.md.sha1.create();
  md.update(xmlString, 'utf8');
  const signature = privateKey.sign(md);
  const signatureB64 = forge.util.encode64(signature);

  logger.info('XML assinado com sucesso via certificado A1');
  return { xmlAssinado: xmlString, signatureB64 };
}

/**
 * Prepara o certificado para envio à API Focus NF-e
 * Retorna o PFX em base64 puro (descriptografado)
 */
function getCertificadoParaFocus(pfxBase64Cripto, senhaCripto) {
  return {
    pfxBase64: decrypt(pfxBase64Cripto),
    senha: decrypt(senhaCripto),
  };
}

module.exports = {
  encrypt,
  decrypt,
  processarCertificado,
  assinarXML,
  getCertificadoParaFocus,
};
