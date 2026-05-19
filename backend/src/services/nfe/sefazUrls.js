/**
 * URLs dos webservices SEFAZ por UF e ambiente
 * NF-e modelo 55 (NF-e) e modelo 65 (NFC-e)
 */

// Código IBGE das UFs
const UF_CODES = {
  AC: 12, AL: 27, AP: 16, AM: 13, BA: 29, CE: 23, DF: 53, ES: 32,
  GO: 52, MA: 21, MT: 51, MS: 50, MG: 31, PA: 15, PB: 25, PR: 41,
  PE: 26, PI: 22, RJ: 33, RN: 24, RS: 43, RO: 11, RR: 14, SC: 42,
  SP: 35, SE: 28, TO: 17,
};

// URLs dos webservices - NF-e (mod 55)
const NFE_URLS = {
  // São Paulo - servidor próprio
  SP: {
    homologacao: {
      autorizacao:       'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
      retAutorizacao:    'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx',
      consultaProtocolo: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx',
      recepcaoEvento:    'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx',
      statusServico:     'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx',
    },
    producao: {
      autorizacao:       'https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
      retAutorizacao:    'https://nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx',
      consultaProtocolo: 'https://nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx',
      recepcaoEvento:    'https://nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx',
      statusServico:     'https://nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx',
    },
  },
  // Minas Gerais - servidor próprio
  MG: {
    homologacao: {
      autorizacao:       'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4',
      retAutorizacao:    'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeRetAutorizacao4',
      consultaProtocolo: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo4',
      recepcaoEvento:    'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeRecepcaoEvento4',
      statusServico:     'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4',
    },
    producao: {
      autorizacao:       'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4',
      retAutorizacao:    'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeRetAutorizacao4',
      consultaProtocolo: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo4',
      recepcaoEvento:    'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeRecepcaoEvento4',
      statusServico:     'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4',
    },
  },
  // Paraná - servidor próprio
  PR: {
    homologacao: {
      autorizacao:       'https://homologacao.nfe2.fazenda.pr.gov.br/nfe/NFeAutorizacao4',
      retAutorizacao:    'https://homologacao.nfe2.fazenda.pr.gov.br/nfe/NFeRetAutorizacao4',
      consultaProtocolo: 'https://homologacao.nfe2.fazenda.pr.gov.br/nfe/NFeConsultaProtocolo4',
      recepcaoEvento:    'https://homologacao.nfe2.fazenda.pr.gov.br/nfe/NFeRecepcaoEvento4',
      statusServico:     'https://homologacao.nfe2.fazenda.pr.gov.br/nfe/NFeStatusServico4',
    },
    producao: {
      autorizacao:       'https://nfe2.fazenda.pr.gov.br/nfe/NFeAutorizacao4',
      retAutorizacao:    'https://nfe2.fazenda.pr.gov.br/nfe/NFeRetAutorizacao4',
      consultaProtocolo: 'https://nfe2.fazenda.pr.gov.br/nfe/NFeConsultaProtocolo4',
      recepcaoEvento:    'https://nfe2.fazenda.pr.gov.br/nfe/NFeRecepcaoEvento4',
      statusServico:     'https://nfe2.fazenda.pr.gov.br/nfe/NFeStatusServico4',
    },
  },
  // Rio Grande do Sul - SVRS (também serve outros estados)
  RS: {
    homologacao: {
      autorizacao:       'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
      retAutorizacao:    'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx',
      consultaProtocolo: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsultaProtocolo/NfeConsultaProtocolo4.asmx',
      recepcaoEvento:    'https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoEvento/recepcaoEvento4.asmx',
      statusServico:     'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
    },
    producao: {
      autorizacao:       'https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
      retAutorizacao:    'https://nfe.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx',
      consultaProtocolo: 'https://nfe.svrs.rs.gov.br/ws/NfeConsultaProtocolo/NfeConsultaProtocolo4.asmx',
      recepcaoEvento:    'https://nfe.svrs.rs.gov.br/ws/recepcaoEvento/recepcaoEvento4.asmx',
      statusServico:     'https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
    },
  },
  // Bahia
  BA: {
    homologacao: {
      autorizacao:       'https://hnfe.sefaz.ba.gov.br/webservices/NFeAutorizacao4/NFeAutorizacao4.asmx',
      retAutorizacao:    'https://hnfe.sefaz.ba.gov.br/webservices/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx',
      consultaProtocolo: 'https://hnfe.sefaz.ba.gov.br/webservices/NfeConsultaProtocolo4/NfeConsultaProtocolo4.asmx',
      recepcaoEvento:    'https://hnfe.sefaz.ba.gov.br/webservices/sefazrecepcaoevento4/sefazrecepcaoevento4.asmx',
      statusServico:     'https://hnfe.sefaz.ba.gov.br/webservices/NfeStatusServico4/NfeStatusServico4.asmx',
    },
    producao: {
      autorizacao:       'https://nfe.sefaz.ba.gov.br/webservices/NFeAutorizacao4/NFeAutorizacao4.asmx',
      retAutorizacao:    'https://nfe.sefaz.ba.gov.br/webservices/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx',
      consultaProtocolo: 'https://nfe.sefaz.ba.gov.br/webservices/NfeConsultaProtocolo4/NfeConsultaProtocolo4.asmx',
      recepcaoEvento:    'https://nfe.sefaz.ba.gov.br/webservices/sefazrecepcaoevento4/sefazrecepcaoevento4.asmx',
      statusServico:     'https://nfe.sefaz.ba.gov.br/webservices/NfeStatusServico4/NfeStatusServico4.asmx',
    },
  },
  // Amazonas
  AM: {
    homologacao: {
      autorizacao:       'https://homnfe.sefaz.am.gov.br/services2/services/NfeAutorizacao4',
      retAutorizacao:    'https://homnfe.sefaz.am.gov.br/services2/services/NfeRetAutorizacao4',
      consultaProtocolo: 'https://homnfe.sefaz.am.gov.br/services2/services/NfeConsultaProtocolo4',
      recepcaoEvento:    'https://homnfe.sefaz.am.gov.br/services2/services/RecepcaoEvento4',
      statusServico:     'https://homnfe.sefaz.am.gov.br/services2/services/NfeStatusServico4',
    },
    producao: {
      autorizacao:       'https://nfe.sefaz.am.gov.br/services2/services/NfeAutorizacao4',
      retAutorizacao:    'https://nfe.sefaz.am.gov.br/services2/services/NfeRetAutorizacao4',
      consultaProtocolo: 'https://nfe.sefaz.am.gov.br/services2/services/NfeConsultaProtocolo4',
      recepcaoEvento:    'https://nfe.sefaz.am.gov.br/services2/services/RecepcaoEvento4',
      statusServico:     'https://nfe.sefaz.am.gov.br/services2/services/NfeStatusServico4',
    },
  },
  // Goiás
  GO: {
    homologacao: {
      autorizacao:       'https://homolog.sefaz.go.gov.br/nfe2/services/NFeAutorizacao4',
      retAutorizacao:    'https://homolog.sefaz.go.gov.br/nfe2/services/NFeRetAutorizacao4',
      consultaProtocolo: 'https://homolog.sefaz.go.gov.br/nfe2/services/NFeConsultaProtocolo4',
      recepcaoEvento:    'https://homolog.sefaz.go.gov.br/nfe2/services/NFeRecepcaoEvento4',
      statusServico:     'https://homolog.sefaz.go.gov.br/nfe2/services/NFeStatusServico4',
    },
    producao: {
      autorizacao:       'https://nfe.sefaz.go.gov.br/nfe2/services/NFeAutorizacao4',
      retAutorizacao:    'https://nfe.sefaz.go.gov.br/nfe2/services/NFeRetAutorizacao4',
      consultaProtocolo: 'https://nfe.sefaz.go.gov.br/nfe2/services/NFeConsultaProtocolo4',
      recepcaoEvento:    'https://nfe.sefaz.go.gov.br/nfe2/services/NFeRecepcaoEvento4',
      statusServico:     'https://nfe.sefaz.go.gov.br/nfe2/services/NFeStatusServico4',
    },
  },
};

