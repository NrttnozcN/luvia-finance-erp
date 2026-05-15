const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'Token bulunamadı.' });

  const token = header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token formatı hatalı.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'luvia_secret');
    req.user = decoded; // { id, company_id, role }
    next();
  } catch {
    return res.status(401).json({ error: 'Token geçersiz veya süresi dolmuş.' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'Admin' && req.user?.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
  }
  next();
};

const superAdminOnly = (req, res, next) => {
  if (req.user?.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'Sadece platform sahibi bu işlemi yapabilir.' });
  }
  next();
};

module.exports = { auth, adminOnly, superAdminOnly };
