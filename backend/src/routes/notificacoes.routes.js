const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const ctrl = require('../controllers/notificacoes.controller');

router.use(authenticate);
router.get('/', ctrl.list);

module.exports = router;
