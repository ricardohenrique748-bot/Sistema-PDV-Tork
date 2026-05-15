import { useState, useEffect } from 'react';
import { TrendingUp, Users, Package, DollarSign } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie,
} from 'recharts';
import { Card, PageHeader, Spinner } from '../../components/ui/index.jsx';
import { formatCurrency } from '../../utils/formatters';
import api from '../../services/api';
import toast from 'react-hot-toast';

const COLORS = ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs">
        <p className="text-gray-400 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-medium">
            {p.name}: {p.name === 'Faturamento' || p.name === 'faturamento' ? formatCurrency(p.value) : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Relatorios() {
  const [tab, setTab] = useState('faturamento');
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0]);
  const [agrupamento, setAgrupamento] = useState('dia');
  const [loading, setLoading] = useState(false);
  const [faturamento, setFaturamento] = useState([]);
  const [rankingClientes, setRankingClientes] = useState([]);
  const [rankingPecas, setRankingPecas] = useState([]);
  const [estoque, setEstoque] = useState(null);
  const [porCategoria, setPorCategoria] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        if (tab === 'faturamento') {
          const { data } = await api.get('/relatorios/faturamento', { params: { dataInicio, dataFim, agrupamento } });
          if (!cancelled) setFaturamento(data);
        } else if (tab === 'clientes') {
          const { data } = await api.get('/relatorios/ranking-clientes', { params: { dataInicio, dataFim, limit: 10 } });
          if (!cancelled) setRankingClientes(data);
        } else if (tab === 'pecas') {
          const [pecasRes, catRes] = await Promise.all([
            api.get('/relatorios/ranking-pecas', { params: { limit: 10 } }),
            api.get('/relatorios/vendas-por-categoria'),
          ]);
          if (!cancelled) { setRankingPecas(pecasRes.data); setPorCategoria(catRes.data); }
        } else if (tab === 'estoque') {
          const { data } = await api.get('/relatorios/estoque-valorizado');
          if (!cancelled) setEstoque(data);
        }
      } catch {
        if (!cancelled) toast.error('Erro ao carregar relatório.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [tab, dataInicio, dataFim, agrupamento]);

  const tabs = [
    { id: 'faturamento', label: 'Faturamento', icon: TrendingUp },
    { id: 'clientes', label: 'Top Clientes', icon: Users },
    { id: 'pecas', label: 'Top Peças', icon: Package },
    { id: 'estoque', label: 'Estoque Valorizado', icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios" subtitle="Análise detalhada do seu negócio" />

      {/* Tabs */}
      <Card className="p-2">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.id ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Filtros */}
      {tab !== 'estoque' && (
        <Card className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>De</span>
              <input
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg text-gray-300 px-3 py-1.5 text-sm"
              />
              <span>até</span>
              <input
                type="date"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg text-gray-300 px-3 py-1.5 text-sm"
              />
            </div>
            {tab === 'faturamento' && (
              <select
                value={agrupamento}
                onChange={e => setAgrupamento(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm px-3 py-1.5"
              >
                <option value="dia">Por dia</option>
                <option value="semana">Por semana</option>
                <option value="mes">Por mês</option>
              </select>
            )}
          </div>
        </Card>
      )}

      {loading ? (
        <div className="py-16 flex justify-center"><Spinner size={32} /></div>
      ) : (
        <>
          {/* Faturamento */}
          {tab === 'faturamento' && (
            <div className="space-y-4">
              {faturamento.length > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="p-4">
                      <p className="text-xs text-gray-500">Total do período</p>
                      <p className="text-xl font-bold text-green-400">{formatCurrency(faturamento.reduce((s, d) => s + d.faturamento, 0))}</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-xs text-gray-500">Qtd. vendas</p>
                      <p className="text-xl font-bold text-white">{faturamento.reduce((s, d) => s + d.quantidade, 0)}</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-xs text-gray-500">Ticket médio</p>
                      <p className="text-xl font-bold text-white">
                        {formatCurrency(faturamento.reduce((s, d) => s + d.ticket_medio, 0) / faturamento.length)}
                      </p>
                    </Card>
                  </div>
                  <Card>
                    <h3 className="text-sm font-semibold text-white mb-4">Faturamento por {agrupamento}</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={faturamento}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#6b7280' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="faturamento" name="Faturamento" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </>
              ) : (
                <Card><p className="text-center text-gray-500 py-8">Nenhuma venda no período selecionado.</p></Card>
              )}
            </div>
          )}

          {/* Top Clientes */}
          {tab === 'clientes' && (
            <Card className="p-0 overflow-hidden">
              {rankingClientes.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nenhum dado disponível.</p>
              ) : (
                <table className="tork-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Cliente</th>
                      <th className="text-center">Compras</th>
                      <th className="text-right">Total gasto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingClientes.map((c, idx) => (
                      <tr key={c.id}>
                        <td>
                          <span className={`text-sm font-bold ${idx < 3 ? 'text-yellow-400' : 'text-gray-500'}`}>
                            {idx + 1}º
                          </span>
                        </td>
                        <td className="text-sm text-gray-200">{c.nome}</td>
                        <td className="text-center text-gray-400">{c.total_compras}</td>
                        <td className="text-right font-semibold text-green-400">{formatCurrency(c.valor_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}

          {/* Top Peças */}
          {tab === 'pecas' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800">
                  <h3 className="text-sm font-semibold text-white">Top 10 Peças Mais Vendidas</h3>
                </div>
                {rankingPecas.length === 0 ? (
                  <p className="text-center text-gray-500 py-8 text-sm">Nenhum dado disponível.</p>
                ) : (
                  <table className="tork-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Peça</th>
                        <th className="text-center">Qtd vendida</th>
                        <th className="text-right">Faturamento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankingPecas.map((p, idx) => (
                        <tr key={p.id}>
                          <td><span className={`text-sm font-bold ${idx < 3 ? 'text-yellow-400' : 'text-gray-500'}`}>{idx + 1}º</span></td>
                          <td>
                            <p className="text-sm text-gray-200">{p.nome}</p>
                            <p className="text-xs text-gray-500">{p.codigo}</p>
                          </td>
                          <td className="text-center text-gray-400">{p.total_vendido}</td>
                          <td className="text-right text-green-400 font-medium">{formatCurrency(p.faturamento)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>

              <Card>
                <h3 className="text-sm font-semibold text-white mb-4">Vendas por Categoria</h3>
                {porCategoria.length === 0 ? (
                  <p className="text-center text-gray-500 py-8 text-sm">Nenhum dado disponível.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={porCategoria.map((item, idx) => ({ ...item, fill: COLORS[idx % COLORS.length] }))}
                        dataKey="faturamento"
                        nameKey="categoria"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ categoria, percent }) => `${categoria} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      />
                      <Tooltip formatter={(val) => formatCurrency(val)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>
          )}

          {/* Estoque Valorizado */}
          {tab === 'estoque' && estoque && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4">
                  <p className="text-xs text-gray-500">Valor a custo</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(estoque.totais.totalCusto)}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500">Valor a venda</p>
                  <p className="text-xl font-bold text-green-400">{formatCurrency(estoque.totais.totalVenda)}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500">Total de itens</p>
                  <p className="text-xl font-bold text-white">{estoque.totais.totalItens}</p>
                </Card>
              </div>

              <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="tork-table">
                    <thead>
                      <tr>
                        <th>Peça</th>
                        <th>Categoria</th>
                        <th className="text-center">Estoque</th>
                        <th className="text-right">Preço Compra</th>
                        <th className="text-right">Preço Venda</th>
                        <th className="text-right">Valor Custo</th>
                        <th className="text-right">Valor Venda</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estoque.data.map(p => (
                        <tr key={p.id}>
                          <td>
                            <p className="text-sm text-gray-200">{p.nome}</p>
                            <p className="text-xs text-gray-500">{p.codigo}</p>
                          </td>
                          <td><span className="badge badge-info text-xs">{p.categoria}</span></td>
                          <td className="text-center">
                            <span className={`text-sm font-medium ${p.estoque_baixo ? 'text-red-400' : 'text-gray-200'}`}>
                              {p.estoqueAtual}
                            </span>
                          </td>
                          <td className="text-right text-gray-400 text-sm">{formatCurrency(p.precoCompra)}</td>
                          <td className="text-right text-green-400 text-sm">{formatCurrency(p.precoVenda)}</td>
                          <td className="text-right text-gray-300 text-sm">{formatCurrency(p.valor_custo)}</td>
                          <td className="text-right text-green-400 font-medium text-sm">{formatCurrency(p.valor_venda)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
