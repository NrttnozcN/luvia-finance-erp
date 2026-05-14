const fs = require('fs');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');

// Luvia Supabase Bilgileri
const SUPABASE_URL = 'https://yqcpvkiqkqdmranngdyv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_237AuUGPAkPQPQTs8kHZ6g_-1qDWCJl';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Sizin Firmanızın ID'si
const COMPANY_ID = 'cfff7842-1310-4282-b4db-09716051bb4c'; 
const CSV_FILE_PATH = './Cariler.csv';

const records = [];
const legacyMapping = {}; // Eski CariId -> Yeni UUID eşleşmesini tutacağız

async function run() {
  console.log('CSV dosyası okunuyor...');
  
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`HATA: ${CSV_FILE_PATH} bulunamadı! Lütfen SSMS'den aldığınız CSV dosyasını projenin ana dizinine koyun.`);
    return;
  }

  fs.createReadStream(CSV_FILE_PATH)
    // SSMS genelde noktalı virgül (;) ile dışarı aktarır, virgül (,) ise separator: ',' yapın
    .pipe(csv({ separator: ';' })) 
    .on('data', (row) => {
      const legacyId = row.CariId;
      
      // Eski sistemden gelen verileri Luvia formatına (customers tablosuna) eşliyoruz
      const newCustomer = {
        name: row.FirmaUnvani || row.CariKodu || 'İsimsiz Cari',
        tax_office: row.VergiDaire || null,
        tax_no: row.VergiNo || row.TCKimlik || null,
        phone: row.Telefon || row.GSM || null,
        email: row.Email || null,
        address: row.Adres || null,
        type: row.CariGrupId == '2' ? 'Tedarikçi' : 'Müşteri', // Örnek gruplama
        balance: 0,
        company_id: COMPANY_ID,
        created_at: row.Tarih ? new Date(row.Tarih).toISOString() : new Date().toISOString()
      };

      records.push({ legacyId, newCustomer });
    })
    .on('end', async () => {
      console.log(`${records.length} kayıt okundu. Luvia veritabanına aktarılıyor...`);
      
      let successCount = 0;
      let errorCount = 0;

      // 100'erli paketler halinde (batch insert) gönderelim ki Supabase API yorulmasın
      const BATCH_SIZE = 100;
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const insertData = batch.map(b => b.newCustomer);

        const { data, error } = await supabase
          .from('customers')
          .insert(insertData)
          .select(); // Eklenen kayıtları yeni UUID'leriyle birlikte geri döndürür

        if (error) {
          console.error(`Satır ${i} ile ${i + BATCH_SIZE} arası aktarılırken hata:`, error.message);
          errorCount += batch.length;
        } else if (data) {
          successCount += data.length;
          
          // İlişki (Mapping) tablosunu oluştur
          data.forEach((insertedRow, index) => {
             const legacyId = batch[index].legacyId;
             if (legacyId) {
               legacyMapping[legacyId] = insertedRow.id;
             }
          });
        }
      }

      console.log(`\n✅ AKTARIM TAMAMLANDI!`);
      console.log(`Başarıyla Eklenen Cari Sayısı: ${successCount}`);
      if (errorCount > 0) console.log(`Hata Alınan Kayıt Sayısı: ${errorCount}`);

      // İlişkisel eşleştirmeyi (Mapping) bir JSON dosyasına kaydedelim
      fs.writeFileSync('./cari_mapping.json', JSON.stringify(legacyMapping, null, 2));
      console.log('Eski ID -> Yeni ID eşleştirmesi "cari_mapping.json" dosyasına kaydedildi.');
      console.log('Bu dosyayı bir sonraki adımda "Araçlar" tablosunu aktarırken ilişkileri kurmak için kullanacağız.');
    });
}

run();
