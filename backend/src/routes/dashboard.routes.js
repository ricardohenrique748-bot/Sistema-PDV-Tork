const express = require('express');
const router = express.Router();
const { getDashboard } = require('../controllers/dashboard.controller');
const { authenticate } = require('../middlewares/auth');
router.get('/', authenticate, getDashboard);
module.exports = router;
