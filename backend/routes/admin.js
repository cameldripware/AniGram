const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../supabaseClient');

const ADMIN_KULLANICI = process.env.ADMIN_KULLANICI || 'camel';
const ADMIN_SIFRE = process.env.ADMIN_SIFRE || 'camel2026_72392dcpaser_admin_K9#mP2!v42GnjL7';

const girisDenemeleri = {};
const adminLoglari = [];

function logEkle(islem, detay, adminIp) {
  const log = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    islem: islem,
    detay: detay,
    adminIp: adminIp || 'localhost',
    tarih: new Date().toISOString()
  };
  adminLoglari.unshift(log);
  if (adminLoglari.length > 500) adminLoglari.pop();
  console.log('[ADMIN LOG]', islem, '-', detay);
  return log;
}

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    if (girisDenemeleri[ip] && girisDenemeleri[ip].banUntil > Date.now()) {
      const kalanDakika = Math.ceil((girisDenemeleri[ip].banUntil - Date.now()) / 60000);
      return res.status(429).json({ hata: true, mesaj: 'Cok fazla basarisiz deneme. ' + kalanDakika + ' dakika sonra tekrar deneyin.' });
    }

    if (username !== ADMIN_KULLANICI) {
      logEkle('BASARISIZ GIRIS', 'Hatali kullanici adi: ' + username, ip);
      return res.status(401).json({ hata: true, mesaj: 'Hatali admin bilgileri.' });
    }

    if (password !== ADMIN_SIFRE) {
      if (!girisDenemeleri[ip]) {
        girisDenemeleri[ip] = { count: 0, banUntil: null };
      }
      girisDenemeleri[ip].count++;
      logEkle('BASARISIZ GIRIS', 'Hatali sifre (Deneme: ' + girisDenemeleri[ip].count + '/5)', ip);

      if (girisDenemeleri[ip].count >= 5) {
        girisDenemeleri[ip].banUntil = Date.now() + 5 * 60 * 1000;
        logEkle('IP BANLANDI', '5 basarisiz deneme - IP: ' + ip, ip);
        return res.status(429).json({ hata: true, mesaj: '5 basarisiz deneme. 5 dakika banlandiniz.' });
      }

      return res.status(401).json({ hata: true, mesaj: 'Hatali admin sifresi. Kalan deneme: ' + (5 - girisDenemeleri[ip].count) });
    }

    girisDenemeleri[ip] = { count: 0, banUntil: null };
    const adminToken = Buffer.from(ADMIN_KULLANICI + ':' + Date.now() + ':' + Math.random().toString(36)).toString('base64');
    logEkle('BASARILI GIRIS', 'Admin panele giris yapti', ip);
    res.json({ hata: false, token: adminToken, mesaj: 'Hos geldiniz.' });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

function adminTokenKontrol(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ hata: true, mesaj: 'Admin yetkisi gerekli.' });
  }

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    const username = parts[0];
    const timestamp = parseInt(parts[1]);

    if (username !== ADMIN_KULLANICI) {
      return res.status(403).json({ hata: true, mesaj: 'Gecersiz admin tokeni.' });
    }

    if (Date.now() - timestamp > 12 * 60 * 60 * 1000) {
      return res.status(403).json({ hata: true, mesaj: 'Admin token suresi dolmus. Tekrar giris yapin.' });
    }

    next();
  } catch (error) {
    return res.status(403).json({ hata: true, mesaj: 'Gecersiz token.' });
  }
}

