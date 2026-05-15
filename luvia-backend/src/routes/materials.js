const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

const cid = (req) => req.user.company_id;

// Tüm malzemeleri getir (item_type filtresi opsiyonel)
router.get('/', auth, async (req, res) => {
  const { item_type } = req.query;
  try {
    let query = 'SELECT * FROM materials WHERE company_id = $1';
    const params = [cid(req)];
    if (item_type) { query += ' AND item_type = $2'; params.push(item_type); }
    query += ' ORDER BY name';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Yeni malzeme ekle
router.post('/', auth, async (req, res) => {
  const { name, category, unit, item_type } = req.body;
  if (!name) return res.status(400).json({ error: 'Tanım adı zorunludur.' });
  try {
    const result = await db.query(
      `INSERT INTO materials (name, category, unit, item_type, company_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, category || null, unit || 'Adet', item_type || 'Malzeme', cid(req)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Malzeme güncelle
router.put('/:id', auth, async (req, res) => {
  const { name, category, unit, item_type } = req.body;
  try {
    const result = await db.query(
      `UPDATE materials SET name=$1, category=$2, unit=$3, item_type=$4
       WHERE id=$5 AND company_id=$6 RETURNING *`,
      [name, category || null, unit || 'Adet', item_type, req.params.id, cid(req)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Malzeme sil
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM materials WHERE id=$1 AND company_id=$2', [req.params.id, cid(req)]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
