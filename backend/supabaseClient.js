// ============================================
// 🔒 SUPABASE BAĞLANTI YAPILANDIRMASI - GÜVENLI
// ============================================
// Bu dosya, Supabase ile konusmamizi saglayan ana baglantiyi olusturur.
// Tum sensitive bilgiler .env dosyasindan okunur - ASLA hardcode etme!
// ============================================

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// 🔐 .env dosyasindan gizli bilgileri al
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ⚠️ BAGLANTI KONTROLU: Eger .env dosyasinda bilgiler yoksa hata ver
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('\n' + '='.repeat(60));
  console.error('❌ HATA: Supabase baglanti bilgileri eksik!');
  console.error('='.repeat(60));
  console.error('\nLutfen backend/.env dosyasini kontrol edin.');
  console.error('Asagidaki degerlerin hepsi olmali:\n');
  console.error('  ✓ SUPABASE_URL');
  console.error('  ✓ SUPABASE_ANON_KEY');
  console.error('  ✓ SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n' + '='.repeat(60));
  console.error('\n⚠️  GÜVENLİK UYARISI:');
  console.error('Bu bilgileri ASLA GitHub\'a commit etmeyin!');
  console.error('Sadece .env dosyasında tutu. (.gitignore tarafından gizlenmiş)');
  console.error('='.repeat(60) + '\n');
  process.exit(1);
}

// Normal kullanici islemleri icin ANON KEY ile client olustur
// Row Level Security (RLS) kurallarina uyar - GUVENLI
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin islemleri icin SERVICE ROLE KEY ile ayri bir client olustur
// ⚠️ DIKKAT: Bu client, RLS kurallarini ATLAR
// Sadece backend'de guvenli ortamda kullan!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Baglanti basarili mesaji
console.log('\n' + '-'.repeat(50));
console.log('✅ Supabase baglantisi basarili');
console.log('URL: ' + supabaseUrl);
console.log('-'.repeat(50) + '\n');

// Clients'lari diger dosyalarin kullanabilmesi icin export et
module.exports = { supabase, supabaseAdmin };
