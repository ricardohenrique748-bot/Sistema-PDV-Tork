import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/layout/Layout';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import PDV from './pages/PDV';
import Clientes from './pages/Clientes';
import NotasFiscais from './pages/NotasFiscais';
import Orcamentos from './pages/Orcamentos';
import Pecas from './pages/Pecas';
import Vendas from './pages/Vendas';
import Relatorios from './pages/Relatorios';
import Configuracoes from './pages/Configuracoes';

function PrivateRoute({ children }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="pdv" element={<PDV />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="notas-fiscais" element={<NotasFiscais />} />
        <Route path="orcamentos" element={<Orcamentos />} />
        <Route path="pecas" element={<Pecas />} />
        <Route path="vendas" element={<Vendas />} />
        <Route path="relatorios" element={<Relatorios />} />
        <Route path="configuracoes" element={<Configuracoes />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
