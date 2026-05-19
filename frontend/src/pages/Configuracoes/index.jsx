import { useState, useEffect, useRef } from 'react';
import { Settings, Building2, Shield, Upload, CheckCircle, AlertTriangle, Save, Database, Users, Plus, Pencil, Eye, EyeOff, Search, Loader2 } from 'lucide-react';
import { Button, Card, PageHeader, Spinner, Input, Modal } from '../../components/ui/index.jsx';
import { formatDate } from '../../utils/formatters';
import api from '../../services/api';
import toast from 'react-hot-toast';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const defaultEmpresa = {
  razaoSocial: '', nomeFantasia: '', cnpj: '', inscricaoEstadual: '',
  inscricaoMunicipal: '', cnae: '', regimeTributario: 1,
  logradouro: '', numero: '', complemento: '', bairro: '',
  municipio: '', uf: '', cep: '', codigoMunicipio: '',
  telefone: '', email: '', ambienteNF: 2, csc: '', cscId: '',
};

export default function Configuracoes() {
  const [tab, setTab] = useState('empresa');
  const [empresa, setEmpresa] = useState(defaultEmpresa);
  const [certificados, setCertificados] = useState([]);
  const [loadingEmpresa, setLoadingEmpresa] = useState(true);
  const [savingEmpresa, setSavingEmpresa] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [senhaCert, setSenhaCert] = useState('');
  const fileRef = useRef(null);
  const defaultUserForm = { nome: '', email: '', senha: '', role: 'VENDEDOR', ativo: true };
  const [usuarios, setUsuarios] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState(defaultUserForm);
  const [savingUser, setSavingUser] = useState(false);
  const [showUserPass, setShowUserPass] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingEmpresa(true);
      try {
        const [empRes, certRes] = await Promise.all([
          api.get('/empresa'),
          api.get('/empresa/certificados'),
        ]);
        if (empRes.data && empRes.data.id) {
          setEmpresa({ ...defaultEmpresa, ...empRes.data });
        }
        setCertificados(certRes.data || []);
      } catch {
        toast.error('Erro ao carregar configurações.');
      } finally {
        setLoadingEmpresa(false);
      }
    };
    fetchData();
  }, []);

  const setE = (key, val) => setEmpresa(e => ({ ...e, [key]: val }));

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data } = await api.get('/auth/users');
      setUsuarios(data);
    } catch {
      toast.error('Erro ao carregar usuários.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const openNewUser = () => {
    setEditingUser(null);
    setUserForm(defaultUserForm);
    setShowUserPass(false);
    setShowUserModal(true);
  };

  const openEditUser = (u) => {
    setEditingUser(u);
    setUserForm({ nome: u.nome, email: u.email, senha: '', role: u.role, ativo: u.ativo });
    setShowUserPass(false);
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.nome || !userForm.email) { toast.error('Nome e e-mail são obrigatórios.'); return; }
    if (!editingUser && !userForm.senha) { toast.error('Senha obrigatória para novo usuário.'); return; }
    setSavingUser(true);
    try {
      if (editingUser) {
        const payload = { nome: userForm.nome, email: userForm.email, role: userForm.role, ativo: userForm.ativo };
        if (userForm.senha) payload.senha = userForm.senha;
        const { data } = await api.put(`/auth/users/${editingUser.id}`, payload);
        setUsuarios(prev => prev.map(u => u.id === data.id ? data : u));
        toast.success('Usuário atualizado!');
      } else {
        const { data } = await api.post('/auth/users', userForm);
        setUsuarios(prev => [...prev, data]);
        toast.success('Usuário criado!');
      }
      setShowUserModal(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar usuário.');
    } finally {
      setSavingUser(false);
    }
  };

  useEffect(() => {
    if (tab === 'banco') fetchUsers();
  }, [tab]);

  const handleSaveEmpresa = async () => {
    if (!empresa.razaoSocial || !empresa.cnpj) {
      toast.error('Razão social e CNPJ são obrigatórios.');
      return;
    }
    setSavingEmpresa(true);
    try {
      await api.put('/empresa', empresa);
      toast.success('Dados da empresa salvos!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar empresa.');
    } finally {
      setSavingEmpresa(false);
    }
  };

  // Máscara CNPJ: 00.000.000/0000-00
  const maskCNPJ = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 14);
    return d
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  const buscarCNPJ = async (cnpjRaw) => {
    const cnpj = cnpjRaw.replace(/\D/g, '');
    if (cnpj.length !== 14) { toast.error('CNPJ inválido. Digite os 14 dígitos.'); return; }
    setLoadingCNPJ(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!res.ok) throw new Error('CNPJ não encontrado na Receita Federal.');
      const d = await res.json();

      // Formata CEP: 01001000 → 01001-000
      const cepFormatado = (d.cep || '').replace(/(\d{5})(\d{3})/, '$1-$2');

      // Formata CNAE: 4530703 → 4530-7/03
      const cnaeFormatado = d.cnae_fiscal
        ? String(d.cnae_fiscal).replace(/(\d{4})(\d)(\d{2})/, '$1-$2/$3')
        : '';

      setEmpresa(prev => ({
        ...prev,
        razaoSocial:        d.razao_social || prev.razaoSocial,
        nomeFantasia:       d.nome_fantasia || prev.nomeFantasia,
        cnpj:               maskCNPJ(cnpj),
        logradouro:         d.logradouro || prev.logradouro,
        numero:             d.numero || prev.numero,
        complemento:        d.complemento || prev.complemento,
        bairro:             d.bairro || prev.bairro,
        municipio:          d.municipio || prev.municipio,
        uf:                 d.uf || prev.uf,
        cep:                cepFormatado || prev.cep,
        telefone:           d.ddd_telefone_1 || prev.telefone,
        email:              d.email || prev.email,
        cnae:               cnaeFormatado || prev.cnae,
        codigoMunicipio:    d.codigo_municipio_ibge ? String(d.codigo_municipio_ibge) : prev.codigoMunicipio,
      }));
      toast.success(`Empresa encontrada: ${d.razao_social}`);
    } catch (err) {
      toast.error(err.message || 'Erro ao buscar CNPJ.');
    } finally {
      setLoadingCNPJ(false);
    }
  };

  const handleCNPJChange = (e) => {
    const masked = maskCNPJ(e.target.value);
    setE('cnpj', masked);
    // Busca automática ao completar 14 dígitos
    if (masked.replace(/\D/g, '').length === 14) {
      buscarCNPJ(masked);
    }
  };

  const handleUploadCert = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!senhaCert) { toast.error('Informe a senha do certificado antes de selecionar o arquivo.'); return; }

    setUploadingCert(true);
    const formData = new FormData();
    formData.append('pfx', file);
    formData.append('senha', senhaCert);
    try {
      const { data } = await api.post('/empresa/certificados/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(data.message || 'Certificado importado!');
      setCertificados(prev => [data.certificado, ...prev.map(c => ({ ...c, ativo: false }))]);
      setSenhaCert('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao importar certificado.');
    } finally {
      setUploadingCert(false);
    }
  };

  const tabs = [
    { id: 'empresa', label: 'Dados da Empresa', icon: Building2 },
    { id: 'nfe',    label: 'NF-e / Certificado', icon: Shield },
    { id: 'banco',  label: 'Base de Dados',       icon: Database },
  ];

  if (loadingEmpresa) {
    return <div className="py-16 flex justify-center"><Spinner size={32} /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" subtitle="Dados da empresa e configurações fiscais" />

      <Card className="p-2">
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Dados empresa */}
      {tab === 'empresa' && (
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Razão Social *" value={empresa.razaoSocial} onChange={e => setE('razaoSocial', e.target.value)} className="sm:col-span-2" />
            <Input label="Nome Fantasia" value={empresa.nomeFantasia || ''} onChange={e => setE('nomeFantasia', e.target.value)} />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-300">CNPJ *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={empresa.cnpj}
                  onChange={handleCNPJChange}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-600"
                />
                <button
                  type="button"
                  onClick={() => buscarCNPJ(empresa.cnpj)}
                  disabled={loadingCNPJ}
                  title="Buscar dados do CNPJ"
                  className="px-3 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 text-white text-sm font-medium"
                >
                  {loadingCNPJ
                    ? <Loader2 size={15} className="animate-spin" />
                    : <Search size={15} />}
                  {loadingCNPJ ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
              <p className="text-xs text-gray-500">Digite o CNPJ e os dados serão preenchidos automaticamente.</p>
            </div>
            <Input label="Inscrição Estadual" value={empresa.inscricaoEstadual || ''} onChange={e => setE('inscricaoEstadual', e.target.value)} />
            <Input label="Inscrição Municipal" value={empresa.inscricaoMunicipal || ''} onChange={e => setE('inscricaoMunicipal', e.target.value)} />
            <Input label="CNAE" value={empresa.cnae || ''} onChange={e => setE('cnae', e.target.value)} placeholder="Ex: 4530-7/03" />

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-300">Regime Tributário</label>
              <select
                value={empresa.regimeTributario}
                onChange={e => setE('regimeTributario', Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm"
              >
                <option value={1}>Simples Nacional</option>
                <option value={2}>Simples Nacional - excesso</option>
                <option value={3}>Regime Normal (Lucro Presumido/Real)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-300">Ambiente NF-e</label>
              <select
                value={empresa.ambienteNF}
                onChange={e => setE('ambienteNF', Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm"
              >
                <option value={2}>Homologação (Testes)</option>
                <option value={1}>Produção</option>
              </select>
            </div>

            <div className="sm:col-span-2 border-t border-gray-700 pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Endereço</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Input label="CEP" value={empresa.cep} onChange={e => setE('cep', e.target.value)} />
                <Input label="Logradouro" value={empresa.logradouro} onChange={e => setE('logradouro', e.target.value)} className="sm:col-span-2" />
                <Input label="Número" value={empresa.numero} onChange={e => setE('numero', e.target.value)} />
                <Input label="Complemento" value={empresa.complemento || ''} onChange={e => setE('complemento', e.target.value)} />
                <Input label="Bairro" value={empresa.bairro} onChange={e => setE('bairro', e.target.value)} />
                <Input label="Município" value={empresa.municipio} onChange={e => setE('municipio', e.target.value)} />
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-300">UF</label>
                  <select
                    value={empresa.uf}
                    onChange={e => setE('uf', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm"
                  >
                    <option value="">UF</option>
                    {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
                <Input label="Cód. Município (IBGE)" value={empresa.codigoMunicipio || ''} onChange={e => setE('codigoMunicipio', e.target.value)} placeholder="7 dígitos" />
              </div>
            </div>

            <div className="sm:col-span-2 border-t border-gray-700 pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Contato</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Telefone" value={empresa.telefone || ''} onChange={e => setE('telefone', e.target.value)} />
                <Input label="E-mail" type="email" value={empresa.email || ''} onChange={e => setE('email', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button variant="primary" loading={savingEmpresa} onClick={handleSaveEmpresa}>
              <Save size={14} /> Salvar Dados
            </Button>
          </div>
        </Card>
      )}

      {/* Base de Dados */}
      {tab === 'banco' && (
        <div className="space-y-6">
          {/* Usuários */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Users size={16} className="text-primary-400" /> Usuários do Sistema
              </h3>
              <Button variant="primary" size="sm" onClick={openNewUser}>
                <Plus size={14} /> Novo Usuário
              </Button>
            </div>

            {loadingUsers ? (
              <div className="py-8 flex justify-center"><Spinner /></div>
            ) : usuarios.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhum usuário cadastrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="tork-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Perfil</th>
                      <th>Status</th>
                      <th>Cadastro</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-black text-xs font-bold shrink-0">
                              {u.nome?.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-200">{u.nome}</span>
                          </div>
                        </td>
                        <td className="text-gray-400">{u.email}</td>
                        <td>
                          <span className={`badge ${u.role === 'ADMIN' ? 'badge-warning' : 'badge-info'}`}>
                            {u.role === 'ADMIN' ? 'Admin' : 'Vendedor'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${u.ativo ? 'badge-success' : 'badge-danger'}`}>
                            {u.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="text-gray-500 text-xs">{formatDate(u.createdAt)}</td>
                        <td>
                          <Button size="sm" variant="ghost" onClick={() => openEditUser(u)} title="Editar">
                            <Pencil size={13} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Modal Usuário */}
      <Modal
        open={showUserModal}
        onClose={() => setShowUserModal(false)}
        title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
      >
        <div className="space-y-4">
          <Input
            label="Nome *"
            value={userForm.nome}
            onChange={e => setUserForm(f => ({ ...f, nome: e.target.value }))}
            placeholder="Nome completo"
          />
          <Input
            label="E-mail *"
            type="email"
            value={userForm.email}
            onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))}
            placeholder="email@exemplo.com"
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-300">
              Senha {editingUser ? '(deixe em branco para não alterar)' : '*'}
            </label>
            <div className="relative">
              <input
                type={showUserPass ? 'text' : 'password'}
                value={userForm.senha}
                onChange={e => setUserForm(f => ({ ...f, senha: e.target.value }))}
                placeholder={editingUser ? 'Nova senha (opcional)' : 'Mínimo 6 caracteres'}
                className="w-full px-3 py-2 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={() => setShowUserPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showUserPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-300">Perfil</label>
            <select
              value={userForm.role}
              onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm"
            >
              <option value="VENDEDOR">Vendedor</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          {editingUser && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={userForm.ativo}
                onChange={e => setUserForm(f => ({ ...f, ativo: e.target.checked }))}
                className="w-4 h-4 accent-amber-500"
              />
              <span className="text-sm text-gray-300">Usuário ativo</span>
            </label>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowUserModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" className="flex-1" loading={savingUser} onClick={handleSaveUser}>
              <Save size={14} /> {editingUser ? 'Salvar' : 'Criar Usuário'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* NF-e / Certificado */}
      {tab === 'nfe' && (
        <div className="space-y-6">
          {/* Certificados */}
          <Card>
            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Shield size={16} className="text-primary-400" />
              Certificado Digital A1 (.pfx)
            </h3>

            {certificados.length > 0 && (
              <div className="mb-6 space-y-2">
                {certificados.map(cert => (
                  <div key={cert.id} className={`flex items-center justify-between p-3 rounded-lg border ${cert.ativo ? 'bg-green-500/5 border-green-500/30' : 'bg-gray-800 border-gray-700'}`}>
                    <div className="flex items-center gap-3">
                      {cert.ativo ? (
                        <CheckCircle size={16} className="text-green-400" />
                      ) : (
                        <Shield size={16} className="text-gray-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-200">{cert.nome}</p>
                        <p className={`text-xs ${new Date(cert.validade) < new Date() ? 'text-red-400' : 'text-gray-500'}`}>
                          Validade: {formatDate(cert.validade)}
                          {new Date(cert.validade) < new Date() && ' (VENCIDO)'}
                        </p>
                      </div>
                    </div>
                    {cert.ativo && (
                      <span className="badge badge-success">Ativo</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4 border-t border-gray-700 pt-4">
              <h4 className="text-sm font-medium text-gray-300">Importar novo certificado</h4>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Senha do certificado"
                  type="password"
                  value={senhaCert}
                  onChange={e => setSenhaCert(e.target.value)}
                  placeholder="Informe a senha antes de selecionar o arquivo"
                />
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-300">Arquivo .pfx</label>
                  <div className="relative">
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pfx,.p12"
                      onChange={handleUploadCert}
                      className="hidden"
                      id="cert-upload"
                    />
                    <Button
                      variant="secondary"
                      loading={uploadingCert}
                      onClick={() => fileRef.current?.click()}
                      className="w-full"
                    >
                      <Upload size={14} /> Selecionar arquivo .pfx
                    </Button>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300">
                O certificado é armazenado criptografado com AES-256. A senha nunca é guardada em texto plano.
              </div>
            </div>
          </Card>

          {/* CSC NFC-e */}
          <Card>
            <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
              <Shield size={16} className="text-primary-400" /> CSC — Código de Segurança do Contribuinte (NFC-e)
            </h3>
            <p className="text-xs text-gray-500 mb-4">Obrigatório para emissão de NFC-e (modelo 65). Obtido no portal da SEFAZ do seu estado.</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="CSC ID"
                value={empresa.cscId || ''}
                onChange={e => setE('cscId', e.target.value)}
                placeholder="Ex: 000001"
              />
              <Input
                label="CSC Token"
                value={empresa.csc || ''}
                onChange={e => setE('csc', e.target.value)}
                placeholder="Token fornecido pela SEFAZ"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="primary" loading={savingEmpresa} onClick={handleSaveEmpresa}>
                <Save size={14} /> Salvar CSC
              </Button>
            </div>
          </Card>

          {/* Info ambiente */}
          <Card>
            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Settings size={16} className="text-primary-400" /> Ambiente de Emissão
            </h3>
            <div className="flex gap-3">
              <button
                onClick={() => setE('ambienteNF', 2)}
                className={`flex-1 p-4 rounded-xl border text-sm font-medium transition-all ${empresa.ambienteNF === 2 ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-300' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'}`}
              >
                <AlertTriangle size={18} className="mx-auto mb-1" />
                Homologação
                <p className="text-xs font-normal mt-1 opacity-70">NFs de teste (sem validade fiscal)</p>
              </button>
              <button
                onClick={() => setE('ambienteNF', 1)}
                className={`flex-1 p-4 rounded-xl border text-sm font-medium transition-all ${empresa.ambienteNF === 1 ? 'bg-green-500/10 border-green-500/40 text-green-300' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'}`}
              >
                <CheckCircle size={18} className="mx-auto mb-1" />
                Produção
                <p className="text-xs font-normal mt-1 opacity-70">NFs com validade fiscal real</p>
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="primary" loading={savingEmpresa} onClick={handleSaveEmpresa}>
                <Save size={14} /> Salvar Ambiente
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
