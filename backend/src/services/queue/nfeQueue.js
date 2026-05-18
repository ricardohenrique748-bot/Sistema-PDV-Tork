const Bull = require('bull');
const logger = require('../../utils/logger');

let nfeQueue;

function getQueue() {
  if (!nfeQueue) {
    nfeQueue = new Bull('nfe-emission', {
      redis: process.env.REDIS_URL || {
        host: '127.0.0.1',
        port: 6379,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      }
    });

    nfeQueue.process(async (job) => {
      const { emitirNF } = require('../nfe/nfeService');
      return await emitirNF(job.data.notaFiscalId);
    });

    nfeQueue.on('completed', (job) => {
      logger.info(`Job NF ${job.id} concluído: ${job.data.notaFiscalId}`);
    });

    nfeQueue.on('failed', (job, err) => {
      logger.error(`Job NF ${job.id} falhou: ${err.message}`);
    });
  }
  return nfeQueue;
}

async function emitirNotaFiscalJob(notaFiscalId) {
  try {
    const { emitirNF } = require('../nfe/nfeService');
    
    // Se não houver REDIS configurado, processa no background sem usar o Bull (Fire and Forget)
    if (!process.env.REDIS_URL) {
      logger.info('REDIS_URL não configurado. Processando emissão em background nativo (sem fila).');
      setImmediate(() => emitirNF(notaFiscalId).catch(e => logger.error(`Falha na emissão direta NF ${notaFiscalId}: ${e.message}`)));
      return `local-${Date.now()}`;
    }

    const queue = getQueue();
    const job = await queue.add({ notaFiscalId }, { priority: 1 });
    logger.info(`Job de emissão enfileirado: ${job.id} para NF ${notaFiscalId}`);
    return job.id;
  } catch (err) {
    logger.warn('Erro ao acessar Redis. Agendando emissão direta (fire-and-forget)...');
    const { emitirNF } = require('../nfe/nfeService');
    setImmediate(() => emitirNF(notaFiscalId).catch(e => logger.error(`Falha na emissão direta NF ${notaFiscalId}: ${e.message}`)));
    return `fallback-${Date.now()}`;
  }
}

module.exports = { emitirNotaFiscalJob, getQueue };
