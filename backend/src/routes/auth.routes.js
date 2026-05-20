const express = require('express');
const router = express.Router();
const { login, refresh, me, createUser, listUsers, updateUser, deleteUser, changePassword } = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middlewares/auth');

router.post('/login', login);
router.post('/refresh', refresh);
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, changePassword);
router.get('/users', authenticate, authorize('ADMIN'), listUsers);
router.post('/users', authenticate, authorize('ADMIN'), createUser);
router.put('/users/:id', authenticate, authorize('ADMIN'), updateUser);
router.delete('/users/:id', authenticate, authorize('ADMIN'), deleteUser);

module.exports = router;
