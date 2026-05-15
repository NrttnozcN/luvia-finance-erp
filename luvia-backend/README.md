# Luvia ERP Backend

Node.js/Express ile yazılmış, PostgreSQL'e doğrudan bağlanan backend sunucusu.  
Supabase gerektirmez — tamamen lokal ve offline çalışır.

---

## 🚀 Kurulum (Adım Adım)

### 1. Gereksinimler
- [Node.js](https://nodejs.org) (v18 veya üzeri)
- PostgreSQL (v14 veya üzeri)

### 2. Bağımlılıkları Yükleyin
```bash
cd luvia-backend
npm install
```

### 3. Ayar Dosyasını Oluşturun
`.env.example` dosyasını kopyalayıp `.env` olarak adlandırın:
```bash
copy .env.example .env
```
Sonra `.env` dosyasını açıp PostgreSQL bilgilerinizi girin.

### 4. Veritabanını Oluşturun
PostgreSQL'de yeni bir veritabanı açın:
```sql
CREATE DATABASE luvia_erp;
```

### 5. Tabloları Kurun
```bash
psql -U postgres -d luvia_erp -f migrations/001_schema.sql
```

### 6. SuperAdmin'i Ekleyin
`migrations/002_setup_admin.sql` dosyasını açın, şifreyi değiştirin, sonra:
```bash
psql -U postgres -d luvia_erp -f migrations/002_setup_admin.sql
```

### 7. Sunucuyu Başlatın
```bash
npm run dev      # Geliştirme modu (otomatik yeniden başlatır)
npm start        # Canlı sunucu modu
```

Sunucu `http://localhost:3001` adresinde çalışmaya başlayacak.

---

## 📡 API Endpointleri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/auth/login` | Giriş |
| GET | `/api/companies` | Firmalar (SuperAdmin) |
| POST | `/api/companies` | Yeni Firma Ekle |
| GET | `/api/materials` | Malzeme/Gelir/Gider Listesi |
| GET | `/api/customers` | Cari Listesi |
| GET | `/api/invoices` | Fatura Listesi |
| GET | `/api/health` | Sunucu Sağlık Kontrolü |

---

## 🔒 Güvenlik
- Tüm istekler JWT token ile korunur
- Şifreler `.env` dosyasında saklanır — bu dosyayı asla paylaşmayın!