// SVC-AN — Sefaz Virtual Ambiente Nacional (Receita Federal), aceita qualquer UF
const SVCAN_URLS = {
  homologacao: {
    autorizacao:       'https://hom.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx',
    retAutorizacao:    'https://hom.sefazvirtual.fazenda.gov.br/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx',
    consultaProtocolo: 'https://hom.sefazvirtual.fazenda.gov.br/NfeConsultaProtocolo4/NfeConsultaProtocolo4.asmx',
    recepcaoEvento:    'https://hom.sefazvirtual.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx',
    statusServico:     'https://hom.sefazvirtual.fazenda.gov.br/NfeStatusServico4/NfeStatusServico4.asmx',
  },
  producao: {
    autorizacao:       'https://www.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx',
    retAutorizacao:    'https://www.sefazvirtual.fazenda.gov.br/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx',
    consultaProtocolo: 'https://www.sefazvirtual.fazenda.gov.br/NfeConsultaProtocolo4/NfeConsultaProtocolo4.asmx',
    recepcaoEvento:    'https://www.sefazvirtual.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx',
    statusServico:     'https://www.sefazvirtual.fazenda.gov.br/NfeStatusServico4/NfeStatusServico4.asmx',
  },
};

// Estados atendidos pelo SVRS (RS)
const SVRS_STATES = ['AC','AL','AP','CE','DF','ES','MS','MT','PA','PB','PE','PI','RJ','RN','RO','RR','SC','SE','TO'];

