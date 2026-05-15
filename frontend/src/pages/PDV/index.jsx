import { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, User, Tag, FileText, X } from 'lucide-react';
import { Button, Card, Spinner } from '../../components/ui/index.jsx';
import { formatCurrency, formatCPF, formatCNPJ } from '../../utils/formatters';
import { useCartStore } from '../../store/cartStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function PDV() {
  const navigate = useNavigate();
  const [searchPeca, setSearchPeca] = useState('');
  const [pecas, setPecas] = useState([]);
  const [searchingPecas, setSearchingPecas] = useState(false);
  const [showPecaResults, setShowPecaResults] = useState(false);

  const [clienteSearch, setClienteSearch] = useState('');
  const [clientes, setClientes] = useState([]);
  const [searchingClientes, setSearchingClientes] = useState(false);
  const [showClienteResults, setShowClienteResults] = useState(false);

  const [tipoDesconto, setTipoDesconto] = useState('VALOR');
  const [descontoInput, setDescontoInput] = useState('');
  const [salvando, setSalvando] = useState(false);

  const {
    items, cliente, desconto,
    addItem, removeItem, updateItem,
    setCliente, setDesconto,
    getSubtotal, getTotal, clearCart,
  } = useCartStore();

  // Busca peças com debounce
  useEffect(() => {
    if (searchPeca.length < 2) { setPecas([]); setShowPecaResults(false); return; }
    setSearchingPecas(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/pecas', { params: { search: searchPeca, limit: 8 } });
        setPecas(data.data || []);
        setShowPecaResults(true);
      } catch { } finally { setSearchingPecas(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchPeca]);

  // Busca clientes com debounce
  useEffect(() => {
    if (clienteSearch.length < 2) { setClientes([]); setShowClienteResults(false); return; }
    setSearchingClientes(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/clientes', { params: { search: clienteSearch, limit: 6 } });
        setClientes(data.data || []);
        setShowClienteResults(true);
      } catch { } finally { setSearchingClientes(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [clienteSearch]);

  const handleAddPeca = (peca) => {
    if (peca.estoqueAtual <= 0) {
      toast.error(`Sem estoque para ${peca.nome}`);
      return;
    }
    addItem(peca);
    setSearchPeca('');
    setShowPecaResults(false);
    toast.success(`${peca.nome} adicionado`, { duration: 1500, position: 'bottom-right' });
  };

  const handleSelectCliente = (c) => {
    setCliente(c);
    setClienteSearch(c.razaoSocial || c.nome);
    setShowClienteResults(false);
  };

  const subtotal = getSubtotal();
  const total = getTotal();
  const descontoVal = tipoDesconto === 'PERCENT' ? (subtotal * Number(descontoInput) / 100) : Number(descontoInput) || 0;

  useEffect(() => {
    setDesconto(Number(descontoInput) || 0, tipoDesconto);
  }, [descontoInput, tipoDesconto]);

  const handleSalvarOrcamento = async () => {
    if (!items.length) { toast.error('Adicione pelo menos uma peça.'); return; }
    setSalvando(true);
    try {
      await api.post('/orcamentos', {
        clienteId: cliente?.id || null,
        itens: items.map(i => ({ pecaId: i.pecaId, quantidade: i.quantidade, precoUnitario: i.precoUnitario, desconto: i.desconto })),
        desconto: Number(descontoInput) || 0,
        tipoDesconto,
        validadeDias: 7,
      });
      toast.success('Orçamento salvo com sucesso!');
      clearCart();
      navigate('/orcamentos');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar orçamento.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Nova Venda (PDV)</h1>
        <p className="text-gray-400 text-sm mt-1">Adicione peças, selecione o cliente e finalize a venda</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT: Busca e carrinho */}
        <div className="xl:col-span-2 space-y-4">
          {/* Busca de peças */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Search size={14} /> Buscar Peça
            </h3>
            <div className="relative">
              <input
                type="text"
                value={searchPeca}
                onChange={e => setSearchPeca(e.target.value)}
                placeholder="Código, nome ou categoria..."
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10"
                onFocus={() => searchPeca.length >= 2 && setShowPecaResults(true)}
                onBlur={() => setTimeout(() => setShowPecaResults(false), 200)}
                autoFocus
              />
              {searchingPecas && <Spinner size={16} className="absolute right-3 top-1/2 -translate-y-1/2" />}

              {showPecaResults && pecas.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-20 overflow-hidden">
                  {pecas.map(peca => (
                    <button
                      key={peca.id}
                      className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-0"
                      onMouseDown={() => handleAddPeca(peca)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-200 truncate">{peca.nome}</p>
                          <p className="text-xs text-gray-500">{peca.codigo} · {peca.categoria?.nome}</p>
                        </div>
                        <div className="text-right ml-3">
                          <p className="text-sm font-bold text-green-400">{formatCurrency(peca.precoVenda)}</p>
                          <p className={`text-xs ${peca.estoqueAtual <= peca.estoqueMinimo ? 'text-red-400' : 'text-gray-500'}`}>
                            Estoque: {peca.estoqueAtual}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {showPecaResults && !searchingPecas && pecas.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg p-4 text-center text-gray-500 text-sm z-20">
                  Nenhuma peça encontrada para "{searchPeca}"
                </div>
              )}
            </div>
          </Card>

          {/* Carrinho */}
          <Card className="p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <ShoppingCart size={14} /> Itens ({items.length})
              </h3>
              {items.length > 0 && (
                <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                  <Trash2 size={12} /> Limpar
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-sm">
                <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                Nenhuma peça adicionada
              </div>
            ) : (
              <div>
                <table className="tork-table">
                  <thead>
                    <tr>
                      <th>Peça</th>
                      <th className="text-center">Qtd</th>
                      <th className="text-right">Preço</th>
                      <th className="text-right">Desc.</th>
                      <th className="text-right">Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.pecaId}>
                        <td>
                          <p className="font-medium text-gray-200 text-sm">{item.peca.nome}</p>
                          <p className="text-xs text-gray-500">{item.peca.codigo}</p>
                        </td>
                        <td>
                          <div className="flex items-center gap-1 justify-center">
                            <button
                              onClick={() => item.quantidade > 1
                                ? updateItem(item.pecaId, { quantidade: item.quantidade - 1 })
                                : removeItem(item.pecaId)
                              }
                              className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-gray-300"
                            >
                              <Minus size={10} />
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={item.peca.estoqueAtual}
                              value={item.quantidade}
                              onChange={e => updateItem(item.pecaId, { quantidade: Math.max(1, parseInt(e.target.value) || 1) })}
                              className="w-12 text-center bg-gray-700 border-0 rounded text-sm text-white py-0.5"
                            />
                            <button
                              onClick={() => updateItem(item.pecaId, { quantidade: Math.min(item.peca.estoqueAtual, item.quantidade + 1) })}
                              className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-gray-300"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        </td>
                        <td className="text-right text-sm">
                          <input
                            type="number"
                            value={item.precoUnitario}
                            onChange={e => updateItem(item.pecaId, { precoUnitario: Number(e.target.value) })}
                            className="w-24 text-right bg-gray-700 border-0 rounded text-sm text-gray-200 py-0.5 px-1"
                          />
                        </td>
                        <td className="text-right text-sm">
                          <input
                            type="number"
                            value={item.desconto}
                            onChange={e => updateItem(item.pecaId, { desconto: Number(e.target.value) })}
                            className="w-20 text-right bg-gray-700 border-0 rounded text-sm text-gray-400 py-0.5 px-1"
                          />
                        </td>
                        <td className="text-right font-semibold text-green-400 text-sm">{formatCurrency(item.total)}</td>
                        <td>
                          <button onClick={() => removeItem(item.pecaId)} className="text-gray-600 hover:text-red-400 transition-colors">
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT: Painel de finalização */}
        <div className="space-y-4">
          {/* Cliente */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <User size={14} /> Cliente
            </h3>
            <div className="relative">
              <input
                type="text"
                value={clienteSearch}
                onChange={e => setClienteSearch(e.target.value)}
                placeholder="Buscar por nome, CPF ou CNPJ..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                onFocus={() => clienteSearch.length >= 2 && setShowClienteResults(true)}
                onBlur={() => setTimeout(() => setShowClienteResults(false), 200)}
              />
              {showClienteResults && clientes.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-20 overflow-hidden">
                  {clientes.map(c => (
                    <button
                      key={c.id}
                      className="w-full px-3 py-2.5 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-0"
                      onMouseDown={() => handleSelectCliente(c)}
                    >
                      <p className="text-sm font-medium text-gray-200">{c.razaoSocial || c.nome}</p>
                      <p className="text-xs text-gray-500">{c.cpf ? formatCPF(c.cpf) : formatCNPJ(c.cnpj)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {cliente && (
              <div className="mt-2 p-2 bg-gray-800 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-200">{cliente.razaoSocial || cliente.nome}</p>
                  <p className="text-xs text-gray-500">{cliente.tipoPessoa === 'FISICA' ? formatCPF(cliente.cpf) : formatCNPJ(cliente.cnpj)}</p>
                </div>
                <button onClick={() => { setCliente(null); setClienteSearch(''); }} className="text-gray-600 hover:text-red-400">
                  <X size={14} />
                </button>
              </div>
            )}
          </Card>

          {/* Desconto */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Tag size={14} /> Desconto
            </h3>
            <div className="flex gap-2">
              <select
                value={tipoDesconto}
                onChange={e => setTipoDesconto(e.target.value)}
                className="w-20 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-xs px-2 py-2 focus:outline-none"
              >
                <option value="VALOR">R$</option>
                <option value="PERCENT">%</option>
              </select>
              <input
                type="number"
                min={0}
                value={descontoInput}
                onChange={e => setDescontoInput(e.target.value)}
                placeholder="0"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </Card>

          {/* Totais */}
          <Card>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {descontoVal > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>Desconto</span>
                  <span>- {formatCurrency(descontoVal)}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-bold text-lg border-t border-gray-800 pt-2">
                <span>Total</span>
                <span className="text-green-400">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="mt-4">
              <Button
                variant="primary"
                className="w-full"
                loading={salvando}
                onClick={handleSalvarOrcamento}
                disabled={!items.length}
              >
                <FileText size={14} /> Salvar Orçamento
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
