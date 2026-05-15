import React, { useEffect, useState } from 'react';
import {
  TrendingUp, ShoppingCart, Receipt, Package, AlertTriangle,
  DollarSign, Users, BarChart2, ArrowUpRight
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { StatCard, Card, Spinner, Badge } from '../../components/ui/index.jsx';
import { formatCurrency, formatDate, formatDateTime, getStatusLabel, getStatusColor } from '../../utils/formatters';
import api from '../../services/api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data: d } = await api.get('/dashboard');
        setData(d);
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={32} />
    </div>
  );

  const grafico = (data?.graficoVendas || []).map(d => ({
    data: new Date(d.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    faturamento: Number(d.faturamento),
    vendas: d.quantidade,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs">
          <p className="text-gray-400 mb-1">{label}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color }} className="font-medium">
              {p.name}: {p.name === 'Faturamento' ? formatCurrency(p.value) : p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Visão geral do seu negócio · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Alerta estoque baixo */}
      {data?.estoqueBaixo > 0 && (
        <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <AlertTriangle size={18} className="text-yellow-400 shrink-0" />
          <p className="text-yellow-300 text-sm">
            <strong>{data.estoqueBaixo} peças</strong> estão com estoque abaixo do mínimo.{' '}
            <a href="/pecas?estoqueMinimo=true" className="underline hover:text-yellow-200">Ver todas</a>
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Faturamento Hoje"
          value={formatCurrency(data?.faturamento?.dia || 0)}
          icon={DollarSign}
          iconColor="text-green-400"
          subtitle={`${data?.vendas?.dia || 0} vendas realizadas`}
        />
        <StatCard
          title="Faturamento Semana"
          value={formatCurrency(data?.faturamento?.semana || 0)}
          icon={TrendingUp}
          iconColor="text-primary-400"
          subtitle={`${data?.vendas?.semana || 0} vendas`}
        />
        <StatCard
          title="Faturamento Mês"
          value={formatCurrency(data?.faturamento?.mes || 0)}
          icon={BarChart2}
          iconColor="text-purple-400"
          subtitle={`${data?.vendas?.mes || 0} vendas no mês`}
        />
        <StatCard
          title="Ticket Médio (Mês)"
          value={formatCurrency(data?.ticketMedio?.mes || 0)}
          icon={ShoppingCart}
          iconColor="text-orange-400"
          subtitle="Por venda"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
            <Receipt size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{data?.nfEmitidas?.dia || 0}</p>
            <p className="text-gray-400 text-sm">NFs emitidas hoje</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
            <Receipt size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{data?.nfEmitidas?.mes || 0}</p>
            <p className="text-gray-400 text-sm">NFs emitidas no mês</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-red-500/10 text-red-400">
            <Package size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{data?.estoqueBaixo || 0}</p>
            <p className="text-gray-400 text-sm">Peças em estoque baixo</p>
          </div>
        </Card>
      </div>

      {/* Chart + Last sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Faturamento — últimos 30 dias</h3>
              <p className="text-gray-500 text-xs mt-0.5">Evolução diária de vendas</p>
            </div>
          </div>
          {grafico.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={grafico}>
                <defs>
                  <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="data" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="faturamento" name="Faturamento" stroke="#3b82f6" fill="url(#colorFat)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-500 text-sm">
              Nenhuma venda registrada no período.
            </div>
          )}
        </Card>

        {/* Last sales */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">Últimas Vendas</h3>
            <a href="/vendas" className="text-primary-400 text-xs hover:text-primary-300 flex items-center gap-1">
              Ver todas <ArrowUpRight size={12} />
            </a>
          </div>
          <div className="space-y-3">
            {(data?.ultimasVendas || []).slice(0, 6).map(venda => (
              <div key={venda.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">
                    {venda.cliente?.razaoSocial || venda.cliente?.nome || 'Consumidor final'}
                  </p>
                  <p className="text-xs text-gray-500">{formatDateTime(venda.createdAt)}</p>
                </div>
                <p className="text-sm font-semibold text-green-400 ml-3 shrink-0">
                  {formatCurrency(venda.total)}
                </p>
              </div>
            ))}
            {!data?.ultimasVendas?.length && (
              <p className="text-gray-500 text-sm text-center py-4">Nenhuma venda encontrada.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
