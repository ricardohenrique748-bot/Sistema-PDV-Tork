const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const https = require('https');
const axios = require('axios');
const { decrypt } = require('./src/services/certificate/certService');
const { extrairDoPfx } = require('./src/services/nfe/xmlSigner');

async function testConnection() {
  const cert = await prisma.certificado.findFirst();
  if (!cert) return console.log('Sem certificado');
  
  const pfxBase64 = decrypt(cert.pfxBase64);
  const senha = decrypt(cert.senhaCripto);
  const pfxBuffer = Buffer.from(pfxBase64, 'base64');
  
  const { privateKeyPem, certPem } = extrairDoPfx(pfxBuffer, senha);
  
  const agent = new https.Agent({
    cert: certPem,
    key: privateKeyPem,
    rejectUnauthorized: false,
    secureProtocol: 'TLSv1_2_method'
  });
  
  try {
    const url = 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx';
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Header><nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4"><cUF>21</cUF><versaoDados>4.00</versaoDados></nfeCabecMsg></soap12:Header><soap12:Body><nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4"><consStatServ versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe"><tpAmb>2</tpAmb><cUF>21</cUF><xServ>STATUS</xServ></consStatServ></nfeDadosMsg></soap12:Body></soap12:Envelope>`;
    
    console.log('Sending request...');
    const res = await axios.post(url, soapEnvelope, {
      headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
      httpsAgent: agent,
      timeout: 10000
    });
    console.log('Status HTTP:', res.status);
    console.log('Response:', res.data);
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) console.error(err.response.data);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
