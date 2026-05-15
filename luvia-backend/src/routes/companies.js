const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, superAdminOnly } = require('../middleware/auth');

// Tüm firmaları getir (Sadece SuperAdmin)
router.get('/', auth, superAdminOnly, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM companies ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Yeni firma ekle (Sadece SuperAdmin)
router.post('/', auth, superAdminOnly, async (req, res) => {
  const { name, tax_no, address, phone, license_end_date } = req.body;
  if (!name) return res.status(400).json({ error: 'Firma adı zorunludur.' });

  try {
    const result = await db.query(
      `INSERT INTO companies (name, tax_no, address, phone, license_end_date, status)
       VALUES ($1, $2, $3, $4, $5, 'active') RETURNING *`,
      [name, tax_no || null, address || null, phone || null, license_end_date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Firma güncelle
router.put('/:id', auth, superAdminOnly, async (req, res) => {
  const { name, license_end_date, status } = req.body;
  try {
    const result = await db.query(
      `UPDATE companies SET name=$1, license_end_date=$2, status=$3 WHERE id=$4 RETURNING *`,
      [name, license_end_date || null, status || 'active', req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Firma sil
router.delete('/:id', auth, superAdminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM companies WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
