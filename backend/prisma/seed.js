const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Empresa
  const empresa = await prisma.empresa.upsert({
    where: { cnpj: '12345678000190' },
    update: {},
    create: {
      razaoSocial: 'TORK PEÇAS AUTOMOTIVAS LTDA',
      nomeFantasia: 'Tork Auto Peças',
      cnpj: '12345678000190',
      inscricaoEstadual: '123456789',
      cnae: '4530703',
      regimeTributario: 1,
      logradouro: 'Rua das Peças',
      numero: '1000',
      complemento: 'Galpão A',
      bairro: 'Industrial',
      municipio: 'São Paulo',
      uf: 'SP',
      cep: '01310100',
      codigoMunicipio: '3550308',
      telefone: '(11) 3333-4444',
      email: 'contato@tork.com.br',
      ambienteNF: 2,
    }
  });
  console.log('✅ Empresa configurada:', empresa.nomeFantasia);

  // Usuário Admin
  const senhaHash = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@empresa.com' },
    update: {},
    create: { nome: 'Administrador', email: 'admin@empresa.com', senha: senhaHash, role: 'ADMIN' }
  });
  const vendedor = await prisma.usuario.upsert({
    where: { email: 'vendedor@empresa.com' },
    update: {},
    create: { nome: 'Carlos Vendedor', email: 'vendedor@empresa.com', senha: senhaHash, role: 'VENDEDOR' }
  });
  console.log('✅ Usuários criados:', admin.email, vendedor.email);

  // Categorias
  const categorias = await Promise.all([
    prisma.categoria.upsert({ where: { nome: 'Freios' }, update: {}, create: { nome: 'Freios', descricao: 'Pastilhas, discos, tambores e componentes de freio' } }),
    prisma.categoria.upsert({ where: { nome: 'Motor' }, update: {}, create: { nome: 'Motor', descricao: 'Componentes do motor e bloco' } }),
    prisma.categoria.upsert({ where: { nome: 'Suspensão' }, update: {}, create: { nome: 'Suspensão', descricao: 'Amortecedores, molas e componentes de suspensão' } }),
    prisma.categoria.upsert({ where: { nome: 'Elétrica' }, update: {}, create: { nome: 'Elétrica', descricao: 'Bateria, alternador, motor de partida' } }),
    prisma.categoria.upsert({ where: { nome: 'Filtros' }, update: {}, create: { nome: 'Filtros', descricao: 'Filtros de óleo, ar, combustível e cabine' } }),
    prisma.categoria.upsert({ where: { nome: 'Transmissão' }, update: {}, create: { nome: 'Transmissão', descricao: 'Embreagem, câmbio e componentes' } }),
  ]);
  console.log('✅ Categorias criadas:', categorias.length);

  // Fornecedores
  const fornecedor1 = await prisma.fornecedor.create({ data: { nome: 'Bosch Distribuidora', cnpj: '09168337000143', contato: 'João Silva', email: 'joao@bosch.com.br', telefone: '(11) 2222-3333' } });
  const fornecedor2 = await prisma.fornecedor.create({ data: { nome: 'Cofap Parts', cnpj: '33200056000160', contato: 'Maria Costa', email: 'maria@cofap.com.br', telefone: '(11) 4444-5555' } });
  console.log('✅ Fornecedores criados');

  // Peças
  const pecaData = [
    { codigo: 'PST-001', nome: 'Pastilha de Freio Dianteira Bosch', ncm: '68138110', categoriaId: categorias[0].id, precoCompra: 45.00, precoVenda: 89.90, estoqueAtual: 50, estoqueMinimo: 10, cfop: '5102', csosn: '400' },
    { codigo: 'DSC-001', nome: 'Disco de Freio Ventilado Celta', ncm: '73259900', categoriaId: categorias[0].id, precoCompra: 85.00, precoVenda: 165.00, estoqueAtual: 20, estoqueMinimo: 5, cfop: '5102', csosn: '400' },
    { codigo: 'FLT-OL-001', nome: 'Filtro de Óleo Mann W712/75', ncm: '84212100', categoriaId: categorias[4].id, precoCompra: 15.00, precoVenda: 32.90, estoqueAtual: 80, estoqueMinimo: 20, cfop: '5102', csosn: '400' },
    { codigo: 'FLT-AR-001', nome: 'Filtro de Ar Fram CA7628', ncm: '84213100', categoriaId: categorias[4].id, precoCompra: 18.00, precoVenda: 38.50, estoqueAtual: 60, estoqueMinimo: 15, cfop: '5102', csosn: '400' },
    { codigo: 'AMT-001', nome: 'Amortecedor Dianteiro Cofap Onix', ncm: '87088000', categoriaId: categorias[2].id, precoCompra: 120.00, precoVenda: 235.00, estoqueAtual: 15, estoqueMinimo: 4, cfop: '5102', csosn: '400' },
    { codigo: 'VEL-001', nome: 'Vela de Ignição NGK BPR6ES', ncm: '85111000', categoriaId: categorias[1].id, precoCompra: 8.50, precoVenda: 18.90, estoqueAtual: 120, estoqueMinimo: 30, cfop: '5102', csosn: '400' },
    { codigo: 'COR-001', nome: 'Correia Dentada Gates Gol 1.6', ncm: '40103999', categoriaId: categorias[1].id, precoCompra: 35.00, precoVenda: 72.00, estoqueAtual: 8, estoqueMinimo: 5, cfop: '5102', csosn: '400' },
    { codigo: 'EMB-001', nome: 'Kit Embreagem Sachs Gol G5', ncm: '16300000', categoriaId: categorias[5].id, precoCompra: 280.00, precoVenda: 520.00, estoqueAtual: 3, estoqueMinimo: 2, cfop: '5102', csosn: '400' },
    { codigo: 'BAT-001', nome: 'Bateria Moura 60Ah M60GD', ncm: '85072000', categoriaId: categorias[3].id, precoCompra: 320.00, precoVenda: 599.00, estoqueAtual: 6, estoqueMinimo: 3, cfop: '5102', csosn: '400' },
    { codigo: 'PST-002', nome: 'Pastilha de Freio Traseira TRW', ncm: '68138110', categoriaId: categorias[0].id, precoCompra: 38.00, precoVenda: 75.00, estoqueAtual: 2, estoqueMinimo: 8, cfop: '5102', csosn: '400' },
  ];

  const pecas = [];
  for (const p of pecaData) {
    const margem = (((p.precoVenda - p.precoCompra) / p.precoCompra) * 100).toFixed(2);
    const peca = await prisma.peca.create({ data: { ...p, margemLucro: Number(margem), unidade: 'UN' } });
    pecas.push(peca);
  }
  console.log('✅ Peças criadas:', pecas.length);

  // Clientes
  const clientePF = await prisma.cliente.create({
    data: {
      tipoPessoa: 'FISICA', nome: 'João Silva Santos', cpf: '12345678901',
      email: 'joao.silva@email.com', celular: '(11) 98765-4321',
      logradouro: 'Rua das Flores', numero: '45', bairro: 'Jardim Primavera',
      municipio: 'São Paulo', uf: 'SP', cep: '01310200',
    }
  });
  const clientePJ1 = await prisma.cliente.create({
    data: {
      tipoPessoa: 'JURIDICA', nome: 'Auto Center Express', razaoSocial: 'EXPRESS SERVICOS AUTOMOTIVOS LTDA',
      cnpj: '98765432000111', inscricaoEstadual: '987654321',
      email: 'compras@expresscenter.com.br', telefone: '(11) 3333-2222',
      logradouro: 'Av. Paulista', numero: '1000', complemento: 'Sala 5',
      bairro: 'Bela Vista', municipio: 'São Paulo', uf: 'SP', cep: '01310100',
      codigoMunicipio: '3550308', limiteCredito: 5000.00,
    }
  });
  const clientePJ2 = await prisma.cliente.create({
    data: {
      tipoPessoa: 'JURIDICA', nome: 'Oficina do Zé', razaoSocial: 'JOSE MECANICA ME',
      cnpj: '11223344000155', inscricaoEstadual: '112233445',
      email: 'ze@oficina.com.br', celular: '(11) 97777-8888',
      logradouro: 'Rua dos Mecânicos', numero: '200',
      bairro: 'Industrial', municipio: 'Guarulhos', uf: 'SP', cep: '07180000',
      limiteCredito: 2000.00,
    }
  });
  console.log('✅ Clientes criados:', 3);

  // Venda 1 (concluída, sem NF)
  const venda1 = await prisma.venda.create({
    data: {
      clienteId: clientePF.id,
      usuarioId: vendedor.id,
      status: 'CONCLUIDA',
      subtotal: 198.60,
      desconto: 0,
      total: 198.60,
      observacoes: 'Cliente fiel - venda balcão',
      itens: {
        create: [
          { pecaId: pecas[0].id, quantidade: 1, precoUnitario: 89.90, desconto: 0, total: 89.90 },
          { pecaId: pecas[2].id, quantidade: 1, precoUnitario: 32.90, desconto: 0, total: 32.90 },
          { pecaId: pecas[5].id, quantidade: 4, precoUnitario: 18.90, desconto: 0, total: 75.60 },
        ]
      },
      pagamentos: { create: [{ forma: 'PIX', valor: 198.60 }] }
    }
  });

  // Baixa estoque venda 1
  await prisma.peca.update({ where: { id: pecas[0].id }, data: { estoqueAtual: { decrement: 1 } } });
  await prisma.peca.update({ where: { id: pecas[2].id }, data: { estoqueAtual: { decrement: 1 } } });
  await prisma.peca.update({ where: { id: pecas[5].id }, data: { estoqueAtual: { decrement: 4 } } });

  // Venda 2 (B2B com NF)
  const venda2 = await prisma.venda.create({
    data: {
      clienteId: clientePJ1.id,
      usuarioId: admin.id,
      status: 'CONCLUIDA',
      subtotal: 2105.00,
      desconto: 105.00,
      total: 2000.00,
      observacoes: 'Pedido mensal oficina',
      itens: {
        create: [
          { pecaId: pecas[4].id, quantidade: 2, precoUnitario: 235.00, desconto: 0, total: 470.00 },
          { pecaId: pecas[7].id, quantidade: 2, precoUnitario: 520.00, desconto: 50, total: 940.00 },
          { pecaId: pecas[8].id, quantidade: 1, precoUnitario: 599.00, desconto: 55, total: 544.00 },
          { pecaId: pecas[0].id, quantidade: 2, precoUnitario: 89.90, desconto: 0, total: 179.80 },
        ]
      },
      pagamentos: {
        create: [
          { forma: 'BOLETO', valor: 1000.00, parcelas: 1 },
          { forma: 'CREDIARIO', valor: 1000.00, parcelas: 2 },
        ]
      }
    }
  });

  // NF para venda 2
  await prisma.notaFiscal.create({
    data: {
      vendaId: venda2.id,
      clienteId: clientePJ1.id,
      usuarioId: admin.id,
      modelo: 'NFE',
      serie: 1,
      numero: 49,
      status: 'DIGITANDO',
      totalNF: 2000.00,
      ambienteNF: 2,
    }
  });

  console.log('✅ Vendas criadas:', 2);

  // Orçamento
  await prisma.orcamento.create({
    data: {
      clienteId: clientePJ2.id,
      usuarioId: vendedor.id,
      status: 'PENDENTE',
      subtotal: 547.00,
      desconto: 0,
      total: 547.00,
      validadeDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      observacoes: 'Orçamento para revisão 30.000km',
      itens: {
        create: [
          { pecaId: pecas[2].id, quantidade: 1, precoUnitario: 32.90, desconto: 0, total: 32.90 },
          { pecaId: pecas[3].id, quantidade: 1, precoUnitario: 38.50, desconto: 0, total: 38.50 },
          { pecaId: pecas[6].id, quantidade: 1, precoUnitario: 72.00, desconto: 0, total: 72.00 },
          { pecaId: pecas[5].id, quantidade: 4, precoUnitario: 18.90, desconto: 0, total: 75.60 },
          { pecaId: pecas[4].id, quantidade: 1, precoUnitario: 235.00, desconto: 0, total: 235.00 },
        ]
      }
    }
  });
  console.log('✅ Orçamento criado');

  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('   Login: admin@empresa.com / Admin@123');
  console.log('   Login: vendedor@empresa.com / Admin@123');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
