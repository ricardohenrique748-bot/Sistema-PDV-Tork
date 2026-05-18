const https = require('https');
const axios = require('axios');
(async () => {
  try {
    const agent = new https.Agent({
      rejectUnauthorized: false,
      secureProtocol: 'TLSv1_2_method',
      ciphers: 'DEFAULT:@SECLEVEL=1'
    });
    const res = await axios.post('https://nfce-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx', '<xml/>', { httpsAgent: agent, timeout: 10000 });
    console.log(res.status);
  } catch (err) {
    console.log(err.message);
  }
})();