router.get('/dashboard', adminTokenKontrol, async (req, res) => {
  try {
    const { count: kullaniciSayisi } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true });
    const { count: gonderiSayisi } = await supabaseAdmin.from('posts').select('*', { count: 'exact', head: true });
    const { count: yorumSayisi } = await supabaseAdmin.from('comments').select('*', { count: 'exact', head: true });
    const { count: begeniSayisi } = await supabaseAdmin.from('likes').select('*', { count: 'exact', head: true });
    const { count: mesajSayisi } = await supabaseAdmin.from('messages').select('*', { count: 'exact', head: true });
    const { count: banliSayisi } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('is_banned', true);

    const { data: sonKullanicilar } = await supabaseAdmin.from('users').select('*').order('created_at', { ascending: false }).limit(5);
    const { data: sonGonderiler } = await supabaseAdmin.from('posts').select('*, users:user_id (username)').order('created_at', { ascending: false }).limit(10);

    res.json({
      hata: false,
      istatistikler: {
        kullanici_sayisi: kullaniciSayisi || 0,
        gonderi_sayisi: gonderiSayisi || 0,
        yorum_sayisi: yorumSayisi || 0,
        begeni_sayisi: begeniSayisi || 0,
        mesaj_sayisi: mesajSayisi || 0,
        banli_sayisi: banliSayisi || 0
      },
      son_kullanicilar: sonKullanicilar || [],
      son_gonderiler: sonGonderiler || [],
      admin_loglari: adminLoglari.slice(0, 20)
    });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

router.get('/users', adminTokenKontrol, async (req, res) => {
  try {
    const arama = req.query.ara || '';
    let sorgu = supabaseAdmin.from('users').select('*').order('created_at', { ascending: false }).limit(100);
    if (arama) {
      sorgu = sorgu.or(`username.ilike.%${arama}%,name.ilike.%${arama}%,email.ilike.%${arama}%`);
    }
    const { data: kullanicilar, error } = await sorgu;
    if (error) return res.status(400).json({ hata: true, mesaj: error.message });
    res.json({ hata: false, kullanicilar: kullanicilar || [] });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

router.get('/users/:userId', adminTokenKontrol, async (req, res) => {
  try {
    const { data: kullanici } = await supabaseAdmin.from('users').select('*').eq('id', req.params.userId).single();
    if (!kullanici) return res.status(404).json({ hata: true, mesaj: 'Kullanici bulunamadi.' });
    
    const { data: gonderiler } = await supabaseAdmin.from('posts').select('*, post_media (*)').eq('user_id', req.params.userId).order('created_at', { ascending: false }).limit(20);
    const { count: gonderiSayisi } = await supabaseAdmin.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', req.params.userId);
    const { count: takipci } = await supabaseAdmin.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', req.params.userId);
    const { count: takip } = await supabaseAdmin.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', req.params.userId);
    
    const { data: mesajlar } = await supabaseAdmin.from('messages').select('*, sender:sender_id (username), receiver:receiver_id (username)').or(`sender_id.eq.${req.params.userId},receiver_id.eq.${req.params.userId}`).order('created_at', { ascending: false }).limit(20);
    const { data: favoriAnimeler } = await supabaseAdmin.from('favorite_animes').select('*').eq('user_id', req.params.userId);
    const { data: notifAyarlar } = await supabaseAdmin.from('notification_settings').select('*').eq('user_id', req.params.userId).single();

    res.json({
      hata: false,
      kullanici: {
        ...kullanici,
        gonderi_sayisi: gonderiSayisi || 0,
        takipci_sayisi: takipci || 0,
        takip_sayisi: takip || 0
      },
      gonderiler: gonderiler || [],
      mesajlar: mesajlar || [],
      favori_animeler: favoriAnimeler || [],
      bildirim_ayarlari: notifAyarlar || null
    });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

router.put('/users/:userId', adminTokenKontrol, async (req, res) => {
  try {
    const { category, bio, is_private, abonelik_seviyesi, rozetler } = req.body;
    const updateData = {};
    if (category !== undefined) updateData.category = category;
    if (bio !== undefined) updateData.bio = bio;
    if (is_private !== undefined) updateData.is_private = is_private;
    if (abonelik_seviyesi !== undefined) updateData.abonelik_seviyesi = abonelik_seviyesi;
    if (rozetler !== undefined) updateData.rozetler = rozetler;

    const { data: updated, error } = await supabaseAdmin.from('users').update(updateData).eq('id', req.params.userId).select().single();
    if (error) return res.status(400).json({ hata: true, mesaj: error.message });
    
    logEkle('KULLANICI GUNCELLE', updated.username + ' - ' + JSON.stringify(updateData), req.ip);
    res.json({ hata: false, kullanici: updated, mesaj: 'Kullanici basariyla guncellendi.' });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

router.post('/users/:userId/ban', adminTokenKontrol, async (req, res) => {
  try {
    const { ban, sure, sebep } = req.body;
    let banBitis = null;
    
    if (ban === true && sure) {
      const simdi = new Date();
      if (sure === 'kalici') {
        banBitis = new Date('2099-12-31').toISOString();
      } else {
        const sureMs = parseInt(sure) * 60 * 60 * 1000;
        banBitis = new Date(simdi.getTime() + sureMs).toISOString();
      }
    }
    
    const updateData = {
      is_banned: ban === true,
      ban_bitis: banBitis,
      ban_sebebi: sebep || null,
      banned_at: ban === true ? new Date().toISOString() : null
    };
    
    if (!ban) {
      updateData.ban_bitis = null;
      updateData.ban_sebebi = null;
      updateData.banned_at = null;
    }

    const { data: updated, error } = await supabaseAdmin.from('users').update(updateData).eq('id', req.params.userId).select().single();
    if (error) return res.status(400).json({ hata: true, mesaj: error.message });
    
    logEkle(
      ban ? 'KULLANICI BANLANDI' : 'KULLANICI BAN AÇILDI',
      updated.username + (ban ? ' - Sure: ' + (sure || 'kalici') + ' - Sebep: ' + (sebep || 'Belirtilmedi') : ''),
      req.ip
    );
    
    res.json({
      hata: false,
      kullanici: updated,
      mesaj: ban
        ? updated.username + ' kullanicisi ' + (sure === 'kalici' ? 'kalici olarak' : sure + ' saat') + ' banlandi. Sebep: ' + (sebep || 'Belirtilmedi')
        : updated.username + ' kullanicisinin ban açildi.'
    });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

router.get('/check-ban/:userId', async (req, res) => {
  try {
    const { data: kullanici } = await supabaseAdmin.from('users').select('is_banned, ban_bitis, ban_sebebi').eq('id', req.params.userId).single();
    if (!kullanici) return res.json({ banned: false });
    
    if (kullanici.is_banned && kullanici.ban_bitis) {
      const simdi = new Date();
      const banBitis = new Date(kullanici.ban_bitis);
      
      if (banBitis > simdi) {
        const kalanSaat = Math.ceil((banBitis - simdi) / (1000 * 60 * 60));
        return res.json({
          banned: true,
          ban_bitis: kullanici.ban_bitis,
          ban_sebebi: kullanici.ban_sebebi,
          kalan_saat: kalanSaat
        });
      } else {
        await supabaseAdmin.from('users').update({ is_banned: false, ban_bitis: null, ban_sebebi: null }).eq('id', req.params.userId);
        return res.json({ banned: false });
      }
    }
    
    res.json({ banned: kullanici.is_banned || false });
  } catch (error) {
    res.json({ banned: false });
  }
});

router.get('/posts', adminTokenKontrol, async (req, res) => {
  try {
    const { data: gonderiler, error } = await supabaseAdmin.from('posts').select('*, users:user_id (username), post_media (*), post_tags (*)').order('created_at', { ascending: false }).limit(50);
    if (error) return res.status(400).json({ hata: true, mesaj: error.message });
    res.json({ hata: false, gonderiler: gonderiler || [] });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

router.delete('/posts/:postId', adminTokenKontrol, async (req, res) => {
  try {
    const { data: gonderi } = await supabaseAdmin.from('posts').select('*, users:user_id (username)').eq('id', req.params.postId).single();
    await supabaseAdmin.from('post_media').delete().eq('post_id', req.params.postId);
    await supabaseAdmin.from('post_tags').delete().eq('post_id', req.params.postId);
    await supabaseAdmin.from('likes').delete().eq('post_id', req.params.postId);
    await supabaseAdmin.from('comments').delete().eq('post_id', req.params.postId);
    await supabaseAdmin.from('saved_posts').delete().eq('post_id', req.params.postId);
    await supabaseAdmin.from('posts').delete().eq('id', req.params.postId);
    logEkle('GONDERI SILINDI', gonderi?.users?.username + ' - ' + (gonderi?.caption?.substring(0, 50) || 'Medya'), req.ip);
    res.json({ hata: false, mesaj: 'Gonderi ve tum iliskili veriler silindi.' });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

router.get('/messages', adminTokenKontrol, async (req, res) => {
  try {
    const { kullanici1, kullanici2 } = req.query;
    let sorgu = supabaseAdmin.from('messages').select('*, sender:sender_id (username, name, avatar_url), receiver:receiver_id (username, name, avatar_url)').order('created_at', { ascending: false }).limit(100);
    if (kullanici1 && kullanici2) {
      const { data: user1 } = await supabaseAdmin.from('users').select('id').eq('username', kullanici1).single();
      const { data: user2 } = await supabaseAdmin.from('users').select('id').eq('username', kullanici2).single();
      if (user1 && user2) {
        sorgu = sorgu.or(`and(sender_id.eq.${user1.id},receiver_id.eq.${user2.id}),and(sender_id.eq.${user2.id},receiver_id.eq.${user1.id})`);
      }
    }
    const { data: mesajlar, error } = await sorgu;
    if (error) return res.status(400).json({ hata: true, mesaj: error.message });
    res.json({ hata: false, mesajlar: mesajlar || [] });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

router.delete('/messages/:messageId', adminTokenKontrol, async (req, res) => {
  try {
    await supabaseAdmin.from('messages').delete().eq('id', req.params.messageId);
    logEkle('MESAJ SILINDI', 'Mesaj ID: ' + req.params.messageId, req.ip);
    res.json({ hata: false, mesaj: 'Mesaj silindi.' });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

router.get('/conversations', adminTokenKontrol, async (req, res) => {
  try {
    const { data: mesajlar, error } = await supabaseAdmin.from('messages').select('*, sender:sender_id (username, name), receiver:receiver_id (username, name)').order('created_at', { ascending: false }).limit(200);
    if (error) return res.status(400).json({ hata: true, mesaj: error.message });
    const konusmalar = {};
    (mesajlar || []).forEach(msg => {
      const key = [msg.sender_id, msg.receiver_id].sort().join('-');
      if (!konusmalar[key]) {
        konusmalar[key] = { kullanici1: msg.sender?.username || msg.sender_id, kullanici2: msg.receiver?.username || msg.receiver_id, son_mesaj: msg.content?.substring(0, 100) || '[Medya]', son_mesaj_zamani: msg.created_at, toplam_mesaj: 0 };
      }
      konusmalar[key].toplam_mesaj++;
    });
    res.json({ hata: false, konusmalar: Object.values(konusmalar) });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

router.get('/logs', adminTokenKontrol, async (req, res) => {
  res.json({ hata: false, loglar: adminLoglari.slice(0, 100) });
});

router.get('/bot/status', adminTokenKontrol, async (req, res) => {
  const { getBotState, getApiCount } = require('../botEngine');
  const botState = getBotState();
  const { data: botUser } = await supabaseAdmin.from('users').select('id').eq('username', 'anigram_bot').single();
  let botGonderiSayisi = 0;
  if (botUser) {
    const { count } = await supabaseAdmin.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', botUser.id);
    botGonderiSayisi = count || 0;
  }
  res.json({ hata: false, bot_durum: botState, api_sayisi: getApiCount(), bot_gonderi_sayisi: botGonderiSayisi });
});

router.post('/bot/start', adminTokenKontrol, async (req, res) => {
  const { startBotLoop } = require('../botEngine');
  startBotLoop();
  logEkle('BOT BASLATILDI', 'Admin tarafindan baslatildi', req.ip);
  res.json({ hata: false, mesaj: 'Bot baslatildi.' });
});

router.post('/bot/stop', adminTokenKontrol, async (req, res) => {
  const { stopBotLoop } = require('../botEngine');
  stopBotLoop();
  logEkle('BOT DURDURULDU', 'Admin tarafindan durduruldu', req.ip);
  res.json({ hata: false, mesaj: 'Bot durduruldu.' });
});

router.post('/bot/run', adminTokenKontrol, async (req, res) => {
  const { runBot } = require('../botEngine');
  logEkle('BOT MANUEL CALISTIRILDI', 'Admin tarafindan tetiklendi', req.ip);
  res.json({ hata: false, mesaj: 'Bot calistiriliyor...' });
  runBot().catch(err => console.error('Manuel bot hatasi:', err));
});

module.exports = router;