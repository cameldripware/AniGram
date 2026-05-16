const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../supabaseClient');

router.get('/', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ hata: true, mesaj: 'Oturum gerekli.' });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ hata: true, mesaj: 'Gecersiz oturum.' });

    const tip = req.query.tip;
    let sorgu = supabase.from('notifications').select('*, from_user:from_user_id (username, name, avatar_url)', { count: 'exact' }).eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
    if (tip && tip !== 'tumu') sorgu = sorgu.eq('type', tip);

    const { data: bildirimler, error, count } = await sorgu;
    if (error) return res.status(400).json({ hata: true, mesaj: error.message });

    const okunmamisSayisi = (bildirimler || []).filter(b => !b.is_read).length;
    res.json({ hata: false, bildirimler: bildirimler || [], toplam: count || 0, okunmamis_sayisi: okunmamisSayisi });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

router.get('/sayi', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ hata: true, mesaj: 'Oturum gerekli.' });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ hata: true, mesaj: 'Gecersiz oturum.' });
    const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false);
    res.json({ hata: false, okunmamis_sayisi: count || 0 });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

router.post('/okundu', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ hata: true, mesaj: 'Oturum gerekli.' });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ hata: true, mesaj: 'Gecersiz oturum.' });
    const { bildirim_id } = req.body;
    if (bildirim_id) { await supabase.from('notifications').update({ is_read: true }).eq('id', bildirim_id).eq('user_id', user.id); }
    else { await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false); }
    res.json({ hata: false, mesaj: 'Okundu olarak isaretlendi.' });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

router.get('/ayarlar', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ hata: true, mesaj: 'Oturum gerekli.' });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ hata: true, mesaj: 'Gecersiz oturum.' });
    const { data: ayarlar } = await supabase.from('notification_settings').select('*').eq('user_id', user.id).single();
    res.json({ hata: false, ayarlar: ayarlar || { begeni: true, yorum: true, takip: true, mesaj: true, mention: true } });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

router.put('/ayarlar', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ hata: true, mesaj: 'Oturum gerekli.' });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ hata: true, mesaj: 'Gecersiz oturum.' });
    const { begeni, yorum, takip, mesaj, mention } = req.body;
    const ayarData = { user_id: user.id };
    if (begeni !== undefined) ayarData.begeni = begeni;
    if (yorum !== undefined) ayarData.yorum = yorum;
    if (takip !== undefined) ayarData.takip = takip;
    if (mesaj !== undefined) ayarData.mesaj = mesaj;
    if (mention !== undefined) ayarData.mention = mention;
    const { data: mevcut } = await supabase.from('notification_settings').select('id').eq('user_id', user.id).single();
    if (mevcut) { await supabase.from('notification_settings').update(ayarData).eq('id', mevcut.id); }
    else { await supabase.from('notification_settings').insert([ayarData]); }
    res.json({ hata: false, mesaj: 'Bildirim ayarlari guncellendi.' });
  } catch (error) {
    res.status(500).json({ hata: true, mesaj: error.message });
  }
});

module.exports = router;