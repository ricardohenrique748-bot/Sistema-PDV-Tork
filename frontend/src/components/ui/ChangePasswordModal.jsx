import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Lock, Loader2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ChangePasswordModal() {
  const { setAuth } = useAuthStore();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (novaSenha !== confirmarSenha) {
      toast.error('As senhas não coincidem.');
      return;
    }
    if (novaSenha.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/change-password', { novaSenha });
      toast.success('Senha atualizada com sucesso!');
      // Atualiza os dados do usuário no store (primeiroAcesso vira false)
      setAuth(data.user, data.token, data.refreshToken);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div 
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl animate-scale-in"
        style={{ 
          background: 'var(--tork-surface)',
          border: '1px solid var(--tork-border)' 
        }}
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mb-4">
            <Lock size={24} />
          </div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--tork-text)' }}>
            Bem-vindo(a)!
          </h2>
          <p className="text-sm text-center mt-2" style={{ color: 'var(--tork-text-muted)' }}>
            Este é o seu primeiro acesso. Por questões de segurança, você precisa definir uma nova senha para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tork-text-muted)' }}>
              Nova Senha
            </label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg transition-all"
              style={{
                background: 'var(--tork-input-bg)',
                border: '1px solid var(--tork-border)',
                color: 'var(--tork-text)',
              }}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tork-text-muted)' }}>
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg transition-all"
              style={{
                background: 'var(--tork-input-bg)',
                border: '1px solid var(--tork-border)',
                color: 'var(--tork-text)',
              }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-4 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            style={{
              background: '#f59e0b',
              color: '#000',
            }}
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? 'Salvando...' : 'Salvar e Continuar'}
          </button>
        </form>
      </div>
    </div>
  );
}
