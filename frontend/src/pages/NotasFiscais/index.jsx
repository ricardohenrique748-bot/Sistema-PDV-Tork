import React, { useState, useEffect, useCallback } from 'react';
import { Receipt, Search, Filter, Download, Send, XCircle, Eye, RefreshCw, FileEdit } from 'lucide-react';
import {
  Button, Card, SearchInput, PageHeader, Spinner, Badge, Modal, EmptyState, Pagination
} from '../../components/ui/index.jsx';
import { formatCurrency, formatDateTime, getStatusColor, getStatusLabel } from '../../utils/formatters';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function NotasFiscais() {
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroModelo, setFiltroModelo] = useState('');
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCancelar, setShowCancelar] = useState(false);
  const [showCce, setShowCce] = useState(false);
  const [justificativa, setJustificativa] = useState('');
  const [correcao, setCorrecao] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNotas = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (filtroStatus) params.status = filtroStatus;
      if (filtroModelo) params.modelo = filtroModelo;
      const { data } = await api.get('/notas-fiscais', { params });
      setNotas(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error('Erro ao carregar notas fiscais.');
    } finally {
      setLoading(false);
    }
  }, [page, filtroStatus, filtroModelo]);

  useEffect(() => { fetchNotas(); }, [fetchNotas]);

  const handleEmitir = async (nf) => {
    setActionLoading(true);
    try {
      await api.post(`/notas-fiscais/${nf.id}/emitir`);
      toast.success('NF enviada para emissão. Aguarde a autorização da SEFAZ.');
      fetchNotas();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao emitir NF.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelar = async () => {
    if (justificativa.length < 15) { toast.error('Justificativa deve ter mínimo 15 caracteres.'); return; }
    setActionLoading(true);
    try {
      await api.post(`/notas-fiscais/${selected.id}/cancelar`, { justificativa });
      toast.success('NF cancelada com sucesso.');
      setShowCancelar(false);
      fetchNotas();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao cancelar NF.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCce = async () => {
    if (correcao.length < 15) { toast.error('Texto da correção deve ter mínimo 15 caracteres.'); return; }
    setActionLoading(true);
    try {
      await api.post(`/notas-fiscais/${selected.id}/carta-correcao`, { correcao });
      toast.success('Carta de Correção enviada!');
      setShowCce(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao enviar CC-e.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePollingStatus = async (nf) => {
    try {
      const { data } = await api.get(`/notas-fiscais/${nf.id}/status`);
      toast.success(`Status atualizado: ${getStatusLabel(data.status)}`);
      fetchNotas();
    } catch (err) {
      toast.error('Erro ao consultar status.');
    }
  };

  const statusColors = {
    AUTORIZADA: 'badge-success',
    ENVIADA: 'badge-info',
    ASSINADA: 'badge-info',
    DIGITANDO: 'badge-gray',
    CANCELADA: 'badge-danger',
    DENEGADA: 'badge-danger',
    ERRO: 'badge-danger',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notas Fiscais"
        subtitle="Gerencie NF-e e NFC-e emitidas"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchNotas}>
              <RefreshCw size={14} /> Atualizar
            </Button>
          </div>
        }
      />

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={filtroStatus}
            onChange={e => { setFiltroStatus(e.target.value); setPage(1); }}
            className="bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos os status</option>
            <option value="DIGITANDO">Em digitação</option>
            <option value="ENVIADA">Enviada</option>
            <option value="AUTORIZADA">Autorizada</option>
            <option value="CANCELADA">Cancelada</option>
            <option value="ERRO">Erro</option>
          </select>
          <select
            value={filtroModelo}
            onChange={e => { setFiltroModelo(e.target.value); setPage(1); }}
            className="bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos os modelos</option>
            <option value="NFE">NF-e (55)</option>
            <option value="NFCE">NFC-e (65)</option>
          </select>
        </div>
      </Card>

      {/* Tabela */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center"><Spinner /></div>
        ) : notas.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Nenhuma nota fiscal encontrada"
            description="As notas fiscais emitidas aparecerão aqui."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="tork-table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Modelo</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Emissão</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {notas.map(nf => (
                    <tr key={nf.id}>
                      <td>
                        <p className="font-mono text-sm text-gray-200">#{nf.numero?.toString().padStart(6, '0')}</p>
                        {nf.chaveAcesso && (
                          <p className="text-xs text-gray-600 font-mono truncate max-w-[120px]">{nf.chaveAcesso?.substring(0, 20)}...</p>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${nf.modelo === 'NFE' ? 'badge-info' : 'badge-purple'}`}>
                          {nf.modelo === 'NFE' ? 'NF-e' : 'NFC-e'}
                        </span>
                      </td>
                      <td>
                        <p className="text-sm text-gray-200">{nf.cliente?.razaoSocial || nf.cliente?.nome || 'Consumidor final'}</p>
                      </td>
                      <td className="font-semibold text-green-400">{formatCurrency(nf.totalNF)}</td>
                      <td>
                        <span className={`badge ${statusColors[nf.status] || 'badge-gray'}`}>
                          {getStatusLabel(nf.status)}
                        </span>
                      </td>
                      <td className="text-gray-500 text-xs">{formatDateTime(nf.createdAt)}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          {/* Emitir */}
                          {['DIGITANDO', 'ERRO'].includes(nf.status) && (
                            <Button size="sm" variant="primary" onClick={() => handleEmitir(nf)} loading={actionLoading} title="Emitir NF">
                              <Send size={12} />
                            </Button>
                          )}
                          {/* Atualizar status */}
                          {['ENVIADA', 'ASSINADA'].includes(nf.status) && (
                            <Button size="sm" variant="ghost" onClick={() => handlePollingStatus(nf)} title="Consultar status">
                              <RefreshCw size={12} />
                            </Button>
                          )}
                          {/* Cancelar */}
                          {nf.status === 'AUTORIZADA' && (
                            <Button size="sm" variant="danger" onClick={() => { setSelected(nf); setShowCancelar(true); }} title="Cancelar NF">
                              <XCircle size={12} />
                            </Button>
                          )}
                          {/* CC-e */}
                          {nf.status === 'AUTORIZADA' && (
                            <Button size="sm" variant="outline" onClick={() => { setSelected(nf); setShowCce(true); }} title="Carta de Correção">
                              <FileEdit size={12} />
                            </Button>
                          )}
                          {/* XML e PDF Download */}
                          {nf.status === 'AUTORIZADA' && (
                            <>
                              <Button size="sm" variant="ghost" onClick={async () => {
                                try {
                                  const response = await api.get(`/notas-fiscais/${nf.id}/xml`, { responseType: 'blob' });
                                  const url = window.URL.createObjectURL(new Blob([response.data]));
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.setAttribute('download', `nf_${nf.chaveAcesso || nf.id}.xml`);
                                  document.body.appendChild(link);
                                  link.click();
                                  link.remove();
                                } catch (e) { toast.error('Erro ao baixar XML'); }
                              }} title="Download XML">
                                <Download size={12} /> XML
                              </Button>
                              <Button size="sm" variant="ghost" onClick={async () => {
                                try {
                                  const response = await api.get(`/notas-fiscais/${nf.id}/pdf`, { responseType: 'blob' });
                                  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.setAttribute('download', `danfe_${nf.chaveAcesso || nf.id}.pdf`);
                                  document.body.appendChild(link);
                                  link.click();
                                  link.remove();
                                } catch (e) { toast.error('Erro ao baixar PDF'); }
                              }} title="Download PDF">
                                <Download size={12} /> PDF
                              </Button>
                            </>
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

      {/* Modal Cancelamento */}
      <Modal open={showCancelar} onClose={() => setShowCancelar(false)} title="Cancelar Nota Fiscal">
        <div className="space-y-4">
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
            ⚠️ O cancelamento só é permitido até 24h após a autorização e antes da circulação da mercadoria.
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Justificativa (mín. 15 caracteres)</label>
            <textarea
              value={justificativa}
              onChange={e => setJustificativa(e.target.value)}
              rows={4}
              placeholder="Descreva o motivo do cancelamento..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">{justificativa.length}/255 caracteres</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowCancelar(false)}>Voltar</Button>
            <Button variant="danger" className="flex-1" loading={actionLoading} onClick={handleCancelar}>
              Confirmar Cancelamento
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal CC-e */}
      <Modal open={showCce} onClose={() => setShowCce(false)} title="Carta de Correção Eletrônica">
        <div className="space-y-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-blue-300">
            A CC-e não pode corrigir valores, impostos, destinatário ou data de emissão.
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Texto da Correção (mín. 15 caracteres)</label>
            <textarea
              value={correcao}
              onChange={e => setCorrecao(e.target.value)}
              rows={4}
              placeholder="Descreva a correção a ser feita..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowCce(false)}>Cancelar</Button>
            <Button variant="primary" className="flex-1" loading={actionLoading} onClick={handleCce}>
              Enviar CC-e
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
