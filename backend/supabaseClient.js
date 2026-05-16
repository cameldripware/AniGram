// ============================================
// SUPABASE BAĞLANTI YAPILANDIRMASI
// Bu dosya, Supabase ile konusmamizi saglayan ana baglantiyi olusturur.
// Tum route'lar bu client'i kullanarak veritabani islemleri yapacak.
// ============================================

// .env dosyasindaki gizli bilgileri okumak icin dotenv paketini yukle
require('dotenv').config();

// Supabase istemcisini yukle (veritabani, auth, storage icin)
const { createClient } = require('@supabase/supabase-js');

// .env dosyasindan Supabase URL ve anahtarlarini al
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// BAGLANTI KONTROLU: Eger .env dosyasinda bilgiler yoksa hata ver ve dur
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('============================================');
  console.error('HATA: Supabase baglanti bilgileri eksik!');
  console.error('Lutfen backend/.env dosyasini kontrol edin.');
  console.error('SUPABASE_URL ve SUPABASE_ANON_KEY mutlaka olmali.');
  console.error('============================================');
  process.exit(1); // Uygulamayi durdur
}

// Normal kullanici islemleri icin ANON KEY ile client olustur
// Bu client, Row Level Security (RLS) kurallarina uyar - guvenli
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin islemleri icin SERVICE ROLE KEY ile ayri bir client olustur
// Bu client, RLS kurallarini ATLAR - sadece backend'de guvenli ortamda kullan!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Baglanti basarili mesaji (konsolda gormek icin)
console.log('----------------------------------------');
console.log('Supabase baglantisi hazir.');
console.log('Proje URL:', supabaseUrl);
console.log('----------------------------------------');

// Bu client'lari diger dosyalarin kullanabilmesi icin disa aktar
module.exports = { supabase, supabaseAdmin };