import { create } from 'zustand';

export const useCartStore = create((set, get) => ({
  items: [],
  cliente: null,
  desconto: 0,
  tipoDesconto: 'VALOR',
  pagamentos: [],
  modeloNF: 'NFCE',
  observacoes: '',

  addItem: (peca, quantidade = 1) => {
    const items = get().items;
    const existing = items.find(i => i.pecaId === peca.id);
    if (existing) {
      set({
        items: items.map(i =>
          i.pecaId === peca.id
            ? { ...i, quantidade: i.quantidade + quantidade, total: (i.quantidade + quantidade) * i.precoUnitario }
            : i
        )
      });
    } else {
      set({
        items: [...items, {
          pecaId: peca.id,
          peca,
          quantidade,
          precoUnitario: Number(peca.precoVenda),
          desconto: 0,
          total: Number(peca.precoVenda) * quantidade,
        }]
      });
    }
  },

  removeItem: (pecaId) =>
    set({ items: get().items.filter(i => i.pecaId !== pecaId) }),

  updateItem: (pecaId, updates) =>
    set({
      items: get().items.map(i => {
        if (i.pecaId !== pecaId) return i;
        const updated = { ...i, ...updates };
        updated.total = (updated.precoUnitario - updated.desconto) * updated.quantidade;
        return updated;
      })
    }),

  setCliente: (cliente) => set({ cliente }),
  setDesconto: (desconto, tipo) => set({ desconto, tipoDesconto: tipo }),
  setPagamentos: (pagamentos) => set({ pagamentos }),
  setModeloNF: (modelo) => set({ modeloNF: modelo }),
  setObservacoes: (obs) => set({ observacoes: obs }),

  getSubtotal: () => get().items.reduce((s, i) => s + i.total, 0),

  getTotal: () => {
    const subtotal = get().items.reduce((s, i) => s + i.total, 0);
    const { desconto, tipoDesconto } = get();
    const descontoVal = tipoDesconto === 'PERCENT' ? (subtotal * desconto / 100) : Number(desconto);
    return Math.max(0, subtotal - descontoVal);
  },

  clearCart: () => set({
    items: [], cliente: null, desconto: 0, tipoDesconto: 'VALOR',
    pagamentos: [], modeloNF: 'NFCE', observacoes: '',
  }),
}));
