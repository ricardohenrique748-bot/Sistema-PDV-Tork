import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, UserPlus } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    role: 'VENDEDOR',
    ativo: true
  });

  const fetchUsuarios = async () => {
    try {
      const { data } = await api.get('/auth/users');
      setUsuarios(data);
    } catch (err) {
      toast.error('Erro ao buscar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Edit
        const dataToSend = { ...formData };
        if (!dataToSend.senha) delete dataToSend.senha; // don't update password if empty
        await api.put(`/auth/users/${editingId}`, dataToSend);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        // Create
        if (!formData.senha) {
          toast.error('A senha é obrigatória para novos usuários.');
          return;
        }
        await api.post('/auth/users', formData);
        toast.success('Usuário criado com sucesso!');
      }
      setShowModal(false);
      fetchUsuarios();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar usuário');
    }
  };

  const openEdit = (user) => {
    setEditingId(user.id);
    setFormData({
      nome: user.nome,
      email: user.email,
      senha: '',
      role: user.role,
      ativo: user.ativo
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({
      nome: '',
      email: '',
      senha: '',
      role: 'VENDEDOR',
      ativo: true
    });
    setShowModal(true);
  };

  const filtered = usuarios.filter(u => 
    u.nome.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--tork-text)' }}>Usuários</h1>
          <p className="text-sm" style={{ color: 'var(--tork-text-muted)' }}>Gerencie os acessos ao sistema</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-600 transition-colors"
        >
          <UserPlus size={18} />
          Novo Usuário
        </button>
      </div>

      <div 
        className="p-4 rounded-xl border"
        style={{ background: 'var(--tork-surface)', borderColor: 'var(--tork-border)' }}
      >
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg"
              style={{ background: 'var(--tork-input-bg)', color: 'var(--tork-text)', border: '1px solid var(--tork-border)' }}
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-amber-500" size={32} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase" style={{ color: 'var(--tork-text-muted)', borderBottom: '1px solid var(--tork-border)' }}>
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Nível</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--tork-border)' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--tork-text)' }}>{user.nome}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--tork-text-muted)' }}>{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs rounded-full font-medium" style={{ background: 'var(--tork-bg)', color: 'var(--tork-text)' }}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${user.ativo ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {user.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(user)} className="p-1.5 rounded hover:bg-amber-500/10 text-amber-500 transition-colors" title="Editar">
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center" style={{ color: 'var(--tork-text-muted)' }}>
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div 
            className="w-full max-w-md rounded-xl p-6 shadow-xl"
            style={{ background: 'var(--tork-surface)', border: '1px solid var(--tork-border)' }}
          >
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--tork-text)' }}>
              {editingId ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--tork-text-muted)' }}>Nome</label>
                <input required type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full px-3 py-2 rounded-lg border" style={{ background: 'var(--tork-input-bg)', color: 'var(--tork-text)', borderColor: 'var(--tork-border)' }} />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--tork-text-muted)' }}>E-mail</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 rounded-lg border" style={{ background: 'var(--tork-input-bg)', color: 'var(--tork-text)', borderColor: 'var(--tork-border)' }} />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--tork-text-muted)' }}>
                  Senha {editingId && <span className="text-xs opacity-70">(deixe em branco para manter)</span>}
                </label>
                <input type="password" value={formData.senha} onChange={e => setFormData({...formData, senha: e.target.value})} className="w-full px-3 py-2 rounded-lg border" style={{ background: 'var(--tork-input-bg)', color: 'var(--tork-text)', borderColor: 'var(--tork-border)' }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--tork-text-muted)' }}>Nível</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-3 py-2 rounded-lg border" style={{ background: 'var(--tork-input-bg)', color: 'var(--tork-text)', borderColor: 'var(--tork-border)' }}>
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="FINANCEIRO">Financeiro</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--tork-text-muted)' }}>Status</label>
                  <select value={formData.ativo ? 'true' : 'false'} onChange={e => setFormData({...formData, ativo: e.target.value === 'true'})} className="w-full px-3 py-2 rounded-lg border" style={{ background: 'var(--tork-input-bg)', color: 'var(--tork-text)', borderColor: 'var(--tork-border)' }}>
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg" style={{ color: 'var(--tork-text-muted)' }}>
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-600 transition-colors">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
