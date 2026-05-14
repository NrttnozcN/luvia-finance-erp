import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://yqcpvkiqkqdmranngdyv.supabase.co', 'sb_publishable_237AuUGPAkPQPQTs8kHZ6g_-1qDWCJl');

async function fix() {
  console.log('Gelir kartları düzeltiliyor...');
  
  // 1. HAKEDİŞ kategorisini -> item_type: 'Gelir', category: 'Hakediş Geliri' yap
  const r1 = await supabase.from('materials').update({ item_type: 'Gelir', category: 'Hakediş Geliri' }).eq('category', 'HAKEDİŞ');
  console.log('Hakediş güncellendi:', r1.error ? r1.error : 'Başarılı');

  // 2. GELİR kategorisini -> item_type: 'Gelir', category: 'Diğer Gelirler' yap
  const r2 = await supabase.from('materials').update({ item_type: 'Gelir', category: 'Diğer Gelirler' }).eq('category', 'GELİR');
  console.log('Gelir güncellendi:', r2.error ? r2.error : 'Başarılı');

  // Bazı temel malzemeleri Luvia'nın sabit renkli kartlarına eşitleyelim ki klasörler birleşsin
  const updates = [
    { old: 'YEDEK PARÇA', new: 'Yedek Parça' },
    { old: 'LASTİKLER', new: 'Lastik' },
    { old: 'AKARYAKIT', new: 'Akaryakıt' },
    { old: 'MADENİ YAĞLAR', new: 'Yağ & Filtre' },
    { old: 'ARAÇ VE İŞ MAKİNASI GİDERLERİ', new: 'Araç ve İş Makinesi Giderleri' },
    { old: 'GIDA GİDERLERİ', new: 'Yemek ve Gıda Giderleri' },
    { old: 'OFİS VE BÜRO MALZEMELERİ', new: 'Büro Malzemesi' },
    { old: 'KIRTASİYE MALZEMELERİ', new: 'Büro Malzemesi' },
    { old: 'ELEKTİRİK ARAÇ VE İŞ MAKİNASI GİDERLERİ', new: 'Araç ve İş Makinesi Giderleri' }
  ];

  for (let u of updates) {
    const res = await supabase.from('materials').update({ category: u.new }).eq('category', u.old);
    console.log(`${u.old} -> ${u.new} güncellendi.`);
  }
  
  console.log('Tüm düzeltmeler bitti!');
}

fix();
