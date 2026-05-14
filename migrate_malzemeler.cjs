const fs = require('fs');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');

// Luvia Supabase Bilgileri
const SUPABASE_URL = 'https://yqcpvkiqkqdmranngdyv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_237AuUGPAkPQPQTs8kHZ6g_-1qDWCJl';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Sizin Firmanızın ID'si
const COMPANY_ID = 'cfff7842-1310-4282-b4db-09716051bb4c'; 
const CSV_FILE_PATH = './Malzemeler.csv';

// Gönderdiğiniz Kategori Listesi (Harita)
const CATEGORY_MAP = {
  197: "ADAPTÖR TIRNAK", 100: "ADDBLUE", 154: "AGREGA", 147: "AKARYAKIT",
  101: "AKÜ", 155: "ANTİFİRİZ", 102: "ARAÇ VE İŞ MAKİNASI GİDERLERİ",
  148: "ARAÇ VE İŞ MAKİNASI KİRALAMA BEDELİ", 210: "ATÖLYE İŞÇİLİK",
  99: "AVADANLIK", 115: "BAKIM ONARIM TAMİRAT", 192: "BALATALAR",
  94: "BETON", 107: "BIÇAKLAR", 143: "BİTKİ", 126: "BORU KORUGE",
  105: "BSK ASFALT", 203: "CİVATA", 134: "ÇİMENTO", 127: "DEMİR",
  95: "DEMİRBAŞ", 189: "DİNAMOLAR", 199: "ELEK",
  120: "ELEKTİRİK ARAÇ VE İŞ MAKİNASI GİDERLERİ", 141: "ELEKTİRİK TESİSAT MALZ",
  136: "ENJEKSİYON İŞLERİ", 98: "FIRÇALAR", 162: "FİLİTRE",
  208: "GARANTİ MALZEMELER", 132: "GELİR", 119: "GIDA GİDERLERİ",
  193: "GREYDER DAİRE DÖNDÜRME PAPUÇLARI", 142: "GÜBRE", 153: "HAKEDİŞ",
  204: "HARİTA ÖLÇÜM EKİPMANLARI", 206: "HORTUM HİDROLİK", 161: "HURDA GERİ DÖNÜŞÜM",
  117: "İNŞAAT MALZEMELERİ", 125: "İŞ GÜVENLİĞİ", 104: "İŞ KIYAFETLERİ",
  163: "İŞÇİLİK", 195: "KAMPANALAR", 188: "KAR BIÇAK APARATLARI",
  131: "KARLA MÜCADELE", 144: "KERESTE", 149: "KIRTASİYE MALZEMELERİ",
  103: "KİRALAMALAR", 158: "KÖMÜR", 191: "KULLANILMAYANLAR",
  164: "KUMANDA PANELLERİ", 137: "KUTU GABİON", 108: "LASTİKLER",
  109: "LEVHALAR", 91: "MADENİ YAĞLAR", 145: "MALZEME TAŞERON AVANSLARI",
  110: "MAZOT", 152: "MOTORİN POMPASI", 114: "MOTORLAR", 118: "NAKLİYE",
  133: "NAKLİYE ÖZD GURUP", 157: "OFİS VE BÜRO MALZEMELERİ",
  123: "OT BİÇME GİDERLERİ", 194: "OT BİÇME MALZEMELERİ", 190: "OTOMATİKLER",
  209: "ÖZD TIR ARAÇ GURUBU", 156: "PEYZAJ", 187: "POMPALAR",
  205: "PROJE İŞLERİ", 207: "REKOR VE SOKET", 151: "SAHADA KULLANILAN MAKİNA GİDERİ",
  113: "SARF MALZEMELER", 129: "SİGORTA", 198: "SOLÜSYON",
  140: "SU TESİSAT MALZ", 97: "ŞANTİYE ALETLERİ", 150: "ŞANTİYE YEMEK",
  138: "TAŞERON", 122: "TAZMİNATLAR", 196: "TIRNAKLAR", 90: "TUZ",
  200: "TUZ AGREGASI", 130: "TUZ SERİCİ APARATLARI", 128: "TÜP",
  211: "USTA TALEBİ", 135: "YANGIN SÖNDÜRME TÜPLERİ", 124: "YEDEK PARÇA",
  159: "YOL SPÜRGE MAKİNASI", 111: "ZİNCİRLER"
};

const records = [];

async function run() {
  console.log('Malzemeler CSV dosyası okunuyor...');
  
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`HATA: ${CSV_FILE_PATH} bulunamadı! Lütfen SSMS'den aldığınız CSV dosyasını projenin ana dizinine koyun.`);
    return;
  }

  fs.createReadStream(CSV_FILE_PATH)
    .pipe(csv({ separator: ';' })) // Noktalı virgül (eğer virgül ise ',' yapın)
    .on('data', (row) => {
      // Kategori adını haritadan bul (Yoksa Diğer yap)
      const categoryName = CATEGORY_MAP[row.MalzemeKategoriId] || 'DİĞER';
      
      // Kategori adında "GİDER", "KİRA", "SİGORTA" vb. geçiyorsa Luvia'da "Gider Kartı" olarak ayır
      const isExpense = categoryName.includes('GİDER') || 
                        categoryName.includes('KİRA') || 
                        categoryName.includes('SİGORTA') ||
                        categoryName.includes('TAZMİNAT') ||
                        categoryName.includes('HAKEDİŞ') ||
                        categoryName.includes('GELİR') ||
                        categoryName.includes('TAŞERON');

      const itemType = isExpense ? 'Gider' : 'Malzeme';
      const accountCard = isExpense ? 'Diğer Giderler' : null;

      let parsedDate = new Date().toISOString();
      if (row.Tarih && row.Tarih !== 'NULL' && row.Tarih.trim() !== '') {
        try {
          const d = new Date(row.Tarih);
          if (!isNaN(d)) parsedDate = d.toISOString();
        } catch(e) {}
      }

      // Luvia materials formatına dönüştür
      const newMaterial = {
        name: row.UrunAd || row.UrunKodu || 'İsimsiz Malzeme',
        category: categoryName,
        item_type: itemType,
        unit: 'Adet', // Eski sistemde 1,2,3 gibi ID'ler var, varsayılan Adet veriyoruz
        min_stock: row.Ikaz ? parseInt(row.Ikaz) : 0,
        company_id: COMPANY_ID,
        created_at: parsedDate
      };

      records.push(newMaterial);
    })
    .on('end', async () => {
      console.log(`${records.length} malzeme okundu. Luvia'ya aktarılıyor...`);
      
      let successCount = 0;
      let errorCount = 0;

      // 100'erli paketler halinde aktar
      const BATCH_SIZE = 100;
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);

        const { data, error } = await supabase
          .from('materials')
          .insert(batch);

        if (error) {
          console.error(`Satır ${i} - ${i + BATCH_SIZE} aktarılırken hata:`, error.message);
          errorCount += batch.length;
        } else {
          successCount += batch.length;
          console.log(`+ ${batch.length} ürün eklendi...`);
        }
      }

      console.log(`\n✅ AKTARIM TAMAMLANDI!`);
      console.log(`Başarıyla Eklenen Malzeme: ${successCount}`);
      if (errorCount > 0) console.log(`Hata Alınan Kayıt: ${errorCount}`);
      console.log(`\nŞimdi Luvia'ya girip 'Sistem Tanımlamaları'ndan tüm malzemeleri yeni klasörlerinde görebilirsiniz!`);
    });
}

run();
