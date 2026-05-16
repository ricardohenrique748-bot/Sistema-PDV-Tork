import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, FileText, Receipt, Users,
  Package, BarChart3, Settings, LogOut, Menu, X, Bell,
  Sun, Moon, AlertTriangle, Info, AlertCircle, Trash2
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import TorkLogo from '../ui/TorkLogo';
import api from '../../services/api';
import ChangePasswordModal from '../ui/ChangePasswordModal';

const navItems = [
  { to: '/',             label: 'Dashboard',      icon: LayoutDashboard, exact: true },
  { to: '/pdv',          label: 'Nova Venda',      icon: ShoppingCart },
  { to: '/orcamentos',   label: 'Orçamentos',      icon: FileText },
  { to: '/notas-fiscais',label: 'Notas Fiscais',   icon: Receipt },
  { to: '/clientes',     label: 'Clientes',        icon: Users },
  { to: '/pecas',        label: 'Serviços e Peças', icon: Package },
  { to: '/relatorios',   label: 'Relatórios',      icon: BarChart3 },
  { to: '/configuracoes',label: 'Configurações',   icon: Settings },
];

const nivelIcon = {
  CRITICO: <AlertCircle size={14} className="text-red-400 shrink-0" />,
  AVISO:   <AlertTriangle size={14} className="text-amber-400 shrink-0" />,
  INFO:    <Info size={14} className="text-blue-400 shrink-0" />,
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const [notifs, setNotifs] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tork_dismissed_notifs') || '[]'); }
    catch { return []; }
  });
  const [showNotifs, setShowNotifs] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const bellRef = useRef(null);
  const panelRef = useRef(null);

  const fetchNotifs = async () => {
    try {
      setLoadingNotifs(true);
      const { data } = await api.get('/notificacoes');
      setNotifs(data.data || []);
    } catch {
      // silently fail
    } finally {
      setLoadingNotifs(false);
    }
  };

  const clearNotifs = () => {
    const ids = notifs.map(n => n.id);
    const next = [...new Set([...dismissed, ...ids])];
    setDismissed(next);
    localStorage.setItem('tork_dismissed_notifs', JSON.stringify(next));
  };

  // Busca ao montar e a cada 60s
  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    if (!showNotifs) return;
    const handler = (e) => {
      if (
        bellRef.current && !bellRef.current.contains(e.target) &&
        panelRef.current && !panelRef.current.contains(e.target)
      ) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifs]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNotifClick = (link) => {
    setShowNotifs(false);
    navigate(link);
  };

  const visibleNotifs = notifs.filter(n => !dismissed.includes(n.id));
  const criticos = visibleNotifs.filter(n => n.nivel === 'CRITICO').length;
  const badgeCount = visibleNotifs.length;

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: 'var(--tork-bg)' }}
    >
      {user?.primeiroAcesso && <ChangePasswordModal />}

      {/* Sidebar overlay — mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 z-30 flex flex-col
          border-r transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          background: 'var(--tork-surface)',
          borderColor: 'var(--tork-border)',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--tork-border)' }}
        >
          <div className="flex items-center justify-center flex-1">
            <TorkLogo size={110} full />
          </div>
          <button
            className="lg:hidden transition-colors ml-2 shrink-0"
            style={{ color: 'var(--tork-text-muted)' }}
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-0.5">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-150
                  ${isActive
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'hover:bg-amber-500/10'
                  }
                `}
                style={({ isActive }) => isActive ? {} : { color: 'var(--tork-text-muted)' }}
              >
                <item.icon size={18} className="shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User section */}
        <div
          className="border-t p-4"
          style={{ borderColor: 'var(--tork-border)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-black text-sm font-bold shrink-0">
              {user?.nome?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-sm font-medium truncate"
                style={{ color: 'var(--tork-text)' }}
              >
                {user?.nome}
              </div>
              <div
                className="text-xs truncate capitalize"
                style={{ color: 'var(--tork-text-subtle)' }}
              >
                {user?.role}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="transition-colors hover:text-red-500"
              style={{ color: 'var(--tork-text-subtle)' }}
              title="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header
          className="h-14 border-b flex items-center gap-4 px-4 shrink-0"
          style={{
            background: 'var(--tork-surface)',
            borderColor: 'var(--tork-border)',
          }}
        >
          <button
            className="lg:hidden transition-colors"
            style={{ color: 'var(--tork-text-muted)' }}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          <div className="flex-1" />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--tork-text-muted)', background: 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--tork-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              ref={bellRef}
              onClick={() => { setShowNotifs(v => !v); if (!showNotifs) fetchNotifs(); }}
              className="relative p-2 rounded-lg transition-colors"
              style={{ color: 'var(--tork-text-muted)', background: 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--tork-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              title="Notificações"
            >
              <Bell size={18} />
              {badgeCount > 0 && (
                <span className={`absolute top-1.5 right-1.5 min-w-[8px] h-2 rounded-full text-[10px] ${criticos > 0 ? 'bg-red-500' : 'bg-amber-400'}`} />
              )}
            </button>

            {/* Dropdown */}
            {showNotifs && (
              <div
                ref={panelRef}
                className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-2xl border overflow-hidden z-50"
                style={{ background: 'var(--tork-surface)', borderColor: 'var(--tork-border)' }}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between px-4 py-3 border-b"
                  style={{ borderColor: 'var(--tork-border)' }}
                >
                  <span className="text-sm font-semibold" style={{ color: 'var(--tork-text)' }}>
                    Notificações
                    {badgeCount > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-amber-500 text-black font-bold">
                        {badgeCount}
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    {visibleNotifs.length > 0 && (
                      <button
                        onClick={clearNotifs}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors"
                        style={{ color: 'var(--tork-text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--tork-text)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--tork-text-muted)'}
                        title="Limpar notificações"
                      >
                        <Trash2 size={13} />
                        Limpar
                      </button>
                    )}
                    <button onClick={() => setShowNotifs(false)} style={{ color: 'var(--tork-text-muted)' }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="max-h-80 overflow-y-auto">
                  {loadingNotifs ? (
                    <div className="py-8 text-center text-sm" style={{ color: 'var(--tork-text-muted)' }}>
                      Carregando...
                    </div>
                  ) : visibleNotifs.length === 0 ? (
                    <div className="py-8 text-center text-sm" style={{ color: 'var(--tork-text-muted)' }}>
                      <Bell size={28} className="mx-auto mb-2 opacity-30" />
                      Nenhuma notificação
                    </div>
                  ) : (
                    visibleNotifs.map(n => (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n.link)}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b last:border-0"
                        style={{ borderColor: 'var(--tork-border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--tork-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span className="mt-0.5">{nivelIcon[n.nivel]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: 'var(--tork-text)' }}>
                            {n.titulo}
                          </p>
                          <p className="text-xs truncate" style={{ color: 'var(--tork-text-muted)' }}>
                            {n.descricao}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
