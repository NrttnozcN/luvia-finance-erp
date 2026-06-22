-- ============================================================
-- LUVIA SaaS — Supabase Auth Bağlantısı + Multi-Tenant RLS
-- ============================================================
-- AMAÇ: Şu an HİÇBİR tabloda RLS yok; anon/publishable key ile
-- (login yapmadan) tüm firmaların tüm verisi okunabiliyor.
-- Bu dosya: (1) profiles.auth_user_id linkini ekler, (2) eksik
-- company_id kolonlarını tamamlar (purchase_requests, documents —
-- bu ikisi şu an üretimde KIRIK, insert'leri zaten hata veriyor),
-- (3) RLS helper fonksiyonlarını, (4) tüm tablolar için policy'leri
-- tanımlar.
--
-- ÇALIŞTIRMADAN ÖNCE:
--   - Bu dosyayı Supabase Dashboard → SQL Editor'de çalıştır.
--   - Bu dosya tek başına login akışını BOZMAZ (eski düz-metin
--     login hâlâ anon key ile çalışır) — ÇÜNKÜ tabloların RLS'i
--     bu dosyanın SONUNDA açılıyor. Frontend kodu (localApi.js,
--     authStore.js) güncellenip Supabase Auth'a geçilmeden BU
--     DOSYAYI ÇALIŞTIRMA — RLS açıldığı anda anon key hiçbir
--     satır göremeyeceği için eski login akışı (profiles tablosunu
--     anon key ile sorgulayan) çalışmaz hâle gelir ve site kilitlenir.
--
-- SIRA: 1) Bu SQL'i çalıştır (auth_user_id eklenir, RLS HENÜZ AÇILMAZ
--          — son bölüm yorum satırı içinde, elle aktif edilecek)
--       2) Backfill script'ini çalıştır (auth.users + auth_user_id doldurulur)
--       3) Frontend kod değişiklikleri deploy edilir (Auth tabanlı login)
--       4) Gerçek kullanıcıyla yeni login test edilir
--       5) ANCAK O ZAMAN bu dosyanın en alttaki "RLS'İ AÇ" bölümünü çalıştır
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- BÖLÜM 1: Şema — auth_user_id linki + eksik company_id kolonları
-- ────────────────────────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_auth_user_id_idx ON profiles(auth_user_id);

-- Bu iki tabloda company_id kolonu hiç yok — kod insert/select sırasında
-- bu kolonu varsayıyor (Purchasing.jsx, Documents.jsx), yani bu modüller
-- şu an üretimde fiilen ÇALIŞMIYOR. RLS'e hazırlık + bug fix:
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
ALTER TABLE documents         ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_company ON purchase_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_company          ON documents(company_id);


-- ────────────────────────────────────────────────────────────
-- BÖLÜM 2: Helper fonksiyonlar (RLS recursion'sız tenant kontrolü)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION current_company_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'SuperAdmin'
  );
$$;

-- Login öncesi (anonim) çağrılır: kullanıcı adından gerçek/sentetik Auth
-- email'ini döndürür. SECURITY DEFINER ile profiles RLS'ini bypass eder ama
-- SADECE email döndürür — başka hiçbir profil verisi (şifre, maaş, vb.) sızdırmaz.
CREATE OR REPLACE FUNCTION resolve_auth_email(identifier text)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(email, username || '@' || company_id || '.luvia.internal')
  FROM profiles
  WHERE lower(username) = lower(identifier)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION resolve_auth_email(text) TO anon, authenticated;


-- ────────────────────────────────────────────────────────────
-- BÖLÜM 3: RLS POLICY TANIMLARI
-- (RLS henüz AÇILMIYOR — sadece policy'ler tanımlanıyor. Policy
--  varlığı, RLS kapalıyken hiçbir etki yapmaz, bu yüzden güvenle
--  şimdiden tanımlanabilir.)
-- ────────────────────────────────────────────────────────────

-- 3.1 — company_id DİREKT olan tablolar (standart pattern)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'customers','invoices','invoice_items','finance_transactions','vehicles',
    'employees','employee_documents','materials','fuel_logs','checks',
    'support_tickets','facilities','kasalar','employee_performance',
    'employee_expenses','fuel_transfers','employee_payroll','employee_leaves',
    'personnel','purchase_requests','documents'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I FOR ALL USING (company_id = current_company_id() OR is_superadmin())',
      t
    );
  END LOOP;
END $$;

-- 3.2 — companies / profiles (özel: SuperAdmin hepsini görür, normal kullanıcı sadece kendisini/kendi firmasını)
DROP POLICY IF EXISTS companies_tenant ON companies;
CREATE POLICY companies_tenant ON companies FOR ALL
  USING (id = current_company_id() OR is_superadmin());

