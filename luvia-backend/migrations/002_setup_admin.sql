-- ============================================================
-- Luvia ERP - SuperAdmin ve İlk Firma Kurulumu
-- 001_schema.sql çalıştırıldıktan SONRA bu dosyayı çalıştırın.
-- ŞİFRELERİ DEĞİŞTİRİN!
-- ============================================================

-- SuperAdmin'in (Sizin) firmanızı oluşturun
INSERT INTO companies (id, name, status)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Ülgen Soft',
  'active'
) ON CONFLICT DO NOTHING;

-- SuperAdmin kullanıcısını oluşturun
INSERT INTO profiles (full_name, username, email, password, role, company_id)
VALUES (
  'Nurettin Öz',
  'nurettin',
  'nurettin@ulgensoft.com',
  'BURAYA_SIFRENIZI_YAZIN',  -- <-- Değiştirin!
  'SuperAdmin',
  'aaaaaaaa-0000-0000-0000-000000000001'
) ON CONFLICT DO NOTHING;

-- Başlangıç kasasını oluşturun
INSERT INTO wallets (name, type, currency, company_id)
VALUES (
  'Ana Kasa', 'Kasa', 'TRY',
  'aaaaaaaa-0000-0000-0000-000000000001'
) ON CONFLICT DO NOTHING;
