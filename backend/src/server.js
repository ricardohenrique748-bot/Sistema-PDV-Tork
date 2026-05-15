require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info(`🚀 Servidor Tork rodando na porta ${PORT}`);
  logger.info(`📖 Documentação: http://localhost:${PORT}/api/docs`);
  logger.info(`🌍 Ambiente: ${process.env.NODE_ENV}`);
});
