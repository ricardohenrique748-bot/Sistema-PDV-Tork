const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { mapearStatusFocus } = require('../services/nfe/nfeService');
const logger = require('../utils/logger');

// Webhook Focus NF-e
router.post('/focus', async (req, res) => {
  try {
    logger.info('Webhook Focus NF-e recebido:', JSON.stringify(req.body).substring(0, 500));
    const data = req.body;
    const ref = data.ref; // ID de referência enviado no POST

    if (ref) {
      const notaFiscalId = ref.replace('tork_', '');
      const nf = await prisma.notaFiscal.findFirst({
        where: { OR: [{ id: notaFiscalId }, { focusNFeId: ref }] }
      });

      if (nf) {
        await prisma.notaFiscal.update({
          where: { id: nf.id },
          data: {
            status: mapearStatusFocus(data.status),
            chaveAcesso: data.chave_nfe || nf.chaveAcesso,
            protocolo: data.protocolo || nf.protocolo,
            xMotivo: data.mensagem_sefaz || nf.xMotivo,
            cStat: data.codigo_verificacao ? parseInt(data.codigo_verificacao) : nf.cStat,
            dataAutorizacao: data.data_autorizacao ? new Date(data.data_autorizacao) : nf.dataAutorizacao,
          }
        });
        logger.info(`NF ${nf.id} atualizada via webhook: ${data.status}`);
      }
    }
    res.status(200).json({ received: true });
  } catch (err) {
    logger.error('Erro no webhook:', err.message);
    res.status(200).json({ received: true }); // Sempre retorna 200 para não retentar
  }
});

module.exports = router;
