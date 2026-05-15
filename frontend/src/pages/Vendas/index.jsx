import { useState, useEffect } from 'react';
import { ShoppingCart, Eye, XCircle, Receipt, Calendar, FilePlus } from 'lucide-react';
import {
  Button, Card, PageHeader, Spinner, Modal, EmptyState, Pagination
} from '../../components/ui/index.jsx';
import { formatCurrency, formatDateTime, getStatusLabel } from '../../utils/formatters';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const statusColors = {
  CONCLUIDA: 'badge-success',
  PENDENTE: 'badge-warning',
  CANCELADA: 'badge-danger',
  ORCAMENTO: 'badge-gray',
};

export default function Vendas() {
  const navigate = useNavigate();
  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [showCancelar, setShowCancelar] = useState(false);
  const [showCriarNF, setShowCriarNF] = useState(false);
  const [modeloNF, setModeloNF] = useState('NFCE');
  const [criandoNF, setCriandoNF] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const params = { page, limit: 15 };
        if (filtroStatus) params.status = filtroStatus;
        if (dataInicio) params.dataInicio = dataInicio;
        if (dataFim) params.dataFim = dataFim;
        const { data } = await api.get('/vendas', { params });
        if (!cancelled) {
          setVendas(data.data || []);
          setTotal(data.total || 0);
        }
      } catch {
        if (!cancelled) toast.error('Erro ao carregar vendas.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [page, filtroStatus, dataInicio, dataFim, refresh]);

  const handleCancelar = async () => {
    if (!motivoCancelamento.trim()) { toast.error('Informe o motivo do cancelamento.'); return; }
    setCancelando(true);
    try {
      await api.post(`/vendas/${selected.id}/cancelar`, { motivo: motivoCancelamento });
      toast.success('Venda cancelada e estoque devolvido.');
      setShowCancelar(false);
      setMotivoCancelamento('');
      setRefresh(r => r + 1);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao cancelar venda.');
    } finally {
      setCancelando(false);
    }
  };

  const handleCriarNF = async () => {
    setCriandoNF(true);
    try {
      await api.post(`/vendas/${selected.id}/nota-fiscal`, { modeloNF });
      toast.success('NF criada e enfileirada para emissão!');
      setShowCriarNF(false);
      setRefresh(r => r + 1);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao criar nota fiscal.');
    } finally {
      setCriandoNF(false);
    }
  };

  const totalFaturamento = vendas
    .filter(v => v.status === 'CONCLUIDA')
    .reduce((s, v) => s + Number(v.total), 0);

  const vendasConcluidas = vendas.filter(v => v.status === 'CONCLUIDA');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendas"
        subtitle={`${total} vendas encontradas`}
        action={
          <Button onClick={() => navigate('/pdv')}>
            <ShoppingCart size={16} /> Nova Venda
          </Button>
        }
      />

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={filtroStatus}
            onChange={e => { setFiltroStatus(e.target.value); setPage(1); }}
            className="bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm px-3 py-2"
          >
            <option value="">Todos os status</option>
            <option value="CONCLUIDA">Concluída</option>
            <option value="PENDENTE">Pendente</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-gray-500" />
            <input
              type="date"
              value={dataInicio}
              onChange={e => { setDataInicio(e.target.value); setPage(1); }}
              className="bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm px-3 py-2"
            />
            <span className="text-gray-500 text-sm">até</span>
            <input
              type="date"
              value={dataFim}
              onChange={e => { setDataFim(e.target.value); setPage(1); }}
              className="bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm px-3 py-2"
            />
          </div>
          {(dataInicio || dataFim || filtroStatus) && (
            <button
              onClick={() => { setFiltroStatus(''); setDataInicio(''); setDataFim(''); setPage(1); }}
              className="text-xs text-gray-400 hover:text-white"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </Card>

      {/* Resumo */}
      {vendas.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs text-gray-500">Faturamento (página)</p>
            <p className="text-xl font-bold text-green-400">{formatCurrency(totalFaturamento)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500">Vendas concluídas</p>
            <p className="text-xl font-bold text-white">{vendasConcluidas.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500">Ticket médio</p>
            <p className="text-xl font-bold text-white">
              {formatCurrency(vendasConcluidas.length > 0 ? totalFaturamento / vendasConcluidas.length : 0)}
            </p>
          </Card>
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center"><Spinner /></div>
        ) : vendas.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="Nenhuma venda encontrada" description="Realize sua primeira venda pelo PDV." action={<Button onClick={() => navigate('/pdv')}><ShoppingCart size={14} /> Nova Venda</Button>} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="tork-table">
                <thead>
                  <tr>
                    <th>Nº</th>
                    <th>Cliente</th>
                    <th>Itens</th>
                    <th>Total</th>
                    <th>Pagamento</th>
                    <th>NF</th>
                    <th>Status</th>
                    <th>Data</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {vendas.map(v => (
                    <tr key={v.id}>
                      <td className="font-mono text-sm">#{v.numero?.toString().padStart(4, '0')}</td>
                      <td>
                        <p className="text-sm text-gray-200">{v.cliente?.razaoSocial || v.cliente?.nome || 'Consumidor final'}</p>
                        <p className="text-xs text-gray-500">{v.usuario?.nome}</p>
                      </td>
                      <td className="text-sm text-gray-400">{v.itens?.length || 0}</td>
                      <td className="font-semibold text-green-400">{formatCurrency(v.total)}</td>
                      <td>
                        <div className="flex flex-col gap-0.5">
                          {v.pagamentos?.map((p, i) => (
                            <span key={i} className="text-xs text-gray-400">{p.forma.replace('_', ' ')}: {formatCurrency(p.valor)}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        {v.notaFiscal ? (
                          <button
                            onClick={() => navigate('/notas-fiscais')}
                            className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                          >
                            <Receipt size={12} />
                            {v.notaFiscal.modelo === 'NFE' ? 'NF-e' : 'NFC-e'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${statusColors[v.status] || 'badge-gray'}`}>
                          {getStatusLabel(v.status)}
                        </span>
                      </td>
                      <td className="text-xs text-gray-500">{formatDateTime(v.createdAt)}</td>
                      <td>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => { setSelected(v); setShowDetail(true); }} title="Ver detalhes">
                            <Eye size={14} />
                          </Button>
                          {v.status === 'CONCLUIDA' && !v.notaFiscal && (
                            <Button size="sm" variant="success" onClick={() => { setSelected(v); setModeloNF('NFCE'); setShowCriarNF(true); }} title="Criar Nota Fiscal">
                              <FilePlus size={14} />
                            </Button>
                          )}
                          {v.status === 'CONCLUIDA' && (
                            <Button size="sm" variant="danger" onClick={() => { setSelected(v); setShowCancelar(true); }} title="Cancelar venda">
                              <XCircle size={14} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={total} limit={15} onPageChange={setPage} />
          </>
        )}
      </Card>

      {/* Modal detalhe */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title={`Venda #${selected?.numero?.toString().padStart(4, '0')}`} maxWidth="max-w-2xl">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Cliente</p>
                <p className="text-gray-200">{selected.cliente?.razaoSocial || selected.cliente?.nome || 'Consumidor final'}</p>
              </div>
              <div>
                <p className="text-gray-500">Vendedor</p>
                <p className="text-gray-200">{selected.usuario?.nome}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <span className={`badge ${statusColors[selected.status] || 'badge-gray'}`}>{getStatusLabel(selected.status)}</span>
              </div>
              <div>
                <p className="text-gray-500">Data</p>
                <p className="text-gray-200">{formatDateTime(selected.createdAt)}</p>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Itens</p>
              <table className="tork-table">
                <thead>
                  <tr>
                    <th>Peça</th>
                    <th className="text-center">Qtd</th>
                    <th className="text-right">Preço</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.itens?.map(item => (
                    <tr key={item.id}>
                      <td>
                        <p className="text-sm">{item.peca?.nome}</p>
                        <p className="text-xs text-gray-500">{item.peca?.codigo}</p>
                      </td>
                      <td className="text-center">{item.quantidade}</td>
                      <td className="text-right">{formatCurrency(item.precoUnitario)}</td>
                      <td className="text-right text-green-400 font-medium">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-gray-800 pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>{formatCurrency(selected.subtotal)}</span>
              </div>
              {Number(selected.desconto) > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>Desconto</span>
                  <span>-{formatCurrency(selected.desconto)}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-bold">
                <span>Total</span>
                <span className="text-green-400">{formatCurrency(selected.total)}</span>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-3">
              <p className="text-xs text-gray-500 mb-1">Pagamentos</p>
              <div className="space-y-1">
                {selected.pagamentos?.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm text-gray-300">
                    <span>{p.forma.replace('_', ' ')}</span>
                    <span>{formatCurrency(p.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal cancelamento */}
      <Modal open={showCancelar} onClose={() => setShowCancelar(false)} title="Cancelar Venda">
        <div className="space-y-4">
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
            ⚠️ O estoque das peças será devolvido automaticamente.
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-300">Motivo do cancelamento</label>
            <textarea
              value={motivoCancelamento}
              onChange={e => setMotivoCancelamento(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowCancelar(false)}>Voltar</Button>
            <Button variant="danger" className="flex-1" loading={cancelando} onClick={handleCancelar}>
              Confirmar Cancelamento
            </Button>
          </div>
        </div>
      </Modal>
      {/* Modal criar NF */}
      <Modal open={showCriarNF} onClose={() => setShowCriarNF(false)} title="Criar Nota Fiscal">
        {selected && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-300">
              Venda #{selected.numero?.toString().padStart(4, '0')} · Total: <strong>{formatCurrency(selected.total)}</strong>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Modelo da NF</label>
              <select
                value={modeloNF}
                onChange={e => setModeloNF(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="NFCE">NFC-e (Nota Fiscal de Consumidor Eletrônica)</option>
                <option value="NFE">NF-e (Nota Fiscal Eletrônica)</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCriarNF(false)}>Cancelar</Button>
              <Button variant="primary" className="flex-1" loading={criandoNF} onClick={handleCriarNF}>
                <FilePlus size={14} /> Criar NF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
