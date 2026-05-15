const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

// Kendi firmasının kullanıcılarını getir
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, full_name, username, email, role, role_id FROM profiles WHERE company_id = $1 ORDER BY full_name',
      [req.user.company_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Yeni kullanıcı ekle
router.post('/', auth, adminOnly, async (req, res) => {
  const { full_name, username, email, password, role, role_id } = req.body;
  if (!full_name || !username || !password)
    return res.status(400).json({ error: 'Ad, kullanıcı adı ve şifre zorunludur.' });

  try {
    const result = await db.query(
      `INSERT INTO profiles (full_name, username, email, password, role, role_id, company_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, full_name, username, email, role, role_id`,
      [full_name, username.toLowerCase(), email || null, password, role || 'Admin', role_id || null, req.user.company_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Kullanıcı güncelle
router.put('/:id', auth, adminOnly, async (req, res) => {
  const { full_name, username, email, role, role_id } = req.body;
  try {
    const result = await db.query(
      `UPDATE profiles SET full_name=$1, username=$2, email=$3, role=$4, role_id=$5
       WHERE id=$6 AND company_id=$7 RETURNING id, full_name, username, email, role, role_id`,
      [full_name, username?.toLowerCase(), email || null, role, role_id || null, req.params.id, req.user.company_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Kullanıcı sil
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM profiles WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
