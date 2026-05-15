import { useState, useEffect, useRef } from 'react';
import { Package, Plus, Edit, Trash2, AlertTriangle, TrendingUp, TrendingDown, Layers } from 'lucide-react';
import {
  Button, Card, PageHeader, Spinner, Modal, EmptyState, Pagination, SearchInput, Input
} from '../../components/ui/index.jsx';
import { formatCurrency } from '../../utils/formatters';
import api from '../../services/api';
import toast from 'react-hot-toast';

const defaultForm = {
  codigo: '', codigoBarras: '', nome: '', descricao: '', categoriaId: '',
  ncm: '', cest: '', cfop: '5102', csosn: '400', unidade: 'UN',
  precoCompra: '', precoVenda: '', estoqueAtual: 0, estoqueMinimo: 1,
  localizacao: '',
};

export default function Pecas() {
  const [pecas, setPecas] = useState([]);
  const [categorias, setCategoriasState] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroEstoqueMinimo, setFiltroEstoqueMinimo] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [showEstoque, setShowEstoque] = useState(false);
  const [selectedPeca, setSelectedPeca] = useState(null);
  const [ajusteQtd, setAjusteQtd] = useState('');
  const [ajusteTipo, setAjusteTipo] = useState('ENTRADA');
  const [ajusteMotivo, setAjusteMotivo] = useState('');
  const [ajustando, setAjustando] = useState(false);
  const categoriasLoaded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const params = { search, page, limit: 15 };
        if (filtroCategoria) params.categoria = filtroCategoria;
        if (filtroEstoqueMinimo) params.estoqueMinimo = 'true';

        const requests = [api.get('/pecas', { params })];
        if (!categoriasLoaded.current) requests.push(api.get('/categorias'));

        const results = await Promise.all(requests);
        if (!cancelled) {
          setPecas(results[0].data.data || []);
          setTotal(results[0].data.total || 0);
          if (!categoriasLoaded.current && results[1]) {
            setCategoriasState(results[1].data.data || []);
            categoriasLoaded.current = true;
          }
        }
      } catch {
        if (!cancelled) toast.error('Erro ao carregar peças.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [search, page, filtroCategoria, filtroEstoqueMinimo, refresh]);

  const openNew = () => { setForm(defaultForm); setEditingId(null); setShowModal(true); };
  const openEdit = (p) => { setForm({ ...defaultForm, ...p, categoriaId: p.categoriaId || '' }); setEditingId(p.id); setShowModal(true); };
  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const calcMargem = (compra, venda) => {
    if (!compra || !venda || Number(compra) === 0) return '';
    return (((Number(venda) - Number(compra)) / Number(compra)) * 100).toFixed(1);
  };

  const handleSave = async () => {
    if (!form.codigo || !form.nome || !form.categoriaId || !form.precoCompra || !form.precoVenda) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/pecas/${editingId}`, form);
        toast.success('Peça atualizada!');
      } else {
        await api.post('/pecas', form);
        toast.success('Peça cadastrada!');
      }
      setShowModal(false);
      setRefresh(r => r + 1);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar peça.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Inativar esta peça?')) return;
    try {
      await api.delete(`/pecas/${id}`);
      toast.success('Peça inativada.');
      setRefresh(r => r + 1);
    } catch {
      toast.error('Erro ao inativar peça.');
    }
  };

  const handleAjuste = async () => {
    if (!ajusteQtd || Number(ajusteQtd) <= 0) { toast.error('Quantidade inválida.'); return; }
    setAjustando(true);
    try {
      await api.post(`/pecas/${selectedPeca.id}/estoque`, {
        quantidade: Number(ajusteQtd),
        tipo: ajusteTipo,
        motivo: ajusteMotivo || 'Ajuste manual',
      });
      toast.success('Estoque ajustado!');
      setShowEstoque(false);
      setAjusteQtd('');
      setAjusteMotivo('');
      setRefresh(r => r + 1);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao ajustar estoque.');
    } finally {
      setAjustando(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Peças / Estoque"
        subtitle={`${total} peças cadastradas`}
        action={<Button onClick={openNew}><Plus size={16} /> Nova Peça</Button>}
      />

      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48">
            <SearchInput value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Código, nome ou descrição..." />
          </div>
          <select
            value={filtroCategoria}
            onChange={e => { setFiltroCategoria(e.target.value); setPage(1); }}
            className="bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm px-3 py-2"
          >
            <option value="">Todas as categorias</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
            <input type="checkbox" checked={filtroEstoqueMinimo} onChange={e => { setFiltroEstoqueMinimo(e.target.checked); setPage(1); }} />
            <AlertTriangle size={14} className="text-yellow-400" /> Estoque baixo
          </label>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center"><Spinner /></div>
        ) : pecas.length === 0 ? (
          <EmptyState icon={Package} title="Nenhuma peça encontrada" description="Cadastre sua primeira peça no estoque." action={<Button onClick={openNew}><Plus size={14} /> Nova Peça</Button>} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="tork-table">
                <thead>
                  <tr>
                    <th>Peça</th>
                    <th>Categoria</th>
                    <th>Preço Compra</th>
                    <th>Preço Venda</th>
                    <th>Margem</th>
                    <th className="text-center">Estoque</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pecas.map(p => (
                    <tr key={p.id}>
                      <td>
                        <p className="text-sm font-medium text-gray-200">{p.nome}</p>
                        <p className="text-xs text-gray-500">{p.codigo}{p.codigoBarras && ` · ${p.codigoBarras}`}</p>
                      </td>
                      <td>
                        <span className="badge badge-info">{p.categoria?.nome}</span>
                      </td>
                      <td className="text-sm text-gray-400">{formatCurrency(p.precoCompra)}</td>
                      <td className="text-sm font-medium text-green-400">{formatCurrency(p.precoVenda)}</td>
                      <td>
                        <span className={`text-xs font-medium ${Number(p.margemLucro) >= 20 ? 'text-green-400' : 'text-yellow-400'}`}>
                          {Number(p.margemLucro).toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-center">
                        <div className={`inline-flex items-center gap-1 text-sm font-semibold ${p.estoqueBaixo ? 'text-red-400' : 'text-gray-200'}`}>
                          {p.estoqueBaixo && <AlertTriangle size={12} />}
                          {p.estoqueAtual}
                          <span className="text-xs text-gray-500 font-normal">/ {p.estoqueMinimo}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => { setSelectedPeca(p); setShowEstoque(true); }} title="Ajustar estoque">
                            <Layers size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(p)} title="Editar">
                            <Edit size={14} />
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => handleDelete(p.id)} title="Inativar">
                            <Trash2 size={14} />
                          </Button>
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

      {/* Modal cadastro/edição */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Editar Peça' : 'Nova Peça'} maxWidth="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Código *" value={form.codigo} onChange={e => setF('codigo', e.target.value)} placeholder="Ex: FILTRO-001" />
            <Input label="Código de Barras" value={form.codigoBarras} onChange={e => setF('codigoBarras', e.target.value)} />
            <Input label="Nome *" value={form.nome} onChange={e => setF('nome', e.target.value)} className="col-span-2" />

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-300">Categoria *</label>
              <select
                value={form.categoriaId}
                onChange={e => setF('categoriaId', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm"
              >
                <option value="">Selecione...</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <Input label="Unidade" value={form.unidade} onChange={e => setF('unidade', e.target.value)} placeholder="UN" />

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-300">Preço Compra *</label>
              <input
                type="number"
                step="0.01"
                value={form.precoCompra}
                onChange={e => setF('precoCompra', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-300">
                Preço Venda *{form.precoCompra && form.precoVenda && (
                  <span className="text-green-400 font-normal ml-1">
                    Margem: {calcMargem(form.precoCompra, form.precoVenda)}%
                  </span>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                value={form.precoVenda}
                onChange={e => setF('precoVenda', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm"
              />
            </div>

            <Input label="Estoque Atual" type="number" value={form.estoqueAtual} onChange={e => setF('estoqueAtual', parseInt(e.target.value) || 0)} />
            <Input label="Estoque Mínimo" type="number" value={form.estoqueMinimo} onChange={e => setF('estoqueMinimo', parseInt(e.target.value) || 0)} />

            <div className="col-span-2 border-t border-gray-700 pt-3">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Dados Fiscais</p>
              <div className="grid grid-cols-3 gap-3">
                <Input label="NCM" value={form.ncm} onChange={e => setF('ncm', e.target.value)} placeholder="8 dígitos" />
                <Input label="CEST" value={form.cest} onChange={e => setF('cest', e.target.value)} />
                <Input label="CFOP" value={form.cfop} onChange={e => setF('cfop', e.target.value)} placeholder="5102" />
                <Input label="CSOSN" value={form.csosn} onChange={e => setF('csosn', e.target.value)} placeholder="400" />
                <Input label="Localização" value={form.localizacao} onChange={e => setF('localizacao', e.target.value)} placeholder="Ex: A1-P3" />
              </div>
            </div>

            <div className="col-span-2 space-y-1">
              <label className="block text-sm font-medium text-gray-300">Descrição</label>
              <textarea
                value={form.descricao}
                onChange={e => setF('descricao', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm resize-none"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button variant="primary" className="flex-1" loading={saving} onClick={handleSave}>
              {editingId ? 'Salvar Alterações' : 'Cadastrar Peça'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal ajuste de estoque */}
      <Modal open={showEstoque} onClose={() => setShowEstoque(false)} title="Ajustar Estoque">
        {selectedPeca && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-800 rounded-lg">
              <p className="text-sm font-medium text-gray-200">{selectedPeca.nome}</p>
              <p className="text-xs text-gray-500">Código: {selectedPeca.codigo} · Estoque atual: <strong className="text-white">{selectedPeca.estoqueAtual}</strong></p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setAjusteTipo('ENTRADA')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${ajusteTipo === 'ENTRADA' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              >
                <TrendingUp size={14} /> Entrada
              </button>
              <button
                onClick={() => setAjusteTipo('SAIDA')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${ajusteTipo === 'SAIDA' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              >
                <TrendingDown size={14} /> Saída
              </button>
            </div>

            <Input
              label="Quantidade"
              type="number"
              min={1}
              value={ajusteQtd}
              onChange={e => setAjusteQtd(e.target.value)}
              placeholder="Informe a quantidade"
            />
            <Input
              label="Motivo (opcional)"
              value={ajusteMotivo}
              onChange={e => setAjusteMotivo(e.target.value)}
              placeholder="Ex: Recebimento de fornecedor"
            />

            {ajusteQtd && (
              <div className="p-3 bg-gray-800 rounded-lg text-sm text-center">
                Novo estoque: <strong className="text-white">
                  {ajusteTipo === 'ENTRADA'
                    ? selectedPeca.estoqueAtual + Number(ajusteQtd)
                    : selectedPeca.estoqueAtual - Number(ajusteQtd)
                  }
                </strong>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowEstoque(false)}>Cancelar</Button>
              <Button variant="primary" className="flex-1" loading={ajustando} onClick={handleAjuste}>
                Confirmar Ajuste
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
