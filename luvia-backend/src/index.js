const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors()); // Herkese izin ver
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/companies',   require('./routes/companies'));
app.use('/api/profiles',    require('./routes/profiles'));
app.use('/api/materials',   require('./routes/materials'));
app.use('/api/customers',   require('./routes/customers'));
app.use('/api/invoices',    require('./routes/invoices'));
app.use('/api/definitions', require('./routes/definitions'));
app.use('/api/ai',          require('./routes/ai.routes'));

// ── Sağlık Kontrolü ─────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', time: new Date().toISOString() });
});

// ── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadı.' });
});

// ── Sunucuyu Başlat ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ██╗     ██╗   ██╗██╗   ██╗██╗ █████╗ ');
  console.log('  ██║     ██║   ██║██║   ██║██║██╔══██╗');
  console.log('  ██║     ██║   ██║██║   ██║██║███████║');
  console.log('  ██║     ██║   ██║╚██╗ ██╔╝██║██╔══██║');
  console.log('  ███████╗╚██████╔╝ ╚████╔╝ ██║██║  ██║');
  console.log('  ╚══════╝ ╚═════╝   ╚═══╝  ╚═╝╚═╝  ╚═╝');
  console.log('');
  console.log(`  ✅ Luvia ERP Backend çalışıyor: http://localhost:${PORT}`);
  console.log(`  📦 Veritabanı: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  console.log('');
});