// Estados que usam SVC-AN (Ambiente Nacional) — MA bloqueou SVC-RS (rejeição 114)
const SVCAN_STATES = ['MA'];

const NFCE_URLS = {
  SP: {
    homologacao: {
      autorizacao:  'https://homologacao.nfce.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
      urlConsulta:  'https://www.nfce.fazenda.sp.gov.br/qrcode',
    },
    producao: {
      autorizacao:  'https://nfce.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
      urlConsulta:  'https://www.nfce.fazenda.sp.gov.br/qrcode',
    }
  },
  RS: { // SVRS — atende MA e demais estados SVRS para NFC-e
    homologacao: {
      autorizacao:  'https://nfce-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
      urlConsulta:  'https://nfce.svrs.rs.gov.br/consultarNFCe',
    },
    producao: {
      autorizacao:  'https://nfce.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
      urlConsulta:  'https://nfce.svrs.rs.gov.br/consultarNFCe',
    }
  }
};

/**
 * Retorna as URLs do webservice para uma UF e ambiente específicos
 */
function getUrls(uf, ambiente, modelo = 'NFE') {
  const ambiKey = ambiente === 1 ? 'producao' : 'homologacao';
  const ufUpper = (uf || 'SP').toUpperCase();

  const baseUrls = modelo === 'NFCE' ? NFCE_URLS : NFE_URLS;

  if (baseUrls[ufUpper]) {
    return baseUrls[ufUpper][ambiKey];
  }

  // Estados que usam SVC-AN (Ambiente Nacional)
  if (SVCAN_STATES.includes(ufUpper)) {
    return SVCAN_URLS[ambiKey];
  }

  // Estados atendidos pelo SVRS (RS)
  if (SVRS_STATES.includes(ufUpper)) {
    return baseUrls.RS ? baseUrls.RS[ambiKey] : NFE_URLS.RS[ambiKey];
  }

  // Fallback: SP
  return baseUrls.SP ? baseUrls.SP[ambiKey] : NFE_URLS.SP[ambiKey];
}

/**
 * Retorna o código IBGE da UF
 */
function getUFCode(uf) {
  return UF_CODES[(uf || 'SP').toUpperCase()] || 35;
}

function getUrlConsulta(uf, ambiente, modelo) {
  if (modelo !== 'NFCE') return null;
  const urls = getUrls(uf, ambiente, modelo);
  return urls?.urlConsulta || null;
}

module.exports = { getUrls, getUFCode, getUrlConsulta, UF_CODES };
