import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Search, Eye, Edit, Trash2, Building2, User, Phone, Mail, MapPin } from 'lucide-react';
import {
  Button, Card, PageHeader, Spinner, Badge, Modal, EmptyState, Pagination, SearchInput, Input, Select
} from '../../components/ui/index.jsx';
import { formatCurrency, formatCPF, formatCNPJ, formatPhone, formatDateTime, maskCPF, maskCNPJ } from '../../utils/formatters';
import api from '../../services/api';
import toast from 'react-hot-toast';

const defaultForm = {
  tipoPessoa: 'FISICA', nome: '', razaoSocial: '', cpf: '', cnpj: '',
  inscricaoEstadual: '', email: '', telefone: '', celular: '',
  logradouro: '', numero: '', complemento: '', bairro: '',
  municipio: '', uf: '', cep: '', limiteCredito: '', observacoes: '',
};

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [buscarCnpjLoading, setBuscarCnpjLoading] = useState(false);
  const [buscarCepLoading, setBuscarCepLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(null);

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/clientes', { params: { search, page, limit: 15 } });
      setClientes(data.data || []);
      setTotal(data.total || 0);
    } catch { toast.error('Erro ao carregar clientes.'); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  const openNew = () => { setForm(defaultForm); setEditingId(null); setShowModal(true); };
  const openEdit = (c) => {
    setForm({ ...defaultForm, ...c });
    setEditingId(c.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/clientes/${editingId}`, form);
        toast.success('Cliente atualizado!');
      } else {
        await api.post('/clientes', form);
        toast.success('Cliente cadastrado!');
      }
      setShowModal(false);
      fetchClientes();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar cliente.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Inativar este cliente?')) return;
    try {
      await api.delete(`/clientes/${id}`);
      toast.success('Cliente inativado.');
      fetchClientes();
    } catch { toast.error('Erro ao inativar cliente.'); }
  };

  const buscarCNPJ = async () => {
    if (!form.cnpj || form.cnpj.replace(/\D/g, '').length !== 14) {
      toast.error('CNPJ inválido.');
      return;
    }
    setBuscarCnpjLoading(true);
    try {
      const { data } = await api.get(`/clientes/buscar-cnpj/${form.cnpj.replace(/\D/g, '')}`);
      setForm(f => ({ ...f, ...data, tipoPessoa: 'JURIDICA' }));
      toast.success('Dados do CNPJ carregados!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'CNPJ não encontrado.');
    } finally { setBuscarCnpjLoading(false); }
  };

  const buscarCEP = async () => {
    if (!form.cep || form.cep.replace(/\D/g, '').length !== 8) {
      toast.error('CEP inválido.');
      return;
    }
    setBuscarCepLoading(true);
    try {
      const { data } = await api.get(`/clientes/buscar-cep/${form.cep.replace(/\D/g, '')}`);
      setForm(f => ({ ...f, ...data }));
      toast.success('Endereço carregado!');
    } catch { toast.error('CEP não encontrado.'); }
    finally { setBuscarCepLoading(false); }
  };

  const setF = (key, value) => setForm(f => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        subtitle={`${total} clientes cadastrados`}
        action={<Button onClick={openNew}><Plus size={16} /> Novo Cliente</Button>}
      />

      <Card className="p-4">
        <SearchInput value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por nome, CPF, CNPJ ou e-mail..." />
      </Card>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center"><Spinner /></div>
        ) : clientes.length === 0 ? (
          <EmptyState icon={Users} title="Nenhum cliente encontrado" description="Cadastre seu primeiro cliente." action={<Button onClick={openNew}><Plus size={14} /> Novo Cliente</Button>} />
        ) : (
          <>
            <table className="tork-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Contato</th>
                  <th>Cidade/UF</th>
                  <th>Cadastrado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${c.tipoPessoa === 'JURIDICA' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                          {c.tipoPessoa === 'JURIDICA' ? <Building2 size={14} /> : <User size={14} />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-200">{c.razaoSocial || c.nome}</p>
                          <p className="text-xs text-gray-500">{c.cpf ? formatCPF(c.cpf) : formatCNPJ(c.cnpj)}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${c.tipoPessoa === 'JURIDICA' ? 'badge-info' : 'badge-purple'}`}>
                        {c.tipoPessoa === 'JURIDICA' ? 'PJ' : 'PF'}
                      </span>
                    </td>
                    <td>
                      <div className="space-y-0.5">
                        {c.email && <p className="text-xs text-gray-400 flex items-center gap-1"><Mail size={10} /> {c.email}</p>}
                        {(c.telefone || c.celular) && <p className="text-xs text-gray-400 flex items-center gap-1"><Phone size={10} /> {c.telefone || c.celular}</p>}
                      </div>
                    </td>
                    <td className="text-sm text-gray-400">{c.municipio && `${c.municipio}/${c.uf}`}</td>
                    <td className="text-xs text-gray-500">{formatDateTime(c.createdAt)}</td>
                    <td>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(c)} title="Editar"><Edit size={14} /></Button>
                        <Button size="sm" variant="danger" onClick={() => handleDelete(c.id)} title="Inativar"><Trash2 size={14} /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} total={total} limit={15} onPageChange={setPage} />
          </>
        )}
      </Card>

      {/* Modal cadastro/edição */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Editar Cliente' : 'Novo Cliente'} maxWidth="max-w-2xl">
        <div className="space-y-4">
          {/* Tipo Pessoa */}
          <div className="flex gap-2">
            <button
              onClick={() => setF('tipoPessoa', 'FISICA')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${form.tipoPessoa === 'FISICA' ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              <User size={14} /> Pessoa Física
            </button>
            <button
              onClick={() => setF('tipoPessoa', 'JURIDICA')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${form.tipoPessoa === 'JURIDICA' ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              <Building2 size={14} /> Pessoa Jurídica
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {form.tipoPessoa === 'FISICA' ? (
              <>
                <Input label="Nome Completo *" value={form.nome} onChange={e => setF('nome', e.target.value)} className="col-span-2" />
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-300">CPF</label>
                  <input value={form.cpf} onChange={e => setF('cpf', maskCPF(e.target.value))} maxLength={14} placeholder="000.000.000-00"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <Input label="Inscrição Estadual" value={form.inscricaoEstadual} onChange={e => setF('inscricaoEstadual', e.target.value)} />
              </>
            ) : (
              <>
                <div className="col-span-2 space-y-1">
                  <label className="block text-sm font-medium text-gray-300">CNPJ</label>
                  <div className="flex gap-2">
                    <input value={form.cnpj} onChange={e => setF('cnpj', maskCNPJ(e.target.value))} maxLength={18} placeholder="00.000.000/0000-00"
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    <Button size="sm" variant="secondary" loading={buscarCnpjLoading} onClick={buscarCNPJ}>Buscar CNPJ</Button>
                  </div>
                </div>
                <Input label="Razão Social *" value={form.razaoSocial} onChange={e => setF('razaoSocial', e.target.value)} />
                <Input label="Nome Fantasia" value={form.nome} onChange={e => setF('nome', e.target.value)} />
                <Input label="Inscrição Estadual" value={form.inscricaoEstadual} onChange={e => setF('inscricaoEstadual', e.target.value)} />
                <Input label="Limite de Crédito" type="number" value={form.limiteCredito} onChange={e => setF('limiteCredito', e.target.value)} />
              </>
            )}

            <Input label="E-mail" type="email" value={form.email} onChange={e => setF('email', e.target.value)} />
            <Input label="Telefone" value={form.telefone} onChange={e => setF('telefone', e.target.value)} placeholder="(11) 0000-0000" />
            <Input label="Celular" value={form.celular} onChange={e => setF('celular', e.target.value)} placeholder="(11) 00000-0000" />

            {/* Endereço */}
            <div className="col-span-2 border-t border-gray-700 pt-3">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <MapPin size={12} /> Endereço
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-300">CEP</label>
                  <div className="flex gap-1">
                    <input value={form.cep} onChange={e => setF('cep', e.target.value)} maxLength={9} placeholder="00000-000"
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    <Button size="sm" variant="secondary" loading={buscarCepLoading} onClick={buscarCEP} className="shrink-0">🔍</Button>
                  </div>
                </div>
                <Input label="Número" value={form.numero} onChange={e => setF('numero', e.target.value)} />
                <Input label="Complemento" value={form.complemento} onChange={e => setF('complemento', e.target.value)} />
                <Input label="Logradouro" value={form.logradouro} onChange={e => setF('logradouro', e.target.value)} className="col-span-2" />
                <Input label="Bairro" value={form.bairro} onChange={e => setF('bairro', e.target.value)} />
                <Input label="Cidade" value={form.municipio} onChange={e => setF('municipio', e.target.value)} />
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-300">UF</label>
                  <select value={form.uf} onChange={e => setF('uf', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">UF</option>
                    {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="col-span-2 space-y-1">
              <label className="block text-sm font-medium text-gray-300">Observações</label>
              <textarea value={form.observacoes} onChange={e => setF('observacoes', e.target.value)} rows={2}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button variant="primary" className="flex-1" loading={saving} onClick={handleSave}>
              {editingId ? 'Salvar Alterações' : 'Cadastrar Cliente'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
