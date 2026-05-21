require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const clienteRoutes = require('./routes/cliente.routes');
const pecaRoutes = require('./routes/peca.routes');
const categoriaRoutes = require('./routes/categoria.routes');
const fornecedorRoutes = require('./routes/fornecedor.routes');
const vendaRoutes = require('./routes/venda.routes');
const orcamentoRoutes = require('./routes/orcamento.routes');
const notaFiscalRoutes = require('./routes/notaFiscal.routes');
const relatorioRoutes = require('./routes/relatorio.routes');
const empresaRoutes = require('./routes/empresa.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const webhookRoutes = require('./routes/webhook.routes');
const uploadRoutes = require('./routes/upload.routes');
const notificacoesRoutes = require('./routes/notificacoes.routes');

const { errorHandler } = require('./middlewares/errorHandler');
const { auditMiddleware } = require('./middlewares/audit');

const app = express();

// Necessário para rate limit funcionar corretamente atrás do proxy da Vercel/AWS
app.set('trust proxy', 1);

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem origin (ex: Postman, curl)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://sistema-pdv-tork.vercel.app',
      'https://torkrl.com.br',
      'https://www.torkrl.com.br',
    ];

    // Adiciona FRONTEND_URL do ambiente se definido
    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL);
    }

    // Aceita qualquer URL de preview do Vercel para este projeto
    const isVercelPreview = /^https:\/\/sistema-pdv-tork-.*\.vercel\.app$/.test(origin);

    if (allowedOrigins.includes(origin) || isVercelPreview) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin não permitida: ${origin}`));
    }
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Muitas requisições, tente novamente em 15 minutos.' }
});
const nfLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Limite de emissões atingido. Aguarde 1 minuto.' }
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Audit middleware
app.use(auditMiddleware);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/pecas', pecaRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/fornecedores', fornecedorRoutes);
app.use('/api/vendas', vendaRoutes);
app.use('/api/orcamentos', orcamentoRoutes);
app.use('/api/notas-fiscais', nfLimiter, notaFiscalRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/empresa', empresaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notificacoes', notificacoesRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Error handler
app.use(errorHandler);

module.exports = app;
