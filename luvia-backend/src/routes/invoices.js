const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

const cid = (req) => req.user.company_id;

// Tüm faturaları getir (filtreli)
router.get('/', auth, async (req, res) => {
  const { customer_id, facility_id, startDate, endDate, type } = req.query;
  try {
    let query = `
      SELECT i.*, c.name AS customer_name
      FROM invoices i
      LEFT JOIN customers c ON c.id = i.customer_id
      WHERE i.company_id = $1`;
    const params = [cid(req)];
    let idx = 2;
    if (customer_id) { query += ` AND i.customer_id = $${idx++}`; params.push(customer_id); }
    if (facility_id)  { query += ` AND i.facility_id = $${idx++}`; params.push(facility_id); }
    if (startDate)    { query += ` AND i.date >= $${idx++}`; params.push(startDate); }
    if (endDate)      { query += ` AND i.date <= $${idx++}`; params.push(endDate); }
    if (type)         { query += ` AND i.islem_turu = $${idx++}`; params.push(type); }
    query += ' ORDER BY i.date DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fatura detayını getir (items dahil)
router.get('/:id', auth, async (req, res) => {
  try {
    const inv = await db.query('SELECT * FROM invoices WHERE id=$1 AND company_id=$2', [req.params.id, cid(req)]);
    if (!inv.rows[0]) return res.status(404).json({ error: 'Fatura bulunamadı.' });
    const items = await db.query('SELECT * FROM invoice_items WHERE invoice_id=$1', [req.params.id]);
    res.json({ ...inv.rows[0], items: items.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Yeni fatura oluştur
router.post('/', auth, async (req, res) => {
  const { invoice_no, customer_id, date, description, islem_turu, fatura_tipi, facility_id, items } = req.body;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const inv = await client.query(
      `INSERT INTO invoices (invoice_no, customer_id, date, description, islem_turu, fatura_tipi, facility_id, company_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [invoice_no, customer_id || null, date, description || null, islem_turu, fatura_tipi || 'Ticari', facility_id || null, cid(req)]
    );
    const invoiceId = inv.rows[0].id;
    if (items?.length) {
      for (const item of items) {
        await client.query(
          `INSERT INTO invoice_items (invoice_id, material_id, description, quantity, unit_price, vat_rate, total)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [invoiceId, item.material_id || null, item.description || null, item.quantity || 1, item.unit_price || 0, item.vat_rate || 0, item.total || 0]
        );
      }
    }
    await client.query('COMMIT');
    res.status(201).json(inv.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Fatura sil
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM invoices WHERE id=$1 AND company_id=$2', [req.params.id, cid(req)]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