DROP POLICY IF EXISTS profiles_tenant ON profiles;
CREATE POLICY profiles_tenant ON profiles FOR ALL
  USING (auth_user_id = auth.uid() OR company_id = current_company_id() OR is_superadmin());

-- 3.3 — company_id'si OLMAYAN, parent FK üzerinden join gereken tablolar
DROP POLICY IF EXISTS sm_tenant ON stock_movements;
CREATE POLICY sm_tenant ON stock_movements FOR ALL USING (
  is_superadmin() OR material_id IN (SELECT id FROM materials WHERE company_id = current_company_id())
);

DROP POLICY IF EXISTS vi_tenant ON vehicle_inspections;
CREATE POLICY vi_tenant ON vehicle_inspections FOR ALL USING (
  is_superadmin() OR vehicle_id IN (SELECT id FROM vehicles WHERE company_id = current_company_id())
);

DROP POLICY IF EXISTS vins_tenant ON vehicle_insurances;
CREATE POLICY vins_tenant ON vehicle_insurances FOR ALL USING (
  is_superadmin() OR vehicle_id IN (SELECT id FROM vehicles WHERE company_id = current_company_id())
);

DROP POLICY IF EXISTS vm_tenant ON vehicle_maintenances;
CREATE POLICY vm_tenant ON vehicle_maintenances FOR ALL USING (
  is_superadmin() OR vehicle_id IN (SELECT id FROM vehicles WHERE company_id = current_company_id())
);

DROP POLICY IF EXISTS tm_tenant ON tire_movements;
CREATE POLICY tm_tenant ON tire_movements FOR ALL USING (
  is_superadmin() OR vehicle_id IN (SELECT id FROM vehicles WHERE company_id = current_company_id())
);

DROP POLICY IF EXISTS sup_msg_tenant ON support_messages;
CREATE POLICY sup_msg_tenant ON support_messages FOR ALL USING (
  is_superadmin() OR ticket_id IN (SELECT id FROM support_tickets WHERE company_id = current_company_id())
);

DROP POLICY IF EXISTS ea_tenant ON employee_attendance;
CREATE POLICY ea_tenant ON employee_attendance FOR ALL USING (
  is_superadmin() OR employee_id IN (SELECT id FROM employees WHERE company_id = current_company_id())
);

DROP POLICY IF EXISTS ed_tenant ON employee_deductions;
CREATE POLICY ed_tenant ON employee_deductions FOR ALL USING (
  is_superadmin() OR employee_id IN (SELECT id FROM employees WHERE company_id = current_company_id())
);

DROP POLICY IF EXISTS epc_tenant ON employee_position_changes;
CREATE POLICY epc_tenant ON employee_position_changes FOR ALL USING (
  is_superadmin() OR employee_id IN (SELECT id FROM employees WHERE company_id = current_company_id())
);


-- ============================================================
-- BÖLÜM 4: RLS'İ AÇ — BUNU SADECE FRONTEND AUTH MİGRATION'I
-- DEPLOY EDİLİP TEST EDİLDİKTEN SONRA, ELLE ÇALIŞTIR.
-- (Bu bölüm bilerek yorum satırı içinde bırakıldı.)
-- ============================================================
/*
ALTER TABLE facilities                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE kasalar                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements             ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests           ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_inspections         ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_insurances          ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_maintenances        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tire_movements              ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_logs                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_transfers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_attendance         ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_deductions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_position_changes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_performance        ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_expenses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_payroll            ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_leaves             ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE checks                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages            ENABLE ROW LEVEL SECURITY;
-- En son ve en dikkatli — current_company_id()/is_superadmin() bunlara bağımlı:
ALTER TABLE profiles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies                   ENABLE ROW LEVEL SECURITY;
*/

-- ============================================================
-- ACİL GERİ DÖNÜŞ (bir tablo RLS sonrası beklenmedik şekilde
-- erişimi kilitlerse, anında eski duruma dön):
--   ALTER TABLE <tablo_adi> DISABLE ROW LEVEL SECURITY;
-- ============================================================

-- NOT — RLS kapsamı DIŞINDA, ayrıca düzeltilmesi gereken bug'lar:
--   - Definitions.jsx 'roles' tablosuna insert/select yapıyor ama bu
--     tablo canlı DB'de YOK. Rol oluşturma ekranı şu an sessizce başarısız oluyor.
--   - Definitions.jsx 'document_categories' tablosuna insert/select yapıyor,
--     bu tablo da canlı DB'de YOK. Belge kategorisi ekleme ekranı çalışmıyor.
--   Bu ikisi RLS'den bağımsız, önceden var olan hatalar — bu migration'ın kapsamı dışında.
