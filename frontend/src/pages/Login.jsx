import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Sun, Moon, X } from 'lucide-react';
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
  const [lembrar, setLembrar] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('tork_saved_credentials');
    if (saved) {
      const { email: e, senha: s } = JSON.parse(saved);
      setEmail(e || '');
      setSenha(s || '');
      setLembrar(true);
    }
  }, []);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, senha });
      if (lembrar) {
        localStorage.setItem('tork_saved_credentials', JSON.stringify({ email, senha }));
      } else {
        localStorage.removeItem('tork_saved_credentials');
      }
      setAuth(data.user, data.token, data.refreshToken);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      toast.success('Se o e-mail estiver cadastrado, você receberá as instruções em breve.');
      setShowForgot(false);
      setForgotEmail('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao enviar e-mail.');
    } finally {
      setForgotLoading(false);
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

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={lembrar}
                onChange={e => setLembrar(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
              />
              <span className="text-sm" style={{ color: 'var(--tork-text-muted)' }}>
                Lembrar acesso
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: '#f59e0b', color: '#000' }}
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-sm transition-colors hover:underline"
                style={{ color: '#f59e0b' }}
              >
                Esqueci minha senha
              </button>
            </div>
          </form>

        </div>

        <p
          className="text-center text-xs mt-6"
          style={{ color: 'var(--tork-text-subtle)' }}
        >
          TORK v1.0 · Peças Automotivas · {new Date().getFullYear()}
        </p>
      </div>

      {/* Modal Esqueci minha senha */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-xl" style={{ background: 'var(--tork-surface)', border: '1px solid var(--tork-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg" style={{ color: 'var(--tork-text)' }}>Redefinir senha</h3>
              <button onClick={() => { setShowForgot(false); setForgotEmail(''); }} style={{ color: 'var(--tork-text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--tork-text-muted)' }}>
              Informe seu e-mail cadastrado. Enviaremos um link para você criar uma nova senha.
            </p>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <input
                type="email"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                required
                autoFocus
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-lg"
                style={{ background: 'var(--tork-input-bg)', border: '1px solid var(--tork-border)', color: 'var(--tork-text)' }}
              />
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full py-3 font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: '#f59e0b', color: '#000' }}
              >
                {forgotLoading && <Loader2 size={18} className="animate-spin" />}
                {forgotLoading ? 'Enviando...' : 'Enviar link'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
