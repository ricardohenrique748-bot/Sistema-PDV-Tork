import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import TorkLogo from '../components/ui/TorkLogo';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (novaSenha !== confirmar) {
      toast.error('As senhas não coincidem.');
      return;
    }
    if (novaSenha.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, novaSenha });
      toast.success('Senha redefinida com sucesso! Faça login.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--tork-bg)' }}>
        <div className="text-center">
          <p style={{ color: 'var(--tork-text-muted)' }}>Link inválido. Solicite um novo link de redefinição.</p>
          <button onClick={() => navigate('/login')} className="mt-4 underline" style={{ color: '#f59e0b' }}>
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ background: 'var(--tork-bg)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-700/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-2">
            <TorkLogo size={200} full />
          </div>
          <p style={{ color: 'var(--tork-text-muted)' }} className="mt-2 text-sm">
            Sistema de Gestão
          </p>
        </div>

        <div className="p-8 rounded-2xl shadow-lg" style={{ background: 'var(--tork-surface)', border: '1px solid var(--tork-border)' }}>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--tork-text)' }}>
            Criar nova senha
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--tork-text-muted)' }}>
            Digite e confirme sua nova senha abaixo.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tork-text-muted)' }}>
                Nova senha
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
                  required
                  autoFocus
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-3 pr-12 rounded-lg"
                  style={{ background: 'var(--tork-input-bg)', border: '1px solid var(--tork-border)', color: 'var(--tork-text)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--tork-text-subtle)' }}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tork-text-muted)' }}>
                Confirmar nova senha
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                required
                placeholder="Repita a senha"
                className="w-full px-4 py-3 rounded-lg"
                style={{ background: 'var(--tork-input-bg)', border: '1px solid var(--tork-border)', color: 'var(--tork-text)' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: '#f59e0b', color: '#000' }}
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>

            <div className="text-center">
              <button type="button" onClick={() => navigate('/login')} className="text-sm hover:underline" style={{ color: 'var(--tork-text-muted)' }}>
                Voltar ao login
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--tork-text-subtle)' }}>
          TORK v1.0 · Peças Automotivas · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
