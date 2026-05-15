-- ============================================================
-- LUVIA ERP - Veritabanı Kurulum Scripti
-- Tüm tabloları sıfırdan oluşturur.
-- Çalıştırmadan önce: CREATE DATABASE luvia_erp;
-- ============================================================

-- UUID desteği
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Firmalar ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  tax_no           TEXT,
  address          TEXT,
  phone            TEXT,
  status           TEXT NOT NULL DEFAULT 'active',   -- active | passive
  license_end_date DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Profiller (Kullanıcılar) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  username    TEXT UNIQUE,
  email       TEXT,
  password    TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'Admin',   -- SuperAdmin | Admin | <özel>
  role_id     UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Roller ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tesisler ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS facilities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  address     TEXT,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Malzeme / Gelir / Gider Tanımlamaları ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS materials (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT,
  unit        TEXT DEFAULT 'Adet',
  item_type   TEXT DEFAULT 'Malzeme',    -- Malzeme | Gider | Gelir
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Cariler ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT DEFAULT 'Müşteri',    -- Müşteri | Tedarikçi | Diğer
  tax_no      TEXT,
  phone       TEXT,
  email       TEXT,
  address     TEXT,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Faturalar ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID REFERENCES companies(id) ON DELETE CASCADE,
  customer_id  UUID REFERENCES customers(id) ON DELETE SET NULL,
  facility_id  UUID REFERENCES facilities(id) ON DELETE SET NULL,
  invoice_no   TEXT,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  islem_turu   TEXT NOT NULL DEFAULT 'Satış Faturası',
  fatura_tipi  TEXT DEFAULT 'Ticari',
  description  TEXT,
  total_amount NUMERIC(15,2) DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Fatura Kalemleri ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id   UUID REFERENCES invoices(id) ON DELETE CASCADE,
  material_id  UUID REFERENCES materials(id) ON DELETE SET NULL,
  description  TEXT,
  quantity     NUMERIC(15,3) DEFAULT 1,
  unit_price   NUMERIC(15,2) DEFAULT 0,
  vat_rate     NUMERIC(5,2)  DEFAULT 0,
  total        NUMERIC(15,2) DEFAULT 0
);

-- ── Kasalar & Banka Hesapları ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT DEFAULT 'Kasa',    -- Kasa | Banka
  currency    TEXT DEFAULT 'TRY',
  balance     NUMERIC(15,2) DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Kasa Hareketleri ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id   UUID REFERENCES wallets(id) ON DELETE CASCADE,
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,    -- Gelir | Gider | Virman
  amount      NUMERIC(15,2) NOT NULL,
  description TEXT,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Araçlar ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  plate       TEXT NOT NULL,
  brand       TEXT,
  model       TEXT,
  year        INT,
  type        TEXT,
  status      TEXT DEFAULT 'Aktif',
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Akaryakıt Hareketleri ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fuel_transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_id  UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  liters      NUMERIC(10,2),
  unit_price  NUMERIC(10,2),
  total       NUMERIC(15,2),
  station     TEXT,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── İndeksler (Performans için) ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_company    ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_materials_company   ON materials(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_company   ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company    ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer   ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_wallets_company     ON wallets(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_company    ON vehicles(company_id);

-- ============================================================
-- KURULUM TAMAMLANDI
-- Şimdi SuperAdmin kullanıcısını ekleyin:
-- (setup_admin.sql dosyasını çalıştırın)
-- ============================================================
