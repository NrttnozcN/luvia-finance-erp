const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

const cid = (req) => req.user.company_id;

// Tüm carileri getir
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM customers WHERE company_id = $1 ORDER BY name',
      [cid(req)]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Yeni cari ekle
router.post('/', auth, async (req, res) => {
  const { name, type, tax_no, phone, email, address, note } = req.body;
  if (!name) return res.status(400).json({ error: 'Cari adı zorunludur.' });
  try {
    const result = await db.query(
      `INSERT INTO customers (name, type, tax_no, phone, email, address, note, company_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, type || 'Müşteri', tax_no || null, phone || null, email || null, address || null, note || null, cid(req)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cari güncelle
router.put('/:id', auth, async (req, res) => {
  const { name, type, tax_no, phone, email, address, note } = req.body;
  try {
    const result = await db.query(
      `UPDATE customers SET name=$1, type=$2, tax_no=$3, phone=$4, email=$5, address=$6, note=$7
       WHERE id=$8 AND company_id=$9 RETURNING *`,
      [name, type, tax_no || null, phone || null, email || null, address || null, note || null, req.params.id, cid(req)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cari sil
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM customers WHERE id=$1 AND company_id=$2', [req.params.id, cid(req)]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
