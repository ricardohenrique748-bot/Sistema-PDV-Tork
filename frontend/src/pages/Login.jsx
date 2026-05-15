import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import TorkLogo from '../components/ui/TorkLogo';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, senha });
      setAuth(data.user, data.token, data.refreshToken);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{ background: 'var(--tork-bg)' }}
    >
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-700/10 rounded-full blur-3xl" />
      </div>

      {/* Theme toggle — top right */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-lg transition-colors"
        style={{ color: 'var(--tork-text-muted)', background: 'var(--tork-surface)' }}
        title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-2">
            <TorkLogo size={200} full />
          </div>
          <p style={{ color: 'var(--tork-text-muted)' }} className="mt-2 text-sm">
            Sistema de Gestão
          </p>
        </div>

        {/* Card */}
        <div
          className="p-8 rounded-2xl shadow-lg"
          style={{
            background: 'var(--tork-surface)',
            border: '1px solid var(--tork-border)',
          }}
        >
          <h2
            className="text-xl font-semibold mb-6"
            style={{ color: 'var(--tork-text)' }}
          >
            Entrar no sistema
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--tork-text-muted)' }}
              >
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full px-4 py-3 rounded-lg transition-all"
                style={{
                  background: 'var(--tork-input-bg)',
                  border: '1px solid var(--tork-border)',
                  color: 'var(--tork-text)',
                }}
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--tork-text-muted)' }}
              >
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 rounded-lg transition-all"
                  style={{
                    background: 'var(--tork-input-bg)',
                    border: '1px solid var(--tork-border)',
                    color: 'var(--tork-text)',
                  }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--tork-text-subtle)' }}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              style={{
                background: '#f59e0b',
                color: '#000',
              }}
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

        </div>

        <p
          className="text-center text-xs mt-6"
          style={{ color: 'var(--tork-text-subtle)' }}
        >
          TORK v1.0 · Peças Automotivas · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
