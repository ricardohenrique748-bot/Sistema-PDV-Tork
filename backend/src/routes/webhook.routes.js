const express = require('express');
const router = express.Router();
const axios = require('axios');
const prisma = require('../config/prisma');
const { mapearStatusFocus } = require('../services/nfe/focusService');
const logger = require('../utils/logger');

// Webhook Focus NF-e — configurar a URL pública no painel da Focus
router.post('/focus', async (req, res) => {
  // Sempre retorna 200 para a Focus não retentar
  res.status(200).json({ received: true });

  try {
    const data = req.body;
    logger.info('[Webhook Focus] recebido:', JSON.stringify(data).substring(0, 300));

    const ref = data.ref;
    if (!ref) return;

    const notaFiscalId = ref.replace('tork_', '');
    const nf = await prisma.notaFiscal.findFirst({
      where: { OR: [{ id: notaFiscalId }, { focusNFeId: ref }] }
    });
    if (!nf) return;

    const novoStatus = mapearStatusFocus(data.status);
    const updateData = {
      status:          novoStatus,
      chaveAcesso:     data.chave_nfe || data.chave_nfce || nf.chaveAcesso,
      protocolo:       data.numero_protocolo || nf.protocolo,
      xMotivo:         data.mensagem_sefaz   || nf.xMotivo,
      dataAutorizacao: data.data_autorizacao ? new Date(data.data_autorizacao) : nf.dataAutorizacao,
    };

    // Baixa XML autorizado quando disponível
    if (novoStatus === 'AUTORIZADA' && data.caminho_xml_nota_fiscal) {
      try {
        const xmlResp = await axios.get(data.caminho_xml_nota_fiscal);
        updateData.xmlConteudo = typeof xmlResp.data === 'string'
          ? xmlResp.data
          : JSON.stringify(xmlResp.data);
      } catch (e) {
        logger.warn(`[Webhook Focus] Falha ao baixar XML: ${e.message}`);
      }
    }

    await prisma.notaFiscal.update({ where: { id: nf.id }, data: updateData });
    logger.info(`[Webhook Focus] NF ${nf.id} atualizada: ${novoStatus}`);
  } catch (err) {
    logger.error('[Webhook Focus] Erro:', err.message);
  }
});

module.exports = router;
