require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const authRoutes = require('./routes/auth');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { requireAuth } = require('./middleware/auth');

const app = express();

// إعداد EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true })); // لقراءة form data
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: 'http://localhost:3000', // لو الواجهة منفصلة تقدر تغيره، لكن هنا نستخدم نفس السيرفر
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
  // يعيد توجيه للـ API الداخلي
  try {
    const response = await fetch('http://localhost:' + (process.env.PORT || 4000) + '/auth/register', {
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
    const response = await fetch('http://localhost:' + (process.env.PORT || 4000) + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: req.body.email, password: req.body.password }),
    });
    // احصل على بيانات JSON والتوكن
    const data = await response.json();
    if (data.error) return res.render('login', { error: data.error, title: 'Login' });

    // خزّن accessToken في كوكي للعميل
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

// صفحة المحادثة الحية
app.get('/chat', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  const userName = user?.email || 'User';
  res.render('chat', { userId: req.userId, userName, title: 'Chat' });
});

// صفحة قديمة (إن أردت إبقاءها)
app.get('/protected', requireAuth, (req, res) => {
  res.render('protected', { userId: req.userId, title: 'Protected' });
});

const http = require('http');
const { initSocket } = require('./socket');
const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log('Server running on', PORT));