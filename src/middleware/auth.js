const { verifyAccessToken } = require('../utils/jwt');

function requireAuth(req, res, next) {
  let token;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // دعم الحصول على التوكن من query أو من كوكي باسم accessToken للتصفّح من الصفحات الداخلية
  if (!token) token = req.query.token;
  if (!token) token = req.cookies?.accessToken;

  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { requireAuth };