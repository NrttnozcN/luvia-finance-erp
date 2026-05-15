const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

const cid = (req) => req.user.company_id;

// Roller
router.get('/roles', auth, adminOnly, async (req, res) => {
  const result = await db.query('SELECT * FROM roles WHERE company_id=$1 ORDER BY name', [cid(req)]);
  res.json(result.rows);
});

router.post('/roles', auth, adminOnly, async (req, res) => {
  const { name, permissions } = req.body;
  if (!name) return res.status(400).json({ error: 'Rol adı zorunludur.' });
  const result = await db.query(
    'INSERT INTO roles (name, permissions, company_id) VALUES ($1, $2, $3) RETURNING *',
    [name, JSON.stringify(permissions || []), cid(req)]
  );
  res.status(201).json(result.rows[0]);
});

router.put('/roles/:id', auth, adminOnly, async (req, res) => {
  const { name, permissions } = req.body;
  const result = await db.query(
    'UPDATE roles SET name=$1, permissions=$2 WHERE id=$3 AND company_id=$4 RETURNING *',
    [name, JSON.stringify(permissions || []), req.params.id, cid(req)]
  );
  res.json(result.rows[0]);
});

router.delete('/roles/:id', auth, adminOnly, async (req, res) => {
  await db.query('DELETE FROM roles WHERE id=$1 AND company_id=$2', [req.params.id, cid(req)]);
  res.json({ success: true });
});

// Tesisler
router.get('/facilities', auth, async (req, res) => {
  const result = await db.query('SELECT * FROM facilities WHERE company_id=$1 ORDER BY name', [cid(req)]);
  res.json(result.rows);
});

router.post('/facilities', auth, adminOnly, async (req, res) => {
  const { name, address, note } = req.body;
  if (!name) return res.status(400).json({ error: 'Tesis adı zorunludur.' });
  const result = await db.query(
    'INSERT INTO facilities (name, address, note, company_id) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, address || null, note || null, cid(req)]
  );
  res.status(201).json(result.rows[0]);
});

router.put('/facilities/:id', auth, adminOnly, async (req, res) => {
  const { name, address, note } = req.body;
  const result = await db.query(
    'UPDATE facilities SET name=$1, address=$2, note=$3 WHERE id=$4 AND company_id=$5 RETURNING *',
    [name, address || null, note || null, req.params.id, cid(req)]
  );
  res.json(result.rows[0]);
});

router.delete('/facilities/:id', auth, adminOnly, async (req, res) => {
  await db.query('DELETE FROM facilities WHERE id=$1 AND company_id=$2', [req.params.id, cid(req)]);
  res.json({ success: true });
});

module.exports = router;
