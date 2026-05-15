const Bull = require('bull');
const logger = require('../../utils/logger');

let nfeQueue;

function getQueue() {
  if (!nfeQueue) {
    nfeQueue = new Bull('nfe-emission', {
      redis: process.env.REDIS_URL || 'redis://localhost:6379',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      }
    });

    // Processor
    nfeQueue.process(async (job) => {
      const { nfeService } = require('../nfe/nfeService');
      return await nfeService.emitirNF(job.data.notaFiscalId);
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
    // Tenta importar o serviço real
    const { emitirNF } = require('../nfe/nfeService');
    const queue = getQueue();
    const job = await queue.add({ notaFiscalId }, { priority: 1 });
    logger.info(`Job de emissão enfileirado: ${job.id} para NF ${notaFiscalId}`);
    return job.id;
  } catch (err) {
    // Redis indisponível — dispara sem aguardar para não bloquear a resposta HTTP
    logger.warn('Redis não disponível. Agendando emissão direta (fire-and-forget)...');
    const { emitirNF } = require('../nfe/nfeService');
    setImmediate(() => emitirNF(notaFiscalId).catch(e => logger.error(`Falha na emissão direta NF ${notaFiscalId}: ${e.message}`)));
  }
}

module.exports = { emitirNotaFiscalJob, getQueue };
