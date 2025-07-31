const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');

const prisma = new PrismaClient();
const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: 'Email already used' });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { email, passwordHash } });
  res.json({ ok: true, user: { id: user.id, email: user.email } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const accessToken = signAccessToken({ userId: user.id });
  const refreshToken = signRefreshToken({ userId: user.id });

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  res.cookie('jid', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    domain: process.env.COOKIE_DOMAIN,
    path: '/refresh_token',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // أرجع توكن الوصول وايضًا اضبطه في كوكي لسهولة الاستخدام في الصفحات الداخلية
  res.cookie('accessToken', accessToken, {
    httpOnly: false, // يمكن قراءته من المتصفح لو احتجت
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
  });

  res.json({ accessToken });
});

router.post('/refresh_token', async (req, res) => {
  const token = req.cookies.jid;
  if (!token) return res.status(401).json({ accessToken: '' });
  let payload;
  try { payload = verifyRefreshToken(token); } catch (err) { return res.status(401).json({ accessToken: '' }); }
  const stored = await prisma.refreshToken.findUnique({ where: { token }, include: { user: true } });
  if (!stored || stored.revoked) return res.status(401).json({ accessToken: '' });
  const newAccessToken = signAccessToken({ userId: payload.userId });
  res.json({ accessToken: newAccessToken });
});

module.exports = router;