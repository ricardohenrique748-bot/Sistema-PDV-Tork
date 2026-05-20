import { useState, useEffect } from 'react';
import { FileText, Plus, Eye, Check, X, Clock, ShoppingCart, Trash2 } from 'lucide-react';
import {
  Button, Card, PageHeader, Spinner, Modal, EmptyState, Pagination
} from '../../components/ui/index.jsx';
import { formatCurrency, formatDate, formatDateTime, getStatusLabel, FORMAS_PAGAMENTO } from '../../utils/formatters';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const statusColors = {
  PENDENTE: 'badge-warning',
  APROVADO: 'badge-success',
  RECUSADO: 'badge-danger',
  EXPIRADO: 'badge-gray',
};

export default function Orcamentos() {
  const navigate = useNavigate();
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showConverter, setShowConverter] = useState(false);
  const [pagamentos, setPagamentos] = useState([{ forma: 'DINHEIRO', valor: '' }]);
  const [emitirNF, setEmitirNF] = useState(false);
  const [modeloNF, setModeloNF] = useState('NFCE');
  const [convertendo, setConvertendo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const params = { page, limit: 15 };
        if (filtroStatus) params.status = filtroStatus;
        const { data } = await api.get('/orcamentos', { params });
        if (!cancelled) {
          setOrcamentos(data.data || []);
          setTotal(data.total || 0);
        }
      } catch {
        if (!cancelled) toast.error('Erro ao carregar orçamentos.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [page, filtroStatus, refresh]);

  const handleStatus = async (id, status) => {
    try {
      await api.patch(`/orcamentos/${id}`, { status });
      toast.success(`Orçamento ${status === 'APROVADO' ? 'aprovado' : 'recusado'}.`);
      setRefresh(r => r + 1);
    } catch {
      toast.error('Erro ao atualizar status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este orçamento permanentemente?')) return;
    try {
      await api.delete(`/orcamentos/${id}`);
      toast.success('Orçamento excluído.');
      setRefresh(r => r + 1);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao excluir orçamento.');
    }
  };

  const handleConverter = async () => {
    const totalPag = pagamentos.reduce((s, p) => s + (Number(p.valor) || 0), 0);
    if (Math.abs(totalPag - Number(selected?.total)) > 0.01) {
      toast.error('Valores dos pagamentos não batem com o total do orçamento.');
      return;
    }
    setConvertendo(true);
    try {
      await api.post(`/orcamentos/${selected.id}/converter`, {
        pagamentos: pagamentos.map(p => ({ forma: p.forma, valor: Number(p.valor), parcelas: 1 })),
        emitirNF,
        modeloNF,
      });
      toast.success('Orçamento convertido em venda com sucesso!');
      setShowConverter(false);
      setRefresh(r => r + 1);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao converter orçamento.');
    } finally {
      setConvertendo(false);
    }
  };

  const openConverter = (orc) => {
    setSelected(orc);
    setPagamentos([{ forma: 'DINHEIRO', valor: Number(orc.total).toFixed(2) }]);
    setShowConverter(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orçamentos"
        subtitle={`${total} orçamentos`}
        action={
          <Button onClick={() => navigate('/pdv')}>
            <Plus size={16} /> Novo Orçamento
          </Button>
        }
      />

      <Card className="p-4">
        <select
          value={filtroStatus}
          onChange={e => { setFiltroStatus(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="APROVADO">Aprovado</option>
          <option value="RECUSADO">Recusado</option>
          <option value="EXPIRADO">Expirado</option>
        </select>
      </Card>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center"><Spinner /></div>
        ) : orcamentos.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum orçamento encontrado"
            description="Crie orçamentos pela tela de Nova Venda (PDV)."
            action={<Button onClick={() => navigate('/pdv')}><Plus size={14} /> Novo Orçamento</Button>}
          />
        ) : (
          <>
            <table className="tork-table">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Cliente</th>
                  <th>Itens</th>
                  <th>Total</th>
                  <th>Validade</th>
                  <th>Status</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {orcamentos.map(orc => (
                  <tr key={orc.id}>
                    <td className="font-mono text-sm">#{orc.numero?.toString().padStart(4, '0')}</td>
                    <td>
                      <p className="text-sm text-gray-200">{orc.cliente?.razaoSocial || orc.cliente?.nome || 'Sem cliente'}</p>
                      <p className="text-xs text-gray-500">{orc.usuario?.nome}</p>
                    </td>
                    <td className="text-sm text-gray-400">{orc.itens?.length || 0} {orc.itens?.length === 1 ? 'item' : 'itens'}</td>
                    <td className="font-semibold text-green-400">{formatCurrency(orc.total)}</td>
                    <td>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={12} />
                        {formatDate(orc.validadeDate)}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${statusColors[orc.status] || 'badge-gray'}`}>
                        {getStatusLabel(orc.status)}
                      </span>
                    </td>
                    <td className="text-xs text-gray-500">{formatDateTime(orc.createdAt)}</td>
                    <td>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setSelected(orc); setShowDetail(true); }} title="Ver detalhes">
                          <Eye size={14} />
                        </Button>
                        {orc.status === 'PENDENTE' && (
                          <>
                            <Button size="sm" variant="success" onClick={() => handleStatus(orc.id, 'APROVADO')} title="Aprovar">
                              <Check size={14} />
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => handleStatus(orc.id, 'RECUSADO')} title="Recusar">
                              <X size={14} />
                            </Button>
                          </>
                        )}
                        {(orc.status === 'PENDENTE' || orc.status === 'APROVADO') && (
                          <Button size="sm" variant="primary" onClick={() => openConverter(orc)} title="Converter em venda">
                            <ShoppingCart size={14} />
                          </Button>
                        )}
                        {orc.status !== 'CONVERTIDO' && (
                          <Button size="sm" variant="danger" onClick={() => handleDelete(orc.id)} title="Excluir orçamento">
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} total={total} limit={15} onPageChange={setPage} />
          </>
        )}
      </Card>

      {/* Modal detalhe */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title={`Orçamento #${selected?.numero?.toString().padStart(4, '0')}`} maxWidth="max-w-2xl">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Cliente</p>
                <p className="text-gray-200">{selected.cliente?.razaoSocial || selected.cliente?.nome || 'Sem cliente'}</p>
              </div>
              <div>
                <p className="text-gray-500">Validade</p>
                <p className="text-gray-200">{formatDate(selected.validadeDate)}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <span className={`badge ${statusColors[selected.status] || 'badge-gray'}`}>{getStatusLabel(selected.status)}</span>
              </div>
              <div>
                <p className="text-gray-500">Criado em</p>
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

            <div className="flex justify-between border-t border-gray-800 pt-3 text-sm">
              {selected.desconto > 0 && (
                <span className="text-red-400">Desconto: -{formatCurrency(selected.desconto)}</span>
              )}
              <span className="text-white font-bold text-base ml-auto">Total: {formatCurrency(selected.total)}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal converter */}
      <Modal open={showConverter} onClose={() => setShowConverter(false)} title="Converter em Venda">
        {selected && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-300">
              Orçamento #{selected.numero?.toString().padStart(4, '0')} · Total: <strong>{formatCurrency(selected.total)}</strong>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-300 mb-2">Formas de pagamento</p>
              {pagamentos.map((pag, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <select
                    value={pag.forma}
                    onChange={e => setPagamentos(pagamentos.map((p, i) => i === idx ? { ...p, forma: e.target.value } : p))}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-xs px-2 py-2"
                  >
                    {FORMAS_PAGAMENTO.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                  <input
                    type="number"
                    value={pag.valor}
                    onChange={e => setPagamentos(pagamentos.map((p, i) => i === idx ? { ...p, valor: e.target.value } : p))}
                    className="w-28 px-2 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-xs"
                  />
                  {pagamentos.length > 1 && (
                    <button onClick={() => setPagamentos(pagamentos.filter((_, i) => i !== idx))} className="text-red-400">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setPagamentos([...pagamentos, { forma: 'DINHEIRO', valor: '' }])}
                className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 mt-1"
              >
                <Plus size={12} /> Adicionar forma
              </button>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={emitirNF} onChange={e => setEmitirNF(e.target.checked)} />
                <span className="text-sm text-gray-300">Emitir NF</span>
              </label>
              {emitirNF && (
                <select
                  value={modeloNF}
                  onChange={e => setModeloNF(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-xs px-2 py-1"
                >
                  <option value="NFCE">NFC-e</option>
                  <option value="NFE">NF-e</option>
                </select>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowConverter(false)}>Cancelar</Button>
              <Button variant="primary" className="flex-1" loading={convertendo} onClick={handleConverter}>
                <ShoppingCart size={14} /> Confirmar Venda
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
