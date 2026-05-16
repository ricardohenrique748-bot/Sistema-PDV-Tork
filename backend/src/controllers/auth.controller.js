const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

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

module.exports = { login, refresh, me, createUser, listUsers, updateUser, changePassword };
