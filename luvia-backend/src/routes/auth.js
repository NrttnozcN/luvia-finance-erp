const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password)
    return res.status(400).json({ error: 'Kullanıcı adı ve şifre zorunludur.' });

  const cleanId = identifier.trim().toLowerCase();

  try {
    const result = await db.query(
      `SELECT p.*, c.name AS company_name, c.status AS company_status, c.license_end_date
       FROM profiles p
       LEFT JOIN companies c ON c.id = p.company_id
       WHERE (LOWER(p.username) = $1 OR LOWER(p.email) = $1) AND p.password = $2`,
      [cleanId, password]
    );

    if (result.rows.length === 0)
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });

    const user = result.rows[0];

    // Firma durumu kontrolü
    if (user.company_status === 'passive')
      return res.status(403).json({ error: 'Firmanızın hesabı askıya alınmıştır.' });

    if (user.license_end_date) {
      const expiry = new Date(user.license_end_date);
      expiry.setHours(23, 59, 59, 999);
      if (expiry < new Date())
        return res.status(403).json({ error: 'Lisans süreniz dolmuştur. Lütfen Ülgen Soft ile iletişime geçin.' });
    }

    // Rol izinlerini çek
    let permissions = null;
    if (user.role_id) {
      const roleRes = await db.query('SELECT permissions FROM roles WHERE id = $1', [user.role_id]);
      permissions = roleRes.rows[0]?.permissions || null;
    }

    const token = jwt.sign(
      { id: user.id, company_id: user.company_id, role: user.role, role_id: user.role_id },
      process.env.JWT_SECRET || 'luvia_secret',
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        username: user.username,
        email: user.email,
        role: user.role,
        role_id: user.role_id,
        company_id: user.company_id,
        companyName: user.company_name,
        permissions,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası.' });
  }
});

module.exports = router;
