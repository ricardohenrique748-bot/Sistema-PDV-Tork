require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3001;

const ZERO_KEY = '0'.repeat(64);
if (!process.env.CERT_ENCRYPTION_KEY || process.env.CERT_ENCRYPTION_KEY === ZERO_KEY) {
  logger.warn('⚠️  CERT_ENCRYPTION_KEY está com valor padrão (zeros). Troque por uma chave aleatória antes de ir para produção!');
}

app.listen(PORT, () => {
  logger.info(`🚀 Servidor Tork rodando na porta ${PORT}`);
  logger.info(`🌍 Ambiente: ${process.env.NODE_ENV}`);
});
