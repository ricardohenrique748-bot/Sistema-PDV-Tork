const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { enviarEmailResetSenha } = require('../services/emailService');

const generateTokens = (user) => {
  const payload = { id: user.id, email: user.email, role: user.role, nome: user.nome, primeiroAcesso: user.primeiroAcesso };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
  const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
  return { token, refreshToken };
};

const login = async (req, res, next) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });

    const user = await prisma.usuario.findUnique({ where: { email } });
    if (!user || !user.ativo) return res.status(401).json({ error: 'Credenciais inválidas.' });

    const valid = await bcrypt.compare(senha, user.senha);
    if (!valid) return res.status(401).json({ error: 'Credenciais inválidas.' });

    const { token, refreshToken } = generateTokens(user);
    const { senha: _, ...userData } = user;
    res.json({ user: userData, token, refreshToken });
  } catch (err) { next(err); }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token obrigatório.' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.usuario.findUnique({ where: { id: decoded.id } });
    if (!user || !user.ativo) return res.status(401).json({ error: 'Usuário não encontrado.' });

    const tokens = generateTokens(user);
    res.json(tokens);
  } catch (err) {
    return res.status(401).json({ error: 'Refresh token inválido ou expirado.' });
  }
};

const me = async (req, res, next) => {
  try {
    const user = await prisma.usuario.findUnique({
      where: { id: req.user.id },
      select: { id: true, nome: true, email: true, role: true, ativo: true, primeiroAcesso: true, createdAt: true }
    });
    res.json(user);
  } catch (err) { next(err); }
};

const createUser = async (req, res, next) => {
  try {
    const { nome, email, senha, role } = req.body;
    const hash = await bcrypt.hash(senha, 12);
    const user = await prisma.usuario.create({
      data: { nome, email, senha: hash, role: role || 'VENDEDOR' },
      select: { id: true, nome: true, email: true, role: true, primeiroAcesso: true, createdAt: true }
    });
    res.status(201).json(user);
  } catch (err) { next(err); }
};

const listUsers = async (req, res, next) => {
  try {
    const users = await prisma.usuario.findMany({
      select: { id: true, nome: true, email: true, role: true, ativo: true, primeiroAcesso: true, createdAt: true },
      orderBy: { nome: 'asc' }
    });
    res.json(users);
  } catch (err) { next(err); }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nome, email, senha, role, ativo } = req.body;
    const data = { nome, email, role, ativo };
    if (senha) data.senha = await bcrypt.hash(senha, 12);

    const user = await prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, nome: true, email: true, role: true, ativo: true, primeiroAcesso: true }
    });
    res.json(user);
  } catch (err) { next(err); }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) return res.status(400).json({ error: 'Você não pode excluir sua própria conta.' });

    await prisma.$transaction(async (tx) => {
      const nfs = await tx.notaFiscal.findMany({ where: { usuarioId: id }, select: { id: true } });
      if (nfs.length > 0) {
        await tx.cartaCorrecao.deleteMany({ where: { notaFiscalId: { in: nfs.map(n => n.id) } } });
      }
      await tx.notaFiscal.deleteMany({ where: { usuarioId: id } });
      await tx.orcamento.deleteMany({ where: { usuarioId: id } });
      await tx.venda.deleteMany({ where: { usuarioId: id } });
      await tx.usuario.delete({ where: { id } });
    });

    res.status(204).send();
  } catch (err) { next(err); }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mail obrigatório.' });

    const user = await prisma.usuario.findUnique({ where: { email } });
    // Sempre retorna sucesso para não revelar se o email existe
    if (!user || !user.ativo) {
      return res.json({ message: 'Se o e-mail estiver cadastrado, você receberá as instruções em breve.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000); // 1 hora

    await prisma.usuario.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });

    await enviarEmailResetSenha(user.email, user.nome, token);
    res.json({ message: 'Se o e-mail estiver cadastrado, você receberá as instruções em breve.' });
  } catch (err) { next(err); }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, novaSenha } = req.body;
    if (!token || !novaSenha) return res.status(400).json({ error: 'Token e nova senha são obrigatórios.' });
    if (novaSenha.length < 6) return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres.' });

    const user = await prisma.usuario.findFirst({
      where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
    });

    if (!user) return res.status(400).json({ error: 'Token inválido ou expirado. Solicite um novo link.' });

    const hash = await bcrypt.hash(novaSenha, 12);
    await prisma.usuario.update({
      where: { id: user.id },
      data: { senha: hash, resetToken: null, resetTokenExpiry: null, primeiroAcesso: false },
    });

    res.json({ message: 'Senha redefinida com sucesso. Faça login com a nova senha.' });
  } catch (err) { next(err); }
};

const changePassword = async (req, res, next) => {
  try {
    const { novaSenha } = req.body;
    if (!novaSenha) return res.status(400).json({ error: 'A nova senha é obrigatória.' });

    const hash = await bcrypt.hash(novaSenha, 12);
    const user = await prisma.usuario.update({
      where: { id: req.user.id },
      data: { senha: hash, primeiroAcesso: false },
      select: { id: true, nome: true, email: true, role: true, ativo: true, primeiroAcesso: true }
    });

    const tokens = generateTokens(user);
    res.json({ user, ...tokens, message: 'Senha atualizada com sucesso.' });
  } catch (err) { next(err); }
};

module.exports = { login, refresh, me, createUser, listUsers, updateUser, deleteUser, changePassword, forgotPassword, resetPassword };
