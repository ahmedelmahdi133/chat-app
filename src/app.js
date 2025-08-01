require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const authRoutes = require('./routes/auth');
const { requireAuth } = require('./middleware/auth');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

// إعداد EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);

app.use('/auth', authRoutes);

// صفحات
app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/register', (req, res) => {
  res.render('register', { error: null, title: 'Register' });
});

app.post('/register', async (req, res) => {
  try {
    const response = await fetch(`${req.protocol}://${req.get('host')}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: req.body.email, password: req.body.password }),
    });
    const data = await response.json();
    if (data.error) return res.render('register', { error: data.error, title: 'Register' });
    res.redirect('/login');
  } catch (err) {
    res.render('register', { error: 'Server error', title: 'Register' });
  }
});

app.get('/login', (req, res) => {
  res.render('login', { error: null, title: 'Login' });
});

app.post('/login', async (req, res) => {
  try {
    const response = await fetch(`${req.protocol}://${req.get('host')}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: req.body.email, password: req.body.password }),
    });
    const data = await response.json();
    if (data.error) return res.render('login', { error: data.error, title: 'Login' });
    res.cookie('accessToken', data.accessToken, {
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });
    res.redirect('/chat');
  } catch (err) {
    res.render('login', { error: 'Server error', title: 'Login' });
  }
});

app.get('/chat', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  const userName = user?.email || 'User';
  res.render('chat', { userId: req.userId, userName, title: 'Chat' });
});

app.get('/protected', requireAuth, (req, res) => {
  res.render('protected', { userId: req.userId, title: 'Protected' });
});

module.exports = app;
