export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
};

export const formatDate = (date) => {
  if (!date) return '-';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date));
};

export const formatDateTime = (date) => {
  if (!date) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(date));
};

export const formatCPF = (cpf) => {
  if (!cpf) return '';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const formatCNPJ = (cnpj) => {
  if (!cnpj) return '';
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

export const formatPhone = (phone) => {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11) return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
};

export const formatCEP = (cep) => {
  if (!cep) return '';
  return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
};

export const maskCPF = (value) => {
  return value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

export const maskCNPJ = (value) => {
  return value.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
};

export const getStatusColor = (status) => {
  const map = {
    AUTORIZADA: 'badge-success',
    CONCLUIDA: 'badge-success',
    APROVADO: 'badge-success',
    ENVIADA: 'badge-info',
    ASSINADA: 'badge-info',
    DIGITANDO: 'badge-gray',
    PENDENTE: 'badge-warning',
    CANCELADA: 'badge-danger',
    CANCELADO: 'badge-danger',
    DENEGADA: 'badge-danger',
    ERRO: 'badge-danger',
    EXPIRADO: 'badge-gray',
    RECUSADO: 'badge-danger',
  };
  return map[status] || 'badge-gray';
};

export const getStatusLabel = (status) => {
  const map = {
    AUTORIZADA: 'Autorizada',
    CONCLUIDA: 'Concluída',
    APROVADO: 'Aprovado',
    ENVIADA: 'Enviada',
    ASSINADA: 'Assinada',
    DIGITANDO: 'Em digitação',
    PENDENTE: 'Pendente',
    CANCELADA: 'Cancelada',
    DENEGADA: 'Denegada',
    ERRO: 'Erro',
    EXPIRADO: 'Expirado',
    RECUSADO: 'Recusado',
    ORCAMENTO: 'Orçamento',
    NFCE: 'NFC-e',
    NFE: 'NF-e',
    FISICA: 'PF',
    JURIDICA: 'PJ',
  };
  return map[status] || status;
};

export const FORMAS_PAGAMENTO = [
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'CARTAO_CREDITO', label: 'Cartão Crédito' },
  { value: 'CARTAO_DEBITO', label: 'Cartão Débito' },
  { value: 'PIX', label: 'PIX' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'CREDIARIO', label: 'Crediário' },
];
