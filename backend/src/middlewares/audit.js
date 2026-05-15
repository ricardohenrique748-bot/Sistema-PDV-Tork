const prisma = require('../config/prisma');
const logger = require('../utils/logger');

const auditMiddleware = async (req, res, next) => {
  res.on('finish', async () => {
    if (req.method !== 'GET' && res.statusCode < 400) {
      try {
        const userId = req.user?.id || null;
        const entity = req.baseUrl?.split('/').pop() || 'unknown';
        const action = `${req.method} ${req.originalUrl}`;

        await prisma.logAuditoria.create({
          data: {
            usuarioId: userId,
            acao: action,
            entidade: entity,
            entidadeId: req.params?.id || null,
            ip: req.ip,
          }
        });
      } catch (e) {
        logger.warn('Falha ao registrar auditoria:', e.message);
      }
    }
  });
  next();
};

module.exports = { auditMiddleware };
